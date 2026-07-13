/** Maps seeded JPG paths that are not shipped in /public to bundled SVG listing art. */
const ROOMMATE_PHOTO_TO_LISTING_SVG: Record<string, string> = {
  "/images/roommates/photo-cottage-avondale.jpg": "/images/roommates/listing-cottage-avondale.svg",
  "/images/roommates/photo-bedroom-senga.jpg": "/images/roommates/listing-room-senga.svg",
  "/images/roommates/photo-lounge-belvedere.jpg": "/images/roommates/listing-room-belvedere.svg",
  "/images/roommates/photo-flat-borrowdale.jpg": "/images/roommates/listing-flat-borrowdale.svg",
  "/images/roommates/photo-room-mount-pleasant.jpg": "/images/roommates/listing-room-mount-pleasant.svg",
  "/images/roommates/photo-room-avondale.jpg": "/images/roommates/listing-cottage-avondale.svg",
  "/images/roommates/photo-cottage-kumalo.jpg": "/images/roommates/listing-cottage-kumalo.svg",
  "/images/roommates/photo-kitchen-ridgemont.jpg": "/images/roommates/listing-room-ridgemont.svg",
  "/images/roommates/photo-house-bulawayo.jpg": "/images/roommates/listing-room-bulawayo-cbd.svg",
  "/images/roommates/photo-kitchen-msasa.jpg": "/images/roommates/listing-room-msasa.svg",
  // Avoid the solid-blue Avondale West SVG in galleries and tours.
  "/images/roommates/photo-flat-avondale-west.jpg": "/images/roommates/listing-flat-borrowdale.svg",
  "/images/roommates/photo-land-mutare.jpg": "/images/roommates/listing-land-mutare.svg",
  "/images/roommates/photo-office-harare.jpg": "/images/roommates/listing-office-harare.svg",
  "/images/roommates/photo-lodge-vicfalls.jpg": "/images/roommates/listing-cottage-avondale.svg",
};

/** Prefer green cottage art over blue flat / lodge SVGs as a last-resort fallback. */
const GENERIC_LISTING_FALLBACK = "/images/roommates/listing-cottage-avondale.svg";

/** Blue-heavy SVG art that reads as a solid blue panel when used full-bleed. */
const BLUE_PLACEHOLDER_SVGS = new Set([
  "/images/roommates/listing-flat-avondale-west.svg",
  "/images/roommates/listing-lodge-vicfalls.svg",
]);

export function resolvePublicImageUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  const mapped = ROOMMATE_PHOTO_TO_LISTING_SVG[trimmed] ?? trimmed;
  if (BLUE_PLACEHOLDER_SVGS.has(mapped)) return GENERIC_LISTING_FALLBACK;
  return mapped;
}

export function resolveListingImages(urls: string[]): string[] {
  return urls
    .map((url) => resolvePublicImageUrl(url))
    .filter((url): url is string => Boolean(url));
}

export function isListingPlaceholderArt(url?: string | null): boolean {
  if (!url) return false;
  return /\/images\/roommates\/listing-.*\.svg$/i.test(url) || url in ROOMMATE_PHOTO_TO_LISTING_SVG;
}

export function isSvgImageUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.svg($|\?)/i.test(url);
}

export function isBluePlaceholderArt(url?: string | null): boolean {
  if (!url) return false;
  return BLUE_PLACEHOLDER_SVGS.has(url) || BLUE_PLACEHOLDER_SVGS.has(resolvePublicImageUrl(url) ?? "");
}

export function virtualTourImageFallbacks(sceneUrl: string | undefined, listingImage?: string) {
  const chain = [
    resolvePublicImageUrl(sceneUrl),
    resolvePublicImageUrl(listingImage),
    GENERIC_LISTING_FALLBACK,
  ].filter((value, index, all): value is string => {
    if (!value) return false;
    if (BLUE_PLACEHOLDER_SVGS.has(value)) return false;
    return all.indexOf(value) === index;
  });
  return chain.length ? chain : [GENERIC_LISTING_FALLBACK];
}
