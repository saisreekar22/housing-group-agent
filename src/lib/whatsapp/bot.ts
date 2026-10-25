import { filtersToSearchParams } from "@/lib/filters";
import { emptyFilters, type Listing, type ListingFilters } from "@/lib/types";

export const BOT_MENTION = "@housing-group-agent";

export function mentionsBot(text: string): boolean {
  return text.toLowerCase().includes(BOT_MENTION);
}

function parseAmount(value: string): number | null {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseBotQuery(text: string): ListingFilters {
  const filters = emptyFilters();
  const query = text.replace(/@housing-group-agent/gi, " ").toLowerCase();

  const rentMatch =
    query.match(/(?:under|below|less than|max(?:imum)?|up to|<=?)\s*\$?\s*(\d[\d,]{2,5})/) ??
    query.match(/\$\s*(\d[\d,]{2,5})/);
  if (rentMatch) filters.maxRent = parseAmount(rentMatch[1]);

  if (/\b(?:female|females|girl|girls|women)\b/.test(query)) {
    filters.gender = "female";
  } else if (/\b(?:male|males|guy|guys|men)\b/.test(query)) {
    filters.gender = "male";
  } else if (/\b(?:mixed|co-?ed|coed|any gender|all genders)\b/.test(query)) {
    filters.gender = "mixed";
  }

  if (/\bvegan\b/.test(query)) {
    filters.diet = "vegan";
  } else if (/\bnon[- ]?veg(?:etarian)?\b/.test(query)) {
    filters.diet = "non_veg";
  } else if (/\bveg(?:etarian)?\b/.test(query)) {
    filters.diet = "veg";
  }

  if (/\bsublease\b|\bsublet\b/.test(query)) {
    filters.listingType = "sublease";
  } else if (/\btakeover\b|\btransfer\b|\blease takeover\b/.test(query)) {
    filters.listingType = "lease_transfer";
  } else if (/\broommate\b/.test(query)) {
    filters.listingType = "roommate_needed";
  }

  if (/\bpool\b/.test(query)) filters.amenities.pool = true;
  if (/\bgym\b|\bfitness\b/.test(query)) filters.amenities.gym = true;
  if (/\bstudy (?:room|rooms|area)\b|\bstudy\b/.test(query)) {
    filters.amenities.study_room = true;
  }
  if (/\blaundry\b|\bwasher\b/.test(query)) {
    filters.amenities.in_unit_laundry = true;
  }
  if (/\bparking\b|\bgarage\b/.test(query)) filters.amenities.parking = true;
  if (/\bfurnished\b/.test(query)) filters.amenities.furnished = true;
  if (/\bprivate bath\b|\battached bath\b/.test(query)) {
    filters.amenities.private_bath = true;
  }

  if (/\b(?:unspecified|any gender)\b/.test(query)) {
    filters.includeUnspecified = true;
  }

  return filters;
}

export function buildMapUrl(filters: ListingFilters, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const query = filtersToSearchParams(filters).toString();
  return query ? `${base}/?${query}` : `${base}/`;
}

function formatListingLine(listing: Listing, index: number): string {
  const rent = listing.rent_monthly !== null ? `$${listing.rent_monthly}/mo` : "Rent not stated";
  const location = listing.location_text ?? "Tempe area";
  const summary = listing.summary ?? "Housing listing";
  const contact = listing.contact_phone
    ? `\n   Contact: https://wa.me/${listing.contact_phone}`
    : "";
  return `${index + 1}. ${rent} — ${location}\n   ${summary}${contact}`;
}

export function formatBotReply(
  listings: Listing[],
  filters: ListingFilters,
  baseUrl?: string
): string {
  const mapUrl = buildMapUrl(filters, baseUrl);
  const top = listings.slice(0, 3);

  if (top.length === 0) {
    return [
      "I couldn't find any matching housing listings right now.",
      `Search the map or adjust filters: ${mapUrl}`,
    ].join("\n");
  }

  return [
    `Here are the top ${top.length} matching listings:`,
    ...top.map((listing, index) => formatListingLine(listing, index)),
    `See all matches on the map: ${mapUrl}`,
  ].join("\n\n");
}
