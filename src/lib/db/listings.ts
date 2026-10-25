import { promises as fs } from "node:fs";
import path from "node:path";
import { getSupabaseClient } from "@/lib/db/supabase";
import { buildSeedListings } from "@/lib/seed-data";
import {
  emptyAmenities,
  emptyFilters,
  type Listing,
  type ListingFilters,
  type NewListing,
} from "@/lib/types";

const TTL_DAYS = 60;
export const LISTING_TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
const LOCAL_LISTINGS_FILE = path.join(process.cwd(), ".listings_store.json");

type SupabaseLike = ReturnType<typeof getSupabaseClient>;

async function readLocalListings(now: Date = new Date()): Promise<Listing[]> {
  try {
    const raw = await fs.readFile(LOCAL_LISTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as Record<string, unknown>[])
      .map(coerceListing)
      .filter((row) => isWithinTtl(row.posted_at, now));
  } catch {
    return [];
  }
}

async function writeLocalListings(rows: NewListing[], now: Date = new Date()): Promise<Listing[]> {
  const existing = await readLocalListings(now);
  const merged = dedupeListings([...existing, ...rows]).filter((row) =>
    isWithinTtl(row.posted_at, now)
  );
  const records: Listing[] = merged.map((row, index) => {
    const record = toListingRecord(row);
    const existingId = "id" in row && typeof row.id === "string" ? row.id : null;
    return {
      ...record,
      id: existingId ?? `local-${Date.now()}-${index + 1}`,
      created_at: record.posted_at,
      updated_at: now.toISOString(),
    };
  });

  try {
    await fs.writeFile(LOCAL_LISTINGS_FILE, JSON.stringify(records, null, 2), "utf8");
  } catch (error) {
    console.warn(`Failed to write local listings store: ${String(error)}`);
  }
  return records;
}

export function ttlCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - LISTING_TTL_MS);
}

export function isWithinTtl(postedAt: string | Date, now: Date = new Date()): boolean {
  const timestamp = postedAt instanceof Date ? postedAt.getTime() : Date.parse(postedAt);
  if (!Number.isFinite(timestamp)) return false;
  const age = now.getTime() - timestamp;
  return age <= LISTING_TTL_MS && age >= -24 * 60 * 60 * 1000;
}

export function normalizeLocationText(text: string | null | undefined): string {
  if (!text) return "unknown location";
  const normalized = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "unknown location";
}

export function listingDedupKey(
  row: Pick<NewListing, "sender_phone" | "location_text" | "rent_monthly">
): string {
  return [
    row.sender_phone.trim(),
    normalizeLocationText(row.location_text),
    row.rent_monthly === null ? "null" : String(row.rent_monthly),
  ].join("|");
}

