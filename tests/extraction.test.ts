import { describe, expect, it, vi } from "vitest";
import {
  extractListing,
  heuristicExtractListing,
  housingExtractionSchema,
  parseExtractionResponse,
} from "@/lib/extraction/llm";

const NOW = new Date("2026-10-25T12:00:00.000Z");

const HOUSING_MESSAGE =
  "Subleasing my private room + private bath at University House Tempe from Nov 15 to July 31. $780/month plus utilities, female veg preferred. Fully furnished, pool, gym, study room, in-unit laundry. Text 602-555-0101.";

describe("housing extraction schema", () => {
  it("defaults every unmentioned attribute to null", () => {
    const parsed = housingExtractionSchema.parse({
      is_housing_post: true,
      listing_type: "sublease",
    });

    expect(parsed.rent_monthly).toBeNull();
    expect(parsed.utilities_included).toBeNull();
    expect(parsed.gender_preference).toBeNull();
    expect(parsed.dietary_preference).toBeNull();
    expect(parsed.location_text).toBeNull();
    expect(parsed.move_in_date).toBeNull();
    expect(parsed.move_out_date).toBeNull();
    expect(parsed.private_room).toBeNull();
    expect(parsed.private_bath).toBeNull();
    expect(parsed.contact_phone).toBeNull();
    expect(parsed.summary).toBeNull();
    expect(parsed.amenities).toEqual({
      pool: null,
      gym: null,
      study_room: null,
      in_unit_laundry: null,
      parking: null,
      furnished: null,
    });
  });

  it("normalizes numeric strings and JSON code fences", () => {
    const parsed = parseExtractionResponse(
      '```json\n{"is_housing_post":true,"listing_type":"sublease","rent_monthly":"$820","amenities":{"gym":true}}\n```'
    );
    expect(parsed?.rent_monthly).toBe(820);
    expect(parsed?.amenities.gym).toBe(true);
    expect(parsed?.amenities.pool).toBeNull();
  });

  it("rejects non-housing posts and looking_for_place posts", () => {
    expect(
      parseExtractionResponse({
        is_housing_post: false,
        listing_type: "sublease",
      })
    ).toBeNull();
    expect(
      parseExtractionResponse({
        is_housing_post: true,
        listing_type: "looking_for_place",
      })
    ).toBeNull();
  });

  it("rejects invalid enum values", () => {
    expect(
      parseExtractionResponse({
        is_housing_post: true,
        listing_type: "sublease",
        gender_preference: "alien",
      })
    ).toBeNull();
  });
});

describe("deterministic heuristic extraction", () => {
  it("extracts structured fields and null defaults from a real housing post", () => {
    const listing = heuristicExtractListing(HOUSING_MESSAGE, NOW);

    expect(listing.is_housing_post).toBe(true);
    expect(listing.listing_type).toBe("sublease");
    expect(listing.rent_monthly).toBe(780);
    expect(listing.utilities_included).toBe(false);
    expect(listing.gender_preference).toBe("female");
    expect(listing.dietary_preference).toBe("veg");
    expect(listing.location_text).toBe("University House Tempe");
    expect(listing.move_in_date).toBe("2026-11-15");
    expect(listing.move_out_date).toBe("2027-07-31");
    expect(listing.private_room).toBe(true);
    expect(listing.private_bath).toBe(true);
    expect(listing.contact_phone).toBe("16025550101");
    expect(listing.amenities).toMatchObject({
      pool: true,
      gym: true,
      study_room: true,
      in_unit_laundry: true,
      furnished: true,
    });
    expect(listing.amenities.parking).toBeNull();
  });

  it("recognizes lease takeovers, roommate posts, and unspecified fields", () => {
    const takeover = heuristicExtractListing(
      "Lease takeover at Vista del Sol starting Jan 1. $1,025/month, private bath, female unit.",
      NOW
    );
    expect(takeover.listing_type).toBe("lease_transfer");
    expect(takeover.rent_monthly).toBe(1025);
    expect(takeover.amenities.pool).toBeNull();

    const roommate = heuristicExtractListing(
      "Roommate needed at Paseo on University, $725 per month with utilities included. Male preferred.",
      NOW
    );
    expect(roommate.listing_type).toBe("roommate_needed");
    expect(roommate.utilities_included).toBe(true);
    expect(roommate.gender_preference).toBe("male");
    expect(roommate.dietary_preference).toBeNull();
  });

  it("does not treat casual chat as a housing post", async () => {
    const listing = heuristicExtractListing(
      "Anyone selling football tickets for the ASU game this weekend?",
      NOW
    );
    expect(listing.is_housing_post).toBe(false);
    expect(
      await extractListing("Anyone selling football tickets for the ASU game this weekend?", {
        groqApiKey: null,
        openrouterApiKey: null,
        now: NOW,
      })
    ).toBeNull();
  });

  it("discards wanted/looking-for-place posts from extraction results", async () => {
    const listing = await extractListing(
      "Looking for a place near ASU from January, budget $800, preferably furnished.",
      { groqApiKey: null, openrouterApiKey: null, now: NOW }
    );
    expect(listing).toBeNull();
  });
});

describe("hosted LLM extraction", () => {
  it("uses the Groq response when a key is configured", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  is_housing_post: true,
                  listing_type: "lease_transfer",
                  rent_monthly: 900,
                  gender_preference: "male",
                  location_text: "Vertex",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as unknown as typeof fetch;

    const listing = await extractListing("Lease takeover at Vertex $900 for a male unit.", {
      groqApiKey: "test-key",
      openrouterApiKey: null,
      fetcher,
      now: NOW,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetcher).mock.calls[0];
    expect(String(url)).toContain("api.groq.com");
    expect(JSON.parse(String(init?.body)).model).toBe("llama-3.3-70b-versatile");
    expect(listing?.rent_monthly).toBe(900);
    expect(listing?.utilities_included).toBeNull();
  });

  it("falls back to the heuristic parser when providers fail", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const listing = await extractListing(HOUSING_MESSAGE, {
      groqApiKey: "test-key",
      openrouterApiKey: "another-key",
      fetcher,
      now: NOW,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(listing?.rent_monthly).toBe(780);
    expect(listing?.location_text).toBe("University House Tempe");
  });
});
