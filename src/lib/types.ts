export const LISTING_TYPES = [
  "sublease",
  "lease_transfer",
  "roommate_needed",
  "looking_for_place",
] as const;

export type ListingType = (typeof LISTING_TYPES)[number];

export const GENDER_PREFERENCES = ["male", "female", "mixed"] as const;
export type GenderPreference = (typeof GENDER_PREFERENCES)[number] | null;

export const DIETARY_PREFERENCES = ["veg", "non_veg", "vegan"] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number] | null;

export const AMENITY_KEYS = [
  "pool",
  "gym",
  "study_room",
  "in_unit_laundry",
  "parking",
  "furnished",
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

export type Amenities = Record<AmenityKey, boolean | null>;

export interface ExtractedListing {
  is_housing_post: boolean;
  listing_type: ListingType | null;
  rent_monthly: number | null;
  utilities_included: boolean | null;
  gender_preference: GenderPreference;
  dietary_preference: DietaryPreference;
  location_text: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  private_room: boolean | null;
  private_bath: boolean | null;
  amenities: Amenities;
  contact_phone: string | null;
  summary: string | null;
}

export interface NewListing extends ExtractedListing {
  sender_phone: string;
  sender_name: string | null;
  group_id: string | null;
  group_name: string | null;
  source_message: string;
  posted_at: string;
  latitude: number;
  longitude: number;
}

export interface Listing extends NewListing {
  id: string;
  normalized_location_text: string;
  created_at?: string;
  updated_at?: string;
}

export type AmenityFilterKey = AmenityKey | "private_bath";

export interface MapCenter {
  latitude: number;
  longitude: number;
  label: string;
}

export interface ListingFilters {
  maxRent: number | null;
  gender: GenderPreference;
  includeUnspecified: boolean;
  diet: DietaryPreference;
  listingType: ListingType | null;
  amenities: Partial<Record<AmenityFilterKey, boolean>>;
}

export interface WhatsAppGroup {
  id: string;
  subject: string;
  size: number;
}

export type WhatsAppConnectionStatus =
  | "disconnected"
  | "connecting"
  | "qr"
  | "pairing"
  | "connected"
  | "error";

export interface WhatsAppStatus {
  status: WhatsAppConnectionStatus;
  connected: boolean;
  qr: string | null;
  pairingCode: string | null;
  error: string | null;
  groups: WhatsAppGroup[];
  trackedGroupIds: string[];
  phoneNumber: string | null;
  connectedAt: string | null;
}

export function emptyAmenities(): Amenities {
  return {
    pool: null,
    gym: null,
    study_room: null,
    in_unit_laundry: null,
    parking: null,
    furnished: null,
  };
}

export function emptyFilters(): ListingFilters {
  return {
    maxRent: null,
    gender: null,
    includeUnspecified: true,
    diet: null,
    listingType: null,
    amenities: {},
  };
}
