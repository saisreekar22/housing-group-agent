import { z } from "zod";
import { findApartment } from "@/lib/geocoding/tempe-apartments";
import {
  DIETARY_PREFERENCES,
  GENDER_PREFERENCES,
  LISTING_TYPES,
  emptyAmenities,
  type Amenities,
  type ExtractedListing,
} from "@/lib/types";

const nullableText = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().nullable()
).default(null);

const nullableNumber = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return value;
  },
  z.number().int().nonnegative().nullable()
).default(null);

function normalizeDateValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

const nullableDate = z.preprocess(normalizeDateValue, z.string().nullable()).default(null);

const amenitiesSchema = z.preprocess(
  (value) => {
    const base = emptyAmenities();
    if (!value || typeof value !== "object") return base;
    return { ...base, ...(value as Record<string, unknown>) };
  },
  z.object({
    pool: z.boolean().nullable(),
    gym: z.boolean().nullable(),
    study_room: z.boolean().nullable(),
    in_unit_laundry: z.boolean().nullable(),
    parking: z.boolean().nullable(),
    furnished: z.boolean().nullable(),
  })
);

export const housingExtractionSchema = z.object({
  is_housing_post: z.boolean().default(true),
  listing_type: z.enum(LISTING_TYPES).nullable().default(null),
  rent_monthly: nullableNumber,
  utilities_included: z.boolean().nullable().default(null),
  gender_preference: z.enum(GENDER_PREFERENCES).nullable().default(null),
  dietary_preference: z.enum(DIETARY_PREFERENCES).nullable().default(null),
  location_text: nullableText,
  move_in_date: nullableDate,
  move_out_date: nullableDate,
  private_room: z.boolean().nullable().default(null),
  private_bath: z.boolean().nullable().default(null),
  amenities: amenitiesSchema,
  contact_phone: nullableText,
  summary: nullableText,
});

export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = `1${digits}`;
  return digits.length >= 10 ? digits : null;
}

interface ValidationOutcome {
  valid: boolean;
  rejected: boolean;
  listing: ExtractedListing | null;
}

function validateExtraction(raw: unknown): ValidationOutcome {
  let value = raw;
  if (typeof value === "string") {
    const cleaned = value
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    try {
      value = JSON.parse(cleaned);
    } catch {
      return { valid: false, rejected: false, listing: null };
    }
  }

  const parsed = housingExtractionSchema.safeParse(value);
  if (!parsed.success) {
    return { valid: false, rejected: false, listing: null };
  }

  const listing = parsed.data;
  if (!listing.is_housing_post || listing.listing_type === "looking_for_place") {
    return { valid: true, rejected: true, listing: null };
  }

  return {
    valid: true,
    rejected: false,
    listing: {
      ...listing,
      contact_phone: normalizePhone(listing.contact_phone),
      amenities: { ...emptyAmenities(), ...listing.amenities },
    },
  };
}

export function parseExtractionResponse(raw: unknown): ExtractedListing | null {
  return validateExtraction(raw).listing;
}

const HOUSING_PATTERN =
  /\$|\b(?:rent|rental|sublease|subleasing|sublet|lease|takeover|transfer|room|rooms|bedroom|bed|beds|bath|baths|b\/b|move[ -]?in|move[ -]?out|available|apartment|apt|roommate|roommates|utilities|furnished|deposit|housing)\b/i;

const WANTED_PATTERN =
  /\b(?:looking for|searching for|need|want|iso)\b[^.!?]{0,40}\b(?:place|apartment|rental|housing|sublet|room to rent)\b/i;

