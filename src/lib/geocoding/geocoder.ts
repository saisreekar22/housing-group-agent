import {
  AREA_CENTERS,
  DEFAULT_AREA,
  findApartment,
  normalizeAreaKey,
  type AreaCenter,
} from "@/lib/geocoding/tempe-apartments";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult extends Coordinates {
  displayName: string;
  source: "local" | "nominatim" | "area" | "fallback";
}

export interface GeocodeOptions {
  area?: AreaCenter;
  fetcher?: typeof fetch;
  rateLimitMs?: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "housing-group-agent/1.0 (ASU hackathon demo)";
const GEOCODE_CACHE = new Map<string, GeocodeResult>();
let lastNominatimRequest = 0;

async function throttle(rateLimitMs: number): Promise<void> {
  if (rateLimitMs <= 0) return;
  const elapsed = Date.now() - lastNominatimRequest;
  if (elapsed < rateLimitMs) {
    await new Promise((resolve) => setTimeout(resolve, rateLimitMs - elapsed));
  }
  lastNominatimRequest = Date.now();
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function jitterAround(area: AreaCenter, seed: string): Coordinates {
  const hash = hashString(seed || area.label);
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 0.0015 + (((hash >>> 9) % 90) / 90) * 0.0075;
  return {
    latitude: area.latitude + Math.cos(angle) * radius,
    longitude: area.longitude + Math.sin(angle) * radius * 1.1,
  };
}

function viewboxFor(area: AreaCenter, delta = 0.35): string {
  const west = area.longitude - delta;
  const east = area.longitude + delta;
  const north = area.latitude + delta;
  const south = area.latitude - delta;
  return `${west},${north},${east},${south}`;
}

async function nominatimSearch(
  query: string,
  area: AreaCenter,
  options: GeocodeOptions,
  bounded: boolean
): Promise<GeocodeResult | null> {
  const fetcher = options.fetcher ?? fetch;
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "us");
  if (bounded) {
    url.searchParams.set("viewbox", viewboxFor(area));
    url.searchParams.set("bounded", "1");
  }

  try {
    await throttle(options.rateLimitMs ?? 1000);
    const response = await fetcher(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const first = payload?.[0];
    if (!first?.lat || !first?.lon) return null;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      latitude,
      longitude,
      displayName: first.display_name ?? query,
      source: "nominatim",
    };
  } catch {
    return null;
  }
}

function localAreaLookup(query: string): AreaCenter | null {
  const normalized = normalizeAreaKey(query);
  if (!normalized) return null;

  if (AREA_CENTERS[normalized]) return AREA_CENTERS[normalized];

  const zipMatch = normalized.match(/\b(8\d{4})\b/);
  if (zipMatch && AREA_CENTERS[zipMatch[1]]) return AREA_CENTERS[zipMatch[1]];

  // Only match if it's clearly just the city/area name, not a more specific location
  for (const [key, center] of Object.entries(AREA_CENTERS)) {
    if (key.length > 2 && key.includes(" ")) continue; // skip multi-word keys for substring matching
    if (key.length > 2 && normalized === key) return center;
    // For short city names, only match if it's the whole query or very specific patterns
    if (key === "tempe" && (normalized === "tempe" || normalized === "tempe az")) return center;
    if (key === "phoenix" && normalized === "phoenix") return center;
    if (key === "mesa" && normalized === "mesa") return center;
    if (key === "scottsdale" && normalized === "scottsdale") return center;
    if (key === "tucson" && normalized === "tucson") return center;
    if (key === "chandler" && normalized === "chandler") return center;
    if (key === "gilbert" && normalized === "gilbert") return center;
  }

  return null;
}

export async function resolveArea(
  query: string,
  options: GeocodeOptions = {}
): Promise<GeocodeResult> {
  const trimmed = query.trim();
  const area = options.area ?? DEFAULT_AREA;
  if (!trimmed) {
    return {
      latitude: area.latitude,
      longitude: area.longitude,
      displayName: area.label,
      source: "area",
    };
  }

  const cacheKey = `area:${normalizeAreaKey(trimmed)}`;
  const cached = GEOCODE_CACHE.get(cacheKey);
  if (cached) return cached;

  const apartment = findApartment(trimmed);
  if (apartment) {
    const result: GeocodeResult = {
      latitude: apartment.latitude,
      longitude: apartment.longitude,
      displayName: `${apartment.name} — ${apartment.address}`,
      source: "local",
    };
    GEOCODE_CACHE.set(cacheKey, result);
    return result;
  }

  const localArea = localAreaLookup(trimmed);
  if (localArea) {
    const result: GeocodeResult = {
      latitude: localArea.latitude,
      longitude: localArea.longitude,
      displayName: localArea.label,
      source: "area",
    };
    GEOCODE_CACHE.set(cacheKey, result);
    return result;
  }

  const remote = await nominatimSearch(trimmed, area, options, false);
  if (remote) {
    GEOCODE_CACHE.set(cacheKey, remote);
    return remote;
  }

  const result: GeocodeResult = {
    latitude: area.latitude,
    longitude: area.longitude,
    displayName: trimmed,
    source: "fallback",
  };
  GEOCODE_CACHE.set(cacheKey, result);
  return result;
}

export async function geocodeLocation(
  locationText: string | null | undefined,
  options: GeocodeOptions = {}
): Promise<GeocodeResult> {
  const area = options.area ?? DEFAULT_AREA;
  const trimmed = locationText?.trim() ?? "";

  if (!trimmed) {
    return {
      latitude: area.latitude,
      longitude: area.longitude,
      displayName: area.label,
      source: "area",
    };
  }

  const cacheKey = `location:${normalizeAreaKey(area.label)}:${normalizeAreaKey(trimmed)}`;
  const cached = GEOCODE_CACHE.get(cacheKey);
  if (cached) return cached;

  const apartment = findApartment(trimmed);
  if (apartment) {
    const result: GeocodeResult = {
      latitude: apartment.latitude,
      longitude: apartment.longitude,
      displayName: `${apartment.name} — ${apartment.address}`,
      source: "local",
    };
    GEOCODE_CACHE.set(cacheKey, result);
    return result;
  }

  const localArea = localAreaLookup(trimmed);
  if (localArea) {
    const result: GeocodeResult = {
      latitude: localArea.latitude,
      longitude: localArea.longitude,
      displayName: localArea.label,
      source: "area",
    };
    GEOCODE_CACHE.set(cacheKey, result);
    return result;
  }

  const remote = await nominatimSearch(trimmed, area, options, true);
  if (remote) {
    GEOCODE_CACHE.set(cacheKey, remote);
    return remote;
  }

  if (!options.fetcher && !trimmed.toLowerCase().includes(area.label.toLowerCase())) {
    const remoteWithArea = await nominatimSearch(`${trimmed}, ${area.label}`, area, options, false);
    if (remoteWithArea) {
      GEOCODE_CACHE.set(cacheKey, remoteWithArea);
      return remoteWithArea;
    }
  }

  const jittered = jitterAround(area, trimmed);
  const result: GeocodeResult = {
    ...jittered,
    displayName: trimmed,
    source: "fallback",
  };
  GEOCODE_CACHE.set(cacheKey, result);
  return result;
}

export const geocodeArea = resolveArea;

export function clearGeocodeCacheForTests(): void {
  GEOCODE_CACHE.clear();
  lastNominatimRequest = 0;
}
