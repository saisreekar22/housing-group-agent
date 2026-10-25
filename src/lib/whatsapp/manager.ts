import { promises as fs } from "node:fs";
import path from "node:path";
import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
  useMultiFileAuthState,
  type WASocket,
  type WAMessage,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import { queryListings } from "@/lib/db/listings";
import {
  loadTrackedGroupIds,
  saveTrackedGroups,
} from "@/lib/db/tracked-groups";
import { normalizePhone } from "@/lib/extraction/llm";
import { ingestMessages } from "@/lib/ingest";
import { isHousingCandidate, type ChatMessage } from "@/lib/whatsapp/parser";
import {
  formatBotReply,
  mentionsBot,
  parseBotQuery,
} from "@/lib/whatsapp/bot";
import type {
  WhatsAppConnectionStatus,
  WhatsAppGroup,
  WhatsAppStatus,
} from "@/lib/types";

interface BufferedGroupMessage {
  keyId: string;
  groupId: string;
  timestampIso: string;
  senderName: string;
  senderPhone: string | null;
  text: string;
}

export interface GroupScanSummary {
  scannedGroups: number;
  totalMessages: number;
  candidateMessages: number;
  extractedListings: number;
  storedListings: number;
}

interface ManagerState {
  sock: WASocket | null;
  status: WhatsAppConnectionStatus;
  qr: string | null;
  pairingCode: string | null;
  error: string | null;
  groups: WhatsAppGroup[];
  trackedGroupIds: Set<string>;
  bufferedMessages: Map<string, Map<string, BufferedGroupMessage>>;
  bufferLoaded: boolean;
  phoneNumber: string | null;
  linkMethod: "pairing" | "qr" | null;
  connectedAt: string | null;
  starting: boolean;
  reconnectTimer: NodeJS.Timeout | null;
}

const GLOBAL_KEY = "__housingGroupAgentWhatsAppManager__";
const AUTH_DIR = path.join(process.cwd(), ".baileys_auth");
const BUFFER_FILE = path.join(process.cwd(), ".whatsapp_group_messages.json");

function initialState(): ManagerState {
  return {
    sock: null,
    status: "disconnected",
    qr: null,
    pairingCode: null,
    error: null,
    groups: [],
    trackedGroupIds: new Set<string>(),
    bufferedMessages: new Map<string, Map<string, BufferedGroupMessage>>(),
    bufferLoaded: false,
    phoneNumber: null,
    linkMethod: null,
    connectedAt: null,
    starting: false,
    reconnectTimer: null,
  };
}

function getState(): ManagerState {
  const globalStore = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: ManagerState;
  };
  if (!globalStore[GLOBAL_KEY]) {
    globalStore[GLOBAL_KEY] = initialState();
  }
  return globalStore[GLOBAL_KEY];
}

function jidToPhone(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const user = jid.split("@")[0]?.split(":")[0] ?? "";
  return normalizePhone(user);
}

function extractMessageText(message: WAMessage["message"]): string {
  if (!message) return "";
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    ""
  );
}

function messageTimestamp(message: WAMessage): Date {
  const raw = message.messageTimestamp;
  if (raw === null || raw === undefined) return new Date();
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) return new Date();
  return new Date(value * 1000);
}

export function getWhatsAppStatus(): WhatsAppStatus {
  const state = getState();
  return {
    status: state.status,
    connected: state.status === "connected",
    qr: state.qr,
    pairingCode: state.pairingCode,
    error: state.error,
    groups: state.groups,
    trackedGroupIds: Array.from(state.trackedGroupIds),
    phoneNumber: state.phoneNumber,
    connectedAt: state.connectedAt,
  };
}