export function dedupeListings<T extends NewListing>(rows: T[]): T[] {
  const byKey = new Map<string, T>();

  for (const row of rows) {
    const key = listingDedupKey(row);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const existingTime = Date.parse(existing.posted_at);
    const nextTime = Date.parse(row.posted_at);
    if (!Number.isFinite(existingTime) || nextTime >= existingTime) {
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values());
}

export function toListingRecord(row: NewListing): NewListing & {
  normalized_location_text: string;
  amenities: NewListing["amenities"];
} {
  return {
    ...row,
    location_text: row.location_text?.trim() || null,
    normalized_location_text: normalizeLocationText(row.location_text),
    amenities: { ...emptyAmenities(), ...row.amenities },
  };
}

export function filterListings(
  listings: Listing[],
  filters: Partial<ListingFilters> = {},
  now: Date = new Date()
): Listing[] {
  const merged: ListingFilters = {
    ...emptyFilters(),
    ...filters,
    amenities: filters.amenities ?? {},
  };

  return listings
    .filter((listing) => isWithinTtl(listing.posted_at, now))
    .filter((listing) => {
      if (merged.maxRent !== null) {
        if (listing.rent_monthly === null) return false;
        if (listing.rent_monthly > merged.maxRent) return false;
      }

      if (merged.gender !== null) {
        const matchesGender = listing.gender_preference === merged.gender;
        const matchesUnspecified =
          merged.includeUnspecified && listing.gender_preference === null;
        if (!matchesGender && !matchesUnspecified) return false;
      }

      if (merged.diet !== null && listing.dietary_preference !== merged.diet) {
        return false;
      }

      if (merged.listingType !== null && listing.listing_type !== merged.listingType) {
        return false;
      }

      for (const [key, enabled] of Object.entries(merged.amenities)) {
        if (!enabled) continue;
        if (key === "private_bath") {
          if (listing.private_bath !== true) return false;
        } else if (listing.amenities[key as keyof typeof listing.amenities] !== true) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => Date.parse(b.posted_at) - Date.parse(a.posted_at));
}

function coerceListing(row: Record<string, unknown>): Listing {
  const source = row as unknown as NewListing & {
    id: string;
    normalized_location_text: string;
  };
  return {
    ...source,
    is_housing_post: true,
    amenities: { ...emptyAmenities(), ...(source.amenities ?? {}) },
    normalized_location_text:
      source.normalized_location_text || normalizeLocationText(source.location_text),
  };
}

export function fallbackListings(now: Date = new Date()): Listing[] {
  return dedupeListings(
    buildSeedListings(now).filter((row) => isWithinTtl(row.posted_at, now))
  ).map((row, index) => ({
    ...toListingRecord(row),
    id: `seed-${index + 1}`,
    created_at: row.posted_at,
    updated_at: row.posted_at,
  }));
}

export interface UpsertResult {
  upserted: number;
  records: NewListing[];
  source: "supabase" | "memory";
}

const SEED_GROUP_IDS = new Set([
  "tempe-housing-1@g.us",
  "asu-subleases-2@g.us",
  "desert-roommates-3@g.us",
]);

export async function upsertListings(
  rows: NewListing[],
  options: { client?: SupabaseLike; now?: Date } = {}
): Promise<UpsertResult> {
  const now = options.now ?? new Date();
  const valid = dedupeListings(rows.filter((row) => isWithinTtl(row.posted_at, now)));
  if (valid.length === 0) {
    return { upserted: 0, records: [], source: "memory" };
  }

  if (options.client === undefined) {
    await writeLocalListings(valid, now);
  }

  const client = options.client === undefined ? getSupabaseClient() : options.client;
  if (!client) {
    return {
      upserted: options.client === undefined ? valid.length : 0,
      records: valid,
      source: "memory",
    };
  }

  const payload = valid.map(toListingRecord);
  const { error } = await client.from("listings").upsert(payload, {
    onConflict: "sender_phone,normalized_location_text,rent_monthly",
    ignoreDuplicates: false,
  });

  if (error) {
    if (options.client === undefined) {
      console.warn(`Supabase upsert failed, stored in local file instead: ${error.message}`);
      return { upserted: valid.length, records: valid, source: "memory" };
    }
    throw new Error(`Failed to upsert listings: ${error.message}`);
  }

  return { upserted: valid.length, records: valid, source: "supabase" };
}

export interface QueryResult {
  listings: Listing[];
  source: "supabase" | "fallback";
}

export interface QueryListingsOptions {
  client?: SupabaseLike;
  now?: Date;
  allowSeedFallback?: boolean;
  groupIds?: string[];
}

export async function queryListings(
  filters: Partial<ListingFilters> = {},
  options: QueryListingsOptions = {}
): Promise<QueryResult> {
  const now = options.now ?? new Date();
  const allowSeedFallback = options.allowSeedFallback ?? true;
  const client = options.client === undefined ? getSupabaseClient() : options.client;
  const localRows = options.client === undefined ? await readLocalListings(now) : [];

  let remoteRows: Listing[] = [];
  if (client) {
    const { data, error } = await client
      .from("listings")
      .select("*")
      .gte("posted_at", ttlCutoff(now).toISOString())
      .order("posted_at", { ascending: false });

    if (!error && data) {
      remoteRows = (data as Record<string, unknown>[]).map(coerceListing);
    } else if (error) {
      console.warn(`Supabase listing query failed: ${error.message}`);
    }
  }

  const combined = dedupeListings([...localRows, ...remoteRows]).map((row, index) => ({
    ...toListingRecord(row),
    id: "id" in row && typeof row.id === "string" ? row.id : `listing-${index + 1}`,
  }));

  if (!allowSeedFallback) {
    const realListings = combined.filter((listing) => {
      if (listing.group_id && SEED_GROUP_IDS.has(listing.group_id)) return false;
      return true;
    });

    return {
      listings: filterListings(realListings, filters, now),
      source: "supabase",
    };
  }

  if (combined.length > 0) {
    return { listings: filterListings(combined, filters, now), source: "supabase" };
  }

  return {
    listings: filterListings(fallbackListings(now), filters, now),
    source: "fallback",
  };
}

export async function deleteExpiredListings(
  options: { client?: SupabaseLike; now?: Date } = {}
): Promise<number> {
  const now = options.now ?? new Date();
  const client = options.client === undefined ? getSupabaseClient() : options.client;
  if (!client) return 0;

  const { data, error } = await client
    .from("listings")
    .delete()
    .lt("posted_at", ttlCutoff(now).toISOString())
    .select("id");

  if (error) {
    console.warn(`Failed to delete expired listings: ${error.message}`);
    return 0;
  }
  return data?.length ?? 0;
}

export async function seedDatabase(
  options: { client?: SupabaseLike; now?: Date } = {}
): Promise<{ seeded: number; source: "supabase" | "fallback" }> {
  const now = options.now ?? new Date();
  const rows = buildSeedListings(now);
  const client = options.client === undefined ? getSupabaseClient() : options.client;

  if (!client) {
    return { seeded: rows.length, source: "fallback" };
  }

  const result = await upsertListings(rows, { client, now });
  return { seeded: result.upserted, source: "supabase" };
}
