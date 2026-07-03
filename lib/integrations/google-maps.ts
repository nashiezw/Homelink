type MapsTestResult = { ok: boolean; message: string; sample?: string };

export async function testGoogleMapsKey(apiKey: string): Promise<MapsTestResult> {
  if (!apiKey.trim()) {
    return { ok: false, message: "Add a Google Maps API key in Platform Settings → Integrations." };
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", "Harare, Zimbabwe");
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as {
      status: string;
      results?: Array<{ formatted_address: string }>;
      error_message?: string;
    };

    if (data.status === "OK" && data.results?.[0]) {
      return {
        ok: true,
        message: "Google Maps Geocoding API responded successfully.",
        sample: data.results[0].formatted_address,
      };
    }

    if (data.status === "REQUEST_DENIED") {
      return {
        ok: false,
        message: data.error_message ?? "Google Maps API key was rejected. Enable Geocoding API for this key.",
      };
    }

    return {
      ok: false,
      message: data.error_message ?? `Google Maps API returned status: ${data.status}`,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Network error";
    return { ok: false, message: `Maps test failed: ${detail}` };
  }
}

export async function geocodeAddress(
  apiKey: string,
  query: string,
): Promise<{ lat: number; lng: number; formatted: string } | null> {
  if (!apiKey.trim() || !query.trim()) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { next: { revalidate: 3600 } });
  const data = (await response.json()) as {
    status: string;
    results?: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  const hit = data.results?.[0];
  if (!hit) return null;

  return {
    lat: hit.geometry.location.lat,
    lng: hit.geometry.location.lng,
    formatted: hit.formatted_address,
  };
}
