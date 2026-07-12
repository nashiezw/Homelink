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
  "/images/roommates/photo-flat-avondale-west.jpg": "/images/roommates/listing-flat-avondale-west.svg",
  "/images/roommates/photo-land-mutare.jpg": "/images/roommates/listing-land-mutare.svg",
  "/images/roommates/photo-office-harare.jpg": "/images/roommates/listing-office-harare.svg",
  "/images/roommates/photo-lodge-vicfalls.jpg": "/images/roommates/listing-lodge-vicfalls.svg",
};

const GENERIC_LISTING_FALLBACK = "/images/roommates/listing-flat-avondale-west.svg";

export function resolvePublicImageUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  return ROOMMATE_PHOTO_TO_LISTING_SVG[trimmed] ?? trimmed;
}

export function virtualTourImageFallbacks(sceneUrl: string | undefined, listingImage?: string) {
  const chain = [
    resolvePublicImageUrl(sceneUrl),
    resolvePublicImageUrl(listingImage),
    GENERIC_LISTING_FALLBACK,
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
  return chain;
}
