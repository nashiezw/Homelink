import { getCachedHydratedPublicPlatformConfigResult } from "@/lib/settings/runtime";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getCachedHydratedPublicPlatformConfigResult();
  const response = ok(result.config, result.degraded ? { degraded: true } : {});
  response.headers.set(
    "Cache-Control",
    result.degraded ? "no-store" : "public, max-age=300, s-maxage=600, stale-while-revalidate=600",
  );
  return response;
}
