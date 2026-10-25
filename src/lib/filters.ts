import {
  DIETARY_PREFERENCES,
  GENDER_PREFERENCES,
  LISTING_TYPES,
  emptyFilters,
  type AmenityFilterKey,
  type DietaryPreference,
  type GenderPreference,
  type ListingFilters,
  type ListingType,
} from "@/lib/types";

const AMENITY_PARAMS: Record<string, AmenityFilterKey> = {
  pool: "pool",
  gym: "gym",
  studyroom: "study_room",
  study_room: "study_room",
  laundry: "in_unit_laundry",
  inunitlaundry: "in_unit_laundry",
  in_unit_laundry: "in_unit_laundry",
  parking: "parking",
  furnished: "furnished",
  privatebath: "private_bath",
  private_bath: "private_bath",
};

function asRecord(
  input: URLSearchParams | Record<string, string | string[] | undefined>
): Record<string, string | undefined> {
  if (input instanceof URLSearchParams) {
    const result: Record<string, string | undefined> = {};
    input.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(input)) {
    result[key] = Array.isArray(value) ? value[0] : value;
  }
  return result;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "no";
}

export function parseFilters(
  input: URLSearchParams | Record<string, string | string[] | undefined>
): ListingFilters {
  const params = asRecord(input);
  const filters = emptyFilters();

  filters.maxRent = parseNumber(params.maxRent ?? params.max_rent);
  filters.includeUnspecified =
    params.includeUnspecified === undefined &&
    params.include_unspecified === undefined
      ? true
      : isTruthy(params.includeUnspecified ?? params.include_unspecified);

  const gender = (params.gender ?? "").toLowerCase();
  filters.gender = (GENDER_PREFERENCES as readonly string[]).includes(gender)
    ? (gender as GenderPreference)
    : null;

  const diet = (params.diet ?? "").toLowerCase().replace(/[- ]/g, "_");
  filters.diet = (DIETARY_PREFERENCES as readonly string[]).includes(diet)
    ? (diet as DietaryPreference)
    : null;

  const listingType = (params.type ?? params.listingType ?? "").toLowerCase();
  filters.listingType = (LISTING_TYPES as readonly string[]).includes(listingType)
    ? (listingType as ListingType)
    : null;

  for (const [param, key] of Object.entries(AMENITY_PARAMS)) {
    const value = params[param] ?? params[param.toLowerCase()] ?? params[param.replace(/_/g, "").toLowerCase()];
    if (value !== undefined && isTruthy(value)) {
      filters.amenities[key] = true;
      continue;
    }
  }
  // Also check camelCase variants
  if (isTruthy(params.privateBath) || isTruthy(params.privatebath)) {
    filters.amenities.private_bath = true;
  }
  if (isTruthy(params.studyRoom) || isTruthy(params.studyroom)) {
    filters.amenities.study_room = true;
  }
  if (isTruthy(params.inUnitLaundry) || isTruthy(params.inunitlaundry)) {
    filters.amenities.in_unit_laundry = true;
  }

  return filters;
}

export function filtersToSearchParams(filters: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.maxRent !== null) params.set("maxRent", String(filters.maxRent));
  if (filters.gender !== null) params.set("gender", filters.gender);
  if (filters.diet !== null) params.set("diet", filters.diet);
  if (filters.listingType !== null) params.set("type", filters.listingType);
  if (!filters.includeUnspecified) params.set("includeUnspecified", "false");

  const paramByAmenity: Record<AmenityFilterKey, string> = {
    pool: "pool",
    gym: "gym",
    study_room: "studyRoom",
    in_unit_laundry: "laundry",
    parking: "parking",
    furnished: "furnished",
    private_bath: "privateBath",
  };

  for (const [key, enabled] of Object.entries(filters.amenities)) {
    if (enabled) {
      params.set(paramByAmenity[key as AmenityFilterKey], "true");
    }
  }

  return params;
}

export function hasActiveFilters(filters: ListingFilters): boolean {
  return (
    filters.maxRent !== null ||
    filters.gender !== null ||
    filters.diet !== null ||
    filters.listingType !== null ||
    !filters.includeUnspecified ||
    Object.values(filters.amenities).some(Boolean)
  );
}
