import { requireAdmin, requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { applyPostgresAgencyAction, listPostgresAgencies } from "@/lib/admin/postgres-agency-management";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  if (isPostgresStoreEnabled()) {
    return ok(await listPostgresAgencies(includeDeleted));
  }

  const store = getStore();
  const agencies = store.listAgencies(includeDeleted);
  const agents = store.listAgents();

  return ok({
    agencies,
    agents,
    summary: {
      agencies: agencies.length,
      agents: agents.length,
      verifiedAgencies: agencies.filter((a) => a.verificationStatus === "VERIFIED").length,
      suspendedAgencies: agencies.filter((a) => a.accountStatus === "SUSPENDED").length,
      totalRevenue: agencies.reduce((s, a) => s + a.revenue, 0),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const body = await request.json();
  const { agencyId, action, reason, tier, name, email, phone, city } = body as {
    agencyId: string;
    action: string;
    reason?: string;
    tier?: string;
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
  };

  if (!agencyId || !action) {
    return problem(400, "INVALID_INPUT", "agencyId and action are required.");
  }

  const actor = { id: auth.user.id, name: auth.user.name };
  if (isPostgresStoreEnabled()) {
    try {
      const agency = await applyPostgresAgencyAction(agencyId, action, actor, { reason, tier, name, email, phone, city });
      if (!agency) return problem(404, "NOT_FOUND", "Agency not found.");
      return ok({ agency });
    } catch (error) {
      return problem(400, "UNKNOWN_ACTION", error instanceof Error ? error.message : `Unknown action: ${action}`);
    }
  }

  const store = getStore();
  switch (action) {
    case "verify":
      return ok({ agency: store.verifyAgency(agencyId, actor) });
    case "reject":
      return ok({ agency: store.rejectAgency(agencyId, actor, reason) });
    case "suspend":
      return ok({ agency: store.suspendAgency(agencyId, actor, reason) });
    case "activate":
      return ok({ agency: store.activateAgency(agencyId, actor) });
    case "delete":
      return ok({ agency: store.deleteAgency(agencyId, actor, reason) });
    case "feature":
      return ok({ agency: store.featureAgency(agencyId, actor) });
    case "update":
      return ok({
        agency: store.updateAgency(agencyId, {
          name,
          email,
          phone,
          city,
          subscriptionTier: tier as "FREE" | "PRO" | "ENTERPRISE" | undefined,
        }, actor),
      });
    default:
      return problem(400, "UNKNOWN_ACTION", `Unknown action: ${action}`);
  }
}
