import { describe, expect, it } from "vitest";
import {
  buildMapUrl,
  formatBotReply,
  mentionsBot,
  parseBotQuery,
} from "@/lib/whatsapp/bot";
import { emptyAmenities, type Listing } from "@/lib/types";

function listing(overrides: Partial<Listing>): Listing {
  return {
    id: "listing-1",
    sender_phone: "16025550101",
    sender_name: "Maya",
    group_id: "group@g.us",
    group_name: "ASU Housing",
    is_housing_post: true,
    listing_type: "sublease",
    rent_monthly: 750,
    utilities_included: null,
    gender_preference: "male",
    dietary_preference: "veg",
    location_text: "University House Tempe",
    normalized_location_text: "university house tempe",
    move_in_date: null,
    move_out_date: null,
    private_room: true,
    private_bath: null,
    amenities: { ...emptyAmenities(), gym: true },
    contact_phone: "16025550101",
    summary: "Male veg sublease at University House.",
    source_message: "Male veg sublease at University House.",
    posted_at: new Date().toISOString(),
    latitude: 33.4153,
    longitude: -111.926,
    ...overrides,
  };
}

describe("@housing-group-agent query parsing", () => {
  it("detects bot mentions", () => {
    expect(mentionsBot("@housing-group-agent male veg under $800")).toBe(true);
    expect(mentionsBot("hello everyone")).toBe(false);
  });

  it("parses gender, diet, rent, and amenity filters", () => {
    const filters = parseBotQuery("@housing-group-agent male veg under $800 with gym");
    expect(filters.gender).toBe("male");
    expect(filters.diet).toBe("veg");
    expect(filters.maxRent).toBe(800);
    expect(filters.amenities.gym).toBe(true);
    expect(filters.includeUnspecified).toBe(true);
  });

  it("parses comma-formatted rent, type, and multiple amenities", () => {
    const filters = parseBotQuery(
      "@housing-group-agent female vegan sublease max $1,250 with pool, laundry and parking"
    );
    expect(filters.gender).toBe("female");
    expect(filters.diet).toBe("vegan");
    expect(filters.listingType).toBe("sublease");
    expect(filters.maxRent).toBe(1250);
    expect(filters.amenities.pool).toBe(true);
    expect(filters.amenities.in_unit_laundry).toBe(true);
    expect(filters.amenities.parking).toBe(true);
  });

  it("builds a pre-filtered map URL", () => {
    const filters = parseBotQuery("@housing-group-agent male veg under $800 with gym");
    const url = buildMapUrl(filters, "https://campusnest.example.com/");
    expect(url).toBe(
      "https://campusnest.example.com/?maxRent=800&gender=male&diet=veg&gym=true"
    );
  });
});

describe("bot reply formatting", () => {
  it("replies with the top 3 matches and a map link", () => {
    const filters = parseBotQuery("@housing-group-agent male veg under $800 with gym");
    const listings = [
      listing({ id: "1", rent_monthly: 750, summary: "First match" }),
      listing({ id: "2", rent_monthly: 700, summary: "Second match" }),
      listing({ id: "3", rent_monthly: 650, summary: "Third match" }),
      listing({ id: "4", rent_monthly: 600, summary: "Fourth match" }),
    ];

    const reply = formatBotReply(listings, filters, "https://campusnest.example.com");
    expect(reply).toContain("top 3");
    expect(reply).toContain("First match");
    expect(reply).toContain("Third match");
    expect(reply).not.toContain("Fourth match");
    expect(reply).toContain("https://campusnest.example.com/?maxRent=800&gender=male&diet=veg&gym=true");
    expect(reply).toContain("https://wa.me/16025550101");
  });

  it("returns a helpful empty-state reply", () => {
    const filters = parseBotQuery("@housing-group-agent female under $500");
    const reply = formatBotReply([], filters, "https://campusnest.example.com");
    expect(reply).toContain("couldn't find");
    expect(reply).toContain("maxRent=500");
    expect(reply).toContain("gender=female");
  });
});
