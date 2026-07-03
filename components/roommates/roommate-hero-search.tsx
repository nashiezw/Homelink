"use client";

import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { roommateAmenityFilters } from "@/lib/roommates/content";
import { cn } from "@/lib/utils";

export type LookingForOption = "room" | "house_share" | "student";

export type HeroSearchState = {
  location: string;
  minPrice: string;
  maxPrice: string;
  roomType: string;
  gender: string;
  moveIn: string;
  lookingFor: LookingForOption;
};

type RoommateHeroSearchProps = {
  value: HeroSearchState;
  onChange: (value: HeroSearchState) => void;
  amenities: string[];
  onToggleAmenity: (label: string) => void;
  onSubmit: (e?: FormEvent) => void;
  onFindRoommate?: () => void;
  variant?: "floating" | "band";
};

const cellLabel = "text-sm font-bold text-slate-700";

const LOOKING_FOR_OPTIONS: { value: LookingForOption; label: string; hint: string }[] = [
  { value: "room", label: "Room", hint: "Single room to rent" },
  { value: "house_share", label: "House share", hint: "Shared flat or house" },
  { value: "student", label: "Student", hint: "Near campus, under $200" },
];

export function RoommateHeroSearch({
  value,
  onChange,
  amenities,
  onToggleAmenity,
  onSubmit,
  onFindRoommate,
  variant = "band",
}: RoommateHeroSearchProps) {
  return (
    <form
      onSubmit={(e) => onSubmit(e)}
      className={cn(
        "rounded-[1.25rem] border p-5 sm:p-7",
        variant === "floating"
          ? "border-slate-200/80 bg-white shadow-[0_32px_80px_rgba(16,32,36,0.14)]"
          : "border-slate-200 bg-white shadow-[0_16px_50px_rgba(16,32,36,0.1)] ring-1 ring-slate-100",
      )}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md">
          <Search className="size-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-ink">Find a room</p>
          <p className="text-base text-slate-600">Browse verified rooms, flats & cottages across Zimbabwe</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        {LOOKING_FOR_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ ...value, lookingFor: opt.value })}
            className={cn(
              "rounded-xl px-3 py-3 text-left transition-all",
              value.lookingFor === opt.value
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/15"
                : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800",
            )}
          >
            <span className="block text-sm font-bold">{opt.label}</span>
            <span className={cn("mt-0.5 block text-[11px] font-medium", value.lookingFor === opt.value ? "text-emerald-100" : "text-slate-400")}>
              {opt.hint}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 lg:col-span-3">
          <span className={cellLabel}>Location</span>
          <input
            value={value.location}
            onChange={(e) => onChange({ ...value, location: e.target.value })}
            placeholder="Harare, Avondale..."
            className="bg-transparent text-base font-semibold text-ink outline-none placeholder:text-slate-400"
          />
        </label>
        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 lg:col-span-2">
          <span className={cellLabel}>Budget (USD)</span>
          <div className="flex items-center gap-2 text-base font-semibold text-ink">
            <input value={value.minPrice} onChange={(e) => onChange({ ...value, minPrice: e.target.value })} className="w-14 bg-transparent outline-none" inputMode="numeric" />
            <span className="text-slate-300">-</span>
            <input value={value.maxPrice} onChange={(e) => onChange({ ...value, maxPrice: e.target.value })} className="w-14 bg-transparent outline-none" inputMode="numeric" />
          </div>
        </label>
        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 lg:col-span-2">
          <span className={cellLabel}>Move-in</span>
          <input type="date" value={value.moveIn} onChange={(e) => onChange({ ...value, moveIn: e.target.value })} className="bg-transparent text-base font-semibold text-ink outline-none" />
        </label>
        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 lg:col-span-2">
          <span className={cellLabel}>Room type</span>
          <select value={value.roomType} onChange={(e) => onChange({ ...value, roomType: e.target.value })} className="bg-transparent text-base font-semibold text-ink outline-none">
            <option value="room">Room</option>
            <option value="flat">Flat</option>
            <option value="cottage">Cottage</option>
          </select>
        </label>
        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 lg:col-span-2">
          <span className={cellLabel}>Gender</span>
          <select value={value.gender} onChange={(e) => onChange({ ...value, gender: e.target.value })} className="bg-transparent text-base font-semibold text-ink outline-none">
            <option value="any">Any</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
        <Button type="submit" className="h-14 rounded-xl bg-emerald-700 px-6 text-base font-bold shadow-lg shadow-emerald-900/15 hover:bg-emerald-800 lg:col-span-1 lg:h-full">
          <Search className="size-4" />
          <span className="lg:hidden">Search rooms</span>
        </Button>
      </div>

      {onFindRoommate && (
        <p className="mt-4 border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
          Looking for a person to share with?{" "}
          <button type="button" onClick={onFindRoommate} className="font-bold text-emerald-700 hover:underline">
            Use roommate matching above
          </button>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {roommateAmenityFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onToggleAmenity(filter)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              amenities.includes(filter) ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-emerald-200",
            )}
          >
            {filter}
          </button>
        ))}
      </div>
    </form>
  );
}
