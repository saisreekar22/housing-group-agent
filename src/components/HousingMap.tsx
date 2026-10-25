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

function pinIcon(
  variant: "single" | "cluster",
  selected: boolean,
  count: number
): L.DivIcon {
  const fill = selected
    ? "#059669"
    : variant === "cluster"
      ? "#059669"
      : "#0f172a";
  const label =
    variant === "cluster" && count > 1
      ? `<text x="14" y="18.5" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" font-weight="800" fill="#ffffff">${count}</text>`
      : `<circle cx="14" cy="14" r="4.5" fill="#ffffff" />`;
  const html = `<svg width="30" height="42" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" class="${selected ? "map-pin map-pin-selected" : "map-pin"}"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.7 14 26 14 26s14-16.3 14-26C28 6.3 21.7 0 14 0z" fill="${fill}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" />${label}</svg>`;
  return L.divIcon({
    html,
    className: "housing-marker-icon",
    iconSize: [30, 42],
    iconAnchor: [15, 40],
    popupAnchor: [0, -38],
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
          return (
            <Marker
              key={cluster.key}
              position={[cluster.latitude, cluster.longitude]}
              icon={pinIcon("single", listing.id === selectedId, 1)}
              zIndexOffset={listing.id === selectedId ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(listing) }}
            />
          );
        }

        return (
          <Marker
            key={cluster.key}
            position={[cluster.latitude, cluster.longitude]}
            icon={pinIcon("cluster", cluster.listings.some((item) => item.id === selectedId), cluster.listings.length)}
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
