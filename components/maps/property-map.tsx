"use client";

import type { Listing } from "@/lib/types";

type PropertyMapProps = {
  listings: Listing[];
  height?: number;
};

export function PropertyMap({ listings, height = 360 }: PropertyMapProps) {
  const primary = listings.find((listing) => listing.latitude && listing.longitude) ?? listings[0];
  const lat = primary?.latitude ?? -17.8292;
  const lng = primary?.longitude ?? 31.0522;
  const delta = 0.08;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="relative w-full" style={{ height }}>
      <iframe
        title={`Map showing properties near ${primary?.suburb ?? "Zimbabwe"}`}
        src={src}
        className="h-full w-full border-0"
        loading="lazy"
      />
      <div className="absolute bottom-3 left-3 rounded-md bg-white/95 px-3 py-2 text-xs shadow-sm dark:bg-slate-900/95">
        {listings.length} properties on map - OpenStreetMap
      </div>
    </div>
  );
}
