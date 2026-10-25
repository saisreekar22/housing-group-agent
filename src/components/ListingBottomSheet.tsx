"use client";

import {
  Bath,
  BedDouble,
  BookOpen,
  CalendarDays,
  Car,
  Dumbbell,
  MapPin,
  MessageCircle,
  Shirt,
  Sofa,
  Users,
  Utensils,
  Waves,
  X,
} from "lucide-react";
import { useEffect } from "react";
import type { AmenityKey, Listing } from "@/lib/types";

interface ListingBottomSheetProps {
  listing: Listing | null;
  onClose: () => void;
}

const AMENITY_LABELS: Record<AmenityKey, string> = {
  pool: "Pool",
  gym: "Gym",
  study_room: "Study room",
  in_unit_laundry: "In-unit laundry",
  parking: "Parking",
  furnished: "Furnished",
};

const AMENITY_ICONS: Record<AmenityKey, typeof Waves> = {
  pool: Waves,
  gym: Dumbbell,
  study_room: BookOpen,
  in_unit_laundry: Shirt,
  parking: Car,
  furnished: Sofa,
};

function formatDate(value: string | null): string {
  if (!value) return "Flexible";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function relativePosted(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Recently posted";
  const days = Math.max(0, Math.round((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  return `Posted ${days} days ago`;
}

export default function ListingBottomSheet({ listing, onClose }: ListingBottomSheetProps) {
  useEffect(() => {
    if (!listing) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [listing]);

  if (!listing) return null;

  const phone = listing.contact_phone?.replace(/\D/g, "") ?? "";
  const inquiry = encodeURIComponent(
    `Hi, I saw your housing post${
      listing.location_text ? ` at ${listing.location_text}` : ""
    } on CampusNest. Is it still available?`
  );
  const waHref = phone ? `https://wa.me/${phone}?text=${inquiry}` : null;
  const amenityEntries = (Object.keys(AMENITY_LABELS) as AmenityKey[]).filter(
    (key) => listing.amenities[key] === true
  );
  const typeLabel = listing.listing_type?.replace(/_/g, " ") ?? "housing";

  return (
    <>
      <div
        className="animate-fade-in fixed inset-0 z-[800] bg-slate-950/35 backdrop-blur-[1px]"
        onClick={onClose}
        role="presentation"
      />

      <section
        className="animate-sheet-up fixed inset-x-0 bottom-0 z-[810] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl safe-bottom sm:bottom-4 sm:left-1/2 sm:w-[min(92vw,520px)] sm:-translate-x-1/2 sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label="Listing details"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-4 pb-2 pt-2.5 backdrop-blur">
          <span className="mx-auto h-1.5 w-11 rounded-full bg-slate-200" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="Close listing details"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <MapPin size={13} />
                <span className="truncate">{listing.location_text ?? "Tempe, AZ"}</span>
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  {listing.rent_monthly !== null ? `$${listing.rent_monthly}` : "Rent N/A"}
                </span>
                {listing.rent_monthly !== null && (
                  <span className="text-sm font-semibold text-slate-400">/month</span>
                )}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold capitalize text-blue-700">
              {typeLabel}
            </span>
          </div>

          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">
            {listing.summary ?? listing.source_message.slice(0, 180)}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {listing.gender_preference && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-700">
                <Users size={12} />
                {listing.gender_preference}
              </span>
            )}
            {listing.dietary_preference && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold capitalize text-emerald-700">
                <Utensils size={12} />
                {listing.dietary_preference.replace(/_/g, " ")}
              </span>
            )}
            {listing.private_room === true && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                <BedDouble size={12} />
                Private room
              </span>
            )}
            {listing.private_bath === true && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                <Bath size={12} />
                Private bath
              </span>
            )}
            {listing.utilities_included === true && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                Utilities included
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                <CalendarDays size={11} />
                Move in
              </p>
              <p className="mt-1 text-xs font-bold text-slate-800">
                {formatDate(listing.move_in_date)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                <CalendarDays size={11} />
                Move out
              </p>
              <p className="mt-1 text-xs font-bold text-slate-800">
                {formatDate(listing.move_out_date)}
              </p>
            </div>
          </div>

          {amenityEntries.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                Amenities
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {amenityEntries.map((key) => {
                  const Icon = AMENITY_ICONS[key];
                  return (
                    <span
                      key={key}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                    >
                      <Icon size={13} className="text-slate-400" />
                      {AMENITY_LABELS[key]}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <details className="group mt-4 rounded-2xl border border-slate-200">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-xs font-extrabold text-slate-700">
              Original WhatsApp message
              <span className="text-[10px] font-semibold text-slate-400 group-open:hidden">
                Tap to expand
              </span>
            </summary>
            <div className="border-t border-slate-100 px-3.5 py-3">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                {listing.source_message}
              </p>
              <p className="mt-2 border-t border-dashed border-slate-100 pt-2 text-[10px] font-medium text-slate-400">
                {listing.group_name ? `${listing.group_name} · ` : ""}
                {relativePosted(listing.posted_at)}
              </p>
            </div>
          </details>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium text-slate-400">
              {relativePosted(listing.posted_at)}
              {listing.sender_name ? ` · ${listing.sender_name}` : ""}
            </p>
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-xs font-extrabold text-[#073b1d] shadow-lg shadow-emerald-900/10 transition hover:bg-[#1fbe5b] active:scale-[0.98]"
              >
                <MessageCircle size={16} strokeWidth={2.6} />
                Message on WhatsApp
              </a>
            ) : (
              <span className="rounded-2xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-400">
                No contact number
              </span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
