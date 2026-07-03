"use client";

import type { HolidayHomeDetails } from "@/lib/holiday-homes/types";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-600 dark:bg-slate-900";

type HolidayHomeFieldsProps = {
  value: Partial<HolidayHomeDetails>;
  onChange: (value: Partial<HolidayHomeDetails>) => void;
};

export function HolidayHomeFields({ value, onChange }: HolidayHomeFieldsProps) {
  function set<K extends keyof HolidayHomeDetails>(key: K, val: HolidayHomeDetails[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div>
        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Holiday home details</h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Pricing, stay rules, and amenities for short-term guests.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Nightly rate (USD) *
          <input
            required
            type="number"
            min={1}
            value={value.nightlyRate ?? ""}
            onChange={(e) => set("nightlyRate", Number(e.target.value))}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Weekly rate (optional)
          <input
            type="number"
            min={1}
            value={value.weeklyRate ?? ""}
            onChange={(e) => set("weeklyRate", e.target.value ? Number(e.target.value) : undefined)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Monthly rate (optional)
          <input
            type="number"
            min={1}
            value={value.monthlyRate ?? ""}
            onChange={(e) => set("monthlyRate", e.target.value ? Number(e.target.value) : undefined)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Minimum stay (nights)
          <input
            type="number"
            min={1}
            value={value.minimumStay ?? 2}
            onChange={(e) => set("minimumStay", Number(e.target.value) || 1)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Maximum guests
          <input
            type="number"
            min={1}
            value={value.maximumGuests ?? 4}
            onChange={(e) => set("maximumGuests", Number(e.target.value) || 1)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Destination
          <input
            value={value.destination ?? ""}
            onChange={(e) => set("destination", e.target.value)}
            placeholder="e.g. Victoria Falls"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Check-in time
          <input
            type="time"
            value={value.checkInTime ?? "14:00"}
            onChange={(e) => set("checkInTime", e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Check-out time
          <input
            type="time"
            value={value.checkOutTime ?? "10:00"}
            onChange={(e) => set("checkOutTime", e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Cleaning fee (USD)
          <input
            type="number"
            min={0}
            value={value.cleaningFee ?? ""}
            onChange={(e) => set("cleaningFee", e.target.value ? Number(e.target.value) : undefined)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Security deposit (USD)
          <input
            type="number"
            min={0}
            value={value.securityDeposit ?? ""}
            onChange={(e) => set("securityDeposit", e.target.value ? Number(e.target.value) : undefined)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["wifiAvailable", "Wi-Fi available"],
            ["swimmingPool", "Swimming pool"],
            ["airConditioning", "Air conditioning"],
            ["kitchen", "Kitchen"],
            ["braaiArea", "Braai area"],
            ["parking", "Parking"],
            ["petFriendly", "Pet friendly"],
            ["wheelchairAccessible", "Wheelchair accessible"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(value[key])}
              onChange={(e) => set(key, e.target.checked)}
              className="size-4 rounded border-slate-300 text-emerald-600"
            />
            {label}
          </label>
        ))}
      </div>

      <label className="block text-sm font-medium">
        House rules
        <textarea
          rows={3}
          value={value.houseRules ?? ""}
          onChange={(e) => set("houseRules", e.target.value)}
          className={fieldClass}
          placeholder="Quiet hours, smoking policy, guest limits..."
        />
      </label>

      <label className="block text-sm font-medium">
        Nearby attractions
        <textarea
          rows={2}
          value={value.nearbyAttractions ?? ""}
          onChange={(e) => set("nearbyAttractions", e.target.value)}
          className={fieldClass}
          placeholder="Waterfalls, restaurants, national parks..."
        />
      </label>
    </div>
  );
}