async function refreshGroups(state: ManagerState): Promise<WhatsAppGroup[]> {
  if (!state.sock || state.status !== "connected") return state.groups;

  try {
    const participating = await state.sock.groupFetchAllParticipating();
    state.groups = Object.values(participating)
      .map((group) => ({
        id: group.id,
        subject: group.subject || "Untitled group",
        size: group.size ?? group.participants.length,
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
    return state.groups;
  } catch (error) {
    console.warn(`Failed to fetch WhatsApp groups: ${String(error)}`);
    return state.groups;
  }
}

async function ensureBufferLoaded(state: ManagerState): Promise<void> {
  if (state.bufferLoaded) return;
  state.bufferLoaded = true;
  try {
    const raw = await fs.readFile(BUFFER_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    for (const item of parsed as BufferedGroupMessage[]) {
      if (!item?.groupId || !item?.keyId || !item?.text) continue;
      let groupMap = state.bufferedMessages.get(item.groupId);
      if (!groupMap) {
        groupMap = new Map<string, BufferedGroupMessage>();
        state.bufferedMessages.set(item.groupId, groupMap);
      }
      groupMap.set(item.keyId, item);
    }
  } catch {
    // No existing buffer file yet.
  }
}

async function persistBuffer(state: ManagerState): Promise<void> {
  const all: BufferedGroupMessage[] = [];
  for (const groupMap of state.bufferedMessages.values()) {
    for (const msg of groupMap.values()) {
      all.push(msg);
    }
  }
  try {
    await fs.writeFile(BUFFER_FILE, JSON.stringify(all.slice(-2500), null, 2), "utf8");
  } catch (error) {
    console.warn(`Failed to persist WhatsApp message buffer: ${String(error)}`);
  }
}

function recordBufferedMessage(
  state: ManagerState,
  message: WAMessage
): BufferedGroupMessage | null {
  const jid = message.key?.remoteJid;
  if (!jid || !jid.endsWith("@g.us")) return null;

  const text = extractMessageText(message.message).trim();
  if (!text || text.startsWith("*CampusNest")) return null;

  const timestamp = messageTimestamp(message);
  const age = Date.now() - timestamp.getTime();
  if (age > 60 * 24 * 60 * 60 * 1000) return null;

  const senderPhone = jidToPhone(message.key.participant ?? message.key.remoteJid);
  const senderName =
    message.pushName ?? senderPhone ?? (message.key.fromMe ? "Me" : "WhatsApp member");
  const keyId =
    message.key.id ?? `${jid}:${timestamp.getTime()}:${senderPhone ?? senderName}:${text.slice(0, 24)}`;

  const buffered: BufferedGroupMessage = {
    keyId,
    groupId: jid,
    timestampIso: timestamp.toISOString(),
    senderName,
    senderPhone,
    text,
  };

  let groupMap = state.bufferedMessages.get(jid);
  if (!groupMap) {
    groupMap = new Map<string, BufferedGroupMessage>();
    state.bufferedMessages.set(jid, groupMap);
  }
  groupMap.set(keyId, buffered);
  return buffered;
}

async function scanBufferedGroups(
  state: ManagerState,
  groupIds: string[]
): Promise<GroupScanSummary> {
  await ensureBufferLoaded(state);
  let totalMessages = 0;
  let candidateMessages = 0;
  let extractedListings = 0;
  let storedListings = 0;

  for (const groupId of groupIds) {
    const groupMap = state.bufferedMessages.get(groupId);
    if (!groupMap || groupMap.size === 0) continue;

    const groupInfo = state.groups.find((candidate) => candidate.id === groupId);
    const messages: ChatMessage[] = Array.from(groupMap.values()).map((entry, idx) => ({
      id: idx + 1,
      timestamp: new Date(entry.timestampIso),
      senderName: entry.senderName,
      senderPhone: entry.senderPhone,
      text: entry.text,
    }));

    const candidates = messages.filter(
      (msg) =>
        msg.text.trim().length >= 30 &&
        !mentionsBot(msg.text) &&
        isHousingCandidate(msg.text)
    );

    totalMessages += messages.length;
    candidateMessages += candidates.length;

    if (candidates.length === 0) continue;

    const result = await ingestMessages(messages, candidates, {
      group: groupInfo
        ? { id: groupInfo.id, subject: groupInfo.subject }
        : { id: groupId, subject: groupId },
    });
    extractedListings += result.extracted;
    storedListings += result.stored;
  }

  return {
    scannedGroups: groupIds.length,
    totalMessages,
    candidateMessages,
    extractedListings,
    storedListings,
  };
}

async function handleBotQuery(state: ManagerState, jid: string, text: string, message: WAMessage) {
  if (!state.sock) return;
  const filters = parseBotQuery(text);
  const { listings } = await queryListings(filters, {
    allowSeedFallback: false,
    groupIds: Array.from(state.trackedGroupIds),
  });
  const reply = formatBotReply(listings, filters);
  await state.sock.sendMessage(jid, { text: reply }, { quoted: message });
}

async function ingestLiveMessage(
  state: ManagerState,
  buffered: BufferedGroupMessage
): Promise<void> {
  const timestamp = new Date(buffered.timestampIso);
  const age = Date.now() - timestamp.getTime();
  if (age > 60 * 24 * 60 * 60 * 1000) return;
  if (buffered.text.trim().length < 30 || !isHousingCandidate(buffered.text)) return;

  const chat: ChatMessage = {
    id: Date.now(),
    timestamp,
    senderName: buffered.senderName,
    senderPhone: buffered.senderPhone,
    text: buffered.text,
  };
  const group = state.groups.find((candidate) => candidate.id === buffered.groupId);

  await ingestMessages([chat], [chat], {
    group: group
      ? { id: group.id, subject: group.subject }
      : { id: buffered.groupId, subject: buffered.groupId },
  });
}

async function handleIncomingMessages(
  state: ManagerState,
  messages: WAMessage[],
  eventType: string
): Promise<void> {
  await ensureBufferLoaded(state);
  let recordedAny = false;

  for (const message of messages) {
    const jid = message.key?.remoteJid;
    if (!jid || !jid.endsWith("@g.us")) continue;

    const buffered = recordBufferedMessage(state, message);
    if (!buffered) continue;
    recordedAny = true;

    if (!state.trackedGroupIds.has(jid)) continue;

    try {
      if (eventType === "notify" && !message.key.fromMe && mentionsBot(buffered.text)) {
        await handleBotQuery(state, jid, buffered.text, message);
        continue;
      }
      await ingestLiveMessage(state, buffered);
    } catch (error) {
      console.error(`Failed to process WhatsApp message: ${String(error)}`);
    }
  }

  if (recordedAny) {
    await persistBuffer(state);
  }
}

async function requestPairingCode(state: ManagerState, sock: WASocket): Promise<void> {
  if (!state.phoneNumber) return;
  try {
    // Baileys needs a short window to initialize the socket before pairing.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const code = await sock.requestPairingCode(state.phoneNumber);
    state.pairingCode = code;
    state.status = "pairing";
    state.error = null;
    console.info("WhatsApp pairing code generated");
  } catch (error) {
    state.error = `Unable to request pairing code: ${String(error)}`;
    state.status = "error";
    console.error(state.error);
  }
}

function scheduleReconnect(state: ManagerState): void {
  if (state.reconnectTimer) return;
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    if (state.status === "connected") return;
    void connectWhatsApp();
  }, 3000);
}

export async function connectWhatsApp(
  phoneNumber?: string,
  method?: "pairing" | "qr"
): Promise<WhatsAppStatus> {
  const state = getState();
  if (state.status === "connected" && state.sock) return getWhatsAppStatus();

  const normalizedPhone = phoneNumber ? normalizePhone(phoneNumber) : null;
  if (normalizedPhone) state.phoneNumber = normalizedPhone;
  if (method) state.linkMethod = method;
  else if (!state.linkMethod) state.linkMethod = normalizedPhone ? "pairing" : "qr";
  if (state.status === "disconnected" || state.status === "error") {
    state.trackedGroupIds = new Set(await loadTrackedGroupIds());
  }

  if (state.starting) return getWhatsAppStatus();
  state.starting = true;
  state.status = "connecting";
  state.error = null;
  state.qr = null;
  state.pairingCode = null;

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const versionInfo = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
    const logger = pino({ level: "silent" });

    const sock = makeWASocket({
      version: versionInfo.version,
      auth: {
        creds: authState.creds,
        keys: makeCacheableSignalKeyStore(authState.keys, logger),
      },
      logger,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: false,
      syncFullHistory: true,
      generateHighQualityLinkPreview: false,
    });

    state.sock = sock;
    await ensureBufferLoaded(state);
    state.trackedGroupIds = new Set(await loadTrackedGroupIds());

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      void (async () => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          state.qr = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
          if (state.status !== "pairing") state.status = "qr";
        }

        if (connection === "open") {
          state.status = "connected";
          state.connectedAt = new Date().toISOString();
          state.qr = null;
          state.pairingCode = null;
          state.error = null;
          await refreshGroups(state);
          if (state.trackedGroupIds.size > 0) {
            await scanBufferedGroups(state, Array.from(state.trackedGroupIds));
          }
        }

        if (connection === "close") {
          const statusCode = (
            lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
          )?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          state.sock = null;
          state.qr = null;
          state.pairingCode = null;
          state.connectedAt = null;

          if (loggedOut) {
            state.status = "error";
            state.error = "WhatsApp logged out. Link the account again with a new pairing code.";
            try {
              await fs.rm(AUTH_DIR, { recursive: true, force: true });
            } catch {
              state.error = "WhatsApp logged out. Remove .baileys_auth and link again.";
            }
          } else {
            state.status = "disconnected";
            scheduleReconnect(state);
          }
        }
      })().catch((error) => {
        state.error = String(error);
        state.status = "error";
      });
    });

    sock.ev.on("messaging-history.set", (event) => {
      const historyEvent = event as { messages?: WAMessage[] };
      if (Array.isArray(historyEvent.messages) && historyEvent.messages.length > 0) {
        void handleIncomingMessages(state, historyEvent.messages, "history");
      }
    });

    sock.ev.on("messages.upsert", (event) => {
      const upsertEvent = event as { messages: WAMessage[]; type: string };
      void handleIncomingMessages(state, upsertEvent.messages ?? [], upsertEvent.type);
    });

    if (state.linkMethod === "pairing" && state.phoneNumber && !authState.creds.registered) {
      await requestPairingCode(state, sock);
    }

    return getWhatsAppStatus();
  } catch (error) {
    state.status = "error";
    state.error = error instanceof Error ? error.message : String(error);
    return getWhatsAppStatus();
  } finally {
    state.starting = false;
  }
}

