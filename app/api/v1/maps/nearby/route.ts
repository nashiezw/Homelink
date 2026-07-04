import { geocodeAddress } from "@/lib/integrations/google-maps";
import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";
import { ok, problem } from "@/lib/api/response";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const suburb = searchParams.get("suburb");

  if (!city || !suburb) {
    return problem(400, "LOCATION_REQUIRED", "city and suburb are required.");
  }

  const settings = await getHydratedRuntimePlatformSettings();
  const mapsKey = settings.integrations.googleMapsKey;
  const query = `${suburb}, ${city}, Zimbabwe`;

  let cbdDistanceKm: number | null = null;
  let provider = "not_configured";

  if (mapsKey) {
    const suburbHit = await geocodeAddress(mapsKey, query);
    const cbdHit = await geocodeAddress(mapsKey, `${city} CBD, Zimbabwe`);
    if (suburbHit && cbdHit) {
      cbdDistanceKm = haversineKm(suburbHit.lat, suburbHit.lng, cbdHit.lat, cbdHit.lng);
      provider = "google_maps";
    }
  }

  return ok({
    city,
    suburb,
    cbdDistanceKm: cbdDistanceKm === null ? null : Math.round(cbdDistanceKm * 10) / 10,
    places: [],
    provider,
  });
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
