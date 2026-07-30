import { ok, problem } from "@/lib/api/response";
import { getLibraryStoreSettings, publicLibraryStoreSettings } from "@/lib/library/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getLibraryStoreSettings();
    return ok(publicLibraryStoreSettings(settings));
  } catch (error) {
    console.error("[library/settings] failed", error);
    return problem(500, "LIBRARY_SETTINGS_FAILED", "Library settings could not be loaded.");
  }
}
