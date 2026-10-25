"use client";

import {
  Bath,
  BookOpen,
  Car,
  Check,
  Dumbbell,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  Shirt,
  SlidersHorizontal,
  Sofa,
  Waves,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { hasActiveFilters } from "@/lib/filters";
import type {
  AmenityFilterKey,
  DietaryPreference,
  GenderPreference,
  ListingFilters,
  ListingType,
} from "@/lib/types";

interface FilterBarProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  onSearch: (query: string) => void;
  onOpenSetup: () => void;
  resultCount: number;
  areaLabel: string;
  source: "supabase" | "fallback" | null;
  loading: boolean;
  searching: boolean;
  searchError: string | null;
}

const GENDER_OPTIONS: Array<{ value: GenderPreference; label: string }> = [
  { value: null, label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "mixed", label: "Mixed" },
];

const DIET_OPTIONS: Array<{ value: DietaryPreference; label: string }> = [
  { value: null, label: "Any" },
  { value: "veg", label: "Veg" },
  { value: "vegan", label: "Vegan" },
  { value: "non_veg", label: "Non-veg" },
];

const TYPE_OPTIONS: Array<{ value: ListingType | null; label: string }> = [
  { value: null, label: "Any" },
  { value: "sublease", label: "Sublease" },
  { value: "lease_transfer", label: "Lease takeover" },
  { value: "roommate_needed", label: "Roommate" },
];

const AMENITY_OPTIONS: Array<{
  key: AmenityFilterKey;
  label: string;
  icon: typeof Waves;
}> = [
  { key: "pool", label: "Pool", icon: Waves },
  { key: "gym", label: "Gym", icon: Dumbbell },
  { key: "study_room", label: "Study room", icon: BookOpen },
  { key: "in_unit_laundry", label: "Laundry", icon: Shirt },
  { key: "parking", label: "Parking", icon: Car },
  { key: "furnished", label: "Furnished", icon: Sofa },
  { key: "private_bath", label: "Private bath", icon: Bath },
];

const TYPE_LABELS: Record<string, string> = {
  sublease: "Sublease",
  lease_transfer: "Lease takeover",
  roommate_needed: "Roommate",
};

const DIET_LABELS: Record<string, string> = {
  veg: "Veg",
  vegan: "Vegan",
  non_veg: "Non-veg",
};

function countActiveFilters(filters: ListingFilters): number {
  let count = 0;
  if (filters.maxRent !== null) count += 1;
  if (filters.gender !== null) count += 1;
  if (filters.diet !== null) count += 1;
  if (filters.listingType !== null) count += 1;
  if (!filters.includeUnspecified) count += 1;
  count += Object.values(filters.amenities).filter(Boolean).length;
  return count;
}

