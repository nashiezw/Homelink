import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem, created } from "@/lib/api/response";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";
import { Role, VerificationStatus } from "@prisma/client";

async function getAdmin(request: Request) {
  const result = await requireAdminAsync(request);
  if ("error" in result && result.error) return { error: result.error };
  return { user: result.user };
}

export async function GET(request: Request) {
  const auth = await getAdmin(request);
  if ("error" in auth && auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") ?? "overview";
  if (isPostgresStoreEnabled()) {
    const prisma = getMainPrisma();
    const [agents, pendingApplications, leads, commissions] = await Promise.all([
      prisma.user.findMany({
        where: { roles: { has: Role.AGENT } },
        select: { id: true, name: true, email: true, phone: true, identityStatus: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: { roles: { has: Role.AGENT }, identityStatus: VerificationStatus.PENDING } }),
      prisma.agentLeadRecord.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.agentCommissionRecord.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    const closedWon = leads.filter((lead) => lead.status === "CLOSED_WON").length;
    const leadConversionRate = leads.length ? Math.round((closedWon / leads.length) * 1000) / 10 : 0;
    if (section === "settings") {
      return ok({ settings: {}, territories: [] });
    }
    return ok({
      analytics: {
        totalAgents: agents.length,
        pendingApplications,
        leadConversionRate,
        activeLeads: leads.filter((lead) => !["CLOSED_WON", "CLOSED_LOST"].includes(lead.status)).length,
        pendingCommissions: commissions.filter((commission) => commission.status === "PENDING").length,
      },
      applications: agents
        .filter((agent) => agent.identityStatus === VerificationStatus.PENDING)
        .map((agent) => ({
          id: agent.id,
          userId: agent.id,
          status: "PENDING",
          submittedAt: agent.createdAt.toISOString(),
          name: agent.name,
          email: agent.email,
        })),
      profiles: agents.map((agent) => ({
        userId: agent.id,
        userName: agent.name,
        userEmail: agent.email,
        phone: agent.phone,
        verificationStatus: agent.identityStatus,
      })),
      leads: [],
      commissions: [],
      territories: [],
      settings: {},
      documents: [],
      branches: [],
    });
  }
  const store = getStore();

  if (section === "settings") {
    return ok({
      settings: store.getAgentSettings(),
      territories: store.listAgentTerritories(),
    });
  }

  return ok({
    analytics: store.getAgentAdminAnalytics(),
    applications: store.listAgentApplications(),
    profiles: store.listAgentProfiles().map((p) => ({
      ...p,
      userName: store.getUserById(p.userId)?.name,
      userEmail: store.getUserById(p.userId)?.email,
    })),
    leads: store.listAgentLeads(),
    commissions: store.listAgentCommissions(),
    territories: store.listAgentTerritories(),
    settings: store.getAgentSettings(),
    documents: store.listAgentDocuments(),
    branches: store.listAgentBranches(),
  });
}

export async function PATCH(request: Request) {
  const auth = await getAdmin(request);
  if ("error" in auth && auth.error) return auth.error;
  if (isPostgresStoreEnabled()) return problem(501, "NOT_IMPLEMENTED", "Agent admin writes are not available in production yet.");
  const admin = auth.user!;
  const body = await request.json();
  const store = getStore();
  const actor = { id: admin.id, name: admin.name };

  if (body.action === "update_settings") {
    return ok(store.updateAgentSettings(body.settings));
  }
  if (body.action === "update_commission_rules") {
    return ok(store.updateAgentCommissionRules(body.rules, actor, body.reason));
  }
  if (body.action === "update_application_status") {
    return ok(store.updateAgentApplicationStatus(body.applicationId, body.status, actor, body.note));
  }
  if (body.action === "approve_application") {
    return ok(store.approveAgentApplication(body.applicationId, actor));
  }
  if (body.action === "update_profile") {
    return ok(store.updateAgentProfile(body.userId, body.updates));
  }
  if (body.action === "pay_commission") {
    const payout = body.payout as
      | {
          method?: "bank_transfer" | "ecocash" | "onemoney" | "innbucks" | "cash";
          sourceAccount?: string;
          destinationAccount?: string;
          reference?: string;
          note?: string;
        }
      | undefined;
    if (!payout?.method || !payout.sourceAccount || !payout.destinationAccount || !payout.reference) {
      return problem(400, "INVALID_PAYOUT", "Payout method, source account, destination account, and reference are required.");
    }
    const commission = store.payAgentCommission(body.commissionId, actor, {
      method: payout.method,
      sourceAccount: payout.sourceAccount,
      destinationAccount: payout.destinationAccount,
      reference: payout.reference,
      note: payout.note,
    });
    if (!commission) return problem(400, "INVALID_COMMISSION", "Commission is already paid, cancelled, or does not exist.");
    return ok(commission);
  }
  if (body.action === "approve_commission") {
    const commission = store.approveAgentCommission(body.commissionId, actor, body.reason);
    if (!commission) return problem(400, "INVALID_COMMISSION", "Commission is not pending or does not exist.");
    return ok(commission);
  }
  if (body.action === "update_commission_status") {
    const commission = store.updateAgentCommissionStatus(body.commissionId, body.status, actor, body.reason ?? "Status updated by administrator.");
    if (!commission) return problem(400, "INVALID_COMMISSION", "Commission is paid, missing, or cannot be updated.");
    return ok(commission);
  }
  if (body.action === "update_lead") {
    const lead = store.updateAgentLeadStatus(body.leadId, body.status, body.notes);
    if (!lead) return problem(404, "NOT_FOUND", "Lead not found.");
    return ok(lead);
  }
  if (body.action === "assign_lead") {
    const lead = store.reassignAgentLead(body.leadId, body.agentUserId);
    if (!lead) return problem(404, "NOT_FOUND", "Lead or agent not found.");
    return ok(lead);
  }
  if (body.action === "update_lead_ownership") {
    const lead = store.updateAgentLeadOwnership(body.leadId, body.updates ?? {}, actor, body.reason ?? "Lead ownership reviewed by administrator.");
    if (!lead) return problem(404, "NOT_FOUND", "Lead or agent not found.");
    return ok(lead);
  }
  if (body.action === "save_territory") {
    return ok(store.saveAgentTerritory(body.territory));
  }
  if (body.action === "delete_territory") {
    store.deleteAgentTerritory(body.territoryId);
    return ok({ deleted: true });
  }
  if (body.action === "verify_document" && body.documentId && body.status) {
    const doc = store.updateAgentDocument(body.documentId, body.status);
    if (!doc) return problem(404, "NOT_FOUND", "Document not found.");
    return ok({ document: doc });
  }
  if (body.action === "upsert_branch" && body.branch) {
    return ok({ branch: store.upsertAgentBranch(body.branch) });
  }

  return problem(400, "INVALID_ACTION", "Unknown action.");
}

export async function POST(request: Request) {
  const auth = await getAdmin(request);
  if ("error" in auth && auth.error) return auth.error;
  if (isPostgresStoreEnabled()) return problem(501, "NOT_IMPLEMENTED", "Agent admin writes are not available in production yet.");
  const admin = auth.user!;
  const body = await request.json();
  if (body.action === "schedule_interview") {
    const app = getStore().updateAgentApplicationStatus(
      body.applicationId,
      "INTERVIEW_SCHEDULED",
      { id: admin.id, name: admin.name },
      `Interview scheduled for ${body.interviewAt}`,
    );
    return created(app);
  }
  return problem(400, "INVALID_ACTION", "Unknown action.");
}
