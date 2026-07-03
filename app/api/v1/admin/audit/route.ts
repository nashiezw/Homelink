import { requireAdmin } from "@/lib/admin/require-admin";
import { getAuditLog } from "@/lib/admin/compute-analytics";
import { ok } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase().trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
  const offset = Number(searchParams.get("offset") ?? 0);

  const store = getStore();
  let entries = getAuditLog();

  if (q) {
    entries = entries.filter(
      (e) =>
        e.actor.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q),
    );
  }

  const total = entries.length;
  const page = entries.slice(offset, offset + limit);

  return ok({
    entries: page,
    total,
    limit,
    offset,
    rawCount: store.getAuditLog(500).length,
  });
}
