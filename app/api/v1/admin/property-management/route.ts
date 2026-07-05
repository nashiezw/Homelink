import { requireAdmin } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { listPMRequestsFromPostgres, shouldUsePostgresPM } from "@/lib/property-management/postgres-pm-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const store = getStore();
  const requests = shouldUsePostgresPM()
    ? await listPMRequestsFromPostgres({ q, status })
    : store.listPMRequests({
        q,
        status: status as import("@/lib/property-management/types").PMRequestStatus | undefined,
        includeDeleted: searchParams.get("deleted") === "true",
      });

  const summary = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING_ASSIGNMENT").length,
    assigned: requests.filter((r) => r.status === "ASSIGNED").length,
    inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
    slaBreached: requests.filter((r) => r.slaBreached).length,
    closed: requests.filter((r) => r.status === "CLOSED").length,
  };

  return ok({
    requests,
    summary,
    leads: shouldUsePostgresPM() ? [] : store.listCRMLeads(),
    consultants: shouldUsePostgresPM() ? [] : store.listConsultants(),
  });
}
