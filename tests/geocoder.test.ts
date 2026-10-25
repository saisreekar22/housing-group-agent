import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGeocodeCacheForTests,
  geocodeLocation,
  resolveArea,
} from "@/lib/geocoding/geocoder";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("hybrid geocoder", () => {
  beforeEach(() => {
    clearGeocodeCacheForTests();
  });

  it("resolves known Tempe apartments from the local dictionary", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const result = await geocodeLocation("University House Tempe", { fetcher, rateLimitMs: 0 });
    expect(result.source).toBe("local");
    expect(result.latitude).toBeCloseTo(33.4153, 4);
    expect(result.longitude).toBeCloseTo(-111.926, 4);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("resolves apartment aliases such as Paseo and UH", async () => {
    const paseo = await geocodeLocation("paseo", { rateLimitMs: 0 });
    expect(paseo.displayName).toContain("Paseo on University");

    const uh = await geocodeLocation("UH Tempe", { rateLimitMs: 0 });
    expect(uh.displayName).toContain("University House Tempe");
  });

  it("resolves zip codes and city names locally for area search", async () => {
    const zip = await resolveArea("85281", { rateLimitMs: 0 });
    expect(zip.source).toBe("area");
    expect(zip.latitude).toBeCloseTo(33.4242, 3);
    expect(zip.longitude).toBeCloseTo(-111.9281, 3);

    const city = await resolveArea("Tempe, AZ", { rateLimitMs: 0 });
    expect(city.displayName).toContain("Tempe");
  });

  it("uses bounded Nominatim queries for unknown locations", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse([
        {
          lat: "33.4512",
          lon: "-112.0688",
          display_name: "Downtown Phoenix, Maricopa County, Arizona",
        },
      ])
    ) as unknown as typeof fetch;

    const result = await resolveArea("Downtown Phoenix", { fetcher, rateLimitMs: 0 });
    expect(result.source).toBe("nominatim");
    expect(result.latitude).toBeCloseTo(33.4512, 4);
    expect(fetcher).toHaveBeenCalledOnce();

    const url = String(vi.mocked(fetcher).mock.calls[0][0]);
    expect(url).toContain("countrycodes=us");
    expect(url).toContain("format=jsonv2");
  });

  it("bounds unknown listing addresses around the active area", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse([{ lat: "33.43", lon: "-111.92", display_name: "Some address, Tempe" }])
    ) as unknown as typeof fetch;

    await geocodeLocation("1234 Unknown Street", { fetcher, rateLimitMs: 0 });
    const url = String(vi.mocked(fetcher).mock.calls[0][0]);
    expect(url).toContain("bounded=1");
    expect(url).toContain("viewbox=");
  });

  it("falls back near the area center when geocoding fails", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    const result = await geocodeLocation("Some unlisted complex", {
      fetcher,
      rateLimitMs: 0,
    });
    expect(result.source).toBe("fallback");
    expect(Math.abs(result.latitude - 33.4242)).toBeLessThan(0.02);
    expect(Math.abs(result.longitude + 111.9281)).toBeLessThan(0.02);
  });
});
