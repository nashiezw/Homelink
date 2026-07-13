"use client";

import { Map as MapIcon, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ListingCard } from "@/components/listings/listing-card";
import { PropertyMap } from "@/components/maps/property-map";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import {
  affordabilityBudgetParam,
  clearRentalAffordabilityMemory,
  readRentalAffordabilityMemory,
  type RentalAffordabilityMemory,
} from "@/lib/calculators/affordability-memory";
import type { Listing } from "@/lib/types";

const smartFilters = [
  { label: "Verified only", key: "verifiedOnly", value: "true" },
  { label: "Available now", key: "availableNow", value: "true" },
  { label: "Solar", key: "amenities", value: "Solar backup" },
  { label: "Borehole", key: "amenities", value: "Borehole" },
  { label: "Water tank", key: "amenities", value: "Water tank" },
  { label: "Wi-Fi", key: "amenities", value: "Wi-Fi" },
  { label: "Parking", key: "amenities", value: "Parking" },
  { label: "Pet friendly", key: "amenities", value: "Pets allowed" },
  { label: "Furnished", key: "amenities", value: "Furnished" },
  { label: "Security wall", key: "amenities", value: "Security wall" },
  { label: "Garden", key: "amenities", value: "Garden" },
];

const holidayFilters = [
  { label: "Swimming pool", key: "pool" },
  { label: "Wi-Fi", key: "wifi" },
  { label: "Pet friendly", key: "petFriendly" },
];

const propertyTypeLabels: Record<string, { singular: string; plural: string }> = {
  room: { singular: "room", plural: "rooms" },
  flat: { singular: "flat", plural: "flats" },
  house: { singular: "house", plural: "houses" },
  cottage: { singular: "cottage", plural: "cottages" },
  commercial: { singular: "commercial property", plural: "commercial properties" },
  land: { singular: "land listing", plural: "land listings" },
  holiday_home: { singular: "holiday home", plural: "holiday homes" },
};

type MarketLens = {
  headline: string;
  intro: string;
  rows: Array<{ label: string; value: string }>;
};

function money(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function mostCommon(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items.filter(Boolean)) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
}

function compactJoin(items: string[]) {
  return items.filter(Boolean).join(", ");
}

