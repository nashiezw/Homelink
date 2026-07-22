"use client";

import { CircleDollarSign, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { PropertyType } from "@/lib/types";

const quickFilters = [
  "Solar backup",
  "Borehole",
  "Parking",
  "Wi-Fi",
  "Pet friendly",
  "Security",
];

const PROPERTY_TYPES: Array<{ value: "" | PropertyType; label: string }> = [
  { value: "", label: "All" },
  { value: "room", label: "Room" },
  { value: "boarding_house", label: "Boarding house" },
  { value: "house", label: "House" },
  { value: "flat", label: "Apartment" },
  { value: "cottage", label: "Cottage" },
  { value: "holiday_home", label: "Holiday home" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
];

type SearchBarProps = {
  compact?: boolean;
  initialLocation?: string;
  initialIntent?: "rent" | "buy";
};

const fieldShell =
  "grid min-w-0 gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950/60 sm:rounded-md sm:py-2";

export function SearchBar({ compact = false, initialLocation = "", initialIntent = "rent" }: SearchBarProps) {
  const router = useRouter();
  const [location, setLocation] = useState(initialLocation);
  const [minPrice, setMinPrice] = useState("100");
  const [maxPrice, setMaxPrice] = useState("1500");
  const [intent, setIntent] = useState<"rent" | "buy">(initialIntent);
  const [propertyType, setPropertyType] = useState<"" | PropertyType>("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const isHoliday = propertyType === "holiday_home";

  function buildParams() {
    const params = new URLSearchParams();
    if (location.trim()) {
      params.set("location", location.trim());
      const parts = location.split(",").map((part) => part.trim());
      if (parts[0]) params.set("city", parts[0]);
      if (parts[1]) {
        params.set("suburb", parts[1]);
      } else if (parts[0] && !parts[0].match(/harare|bulawayo|gweru|kwekwe|mutare|victoria falls/i)) {
        params.set("suburb", parts[0]);
        params.delete("city");
      }
    }
    if (propertyType) params.set("type", propertyType);
    params.set("intent", isHoliday ? "rent" : intent);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    amenities.forEach((amenity) => params.append("amenities", amenity));
    if (verifiedOnly) params.set("verifiedOnly", "true");
    return params;
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    router.push(`/search?${buildParams().toString()}`);
  }

  function openAdvancedSearch() {
    router.push(`/search?${buildParams().toString()}`);
  }

  function toggleAmenity(label: string) {
    setAmenities((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  function onPropertyTypeChange(value: "" | PropertyType) {
    setPropertyType(value);
    if (value === "holiday_home") {
      setIntent("rent");
      setMaxPrice((current) => (Number(current) > 800 ? "500" : current));
    }
    if (value === "land") {
      setIntent("buy");
    }
  }

  return (
    <form onSubmit={submit} className="surface-panel w-full min-w-0 overflow-hidden rounded-xl p-3 shadow-hero sm:rounded-2xl sm:p-4">
      <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        <label className={`${fieldShell} sm:col-span-2 lg:col-span-1`}>
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Location</span>
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <input
              className="min-w-0 flex-1 bg-transparent text-base text-slate-800 outline-none dark:text-slate-100 sm:text-sm"
              placeholder="City or suburb"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </span>
        </label>

        <label className={fieldShell}>
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {isHoliday ? "Nightly budget (USD)" : "Budget (USD)"}
          </span>
          <div className="flex min-w-0 items-center gap-1.5 text-base text-slate-800 dark:text-slate-100 sm:text-sm">
            <CircleDollarSign className="size-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <input
              className="min-w-0 w-0 flex-1 bg-transparent tabular-nums outline-none"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              inputMode="numeric"
              aria-label="Minimum price"
            />
            <span className="shrink-0 text-slate-400">–</span>
            <input
              className="min-w-0 w-0 flex-1 bg-transparent tabular-nums outline-none"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              inputMode="numeric"
              aria-label="Maximum price"
            />
          </div>
        </label>

        <label className={fieldShell}>
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Property type</span>
          <select
            className="w-full min-w-0 bg-transparent text-base text-slate-800 outline-none dark:text-slate-100 sm:text-sm"
            value={propertyType}
            onChange={(event) => onPropertyTypeChange(event.target.value as "" | PropertyType)}
          >
            {PROPERTY_TYPES.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldShell}>
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Purpose</span>
          <select
            className="w-full bg-transparent text-base text-slate-800 outline-none disabled:opacity-60 dark:text-slate-100 sm:text-sm"
            value={intent}
            disabled={isHoliday || propertyType === "land"}
            onChange={(event) => setIntent(event.target.value as "rent" | "buy")}
          >
            <option value="rent">Rent</option>
            <option value="buy">Buy</option>
          </select>
        </label>
      </div>

      <div className={`mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between ${compact ? "" : ""}`}>
        {!compact ? (
          <div className="-mx-1 flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {quickFilters.map((filter) => (
              <button
                type="button"
                key={filter}
                onClick={() => toggleAmenity(filter)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                  amenities.includes(filter)
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {filter}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                verifiedOnly
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              Verified only
            </button>
            <button
              type="button"
              onClick={openAdvancedSearch}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-ocean hover:border-ocean/40 hover:bg-cyan-50"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              More filters
            </button>
          </div>
        ) : (
          <div className="hidden sm:block sm:flex-1" aria-hidden="true" />
        )}

        <Button type="submit" className="h-12 w-full shrink-0 rounded-lg sm:w-auto sm:min-w-[12.5rem]">
          <Search className="size-4" aria-hidden="true" />
          Search properties
        </Button>
      </div>
    </form>
  );
}
