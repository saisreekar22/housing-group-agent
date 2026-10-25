import { describe, expect, it } from "vitest";
import {
  filtersToSearchParams,
  hasActiveFilters,
  parseFilters,
} from "@/lib/filters";
import { emptyFilters } from "@/lib/types";

describe("URL query parameter filter sync", () => {
  it("initializes filters from the pre-filtered WhatsApp bot URL", () => {
    const filters = parseFilters(
      new URLSearchParams("?gender=male&diet=veg&maxRent=800&gym=true")
    );
    expect(filters.gender).toBe("male");
    expect(filters.diet).toBe("veg");
    expect(filters.maxRent).toBe(800);
    expect(filters.amenities.gym).toBe(true);
    expect(filters.includeUnspecified).toBe(true);
  });

  it("round-trips filters through URLSearchParams", () => {
    const filters = {
      ...emptyFilters(),
      maxRent: 950,
      gender: "female" as const,
      diet: "vegan" as const,
      listingType: "lease_transfer" as const,
      includeUnspecified: false,
      amenities: { private_bath: true, laundry: undefined, pool: true },
    };
    const params = filtersToSearchParams(filters);
    expect(params.get("maxRent")).toBe("950");
    expect(params.get("gender")).toBe("female");
    expect(params.get("diet")).toBe("vegan");
    expect(params.get("type")).toBe("lease_transfer");
    expect(params.get("includeUnspecified")).toBe("false");
    expect(params.get("privateBath")).toBe("true");
    expect(params.get("pool")).toBe("true");

    const parsed = parseFilters(params);
    expect(parsed.maxRent).toBe(950);
    expect(parsed.gender).toBe("female");
    expect(parsed.diet).toBe("vegan");
    expect(parsed.listingType).toBe("lease_transfer");
    expect(parsed.includeUnspecified).toBe(false);
    expect(parsed.amenities.private_bath).toBe(true);
    expect(parsed.amenities.pool).toBe(true);
  });

  it("ignores invalid values and reports active filters", () => {
    const filters = parseFilters(
      new URLSearchParams("?gender=alien&maxRent=abc&diet=meat&type=nope")
    );
    expect(filters.gender).toBeNull();
    expect(filters.maxRent).toBeNull();
    expect(filters.diet).toBeNull();
    expect(filters.listingType).toBeNull();
    expect(hasActiveFilters(filters)).toBe(false);
  });
});
