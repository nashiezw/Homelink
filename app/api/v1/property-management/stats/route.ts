import { ok } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export function GET() {
  return ok(getStore().getPMPublicStats());
}
