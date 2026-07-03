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
import { useState } from "react";

const POI_LAYERS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "all", label: "All nearby essentials", icon: MapPin },
  { id: "schools", label: "Schools", icon: GraduationCap },
  { id: "hospitals", label: "Hospitals", icon: Hospital },
  { id: "shops", label: "Shops", icon: ShoppingBag },
  { id: "transport", label: "Transport", icon: Bus },
  { id: "cbd", label: "CBD distance", icon: Building2 },
  { id: "security", label: "Security", icon: Shield },
];

export function MapDiscoveryCard() {
  const [layer, setLayer] = useState("all");
  const activeLayer = POI_LAYERS.find((l) => l.id === layer) ?? POI_LAYERS[0];
  const LayerIcon = activeLayer.icon;

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
              <p className="text-xs text-cyan-100/85">OpenStreetMap / Google Maps ready</p>
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
                onChange={(e) => setLayer(e.target.value)}
                className="w-full appearance-none rounded-lg border border-white/20 bg-white/10 py-2 pl-8 pr-8 text-xs font-medium text-white backdrop-blur transition hover:bg-white/15 focus:border-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              >
                {POI_LAYERS.map((item) => (
                  <option key={item.id} value={item.id} className="text-ink">
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="hidden rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100 sm:inline">
              Live
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute left-[28%] top-[33%]">
          <MapPinCluster homes="3" />
        </div>
        <div className="pointer-events-none absolute left-[55%] top-[50%]">
          <MapPinCluster homes="5" />
        </div>
        <div className="pointer-events-none absolute left-[72%] top-[39%]">
          <MapPinCluster homes="4" />
        </div>
        <div className="absolute left-5 top-[6.2rem] flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md sm:top-[5.9rem]">
          <Building2 className="size-3.5 text-cyan-200" />
          CBD 2.7 km
        </div>

        <div className="rounded-xl border border-white/20 bg-white/95 p-3 shadow-2xl shadow-slate-950/30 backdrop-blur-md dark:bg-slate-900/95">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink dark:text-white">Avondale, Harare</p>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  92% match
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                12 verified properties / high borehole coverage
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["Solar backup", "Borehole", "Secure"].map((tag) => (
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
              href="/search?city=Harare&suburb=Avondale"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ink to-emerald-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-900 hover:to-emerald-800"
            >
              <MapPin className="size-4" aria-hidden="true" />
              Explore on map
              <ArrowRight className="size-4 opacity-80" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapPinCluster({ homes }: { homes: string }) {
  return (
    <div className="relative -translate-x-1/2 -translate-y-full">
      <span className="map-pin-pulse absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/50" />
      <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 shadow-lg shadow-emerald-900/50 ring-2 ring-white">
        <MapPin className="size-4 fill-white text-white" />
      </span>
      <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-ink shadow-md">
        {homes} homes
      </span>
    </div>
  );
}
