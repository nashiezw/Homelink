"use client";

import { useMemo } from "react";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-600 dark:bg-slate-900";

type LocationPickerProps = {
  province: string;
  city: string;
  suburb: string;
  onChange: (value: { province: string; city: string; suburb: string }) => void;
};

export function LocationPicker({ province, city, suburb, onChange }: LocationPickerProps) {
  const { config } = usePlatformConfig();
  const geo = config?.geo ?? [];

  const provinces = useMemo(() => geo.map((p) => p.name), [geo]);

  const cities = useMemo(() => {
    const match = geo.find((p) => p.name === province);
    return match?.cities.map((c) => c.name) ?? config?.cities ?? [];
  }, [geo, province, config?.cities]);

  const suburbs = useMemo(() => {
    const match = geo.find((p) => p.name === province);
    const cityMatch = match?.cities.find((c) => c.name === city);
    return cityMatch?.suburbs ?? config?.suburbs ?? [];
  }, [geo, province, city, config?.suburbs]);

  function onProvinceChange(nextProvince: string) {
    const provinceNode = geo.find((p) => p.name === nextProvince);
    const nextCity = provinceNode?.cities[0]?.name ?? "";
    const nextSuburb = provinceNode?.cities[0]?.suburbs[0] ?? "";
    onChange({ province: nextProvince, city: nextCity, suburb: nextSuburb });
  }

  function onCityChange(nextCity: string) {
    const provinceNode = geo.find((p) => p.name === province);
    const cityNode = provinceNode?.cities.find((c) => c.name === nextCity);
    onChange({ province, city: nextCity, suburb: cityNode?.suburbs[0] ?? "" });
  }

  if (!provinces.length) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          City *
          <input required value={city} onChange={(e) => onChange({ province, city: e.target.value, suburb })} className={fieldClass} />
        </label>
        <label className="block text-sm font-medium">
          Suburb *
          <input required value={suburb} onChange={(e) => onChange({ province, city, suburb: e.target.value })} className={fieldClass} />
        </label>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="block text-sm font-medium">
        Province *
        <select required value={province} onChange={(e) => onProvinceChange(e.target.value)} className={fieldClass}>
          {provinces.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        City *
        <select required value={city} onChange={(e) => onCityChange(e.target.value)} className={fieldClass}>
          {cities.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Suburb *
        <select required value={suburb} onChange={(e) => onChange({ province, city, suburb: e.target.value })} className={fieldClass}>
          {suburbs.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function resolveInitialLocation(geo: Array<{ name: string; cities: Array<{ name: string; suburbs: string[] }> }>) {
  const province = geo[0]?.name ?? "";
  const city = geo[0]?.cities[0]?.name ?? "Harare";
  const suburb = geo[0]?.cities[0]?.suburbs[0] ?? "";
  return { province, city, suburb };
}
