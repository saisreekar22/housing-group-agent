"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import FilterBar from "@/components/FilterBar";
import ListingBottomSheet from "@/components/ListingBottomSheet";
import WhatsAppSetupDrawer from "@/components/WhatsAppSetupDrawer";
import { filtersToSearchParams, parseFilters } from "@/lib/filters";
import {
  emptyFilters,
  type Listing,
  type ListingFilters,
  type MapCenter,
  type WhatsAppStatus,
} from "@/lib/types";

const HousingMap = dynamic(() => import("@/components/HousingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#e7ebef]">
      <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow">
        Loading map…
      </div>
    </div>
  ),
});

const DEFAULT_CENTER: MapCenter = {
  latitude: 33.4242,
  longitude: -111.9281,
  label: "Tempe, AZ 85281",
};

export default function MapApp() {
  const [filters, setFilters] = useState<ListingFilters>(() => emptyFilters());
  const [ready, setReady] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "fallback" | null>(null);
  const [center, setCenter] = useState<MapCenter>(DEFAULT_CENTER);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [whatsappChecked, setWhatsappChecked] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const storedDemoMode = window.localStorage.getItem("housing-group-agent-demo") === "true";
    if (storedDemoMode) setDemoMode(true);

    let cancelled = false;
    const readStatus = () => fetch("/api/whatsapp/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to read WhatsApp status");
        return (await response.json()) as WhatsAppStatus;
      })
      .then((status) => {
        if (cancelled) return;
        setWhatsappStatus(status);
        if (!status.connected && !storedDemoMode) setSetupOpen(true);
      })
      .catch(() => {
        if (!cancelled) setWhatsappStatus(null);
      })
      .finally(() => {
        if (!cancelled) setWhatsappChecked(true);
      });

    void readStatus();
    const interval = window.setInterval(() => {
      if (!demoMode && !whatsappStatus?.connected) void readStatus();
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [demoMode, whatsappStatus?.connected]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(parseFilters(params));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !whatsappChecked || (!demoMode && !whatsappStatus?.connected)) return;
    const controller = new AbortController();
    const query = filtersToSearchParams(filters).toString();
    setLoading(true);

    fetch(`/api/listings${query ? `?${query}` : ""}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load listings");
        return (await response.json()) as {
          listings: Listing[];
          source: "supabase" | "fallback";
        };
      })
      .then((data) => {
        setListings(data.listings);
        setSource(data.source);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setListings([]);
        setSource("fallback");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [demoMode, filters, ready, refreshKey, whatsappChecked, whatsappStatus?.connected]);

  useEffect(() => {
    if (!ready) return;
    const query = filtersToSearchParams(filters).toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );
  }, [filters, ready]);

  const handleSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setCenter(DEFAULT_CENTER);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      if (!response.ok) throw new Error("Unable to find that area");
      const result = (await response.json()) as {
        latitude: number;
        longitude: number;
        displayName: string;
      };
      setCenter({
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.displayName,
      });
    } catch {
      setSearchError("Could not find that area. Try a zip code or city name.");
    } finally {
      setSearching(false);
    }
  }, []);

  const appUnlocked = demoMode || whatsappStatus?.connected === true;

  if (!whatsappChecked || !appUnlocked) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#f4f5f7] px-5 py-10">
        <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/70">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#25D366]/15 text-[#128c4a]">
            <span className="text-lg font-black">WA</span>
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-[#128c4a]">
            Housing Group Agent
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Link WhatsApp to see your groups
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Listings come from the WhatsApp groups you choose or from a chat export you upload.
            Nothing is shown from demo data until you explicitly enable it.
          </p>
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              disabled={!whatsappChecked}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
            >
              Link WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem("housing-group-agent-demo", "true");
                setDemoMode(true);
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              Use demo listings instead
            </button>
          </div>
          <p className="mt-4 text-center text-[11px] font-medium text-slate-400">
            Demo listings are fictional ASU Tempe examples for testing the interface.
          </p>
        </section>
        <WhatsAppSetupDrawer
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          onImported={() => {
            setDemoMode(true);
            setSetupOpen(false);
            setRefreshKey((key) => key + 1);
          }}
        />
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-canvas">
      <HousingMap
        listings={listings}
        center={center}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onOpenSetup={() => setSetupOpen(true)}
        resultCount={listings.length}
        areaLabel={center.label}
        source={source}
        loading={loading}
        searching={searching}
        searchError={searchError}
      />

      {listings.length === 0 && !loading && (
        <div className="pointer-events-none absolute inset-x-4 top-1/2 z-[500] -translate-y-1/2">
          <div className="mx-auto max-w-sm rounded-2xl bg-white/95 p-5 text-center shadow-xl backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">No listings match these filters</p>
            <p className="mt-1 text-xs text-slate-500">
              Try widening your rent range or turning on &ldquo;Include unspecified&rdquo;.
            </p>
          </div>
        </div>
      )}

      <ListingBottomSheet listing={selected} onClose={() => setSelected(null)} />
        <WhatsAppSetupDrawer
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
        onImported={() => { setSetupOpen(false); setRefreshKey((key) => key + 1); }}
      />
    </main>
  );
}