function buildMarketLens(
  listings: Listing[],
  searchParams: URLSearchParams,
  nearby: { cbdDistanceKm: number | null; places: Array<{ type: string; name: string; distanceKm: number }> } | null,
  loading: boolean,
): MarketLens {
  const type = searchParams.get("type") ?? "";
  const label = propertyTypeLabels[type] ?? { singular: "property", plural: "properties" };
  const city = searchParams.get("city")?.trim() ?? "";
  const suburb = searchParams.get("suburb")?.trim() ?? "";
  const maxPrice = Number(searchParams.get("maxPrice") ?? "");
  const location = searchParams.get("location")?.trim() || compactJoin([suburb, city]);
  const scope = location || "your search";

  if (loading) {
    return {
      headline: "Checking current matches",
      intro: "We are reading the live listings that match the client's filters.",
      rows: [{ label: "Search focus", value: `${label.plural}${location ? ` in ${location}` : ""}` }],
    };
  }

  if (!listings.length) {
    const filters = [
      location,
      type ? label.plural : "",
      Number.isFinite(maxPrice) && maxPrice > 0 ? `under ${money(maxPrice)}` : "",
    ].filter(Boolean);
    return {
      headline: `No exact ${label.plural} found`,
      intro: filters.length
        ? `There are no active listings for ${filters.join(" ")}. Widen the area, budget, or amenities to see better options.`
        : "There are no listings matching these filters yet. Widen the search to see more options.",
      rows: [
        { label: "Current focus", value: filters.join(" / ") || "No specific filters" },
        { label: "Next best step", value: "Remove one filter" },
      ],
    };
  }

  const prices = listings.map((listing) => listing.price);
  const topArea = mostCommon(listings.map((listing) => compactJoin([listing.suburb, listing.city]) || listing.city));
  const topAmenity = mostCommon(listings.flatMap((listing) => listing.amenities));
  const verifiedCount = listings.filter((listing) => listing.verified || listing.landlordVerified).length;
  const availableNow = listings.filter((listing) => listing.status === "ACTIVE" && listing.availableFrom.toLowerCase() === "available now").length;
  const nearbyMentions = [...new Set(listings.flatMap((listing) => listing.nearby).filter(Boolean))].slice(0, 3);
  const cbdDistances = listings.map((listing) => listing.distanceToCbdKm).filter((value) => Number.isFinite(value) && value > 0);

  const headline = Number.isFinite(maxPrice) && maxPrice > 0
    ? `${listings.length} ${listings.length === 1 ? label.singular : label.plural} under ${money(maxPrice)}`
    : `${listings.length} ${listings.length === 1 ? label.singular : label.plural} match ${scope}`;

  const rows: MarketLens["rows"] = [
    { label: "Best matching area", value: topArea ? `${topArea[0]} (${topArea[1]})` : scope },
    { label: "Typical price", value: money(median(prices)) },
    { label: "Lowest match", value: money(Math.min(...prices)) },
    { label: "Verified options", value: `${verifiedCount}/${listings.length}` },
  ];

  if (availableNow) rows.push({ label: "Available now", value: String(availableNow) });
  if (topAmenity) rows.push({ label: "Common feature", value: topAmenity[0] });
  if (nearby?.cbdDistanceKm !== null && nearby?.cbdDistanceKm !== undefined) rows.push({ label: "CBD distance", value: `${nearby.cbdDistanceKm} km` });
  else if (cbdDistances.length) rows.push({ label: "Median CBD distance", value: `${median(cbdDistances).toFixed(1)} km` });
  if (nearbyMentions.length) rows.push({ label: "Nearby mentioned", value: nearbyMentions.join(", ") });

  return {
    headline,
    intro: `This summary is based only on the ${listings.length} listing${listings.length === 1 ? "" : "s"} currently matching the client's filters${location ? ` in ${location}` : ""}.`,
    rows: rows.slice(0, 7),
  };
}

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useApp();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [calculatorBudget, setCalculatorBudget] = useState<RentalAffordabilityMemory | null>(null);
  const [nearby, setNearby] = useState<{
    cbdDistanceKm: number | null;
    places: Array<{ type: string; name: string; distanceKm: number }>;
  } | null>(null);

  const queryString = searchParams.toString();
  const intent = searchParams.get("intent");
  const usesRentalBudgetMemory = intent !== "buy";
  const rememberedBudget = usesRentalBudgetMemory ? affordabilityBudgetParam(calculatorBudget) : "";
  const displayedBudget = searchParams.get("maxPrice") ?? rememberedBudget ?? (intent === "buy" ? "" : "1500");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const result = await apiFetch<Listing[]>(`/api/v1/listings?${queryString}`);
      setListings(result.data ?? []);
      setLoading(false);

      const city = searchParams.get("city");
      const suburb = searchParams.get("suburb");
      if (city && suburb) {
        const mapResult = await apiFetch<{
          cbdDistanceKm: number | null;
          places: Array<{ type: string; name: string; distanceKm: number }>;
        }>(`/api/v1/maps/nearby?city=${encodeURIComponent(city)}&suburb=${encodeURIComponent(suburb)}`);
        setNearby(mapResult.data ?? null);
      } else {
        setNearby(null);
      }
    })();
  }, [queryString, searchParams]);

  useEffect(() => {
    const memory = readRentalAffordabilityMemory();
    setCalculatorBudget(memory);
    const memoryBudget = affordabilityBudgetParam(memory);
    if (
      searchParams.get("intent") === "buy" &&
      (searchParams.get("calculatorBudget") || (memoryBudget && searchParams.get("maxPrice") === memoryBudget))
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("calculatorBudget");
      params.delete("maxPrice");
      router.replace(`/search?${params.toString()}`);
      return;
    }
    if (!memory || searchParams.get("maxPrice") || searchParams.get("intent") === "buy") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("maxPrice", affordabilityBudgetParam(memory));
    if (!params.get("intent")) params.set("intent", "rent");
    params.set("calculatorBudget", "memory");
    router.replace(`/search?${params.toString()}`);
  }, [queryString, router, searchParams]);

  function clearCalculatorBudget() {
    clearRentalAffordabilityMemory();
    setCalculatorBudget(null);
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("calculatorBudget")) {
      params.delete("calculatorBudget");
      params.delete("maxPrice");
      router.replace(`/search?${params.toString()}`);
    }
  }

  const activeFilters = useMemo(() => smartFilters.filter((filter) => {
    if (filter.key === "amenities") {
      return searchParams.getAll("amenities").includes(filter.value);
    }
    return searchParams.get(filter.key) === filter.value;
  }), [searchParams]);

  const marketLens = useMemo(
    () => buildMarketLens(listings, searchParams, nearby, loading),
    [listings, loading, nearby, searchParams],
  );

  function toggleFilter(filter: (typeof smartFilters)[number]) {
    const params = new URLSearchParams(searchParams.toString());
    if (filter.key === "amenities") {
      const current = params.getAll("amenities");
      if (current.includes(filter.value)) {
        params.delete("amenities");
        current.filter((item) => item !== filter.value).forEach((item) => params.append("amenities", item));
      } else {
        params.append("amenities", filter.value);
      }
    } else if (params.get(filter.key) === filter.value) {
      params.delete(filter.key);
    } else {
      params.set(filter.key, filter.value);
    }
    router.push(`/search?${params.toString()}`);
  }

  function toggleHolidayFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === "true") {
      params.delete(key);
    } else {
      params.set(key, "true");
    }
    router.push(`/search?${params.toString()}`);
  }

  async function runAiSearch() {
    if (!aiQuery.trim()) {
      return;
    }
    setAiLoading(true);
    const result = await apiFetch<{
      parsed: Record<string, unknown>;
      matches: Listing[];
    }>("/api/v1/search/ai", {
      method: "POST",
      body: JSON.stringify({ query: aiQuery }),
    });
    setAiLoading(false);
    if (result.data?.matches) {
      setListings(result.data.matches);
      setAiOpen(false);
      showToast(`AI found ${result.data.matches.length} matching listings.`);
    } else {
      showToast(result.error?.message ?? "AI search failed.", "error");
    }
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-ink text-white dark:border-slate-800">
        <Image
          src="/images/roommates/photo-flat-borrowdale.jpg"
          alt="Verified Zimbabwe property marketplace"
          fill
          priority
          className="object-cover opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/45" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="min-w-0 w-full max-w-full sm:max-w-2xl lg:max-w-none">
              <p className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-emerald-100">
                Search
              </p>
              <h1 className="mt-4 break-words text-2xl font-semibold tracking-normal sm:text-3xl md:text-4xl">
                Fresh property matches across Zimbabwe
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Combine city, suburb, budget, amenities, and map context. AI search turns natural language into structured filters.
              </p>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => setAiOpen(true)}>
              <Sparkles className="size-4" aria-hidden="true" />
              Try AI search
            </Button>
          </div>

          <form
            className="surface-panel mt-6 grid w-full max-w-full gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const params = new URLSearchParams(searchParams.toString());
              const location = String(data.get("location") ?? "");
              params.delete("location");
              params.delete("city");
              params.delete("suburb");
              if (location.trim()) {
                params.set("location", location.trim());
              }
              const maxPrice = String(data.get("maxPrice") ?? "");
              if (maxPrice) {
                params.set("maxPrice", maxPrice);
              } else {
                params.delete("maxPrice");
              }
              router.push(`/search?${params.toString()}`);
            }}
          >
            <label className="grid gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">City or suburb</span>
              <span className="inline-flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Search className="size-4 text-emerald-700" aria-hidden="true" />
                <input
                  name="location"
                  defaultValue={searchParams.get("location") ?? searchParams.get("city") ?? searchParams.get("suburb") ?? ""}
                  className="w-full bg-transparent outline-none"
                  placeholder="Harare, Avondale, Kwekwe CBD"
                />
              </span>
            </label>
            <label className="grid gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Max budget</span>
              <input
                name="maxPrice"
                key={`budget-${displayedBudget || "empty"}`}
                defaultValue={displayedBudget}
                className="bg-transparent text-slate-800 outline-none dark:text-slate-100"
                inputMode="numeric"
                placeholder={intent === "buy" ? "No limit" : "1500"}
              />
            </label>
            <label className="grid gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Property</span>
              <select
                name="type"
                defaultValue={searchParams.get("type") ?? ""}
                className="bg-transparent text-slate-800 outline-none dark:text-slate-100"
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (event.target.value) {
                    params.set("type", event.target.value);
                  } else {
                    params.delete("type");
                  }
                  router.push(`/search?${params.toString()}`);
                }}
              >
                <option value="">Any type</option>
                <option value="room">Room</option>
                <option value="flat">Flat</option>
                <option value="house">House</option>
                <option value="cottage">Cottage</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
                <option value="holiday_home">Holiday Home</option>
              </select>
            </label>
            <Button type="submit" className="h-full min-h-12 sm:col-span-2 sm:min-h-14 lg:col-span-1">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filter
            </Button>
          </form>

          {calculatorBudget && usesRentalBudgetMemory && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">
              Using your calculator budget: <span className="font-bold">US${Math.round(calculatorBudget.recommendedMaxRent)}/month</span>
              <span className="text-emerald-100/80"> · {calculatorBudget.ratingLabel}</span>
            </div>
          )}

          {calculatorBudget && usesRentalBudgetMemory && (
            <button type="button" className="mt-2 text-sm font-semibold text-emerald-100 underline-offset-4 hover:underline" onClick={clearCalculatorBudget}>
              Clear calculator budget
            </button>
          )}

          <div className="-mx-1 mt-4 flex w-[calc(100%+0.5rem)] gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-full sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {smartFilters.map((filter) => (
              <button
                type="button"
                key={filter.label}
                onClick={() => toggleFilter(filter)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                  activeFilters.some((item) => item.label === filter.label)
                    ? "border-emerald-300 bg-emerald-400/20 text-emerald-50"
                    : "border-white/20 bg-white/90 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {searchParams.get("type") === "holiday_home" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Holiday filters:</span>
              {holidayFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  onClick={() => toggleHolidayFilter(filter.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    searchParams.get(filter.key) === "true"
                      ? "border-emerald-300 bg-emerald-400/20 text-emerald-50"
                      : "border-white/20 bg-white/90 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <label className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/90 px-3 py-1.5 text-sm text-slate-700">
                Guests
                <input
                  type="number"
                  min={1}
                  defaultValue={searchParams.get("minGuests") ?? ""}
                  className="w-12 bg-transparent outline-none"
                  onBlur={(e) => {
                    const params = new URLSearchParams(searchParams.toString());
                    if (e.target.value) params.set("minGuests", e.target.value);
                    else params.delete("minGuests");
                    router.push(`/search?${params.toString()}`);
                  }}
                />
              </label>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 md:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:px-8">
        <div className="order-2 min-w-0 max-w-full md:order-1">
          <div className="surface-panel flex flex-col justify-between gap-3 rounded-lg p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Showing <span className="font-semibold text-ink dark:text-white">{listings.length}</span> listings
              {loading ? " (loading...)" : ""}
            </p>
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setMapOpen((open) => !open)}>
              <MapIcon className="size-4" aria-hidden="true" />
              {mapOpen ? "Hide map" : "Map view"}
            </Button>
          </div>
          {mapOpen && listings[0] && (
            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <PropertyMap listings={listings} />
            </div>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
            {!loading && listings.length === 0 && (
              <p className="text-slate-600 dark:text-slate-300 sm:col-span-2">No listings match your filters. Try widening your search.</p>
            )}
          </div>
        </div>

        <aside className="order-1 h-fit max-w-full overflow-hidden rounded-lg border border-cyan-700/30 bg-gradient-to-br from-ocean via-[#0f5364] to-ink text-white shadow-soft md:order-2 md:sticky md:top-24">
          <div className="border-b border-white/10 p-4 sm:p-5">
            <p className="text-sm font-semibold uppercase tracking-normal text-cyan-100">Search intelligence</p>
            <p className="mt-2 break-words text-xl font-semibold sm:text-2xl">
              {marketLens.headline}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="font-semibold">What matches this client</p>
            <p className="mt-2 text-sm leading-6 text-cyan-50">
              {marketLens.intro}
            </p>
            <div className="mt-5 grid gap-3">
              {marketLens.rows.map((item) => (
                <div key={item.label} className="rounded-md bg-white/12 px-3 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 shrink text-cyan-50">{item.label}</span>
                    <span className="min-w-0 max-w-[58%] break-words text-right font-semibold text-white">{item.value}</span>
                  </div>
                </div>
              ))}
              {nearby?.places.slice(0, 3).map((item) => (
                <div key={`${item.type}-${item.name}`} className="rounded-md bg-white/8 px-3 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words text-cyan-50">{item.name}</span>
                    <span className="shrink-0 font-semibold text-cyan-100">{item.distanceKm} km</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="surface-panel w-full max-w-lg rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">AI property search</h2>
              <button type="button" onClick={() => setAiOpen(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Try: &quot;I need a room under $120 near Kwekwe CBD&quot; or &quot;house in Gweru with solar and borehole&quot;
            </p>
            <textarea
              className="mt-4 min-h-28 w-full rounded-md border border-slate-200 p-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              value={aiQuery}
              onChange={(event) => setAiQuery(event.target.value)}
              placeholder="Describe what you need..."
            />
            <Button className="mt-4 w-full" onClick={runAiSearch} disabled={aiLoading}>
              <Sparkles className="size-4" aria-hidden="true" />
              {aiLoading ? "Searching..." : "Search with AI"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
