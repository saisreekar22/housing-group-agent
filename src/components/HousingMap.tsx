"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from "react-leaflet";
import type { Listing, MapCenter } from "@/lib/types";

interface HousingMapProps {
  listings: Listing[];
  center: MapCenter;
  selectedId: string | null;
  onSelect: (listing: Listing) => void;
}

interface ListingCluster {
  key: string;
  latitude: number;
  longitude: number;
  listings: Listing[];
}

function FlyToCenter({ center }: { center: MapCenter }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.latitude, center.longitude], 14, { duration: 1.15 });
  }, [center.latitude, center.longitude, map]);

  return null;
}

function priceIcon(label: string, variant: "single" | "cluster"): L.DivIcon {
  const html = `<span class="${variant === "single" ? "price-pill" : "cluster-pill"}">${label}</span>`;
  return L.divIcon({
    html,
    className: "housing-marker-icon",
    iconSize: [variant === "single" ? 70 : 86, 34],
    iconAnchor: [variant === "single" ? 35 : 43, 30],
    popupAnchor: [0, -26],
  });
}

export default function HousingMap({
  listings,
  center,
  selectedId,
  onSelect,
}: HousingMapProps) {
  const clusters = useMemo(() => {
    const grouped = new Map<string, ListingCluster>();

    for (const listing of listings) {
      const key = `${listing.latitude.toFixed(4)}:${listing.longitude.toFixed(4)}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.listings.push(listing);
      } else {
        grouped.set(key, {
          key,
          latitude: listing.latitude,
          longitude: listing.longitude,
          listings: [listing],
        });
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.listings.length - a.listings.length
    );
  }, [listings]);

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={13}
      zoomControl={false}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
        detectRetina
      />
      <FlyToCenter center={center} />
      <ZoomControl position="bottomleft" />

      {clusters.map((cluster) => {
        if (cluster.listings.length === 1) {
          const listing = cluster.listings[0];
          const label =
            listing.rent_monthly !== null ? `$${listing.rent_monthly}` : "View";
          return (
            <Marker
              key={cluster.key}
              position={[cluster.latitude, cluster.longitude]}
              icon={priceIcon(label, "single")}
              zIndexOffset={listing.id === selectedId ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(listing) }}
            />
          );
        }

        return (
          <Marker
            key={cluster.key}
            position={[cluster.latitude, cluster.longitude]}
            icon={priceIcon(`${cluster.listings.length} units`, "cluster")}
            zIndexOffset={cluster.listings.some((item) => item.id === selectedId) ? 900 : 0}
          >
            <Popup>
              <div className="bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">
                    {cluster.listings[0].location_text ?? "Apartment cluster"}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    {cluster.listings.length} matching units at this location
                  </p>
                </div>
                <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                  {cluster.listings.map((listing) => (
                    <button
                      key={listing.id}
                      type="button"
                      onClick={() => onSelect(listing)}
                      className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-900">
                          {listing.summary ?? "Housing listing"}
                        </span>
                        <span className="mt-0.5 block text-[11px] capitalize text-slate-500">
                          {listing.listing_type?.replace(/_/g, " ") ?? "sublease"}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">
                        {listing.rent_monthly !== null ? `$${listing.rent_monthly}` : "View"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
