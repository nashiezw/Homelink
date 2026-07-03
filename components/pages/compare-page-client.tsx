"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import type { Listing } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const rows = ["Price", "Location", "Occupancy", "Bedrooms", "Bathrooms", "Amenities", "CBD distance"];

export function ComparePageClient() {
  const { compareIds } = useApp();
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    void (async () => {
      const results = await Promise.all(
        compareIds.map((id) => apiFetch<Listing>(`/api/v1/listings/${id}`)),
      );
      setListings(results.map((result) => result.data).filter(Boolean) as Listing[]);
    })();
  }, [compareIds]);

  return (
    <PageShell
      eyebrow="Compare"
      title="Compare shortlisted properties"
      description="Understand trade-offs across price, location, amenities, and trust signals."
    >
      {listings.length === 0 ? (
        <div className="premium-card rounded-lg border-dashed p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <Scale className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-lg font-semibold text-ink dark:text-white">Build a property comparison</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Add up to 3 listings from search or property pages to compare price, location, and trust signals.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="surface-panel overflow-hidden rounded-lg">
            <div className="grid min-w-[760px] grid-cols-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
              <div className="p-4 font-semibold">
                <Scale className="mb-2 size-5 text-emerald-700" aria-hidden="true" />
                Criteria
              </div>
              {listings.map((listing) => (
                <div key={listing.id} className="border-l border-slate-200 p-4 dark:border-slate-700">
                  <p className="font-semibold">{listing.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{listing.suburb}, {listing.city}</p>
                </div>
              ))}
            </div>
            {rows.map((row) => (
              <div key={row} className="grid min-w-[760px] grid-cols-4 border-b border-slate-200 last:border-b-0 dark:border-slate-700">
                <div className="bg-slate-50 p-4 text-sm font-semibold dark:bg-slate-800">{row}</div>
                {listings.map((listing) => (
                  <div key={`${listing.id}-${row}`} className="border-l border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    {valueFor(row, listing)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function valueFor(row: string, listing: Listing) {
  switch (row) {
    case "Price":
      return formatPrice(listing.price);
    case "Location":
      return `${listing.suburb}, ${listing.city}`;
    case "Occupancy":
      return listing.type === "room" ? `Up to ${listing.tenantPreferences?.maxOccupants ?? 1}` : "Whole property";
    case "Bedrooms":
      return ["room", "land", "commercial"].includes(listing.type) ? "Not applicable" : String(listing.bedrooms);
    case "Bathrooms":
      return ["room", "land"].includes(listing.type) ? "Not applicable" : String(listing.bathrooms);
    case "Amenities":
      return listing.amenities.join(", ");
    case "CBD distance":
      return `${listing.distanceToCbdKm} km`;
    default:
      return "";
  }
}
