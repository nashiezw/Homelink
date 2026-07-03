import { getHydratedPublicPlatformConfig } from "@/lib/settings/runtime";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await getHydratedPublicPlatformConfig());
}
