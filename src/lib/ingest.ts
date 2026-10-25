import { upsertListings } from "@/lib/db/listings";
import { extractListing, normalizePhone } from "@/lib/extraction/llm";
import { geocodeLocation } from "@/lib/geocoding/geocoder";
import type { AreaCenter } from "@/lib/geocoding/tempe-apartments";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseWhatsAppExportFile,
  type ChatMessage,
  type ParsedChat,
} from "@/lib/whatsapp/parser";
import type { ExtractedListing, NewListing, WhatsAppGroup } from "@/lib/types";

export interface IngestOptions {
  now?: Date;
  group?: Pick<WhatsAppGroup, "id" | "subject"> | null;
  area?: AreaCenter;
  fetcher?: typeof fetch;
  extractor?: (text: string) => Promise<ExtractedListing | null>;
  geocoder?: typeof geocodeLocation;
  client?: SupabaseClient | null;
}

export interface IngestResult {
  received: number;
  candidates: number;
  extracted: number;
  stored: number;
  skipped: number;
  source: "supabase" | "memory";
  errors: string[];
}

function senderKey(message: ChatMessage, listing: ExtractedListing): string {
  const phone = listing.contact_phone ?? normalizePhone(message.senderPhone ?? null);
  if (phone) return phone;
  const name = message.senderName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `export:${name || "unknown"}`;
}

export async function ingestMessages(
  messages: ChatMessage[],
  candidates: ChatMessage[],
  options: IngestOptions = {}
): Promise<IngestResult> {
  const now = options.now ?? new Date();
  const extractor = options.extractor ?? ((text: string) => extractListing(text, { now }));
  const geocoder = options.geocoder ?? geocodeLocation;
  const rows: NewListing[] = [];
  const errors: string[] = [];
  let extracted = 0;

  for (const message of candidates) {
    try {
      const listing = await extractor(message.text);
      if (!listing || !listing.is_housing_post || listing.listing_type === "looking_for_place") {
        continue;
      }
      extracted += 1;

      const location = await geocoder(listing.location_text, {
        area: options.area,
        fetcher: options.fetcher,
      });

      rows.push({
        ...listing,
        sender_phone: senderKey(message, listing),
        sender_name: message.senderName || null,
        group_id: options.group?.id ?? null,
        group_name: options.group?.subject ?? null,
        source_message: message.text,
        posted_at: message.timestamp.toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  let stored = 0;
  let source: IngestResult["source"] = "memory";

  const chunkSize = 50;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    try {
      const result = await upsertListings(chunk, { client: options.client, now });
      stored += result.upserted;
      source = result.source;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    received: messages.length,
    candidates: candidates.length,
    extracted,
    stored,
    skipped: messages.length - extracted,
    source,
    errors,
  };
}

export interface IngestFileOptions extends IngestOptions {
  minLength?: number;
  maxAgeDays?: number;
}

export async function ingestChatExport(
  fileName: string,
  buffer: Uint8Array,
  options: IngestFileOptions = {}
): Promise<IngestResult & { parsed: ParsedChat }> {
  const parsed = await parseWhatsAppExportFile(fileName, buffer, {
    now: options.now,
    minLength: options.minLength,
    maxAgeDays: options.maxAgeDays,
  });

  const result = await ingestMessages(parsed.messages, parsed.candidates, options);
  return { ...result, parsed };
}