export async function getWhatsAppGroups(): Promise<WhatsAppGroup[]> {
  const state = getState();
  await ensureBufferLoaded(state);
  if (state.status !== "connected") return [];
  return refreshGroups(state);
}

export async function getBufferedMessageCounts(): Promise<Record<string, number>> {
  const state = getState();
  await ensureBufferLoaded(state);
  const counts: Record<string, number> = {};
  for (const [groupId, groupMap] of state.bufferedMessages.entries()) {
    counts[groupId] = groupMap.size;
  }
  return counts;
}

export async function setTrackedGroups(
  groupIds: string[]
): Promise<WhatsAppStatus & { scan: GroupScanSummary }> {
  const state = getState();
  await ensureBufferLoaded(state);
  const groups = await refreshGroups(state);
  const selected = groupIds
    .map((id) => groups.find((group) => group.id === id))
    .filter((group): group is WhatsAppGroup => Boolean(group));

  const savedIds = await saveTrackedGroups(selected);
  state.trackedGroupIds = new Set(savedIds);

  let scan = await scanBufferedGroups(state, savedIds);
  if (scan.totalMessages === 0) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await ensureBufferLoaded(state);
    scan = await scanBufferedGroups(state, savedIds);
  }
  return {
    ...getWhatsAppStatus(),
    scan,
  };
}

export function resetWhatsAppManagerForTests(): void {
  const globalStore = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: ManagerState;
  };
  if (globalStore[GLOBAL_KEY]?.reconnectTimer) {
    clearTimeout(globalStore[GLOBAL_KEY].reconnectTimer);
  }
  globalStore[GLOBAL_KEY] = initialState();
}
