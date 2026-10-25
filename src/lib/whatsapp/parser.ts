import JSZip from "jszip";

export interface ChatMessage {
  id: number;
  timestamp: Date;
  senderName: string;
  senderPhone?: string | null;
  text: string;
}

export interface ParsedChat {
  chatText: string;
  messages: ChatMessage[];
  candidates: ChatMessage[];
  skippedShort: number;
  skippedOld: number;
  skippedNonHousing: number;
}

export interface ParserOptions {
  now?: Date;
  minLength?: number;
  maxAgeDays?: number;
}

const DEFAULT_MIN_LENGTH = 30;
const DEFAULT_MAX_AGE_DAYS = 60;

const IOS_PATTERN =
  /^\[(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[APap]\.?[Mm]\.?)?)\]\s*([^:]+):\s?([\s\S]*)$/;

const ANDROID_PATTERN =
  /^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[APap]\.?[Mm]\.?)?)\s+[-–—]\s+([^:]+):\s?([\s\S]*)$/;

const HOUSING_KEYWORD_PATTERN =
  /\$|\b(?:rent|rental|sublease|subleasing|lease|takeover|transfer|room|rooms|bedroom|bed|beds|bath|baths|b\/b|move[ -]?in|move[ -]?out|available|apartment|apt|roommate|roommates|utilities|furnished|deposit|housing|signed)\b/i;

function cleanLine(line: string): string {
  return line
    .replace(/\u200e|\u200f/g, "")
    .replace(/[\u202a-\u202e]/g, "")
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function parseDatePart(value: string): { year: number; month: number; day: number } | null {
  const parts = value.split(/[./-]/).map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  let [first, second, third] = parts;
  let year: number;
  let month: number;
  let day: number;

  if (first > 31) {
    year = first;
    month = second;
    day = third;
  } else {
    year = third;
    if (year < 100) year += 2000;
    if (first > 12) {
      day = first;
      month = second;
    } else if (second > 12) {
      month = first;
      day = second;
    } else {
      month = first;
      day = second;
    }
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseTimePart(value: string): { hours: number; minutes: number; seconds: number } | null {
  const cleaned = value.replace(/\./g, " ").trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  const meridiem = match[4];

  if (meridiem === "AM" && hours === 12) hours = 0;
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  return { hours, minutes, seconds };
}

function parseTimestamp(datePart: string, timePart: string): Date | null {
  const date = parseDatePart(datePart);
  const time = parseTimePart(timePart);
  if (!date || !time) return null;

  const timestamp = new Date(
    Date.UTC(
      date.year,
      date.month - 1,
      date.day,
      time.hours,
      time.minutes,
      time.seconds
    )
  );
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function phoneFromSenderName(name: string): string | null {
  const match = name.match(/(?:\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/);
  if (!match) return null;
  return `1${match[1]}${match[2]}${match[3]}`;
}

export function parseWhatsAppText(raw: string): ChatMessage[] {
  const normalized = raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");

  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;
  let id = 1;

  for (const rawLine of normalized.split("\n")) {
    const line = cleanLine(rawLine);
    if (!line) {
      if (current) current.text += "\n";
      continue;
    }

    const match = line.match(IOS_PATTERN) ?? line.match(ANDROID_PATTERN);
    if (match) {
      const [, datePart, timePart, senderName, text] = match;
      const timestamp = parseTimestamp(datePart, timePart);
      if (!timestamp) continue;

      const cleanSender = cleanLine(senderName).replace(/^~/, "").trim();
      const message: ChatMessage = {
        id: id++,
        timestamp,
        senderName: cleanSender,
        senderPhone: phoneFromSenderName(cleanSender),
        text: cleanLine(text),
      };
      messages.push(message);
      current = message;
      continue;
    }

    if (current) {
      current.text = `${current.text.replace(/\n+$/, "")}\n${line}`.trim();
    }
  }

  return messages.map((message) => ({
    ...message,
    text: message.text.replace(/\n{3,}/g, "\n\n").trim(),
  }));
}

export function isHousingCandidate(text: string): boolean {
  return HOUSING_KEYWORD_PATTERN.test(text);
}

export function filterCandidateMessages(
  messages: ChatMessage[],
  options: ParserOptions = {}
): Pick<ParsedChat, "candidates" | "skippedShort" | "skippedOld" | "skippedNonHousing"> {
  const now = options.now ?? new Date();
  const minLength = options.minLength ?? DEFAULT_MIN_LENGTH;
  const maxAgeDays = options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const candidates: ChatMessage[] = [];
  let skippedShort = 0;
  let skippedOld = 0;
  let skippedNonHousing = 0;

  for (const message of messages) {
    const age = now.getTime() - message.timestamp.getTime();
    if (age > maxAgeMs) {
      skippedOld += 1;
      continue;
    }
    if (message.text.trim().length < minLength) {
      skippedShort += 1;
      continue;
    }
    if (!isHousingCandidate(message.text)) {
      skippedNonHousing += 1;
      continue;
    }
    candidates.push(message);
  }

  return { candidates, skippedShort, skippedOld, skippedNonHousing };
}

export function parseWhatsAppExport(raw: string, options: ParserOptions = {}): ParsedChat {
  const messages = parseWhatsAppText(raw);
  const filtered = filterCandidateMessages(messages, options);
  return { chatText: raw, messages, ...filtered };
}

export async function extractChatTextFromZip(
  input: ArrayBuffer | Uint8Array | Buffer
): Promise<string> {
  const zip = await JSZip.loadAsync(input);
  const entries = Object.values(zip.files)
    .filter(
      (entry) =>
        !entry.dir &&
        /\.txt$/i.test(entry.name) &&
        !entry.name.includes("__MACOSX") &&
        !entry.name.split("/").pop()?.startsWith("._")
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) {
    throw new Error("No .txt chat export found inside the .zip archive.");
  }

  const texts = await Promise.all(entries.map((entry) => entry.async("string")));
  return texts.join("\n");
}

function looksLikeZip(name: string, buffer: Uint8Array): boolean {
  if (/\.zip$/i.test(name)) return true;
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

export async function parseWhatsAppExportFile(
  fileName: string,
  buffer: Uint8Array,
  options: ParserOptions = {}
): Promise<ParsedChat> {
  const chatText = looksLikeZip(fileName, buffer)
    ? await extractChatTextFromZip(buffer)
    : new TextDecoder("utf-8").decode(buffer);

  return parseWhatsAppExport(chatText, options);
}
