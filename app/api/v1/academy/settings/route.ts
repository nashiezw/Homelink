import { ok, problem } from "@/lib/api/response";
import { getAcademySettingsPublic } from "@/lib/academy/public-academy-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getAcademySettingsPublic());
  } catch (error) {
    console.error("Failed to load academy settings", error);
    return problem(500, "SETTINGS_FAILED", "Academy settings could not be loaded.");
  }
}
