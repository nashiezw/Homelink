"use client";

import {
  ArrowRight,
  Building2,
  Bus,
  GraduationCap,
  Hospital,
  MapPin,
  Navigation,
  Shield,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Listing } from "@/lib/types";

const POI_LAYERS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "all", label: "All nearby essentials", icon: MapPin },
  { id: "schools", label: "Schools", icon: GraduationCap },
  { id: "hospitals", label: "Hospitals", icon: Hospital },
  { id: "shops", label: "Shops", icon: ShoppingBag },
  { id: "transport", label: "Transport", icon: Bus },
  { id: "cbd", label: "CBD distance", icon: Building2 },
  { id: "security", label: "Security", icon: Shield },
];

const LAYER_MATCHERS: Record<string, RegExp> = {
  schools: /\b(school|college|university|campus|uz|msu|teacher)/i,
  hospitals: /\b(hospital|clinic|medical|mater dei|health)/i,
  shops: /\b(shop|shops|centre|center|mall|village|ok |market|retail|cbd)/i,
  transport: /\b(transport|kombi|bus|road|walk|walking|commute|access|route)/i,
  security: /\b(security|secure|wall|walled|gate|gated|guard|safe)/i,
};

const PIN_POSITIONS = [
  "left-[30%] top-[45%]",
  "left-[56%] top-[58%]",
  "left-[74%] top-[47%]",
];

const AREA_COORDINATES: Record<string, UserPosition> = {
  "avondale, harare": { lat: -17.8007, lng: 31.0335 },
  "belvedere, harare": { lat: -17.8335, lng: 31.0028 },
  "borrowdale, harare": { lat: -17.7615, lng: 31.0893 },
  "mount pleasant, harare": { lat: -17.7817, lng: 31.0533 },
  "avondale west, harare": { lat: -17.7984, lng: 31.0148 },
  "cbd, harare": { lat: -17.8292, lng: 31.0522 },
  "hillside, bulawayo": { lat: -20.1783, lng: 28.6069 },
  "cbd, bulawayo": { lat: -20.1561, lng: 28.5887 },
  "kumalo, bulawayo": { lat: -20.1352, lng: 28.6026 },
  "senga, gweru": { lat: -19.4825, lng: 29.8304 },
  "ridgemont, gweru": { lat: -19.4568, lng: 29.8181 },
  "newtown, kwekwe": { lat: -18.9245, lng: 29.8149 },
  "msasa park, kwekwe": { lat: -18.9194, lng: 29.8297 },
  "chikanga, mutare": { lat: -18.9957, lng: 32.6225 },
  "murambi, mutare": { lat: -18.9833, lng: 32.65 },
  "seke unit a, chitungwiza": { lat: -18.0058, lng: 31.0706 },
  "chinotimba, victoria falls": { lat: -17.9316, lng: 25.8242 },
};

type UserPosition = {
  lat: number;
  lng: number;
};

