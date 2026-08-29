import { getCachedHydratedPublicPlatformConfig } from "@/lib/settings/runtime";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = ok(await getCachedHydratedPublicPlatformConfig());
  response.headers.set("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=600");
  return response;
}
