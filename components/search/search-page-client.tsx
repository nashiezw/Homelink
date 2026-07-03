"use client";

import { Map, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ListingCard } from "@/components/listings/listing-card";
import { PropertyMap } from "@/components/maps/property-map";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
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
  const [nearby, setNearby] = useState<{
    cbdDistanceKm: number;
    places: Array<{ type: string; name: string; distanceKm: number }>;
  } | null>(null);

  const queryString = searchParams.toString();

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
          cbdDistanceKm: number;
          places: Array<{ type: string; name: string; distanceKm: number }>;
        }>(`/api/v1/maps/nearby?city=${encodeURIComponent(city)}&suburb=${encodeURIComponent(suburb)}`);
        setNearby(mapResult.data ?? null);
      } else {
        setNearby(null);
      }
    })();
  }, [queryString, searchParams]);

  const activeFilters = useMemo(() => smartFilters.filter((filter) => {
    if (filter.key === "amenities") {
      return searchParams.getAll("amenities").includes(filter.value);
    }
    return searchParams.get(filter.key) === filter.value;
  }), [searchParams]);

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
            <div className="w-full max-w-xs min-w-0 sm:max-w-2xl lg:max-w-none">
              <p className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-emerald-100">
                Search
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
                Fresh property matches across Zimbabwe
              </h1>
              <p className="mt-3 max-w-2xl text-slate-200">
                Combine city, suburb, budget, amenities, and map context. AI search turns natural language into structured filters.
              </p>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => setAiOpen(true)}>
              <Sparkles className="size-4" aria-hidden="true" />
              Try AI search
            </Button>
          </div>

          <form
            className="surface-panel mt-6 grid w-full gap-3 rounded-lg p-3 lg:grid-cols-[1.3fr_1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const params = new URLSearchParams(searchParams.toString());
              const location = String(data.get("location") ?? "");
              params.delete("city");
              params.delete("suburb");
              if (location.trim()) {
                params.set("city", location.trim());
              }
              const maxPrice = String(data.get("maxPrice") ?? "");
              if (maxPrice) {
                params.set("maxPrice", maxPrice);
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
                  defaultValue={searchParams.get("city") ?? searchParams.get("suburb") ?? ""}
                  className="w-full bg-transparent outline-none"
                  placeholder="Harare, Avondale, Kwekwe CBD"
                />
              </span>
            </label>
            <label className="grid gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Max budget</span>
              <input
                name="maxPrice"
                defaultValue={searchParams.get("maxPrice") ?? "1500"}
                className="bg-transparent text-slate-800 outline-none dark:text-slate-100"
                inputMode="numeric"
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
            <Button type="submit" className="h-full min-h-14">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filter
            </Button>
          </form>

          <div className="mt-4 flex max-w-xs flex-wrap gap-2 sm:max-w-none">
            {smartFilters.map((filter) => (
              <button
                type="button"
                key={filter.label}
                onClick={() => toggleFilter(filter)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
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

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div>
          <div className="surface-panel flex flex-col justify-between gap-3 rounded-lg p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Showing <span className="font-semibold text-ink dark:text-white">{listings.length}</span> listings
              {loading ? " (loading...)" : ""}
            </p>
            <Button variant="secondary" onClick={() => setMapOpen((open) => !open)}>
              <Map className="size-4" aria-hidden="true" />
              {mapOpen ? "Hide map" : "Map view"}
            </Button>
          </div>
          {mapOpen && listings[0] && (
            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <PropertyMap listings={listings} />
            </div>
          )}
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
            {!loading && listings.length === 0 && (
              <p className="text-slate-600 dark:text-slate-300">No listings match your filters. Try widening your search.</p>
            )}
          </div>
        </div>

        <aside className="h-fit overflow-hidden rounded-lg border border-cyan-700/30 bg-gradient-to-br from-ocean via-[#0f5364] to-ink text-white shadow-soft lg:sticky lg:top-24">
          <div className="border-b border-white/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-normal text-cyan-100">Local market lens</p>
            <p className="mt-2 text-2xl font-semibold">
              {nearby ? `${nearby.cbdDistanceKm} km to CBD` : "Harare demand is moving fastest under $650"}
            </p>
          </div>
          <div className="p-5">
            <p className="font-semibold">Map and neighbourhood intelligence</p>
            <p className="mt-2 text-sm leading-6 text-cyan-50">
              OpenStreetMap powers map discovery with nearby schools, hospitals, shops, and transport.
            </p>
            <div className="mt-5 grid gap-3">
              {(nearby?.places ?? [
                { type: "school", name: "Schools nearby", distanceKm: 0.9 },
                { type: "hospital", name: "Hospitals nearby", distanceKm: 2.4 },
                { type: "shopping", name: "Shopping centres", distanceKm: 0.6 },
                { type: "transport", name: "Transport", distanceKm: 0.3 },
              ]).map((item) => (
                <div key={item.name} className="rounded-md bg-white/12 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span>{item.name}</span>
                    <span className="font-semibold text-cyan-100">{item.distanceKm} km</span>
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
