import { getHydratedPublicPlatformConfig } from "@/lib/settings/runtime";
import { ok } from "@/lib/api/response";
import { repairLegacyBrandingInPostgres } from "@/lib/brand/rebrand";

export const dynamic = "force-dynamic";

export async function GET() {
  await repairLegacyBrandingInPostgres();
  const response = ok(await getHydratedPublicPlatformConfig());
  response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return response;
}