export default function FilterBar({
  filters,
  onChange,
  onSearch,
  onOpenSetup,
  resultCount,
  areaLabel,
  source,
  loading,
  searching,
  searchError,
}: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  function update(partial: Partial<ListingFilters>) {
    onChange({ ...filters, ...partial });
  }

  function toggleAmenity(key: AmenityFilterKey) {
    const amenities = { ...filters.amenities };
    if (amenities[key]) {
      delete amenities[key];
    } else {
      amenities[key] = true;
    }
    update({ amenities });
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    onSearch(query);
  }

  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (filters.maxRent !== null) {
    chips.push({
      key: "rent",
      label: `Under $${filters.maxRent}`,
      clear: () => update({ maxRent: null }),
    });
  }
  if (filters.gender !== null) {
    chips.push({
      key: "gender",
      label: `${filters.gender[0].toUpperCase()}${filters.gender.slice(1)}`,
      clear: () => update({ gender: null }),
    });
  }
  if (filters.diet !== null) {
    chips.push({
      key: "diet",
      label: DIET_LABELS[filters.diet] ?? filters.diet,
      clear: () => update({ diet: null }),
    });
  }
  if (filters.listingType !== null) {
    chips.push({
      key: "type",
      label: TYPE_LABELS[filters.listingType] ?? filters.listingType,
      clear: () => update({ listingType: null }),
    });
  }
  for (const amenity of AMENITY_OPTIONS) {
    if (filters.amenities[amenity.key]) {
      chips.push({
        key: amenity.key,
        label: amenity.label,
        clear: () => toggleAmenity(amenity.key),
      });
    }
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[700] px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="pointer-events-auto mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 py-2 pl-2 pr-3.5 shadow-lg shadow-slate-900/10 backdrop-blur">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C4A] text-white shadow-sm">
                <Home size={18} strokeWidth={2.5} />
              </span>
              <span>
                <span className="block text-sm font-extrabold leading-none tracking-tight text-slate-900">
                  CampusNest
                </span>
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  ASU Tempe housing
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenSetup}
              className="flex items-center gap-1.5 rounded-2xl bg-[#25D366] px-3.5 py-3 text-xs font-bold text-[#073b1d] shadow-lg shadow-emerald-900/15 transition hover:bg-[#1fbe5b] active:scale-[0.98]"
            >
              <MessageCircle size={16} strokeWidth={2.6} />
              <span className="hidden sm:inline">Connect WhatsApp</span>
              <span className="sm:hidden">Connect</span>
            </button>
          </div>

          <form
            onSubmit={submitSearch}
            className="mt-2 flex items-center gap-2 rounded-2xl bg-white/95 p-1.5 pl-3 shadow-lg shadow-slate-900/10 backdrop-blur"
          >
            <MapPin size={17} className="shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search zip code or city — try 85281 or Tempe"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              aria-label="Search zip code or city"
            />
            <button
              type="submit"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 active:scale-95"
              aria-label="Search area"
            >
              {searching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} strokeWidth={2.6} />
              )}
            </button>
          </form>

          {searchError && (
            <p className="mt-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700 shadow">
              {searchError}
            </p>
          )}

          <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold shadow transition ${
                activeCount > 0
                  ? "bg-emerald-600 text-white"
                  : "bg-white/95 text-slate-700 hover:bg-white"
              }`}
            >
              <SlidersHorizontal size={14} strokeWidth={2.6} />
              Filters
              {activeCount > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-white px-1 text-[10px] font-extrabold text-emerald-700">
                  {activeCount}
                </span>
              )}
            </button>

            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                className="flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow transition hover:bg-white"
              >
                {chip.label}
                <X size={12} strokeWidth={3} className="text-slate-400" />
              </button>
            ))}

            <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2.5 py-2 text-[10px] font-semibold text-slate-500 shadow backdrop-blur">
              {loading ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
              {resultCount} {resultCount === 1 ? "home" : "homes"} ·{" "}
              {source === "supabase" ? "live" : "demo"}
            </span>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-[900] flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] sm:items-center"
          onClick={() => setDrawerOpen(false)}
          role="presentation"
        >
          <div
            className="animate-sheet-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl safe-bottom sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Housing filters"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Filters</h2>
                <p className="text-xs text-slate-500">
                  {areaLabel} · {resultCount} matching {resultCount === 1 ? "home" : "homes"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters(filters) && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        maxRent: null,
                        gender: null,
                        includeUnspecified: true,
                        diet: null,
                        listingType: null,
                        amenities: {},
                      })
                    }
                    className="text-xs font-bold text-emerald-700"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600"
                  aria-label="Close filters"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-6">
              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Max rent
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-900">
                    {filters.maxRent !== null ? `$${filters.maxRent}/mo` : "Any"}
                  </span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={2000}
                  step={25}
                  value={filters.maxRent ?? 2000}
                  onChange={(event) => update({ maxRent: Number(event.target.value) })}
                  className="mt-3 w-full accent-emerald-600"
                  aria-label="Maximum monthly rent"
                />
                <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
                  <span>$400</span>
                  <button
                    type="button"
                    onClick={() => update({ maxRent: null })}
                    className="font-bold text-emerald-700"
                  >
                    Any rent
                  </button>
                  <span>$2,000+</span>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Gender preference
                </h3>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {GENDER_OPTIONS.map((option) => {
                    const active = filters.gender === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => update({ gender: option.value })}
                        className={`rounded-xl px-2 py-2.5 text-xs font-bold transition ${
                          active
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-3 flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                  <input
                    type="checkbox"
                    checked={filters.includeUnspecified}
                    onChange={(event) => update({ includeUnspecified: event.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded accent-emerald-600"
                  />
                  <span>
                    <span className="block text-xs font-bold text-slate-800">
                      Include unspecified
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Show listings that did not mention a gender preference.
                    </span>
                  </span>
                </label>
              </section>

              <section>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Dietary preference
                </h3>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {DIET_OPTIONS.map((option) => {
                    const active = filters.diet === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => update({ diet: option.value })}
                        className={`rounded-xl px-1 py-2.5 text-xs font-bold transition ${
                          active
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Listing type
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TYPE_OPTIONS.map((option) => {
                    const active = filters.listingType === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => update({ listingType: option.value })}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                          active
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Amenities
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {AMENITY_OPTIONS.map((option) => {
                    const active = Boolean(filters.amenities[option.key]);
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggleAmenity(option.key)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                          active
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Icon size={15} />
                        <span className="flex-1">{option.label}</span>
                        {active && <Check size={13} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-6 w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              Show {resultCount} {resultCount === 1 ? "home" : "homes"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
