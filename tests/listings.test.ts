import { describe, expect, it } from "vitest";
import {
  dedupeListings,
  fallbackListings,
  filterListings,
  isWithinTtl,
  listingDedupKey,
  normalizeLocationText,
  toListingRecord,
} from "@/lib/db/listings";
import {
  emptyAmenities,
  type Listing,
  type NewListing,
} from "@/lib/types";
import { buildSeedListings } from "@/lib/seed-data";

const NOW = new Date("2026-10-25T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function baseListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    sender_phone: "16025550101",
    sender_name: "Maya R.",
    group_id: "group-1@g.us",
    group_name: "ASU Tempe Housing",
    is_housing_post: true,
    listing_type: "sublease",
    rent_monthly: 780,
    utilities_included: false,
    gender_preference: "female",
    dietary_preference: "veg",
    location_text: "University House Tempe",
    normalized_location_text: "university house tempe",
    move_in_date: "2026-11-15",
    move_out_date: "2027-07-31",
    private_room: true,
    private_bath: true,
    amenities: { ...emptyAmenities(), pool: true, gym: true },
    contact_phone: "16025550101",
    summary: "Private room sublease at University House Tempe.",
    source_message: "Subleasing my private room at University House Tempe.",
    posted_at: new Date(NOW.getTime() - 2 * DAY).toISOString(),
    latitude: 33.4153,
    longitude: -111.926,
    ...overrides,
  };
}

describe("listing deduplication", () => {
  it("normalizes location text into a stable key", () => {
    expect(normalizeLocationText("  University House, Tempe! ")).toBe(
      "university house tempe"
    );
    expect(normalizeLocationText(null)).toBe("unknown location");
  });

  it("uses sender, normalized location, and rent as the UPSERT key", () => {
    const first = baseListing();
    const second = baseListing({ location_text: "university-house tempe" });
    expect(listingDedupKey(first)).toBe(listingDedupKey(second));
    expect(listingDedupKey(baseListing({ rent_monthly: 900 }))).not.toBe(
      listingDedupKey(first)
    );
  });

  it("keeps one record per key and refreshes it with the newest repost", () => {
    const older: NewListing = {
      ...baseListing(),
      summary: "old summary",
      posted_at: new Date(NOW.getTime() - 10 * DAY).toISOString(),
    };
    const newer: NewListing = {
      ...baseListing(),
      summary: "updated summary",
      posted_at: new Date(NOW.getTime() - 1 * DAY).toISOString(),
    };
    const differentRent: NewListing = { ...baseListing({ rent_monthly: 900 }) };

    const deduped = dedupeListings([older, newer, differentRent]);
    expect(deduped).toHaveLength(2);
    const updated = deduped.find((row) => row.rent_monthly === 780);
    expect(updated?.summary).toBe("updated summary");
  });

  it("stores normalized location text on insert records", () => {
    const record = toListingRecord({
      ...baseListing(),
      location_text: "Paseo on University, Tempe",
    });
    expect(record.normalized_location_text).toBe("paseo on university tempe");
  });
});

describe("60-day TTL", () => {
  it("includes listings up to 60 days old and excludes older ones", () => {
    const recent = new Date(NOW.getTime() - 59 * DAY).toISOString();
    const expired = new Date(NOW.getTime() - 61 * DAY).toISOString();

    expect(isWithinTtl(recent, NOW)).toBe(true);
    expect(isWithinTtl(expired, NOW)).toBe(false);
    expect(isWithinTtl("not-a-date", NOW)).toBe(false);
  });

  it("omits expired listings from map query results", () => {
    const fresh = baseListing();
    const stale = baseListing({
      id: "listing-old",
      posted_at: new Date(NOW.getTime() - 61 * DAY).toISOString(),
    });
    const result = filterListings([fresh, stale], {}, NOW);
    expect(result.map((listing) => listing.id)).toEqual(["listing-1"]);
  });
});

describe("multi-criteria filters and unspecified semantics", () => {
  const female = baseListing({ id: "female" });
  const male = baseListing({
    id: "male",
    gender_preference: "male",
    dietary_preference: "non_veg",
    rent_monthly: 900,
    amenities: { ...emptyAmenities(), gym: true },
  });
  const unspecified = baseListing({
    id: "unspecified",
    gender_preference: null,
    dietary_preference: null,
    rent_monthly: 650,
    private_bath: null,
    amenities: { ...emptyAmenities(), pool: true },
  });
  const listings = [female, male, unspecified];

  it("hides null gender listings when Include unspecified is off", () => {
    const result = filterListings(
      listings,
      { gender: "female", includeUnspecified: false },
      NOW
    );
    expect(result.map((listing) => listing.id)).toEqual(["female"]);
  });

  it("includes null gender listings when Include unspecified is on", () => {
    const result = filterListings(
      listings,
      { gender: "female", includeUnspecified: true },
      NOW
    );
    expect(result.map((listing) => listing.id).sort()).toEqual(["female", "unspecified"]);
  });

  it("applies rent, diet, and amenity filters together", () => {
    const result = filterListings(
      listings,
      {
        maxRent: 800,
        diet: "veg",
        includeUnspecified: false,
        amenities: { gym: true },
      },
      NOW
    );
    expect(result.map((listing) => listing.id)).toEqual(["female"]);
  });

  it("excludes listings with an unknown rent when max rent is set", () => {
    const unknownRent = baseListing({ id: "unknown-rent", rent_monthly: null });
    const result = filterListings([unknownRent], { maxRent: 1200 }, NOW);
    expect(result).toHaveLength(0);
  });

  it("requires private bath only when requested", () => {
    const result = filterListings(
      [female, unspecified],
      { amenities: { private_bath: true } },
      NOW
    );
    expect(result.map((listing) => listing.id)).toEqual(["female"]);
  });
});

describe("Tempe seed fallback", () => {
  it("provides 60-day-valid listings across the required Tempe complexes", () => {
    const listings = fallbackListings(NOW);
    expect(listings.length).toBeGreaterThanOrEqual(16);
    const locations = new Set(listings.map((listing) => listing.location_text));
    for (const complex of [
      "University House Tempe",
      "Vista del Sol",
      "Paseo on University",
      "Nine20 Tempe",
      "West 6th",
      "Vertex",
      "District on Apache",
      "Union Tempe",
    ]) {
      expect(locations.has(complex)).toBe(true);
    }
    expect(listings.every((listing) => isWithinTtl(listing.posted_at, NOW))).toBe(true);
    expect(listings.every((listing) => listing.latitude !== 0)).toBe(true);
  });

  it("keeps every generated seed listing within the 60-day window", () => {
    const generated = buildSeedListings(NOW);
    expect(generated).toHaveLength(18);
    expect(generated.every((listing) => isWithinTtl(listing.posted_at, NOW))).toBe(true);
  });
});
