export const PROPERTY_CITY_LANDING_PAGES = [
  { slug: "harare", name: "Harare" },
  { slug: "bulawayo", name: "Bulawayo" },
  { slug: "gweru", name: "Gweru" },
  { slug: "mutare", name: "Mutare" },
  { slug: "kwekwe", name: "Kwekwe" },
  { slug: "victoria-falls", name: "Victoria Falls" },
] as const;

export const ROOM_SUBURB_LANDING_PAGES = [
  { slug: "avondale", name: "Avondale" },
  { slug: "borrowdale", name: "Borrowdale" },
  { slug: "mount-pleasant", name: "Mount Pleasant" },
  { slug: "belvedere", name: "Belvedere" },
  { slug: "msasa", name: "Msasa" },
  { slug: "senga", name: "Senga" },
  { slug: "kumalo", name: "Kumalo" },
] as const;

export function resolveCity(slug: string) {
  return PROPERTY_CITY_LANDING_PAGES.find((city) => city.slug === normalizeSlug(slug)) ?? {
    slug: normalizeSlug(slug),
    name: titleFromSlug(slug),
  };
}

export function resolveSuburb(slug: string) {
  return ROOM_SUBURB_LANDING_PAGES.find((suburb) => suburb.slug === normalizeSlug(slug)) ?? {
    slug: normalizeSlug(slug),
    name: titleFromSlug(slug),
  };
}

export function normalizeSlug(value: string) {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromSlug(value: string) {
  return normalizeSlug(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
