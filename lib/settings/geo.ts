import type { GeoProvince } from "@/lib/settings/types";

export function buildDefaultGeo(): GeoProvince[] {
  return [
    {
      name: "Harare",
      cities: [
        { name: "Harare", suburbs: ["Avondale", "Borrowdale", "CBD", "Greendale", "Highlands", "Mount Pleasant"] },
        { name: "Chitungwiza", suburbs: ["St Marys", "Zengeza", "Seke"] },
      ],
    },
    {
      name: "Bulawayo",
      cities: [{ name: "Bulawayo", suburbs: ["Hillside", "Suburbs", "CBD", "Burnside"] }],
    },
    {
      name: "Midlands",
      cities: [{ name: "Gweru", suburbs: ["Senga", "Ridgemont", "Mkoba"] }],
    },
    {
      name: "Manicaland",
      cities: [{ name: "Mutare", suburbs: ["Murambi", "Fairbridge Park", "Greenside"] }],
    },
    {
      name: "Matabeleland North",
      cities: [{ name: "Victoria Falls", suburbs: ["Town Centre", "Chinotimba"] }],
    },
  ];
}

export function flattenGeo(geo: GeoProvince[]) {
  const provinces = geo.map((p) => p.name);
  const cities = [...new Set(geo.flatMap((p) => p.cities.map((c) => c.name)))];
  const suburbs = [...new Set(geo.flatMap((p) => p.cities.flatMap((c) => c.suburbs)))];
  return { provinces, cities, suburbs };
}

export function syncGeoToFlatLists<T extends { geo: GeoProvince[]; provinces: string[]; cities: string[]; suburbs: string[] }>(
  settings: T,
): T {
  const flat = flattenGeo(settings.geo);
  return { ...settings, ...flat };
}
