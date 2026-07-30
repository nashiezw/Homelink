import type { LibraryStoreSettings } from "@/lib/library/settings";

export type LibraryShippingZone = {
  id: string;
  name: string;
  countries: string[];
  provinces: string[];
  cities: string[];
  rate: number;
  freeShippingMin: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  courier: string;
  allowLocalPickup: boolean;
  active: boolean;
  priority: number;
};

export type LibraryShippingQuote = {
  shippingTotal: number;
  zoneId: string | null;
  zoneName: string | null;
  courier: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  allowLocalPickup: boolean;
  method: "ZONE" | "FLAT" | "FREE" | "PICKUP" | "DISABLED";
};

function norm(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function countryCode(value?: string | null) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw === "ZIMBABWE" || raw === "ZIM") return "ZW";
  if (raw.length === 2) return raw;
  return raw;
}

export function matchLibraryShippingZone(
  zones: LibraryShippingZone[],
  address?: { country?: string; province?: string; city?: string } | null,
): LibraryShippingZone | null {
  const active = [...zones].filter((zone) => zone.active).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  if (!active.length) return null;
  const country = countryCode(address?.country);
  const province = norm(address?.province);
  const city = norm(address?.city);

  const scored = active
    .map((zone) => {
      const countries = zone.countries.map(countryCode).filter(Boolean);
      const provinces = zone.provinces.map(norm).filter(Boolean);
      const cities = zone.cities.map(norm).filter(Boolean);
      if (countries.length && country && !countries.includes(country) && !zone.countries.map(norm).includes(norm(address?.country))) {
        return null;
      }
      if (provinces.length && province && !provinces.includes(province)) return null;
      if (cities.length && city && !cities.includes(city)) return null;
      let score = 0;
      if (cities.length && city && cities.includes(city)) score += 100;
      if (provinces.length && province && provinces.includes(province)) score += 50;
      if (countries.length && country) score += 10;
      if (!countries.length && !provinces.length && !cities.length) score += 1;
      return { zone, score };
    })
    .filter(Boolean) as Array<{ zone: LibraryShippingZone; score: number }>;

  scored.sort((a, b) => b.score - a.score || a.zone.priority - b.zone.priority);
  return scored[0]?.zone ?? active.find((zone) => !zone.countries.length && !zone.provinces.length && !zone.cities.length) ?? null;
}

export function quoteLibraryShipping(input: {
  settings: LibraryStoreSettings;
  taxable: number;
  taxTotal: number;
  address?: { country?: string; province?: string; city?: string } | null;
  method?: "SHIPPING" | "PICKUP";
}): LibraryShippingQuote {
  const { settings } = input;
  if (!settings.delivery.enablePrintedShipping) {
    return {
      shippingTotal: 0,
      zoneId: null,
      zoneName: null,
      courier: settings.delivery.defaultCourier,
      estimatedDaysMin: settings.delivery.estimatedDaysMin,
      estimatedDaysMax: settings.delivery.estimatedDaysMax,
      allowLocalPickup: false,
      method: "DISABLED",
    };
  }

  const zone = matchLibraryShippingZone(settings.delivery.zones, input.address);
  const courier = zone?.courier || settings.delivery.defaultCourier;
  const estimatedDaysMin = zone?.estimatedDaysMin ?? settings.delivery.estimatedDaysMin;
  const estimatedDaysMax = zone?.estimatedDaysMax ?? settings.delivery.estimatedDaysMax;
  const allowLocalPickup = Boolean(zone?.allowLocalPickup || settings.delivery.allowLocalPickup);

  if (input.method === "PICKUP" && allowLocalPickup) {
    return {
      shippingTotal: 0,
      zoneId: zone?.id ?? null,
      zoneName: zone?.name ?? "Local pickup",
      courier: "Local pickup",
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
      allowLocalPickup: true,
      method: "PICKUP",
    };
  }

  const rate = zone ? zone.rate : settings.delivery.flatRate;
  const freeMin = zone?.freeShippingMin ?? settings.delivery.freeShippingMin;
  const basis = input.taxable + input.taxTotal;
  if (freeMin != null && basis >= freeMin) {
    return {
      shippingTotal: 0,
      zoneId: zone?.id ?? null,
      zoneName: zone?.name ?? "Default",
      courier,
      estimatedDaysMin,
      estimatedDaysMax,
      allowLocalPickup,
      method: "FREE",
    };
  }

  return {
    shippingTotal: Math.round(Math.max(0, rate) * 100) / 100,
    zoneId: zone?.id ?? null,
    zoneName: zone?.name ?? "Default flat rate",
    courier,
    estimatedDaysMin,
    estimatedDaysMax,
    allowLocalPickup,
    method: zone ? "ZONE" : "FLAT",
  };
}