export function MapDiscoveryCard({ listings }: { listings: Listing[] }) {
  const [layer, setLayer] = useState("all");
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [locationStatus, setLocationStatus] = useState<"checking" | "allowed" | "blocked" | "unavailable">("checking");
  const activeLayer = POI_LAYERS.find((l) => l.id === layer) ?? POI_LAYERS[0];
  const LayerIcon = activeLayer.icon;
  const filteredListings = useMemo(() => filterListingsByLayer(listings, layer), [listings, layer]);
  const area = useMemo(
    () => buildMapAreaSummary(filteredListings, userPosition, layer),
    [filteredListings, userPosition, layer],
  );
  const clusters = useMemo(
    () => buildMapClusters(filteredListings, userPosition, layer, area?.location),
    [filteredListings, userPosition, layer, area?.location],
  );
  const href = buildSearchHref(area?.location, layer);

  useEffect(() => {
    requestUserLocation({ silent: true });
  }, []);

  function requestUserLocation({ silent = false }: { silent?: boolean } = {}) {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }
    if (!silent) setLocationStatus("checking");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("allowed");
      },
      () => setLocationStatus(silent ? "blocked" : "unavailable"),
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 7000 },
    );
  }

  return (
    <div className="group relative min-h-[28rem] overflow-hidden rounded-2xl border border-cyan-800/30 bg-[#062a34] shadow-[0_20px_60px_rgba(10,61,76,0.35)]">
      <div className="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300" />
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <pattern id="map-grid-full" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.075)" strokeWidth="0.7" />
          </pattern>
          <radialGradient id="map-glow-full" cx="50%" cy="50%" r="58%">
            <stop offset="0%" stopColor="rgba(52,211,153,0.2)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="#062a34" />
        <rect width="100%" height="100%" fill="url(#map-grid-full)" />
        <ellipse cx="28%" cy="64%" rx="36%" ry="44%" fill="url(#map-glow-full)" />
        <ellipse cx="78%" cy="36%" rx="28%" ry="34%" fill="url(#map-glow-full)" opacity="0.75" />
        <path
          d="M-20 210 Q110 145 245 168 T520 135 T760 188"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2.2"
          strokeDasharray="6 6"
        />
        <path
          d="M35 -10 Q145 145 300 218 T650 310"
          fill="none"
          stroke="rgba(110,231,183,0.48)"
          strokeWidth="3"
        />
        <path
          d="M720 40 Q540 150 410 208 T105 330"
          fill="none"
          stroke="rgba(103,232,249,0.35)"
          strokeWidth="2.5"
        />
        <path
          d="M-20 355 Q160 300 340 335 T740 290"
          fill="none"
          stroke="rgba(20,184,166,0.26)"
          strokeWidth="5"
        />
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.24),transparent_20rem),linear-gradient(180deg,rgba(8,47,73,0.18),rgba(3,7,18,0.2))]" />

      <div className="relative z-10 flex min-h-[28rem] flex-col justify-between p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-slate-950/28 p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/25 backdrop-blur">
              <Navigation className="size-5 text-cyan-100" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold tracking-tight text-white">Map-first discovery</p>
              <p className="text-xs text-cyan-100/85">
                {locationStatus === "allowed" ? "Nearest areas first" : "OpenStreetMap / Google Maps ready"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative min-w-[10rem]">
              <span className="sr-only">Map layer</span>
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-300">
                <LayerIcon className="size-3.5" />
              </span>
              <select
                value={layer}
                onChange={(event) => setLayer(event.target.value)}
                className="w-full appearance-none rounded-lg border border-white/20 bg-white/10 py-2 pl-8 pr-8 text-xs font-medium text-white backdrop-blur transition hover:bg-white/15 focus:border-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 [&>option]:text-ink"
              >
                {POI_LAYERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => requestUserLocation()}
              className="hidden rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/30 sm:inline"
            >
              {locationStatus === "allowed" ? "Nearby" : "Use location"}
            </button>
          </div>
        </div>

        {clusters.map((cluster, index) => (
          <div key={cluster.location} className={`absolute z-10 ${PIN_POSITIONS[index]}`}>
            <MapPinCluster cluster={cluster} />
          </div>
        ))}
        <div className="absolute left-5 top-[6.2rem] z-20 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md sm:top-[5.9rem]">
          <Building2 className="size-3.5 text-cyan-200" />
          {filteredListings.length
            ? area?.cbdDistance
              ? `${area.cbdDistance} km median CBD distance`
              : `${filteredListings.length} matching listings`
            : "No matches yet"}
        </div>

        <div className="rounded-xl border border-white/20 bg-white/95 p-3 shadow-2xl shadow-slate-950/30 backdrop-blur-md dark:bg-slate-900/95">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink dark:text-white">{area?.location ?? "Zimbabwe listings"}</p>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {area ? `${area.verifiedCount}/${area.count} verified` : "Search ready"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                {area
                  ? `${area.count} matching ${area.count === 1 ? "listing" : "listings"} / ${area.distanceLabel ?? `typical price ${area.typicalPrice}`}`
                  : "Browse active listings by city, suburb, type, and budget"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(area?.amenities.length ? area.amenities : ["Verified", "Local context", "Map search"]).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <Link
              href={href}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ink to-emerald-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-900 hover:to-emerald-800"
            >
              <MapPin className="size-4" aria-hidden="true" />
              Explore on map
              <ArrowRight className="size-4 opacity-80" aria-hidden="true" />
            </Link>
          </div>
          {locationStatus !== "allowed" ? (
            <button
              type="button"
              onClick={() => requestUserLocation()}
              className="mt-3 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              {locationStatus === "checking" ? "Checking your location..." : "Use my location for nearer matches"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function filterListingsByLayer(listings: Listing[], layer: string) {
  const layerMatcher = LAYER_MATCHERS[layer];
  const layerFiltered = listings.filter((listing) => {
    if (layerMatcher && !listingMatchesLayer(listing, layerMatcher)) return false;
    return true;
  });

  if (layerFiltered.length || !layerMatcher) return layerFiltered;
  return listings;
}

function listingMatchesLayer(listing: Listing, matcher: RegExp) {
  const context = [
    listing.title,
    listing.description,
    listing.highlight,
    listing.suburb,
    listing.city,
    ...listing.amenities,
    ...listing.nearby,
  ].join(" ");
  return matcher.test(context);
}

function buildSearchHref(location: string | undefined, layer: string) {
  const params = new URLSearchParams();
  if (location) params.set("location", location);
  if (layer !== "all") params.set("nearby", layer);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function buildMapAreaSummary(listings: Listing[], userPosition: UserPosition | null, layer: string) {
  if (!listings.length) return null;
  const groups = groupListingsByArea(listings);
  const [location, group] = rankAreaGroups(groups, userPosition, layer)[0];
  const prices = group.map((listing) => listing.price).sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const typicalPrice = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
  const cbdDistances = group.map((listing) => listing.distanceToCbdKm).filter((value) => Number.isFinite(value));
  const cbdDistance = cbdDistances.length
    ? (cbdDistances.reduce((sum, value) => sum + value, 0) / cbdDistances.length).toFixed(1)
    : null;
  const amenities = [...new Set(group.flatMap((listing) => listing.amenities))].slice(0, 3);
  const distanceKm = userPosition ? nearestDistanceKm(group, userPosition) : null;

  return {
    location,
    count: group.length,
    verifiedCount: group.filter((listing) => listing.verified).length,
    typicalPrice: `$${Math.round(typicalPrice).toLocaleString("en-US")}`,
    cbdDistance,
    amenities,
    distanceLabel: distanceKm === null ? null : `${distanceKm.toFixed(1)} km from you`,
  };
}

function buildMapClusters(
  listings: Listing[],
  userPosition: UserPosition | null,
  layer: string,
  activeLocation?: string,
) {
  if (!listings.length) return [];
  const groups = rankAreaGroups(groupListingsByArea(listings), userPosition, layer).filter(
    ([location]) => !activeLocation || location === activeLocation,
  );
  return groups.slice(0, 3).map(([location, group]) => {
    const distanceKm = userPosition ? nearestDistanceKm(group, userPosition) : null;
    return {
      label: `${group.length} ${group.length === 1 ? "home" : "homes"}`,
      location,
      href: `/search?location=${encodeURIComponent(location)}`,
      distanceLabel: distanceKm === null ? null : `${distanceKm.toFixed(1)} km`,
    };
  });
}

function groupListingsByArea(listings: Listing[]) {
  const listingGroups = new Map<string, Listing[]>();
  for (const listing of listings) {
    const key = `${listing.suburb}, ${listing.city}`;
    listingGroups.set(key, [...(listingGroups.get(key) ?? []), listing]);
  }
  return listingGroups;
}

function rankAreaGroups(groups: Map<string, Listing[]>, userPosition: UserPosition | null, layer: string) {
  return [...groups.entries()].sort((a, b) => {
    if (userPosition) {
      const aDistance = nearestDistanceKm(a[1], userPosition);
      const bDistance = nearestDistanceKm(b[1], userPosition);
      if (aDistance !== null && bDistance !== null && aDistance !== bDistance) return aDistance - bDistance;
      if (aDistance !== null && bDistance === null) return -1;
      if (aDistance === null && bDistance !== null) return 1;
    }
    if (layer === "cbd") {
      const aCbd = medianCbdDistance(a[1]);
      const bCbd = medianCbdDistance(b[1]);
      if (aCbd !== null && bCbd !== null && aCbd !== bCbd) return aCbd - bCbd;
      if (aCbd !== null && bCbd === null) return -1;
      if (aCbd === null && bCbd !== null) return 1;
    }
    const countDifference = b[1].length - a[1].length;
    if (countDifference) return countDifference;
    const verifiedDifference = verifiedRatio(b[1]) - verifiedRatio(a[1]);
    if (verifiedDifference) return verifiedDifference;
    return averageTrustScore(b[1]) - averageTrustScore(a[1]);
  });
}

function medianCbdDistance(listings: Listing[]) {
  const distances = listings
    .map((listing) => listing.distanceToCbdKm)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!distances.length) return null;
  const middle = Math.floor(distances.length / 2);
  return distances.length % 2 ? distances[middle] : (distances[middle - 1] + distances[middle]) / 2;
}

function verifiedRatio(listings: Listing[]) {
  return listings.length ? listings.filter((listing) => listing.verified).length / listings.length : 0;
}

function averageTrustScore(listings: Listing[]) {
  return listings.length ? listings.reduce((sum, listing) => sum + listing.trustScore, 0) / listings.length : 0;
}

function nearestDistanceKm(listings: Listing[], userPosition: UserPosition) {
  const distances = listings
    .map((listing) => {
      const coordinates = listingCoordinates(listing);
      if (!coordinates) return null;
      return haversineKm(userPosition.lat, userPosition.lng, coordinates.lat, coordinates.lng);
    })
    .filter((value): value is number => value !== null);
  return distances.length ? Math.min(...distances) : null;
}

function listingCoordinates(listing: Listing): UserPosition | null {
  if (listing.latitude !== undefined && listing.longitude !== undefined) {
    return { lat: listing.latitude, lng: listing.longitude };
  }
  return AREA_COORDINATES[`${listing.suburb}, ${listing.city}`.toLowerCase()] ?? null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapPinCluster({ cluster }: { cluster?: { label: string; href: string; location: string; distanceLabel: string | null } }) {
  if (!cluster) return null;
  return (
    <Link href={cluster.href} aria-label={`View listings in ${cluster.location}`} title={cluster.distanceLabel ?? cluster.location} className="group/pin relative block -translate-x-1/2 -translate-y-full">
      <span className="map-pin-pulse absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/50" />
      <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 shadow-lg shadow-emerald-900/50 ring-2 ring-white transition group-hover/pin:scale-110">
        <MapPin className="size-4 fill-white text-white" />
      </span>
      <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-ink shadow-md">
        {cluster.label}
      </span>
    </Link>
  );
}