const PHONE_PATTERN =
  /(?:\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/;

function parseAmount(value: string): number | null {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractRent(text: string): number | null {
  const amount = String.raw`(\d{1,2}(?:,\d{3})+|\d{3,4})`;

  const dollar = text.match(new RegExp(String.raw`\$\s*${amount}(?:\s*(?:\/|per)\s*(?:mo|month))?`, "i"));
  if (dollar) return parseAmount(dollar[1]);

  const perMonth = text.match(
    new RegExp(String.raw`${amount}\s*(?:\/|per)\s*(?:mo|month)\b`, "i")
  );
  if (perMonth) return parseAmount(perMonth[1]);

  const rentLabel = text.match(
    new RegExp(String.raw`\brent(?:al)?(?:\s+is|\s+of|:)?\s*\$?\s*${amount}\b`, "i")
  );
  if (rentLabel) return parseAmount(rentLabel[1]);

  return null;
}

function extractUtilities(text: string): boolean | null {
  if (
    /(?:plus|excluding|excl\.?|separate|not)\s+(?:utilities|electric(?:ity)?|water)/i.test(text) ||
    /utilities\s+(?:are\s+)?not\s+included/i.test(text)
  ) {
    return false;
  }
  if (/\butilities\b[^.!?]{0,20}\bincluded\b|\bincluded\b[^.!?]{0,20}\butilities\b|\ball[- ]inclusive\b/i.test(text)) {
    return true;
  }
  return null;
}

function extractGender(text: string): ExtractedListing["gender_preference"] {
  if (/\b(?:female|females|girl|girls|women|woman)\b/i.test(text)) return "female";
  if (/\b(?:male|males|guy|guys|men|man)\b/i.test(text)) return "male";
  if (/\b(?:mixed|co-?ed|coed|any gender|all genders)\b/i.test(text)) return "mixed";
  return null;
}

function extractDiet(text: string): ExtractedListing["dietary_preference"] {
  if (/\bvegan\b/i.test(text)) return "vegan";
  if (/\bnon[- ]?veg(?:etarian)?\b/i.test(text)) return "non_veg";
  if (/\bveg(?:etarian)?\b/i.test(text)) return "veg";
  return null;
}

function extractLocation(text: string): string | null {
  const apartment = findApartment(text);
  if (apartment) return apartment.name;

  const labeled = text.match(
    /\b(?:location|address|complex|building|community)\s*[:\-]\s*([^.,;\n]{3,55})/i
  );
  if (labeled?.[1]) {
    const candidate = labeled[1].trim();
    const matchedApt = findApartment(candidate);
    if (matchedApt) return matchedApt.name;
    return candidate;
  }

  const address = text.match(
    /\b\d{2,5}\s+[A-Za-z][\w.'-]*(?:\s+[A-Za-z][\w.'-]*){0,5}\s+(?:St(?:reet)?|Ave(?:nue)?|Rd|Road|Blvd|Boulevard|Dr(?:ive)?|Way|Ln|Lane|Pkwy|Parkway|Pl(?:ace)?|Ct|Court)\b/i
  );
  if (address) return address[0].trim();

  const intersection = text.match(
    /\b([A-Z][A-Za-z0-9.'-]*(?:\s+(?:St(?:reet)?|Ave(?:nue)?|Rd|Road|Blvd|Dr(?:ive)?|Ln|Way))?\s*(?:&|and|\/)\s*[A-Z][A-Za-z0-9.'-]*(?:\s+(?:St(?:reet)?|Ave(?:nue)?|Rd|Road|Blvd|Dr(?:ive)?|Ln|Way))?)\b/
  );
  if (intersection?.[1] && !/\b(?:bed|bath|room|girl|boy|male|female|veg|month|rent)\b/i.test(intersection[1])) {
    return intersection[1].trim();
  }

  const namedComplex = text.match(
    /\b(?:at|in|near)\s+((?:The\s+)?[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z0-9][A-Za-z0-9.'-]*){0,3}\s+(?:Apartments?|Apts?|Lofts?|Towers?|Villas?|Commons?|Place|Village|Flats|Station|Court|Residences?|Hall|Campus))\b/
  );
  if (namedComplex?.[1]) return namedComplex[1].trim();

  const atCapitalized = text.match(
    /\b(?:subleas(?:e|ing)|takeover|room(?:mate)?(?:\s+needed|\s+available)?|available|unit|apartment|apt|spot)\b[^.!?\n]{0,35}?\b(?:at|near)\s+([A-Z][A-Za-z0-9&'-]*(?:\s+[A-Z0-9][A-Za-z0-9&'-]*){0,3})\b/
  );
  if (
    atCapitalized?.[1] &&
    !/^(?:ASU|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|DM|Text|Call)$/i.test(
      atCapitalized[1].trim()
    )
  ) {
    return atCapitalized[1].trim();
  }

  const zip = text.match(/\b(8[0-9]{4})\b/);
  if (zip) return `Tempe, AZ ${zip[1]}`;

  const cityMatch = text.match(
    /\b(Downtown Phoenix|North Tempe|South Tempe|West Tempe|Tempe|Phoenix|Mesa|Scottsdale|Chandler|Gilbert|Tucson)\b/i
  );
  if (cityMatch?.[1]) {
    return `${cityMatch[1].trim()}, AZ`;
  }

  if (/\b(?:asu|arizona state)\b/i.test(text)) {
    return "Tempe, AZ 85281";
  }

  return null;
}

function parseLooseDate(value: string, now: Date): string | null {
  const cleaned = value.replace(/\./g, "").trim();
  if (!cleaned) return null;

  const withYear = /\d{4}/.test(cleaned);
  const parsed = new Date(`${cleaned}${withYear ? "" : ` ${now.getFullYear()}`}`);
  if (Number.isNaN(parsed.getTime())) return null;

  let date = parsed;
  if (!withYear && date.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
    date = new Date(`${cleaned} ${now.getFullYear() + 1}`);
  }
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

const DATE_TOKEN = String.raw`([A-Za-z]{3,9}\.?\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)`;

function extractDates(text: string, now: Date): {
  move_in_date: string | null;
  move_out_date: string | null;
} {
  let moveIn: string | null = null;
  let moveOut: string | null = null;

  const range = text.match(
    new RegExp(String.raw`\bfrom\s+${DATE_TOKEN}\s+(?:to|through|until|thru|[-–])\s+${DATE_TOKEN}`, "i")
  );
  if (range) {
    moveIn = parseLooseDate(range[1], now);
    moveOut = parseLooseDate(range[2], now);
  }

  if (!moveIn) {
    const match = text.match(
      new RegExp(String.raw`\b(?:move[ -]?in|available)(?:\s+(?:date|is|from|starting|on|:))?\s*${DATE_TOKEN}`, "i")
    );
    if (match) moveIn = parseLooseDate(match[1], now);
  }

  if (!moveOut) {
    const match = text.match(
      new RegExp(String.raw`\b(?:move[ -]?out|through|until|ends?)(?:\s+(?:date|is|on|:))?\s*${DATE_TOKEN}`, "i")
    );
    if (match) moveOut = parseLooseDate(match[1], now);
  }

  return { move_in_date: moveIn, move_out_date: moveOut };
}

function extractAmenities(text: string): Amenities {
  const amenities = emptyAmenities();
  if (/\bpool\b/i.test(text)) amenities.pool = true;
  if (/\bgym\b|\bfitness(?: center)?\b/i.test(text)) amenities.gym = true;
  if (/\bstudy (?:room|rooms|area)\b/i.test(text)) amenities.study_room = true;
  if (/\bin[- ]unit laundry\b|\bwasher(?: and| &)? dryer\b|\bw\/d\b/i.test(text)) {
    amenities.in_unit_laundry = true;
  }
  if (/\bparking\b|\bgarage\b/i.test(text)) amenities.parking = true;
  if (/\bfurnished\b/i.test(text)) amenities.furnished = true;
  return amenities;
}

function extractPhone(text: string): string | null {
  const match = text.match(PHONE_PATTERN);
  if (!match) return null;
  return normalizePhone(match[0]);
}

function buildSummary(
  listing: Omit<ExtractedListing, "summary">
): string {
  const typeLabels: Record<string, string> = {
    sublease: "Sublease",
    lease_transfer: "Lease takeover",
    roommate_needed: "Roommate needed",
    looking_for_place: "Looking for a place",
  };
  const parts: string[] = [];
  parts.push(typeLabels[listing.listing_type ?? "sublease"] ?? "Housing listing");
  if (listing.location_text) parts.push(`at ${listing.location_text}`);
  if (listing.rent_monthly !== null) parts.push(`for $${listing.rent_monthly}/mo`);
  const preferences = [listing.gender_preference, listing.dietary_preference]
    .filter(Boolean)
    .join(", ");
  if (preferences) parts.push(`(${preferences})`);
  return `${parts.join(" ")}.`;
}

export function heuristicExtractListing(text: string, now: Date = new Date()): ExtractedListing {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const isHousingPost = HOUSING_PATTERN.test(cleanText);
  const lookingForPlace = WANTED_PATTERN.test(cleanText);

  let listingType: ExtractedListing["listing_type"] = null;
  if (lookingForPlace) {
    listingType = "looking_for_place";
  } else if (/\bsublease\b|\bsubleasing\b|\bsublet\b|\bsub-let\b/i.test(cleanText)) {
    listingType = "sublease";
  } else if (/\btakeover\b|\btake over\b|\blease transfer\b|\btransfer(?:ring)? my lease\b/i.test(cleanText)) {
    listingType = "lease_transfer";
  } else if (/\broommate/i.test(cleanText)) {
    listingType = "roommate_needed";
  } else if (isHousingPost) {
    listingType = "sublease";
  }

  const dates = extractDates(cleanText, now);
  const privateRoom = /\bprivate (?:bedroom|room)\b/i.test(cleanText)
    ? true
    : /\bshared room\b|\bdouble room\b/i.test(cleanText)
      ? false
      : null;
  const privateBath = /\bprivate (?:bath|bathroom)\b|\battached (?:bath|bathroom)\b|\ben[- ]?suite\b/i.test(cleanText)
    ? true
    : /\bshared (?:bath|bathroom)\b/i.test(cleanText)
      ? false
      : null;

  const base: Omit<ExtractedListing, "summary"> = {
    is_housing_post: isHousingPost,
    listing_type: listingType,
    rent_monthly: extractRent(cleanText),
    utilities_included: extractUtilities(cleanText),
    gender_preference: extractGender(cleanText),
    dietary_preference: extractDiet(cleanText),
    location_text: extractLocation(cleanText),
    move_in_date: dates.move_in_date,
    move_out_date: dates.move_out_date,
    private_room: privateRoom,
    private_bath: privateBath,
    amenities: extractAmenities(cleanText),
    contact_phone: extractPhone(cleanText),
  };

  const summary =
    isHousingPost || lookingForPlace
      ? buildSummary(base)
      : cleanText.slice(0, 160);

  return { ...base, summary };
}

interface ProviderOutcome {
  status: "ok" | "error";
  listing?: ExtractedListing | null;
}

function buildPrompt(text: string, now: Date): string {
  return [
    `Extract structured housing listing data from the WhatsApp message below. Today is ${now.toISOString().slice(0, 10)}.`,
    "Return a single JSON object and nothing else.",
    "Use these keys exactly:",
    "is_housing_post (boolean), listing_type (sublease | lease_transfer | roommate_needed | looking_for_place | null), rent_monthly (integer or null), utilities_included (boolean or null), gender_preference (male | female | mixed | null), dietary_preference (veg | non_veg | vegan | null), location_text (string or null), move_in_date (YYYY-MM-DD or null), move_out_date (YYYY-MM-DD or null), private_room (boolean or null), private_bath (boolean or null), amenities ({pool, gym, study_room, in_unit_laundry, parking, furnished} each boolean or null), contact_phone (digits with country code or null), summary (concise one-sentence string or null).",
    "Any attribute not mentioned must be null. Do not guess.",
    "Set is_housing_post to false for casual chat that is not about housing.",
    "Use listing_type looking_for_place only when the author is seeking a place and is not offering one.",
    "Message:",
    text,
  ].join("\n");
}

async function callChatProvider(
  url: string,
  apiKey: string,
  model: string,
  text: string,
  now: Date,
  fetcher: typeof fetch,
  extraHeaders: Record<string, string> = {}
): Promise<ProviderOutcome> {
  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract housing listings from noisy group chat messages. Reply with strict JSON only.",
          },
          { role: "user", content: buildPrompt(text, now) },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return { status: "error" };
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { status: "error" };

    const outcome = validateExtraction(content);
    if (!outcome.valid) return { status: "error" };
    return { status: "ok", listing: outcome.listing };
  } catch {
    return { status: "error" };
  }
}

export interface ExtractOptions {
  groqApiKey?: string | null;
  openrouterApiKey?: string | null;
  fetcher?: typeof fetch;
  now?: Date;
}

export async function extractListing(
  text: string,
  options: ExtractOptions = {}
): Promise<ExtractedListing | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? fetch;
  const groqKey =
    options.groqApiKey === undefined ? process.env.GROQ_API_KEY?.trim() : options.groqApiKey;
  const openrouterKey =
    options.openrouterApiKey === undefined
      ? process.env.OPENROUTER_API_KEY?.trim()
      : options.openrouterApiKey;

  if (groqKey) {
    const result = await callChatProvider(
      "https://api.groq.com/openai/v1/chat/completions",
      groqKey,
      "llama-3.3-70b-versatile",
      trimmed,
      now,
      fetcher
    );
    if (result.status === "ok") return result.listing ?? null;
  }

  if (openrouterKey) {
    const result = await callChatProvider(
      "https://openrouter.ai/api/v1/chat/completions",
      openrouterKey,
      "meta-llama/llama-3.3-70b-instruct:free",
      trimmed,
      now,
      fetcher,
      {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "housing-group-agent",
      }
    );
    if (result.status === "ok") return result.listing ?? null;
  }

  return parseExtractionResponse(heuristicExtractListing(trimmed, now));
}
