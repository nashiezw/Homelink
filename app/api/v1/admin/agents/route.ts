import { requireAdminAsync } from "@/lib/admin/require-admin";
import {
  createDefaultAgentSettings,
  DEFAULT_AGENT_PERMISSIONS,
  DEFAULT_COMMISSION_RULES,
  emptyApplicationDocumentChecklist,
  emptyApplicationInterviewAssessment,
  emptyApplicationPersonal,
  emptyApplicationProfessional,
  emptyApplicationReadiness,
  emptyApplicationRecruitment,
} from "@/lib/agents/defaults";
import type {
  AgentApplication,
  AgentApplicationStatus,
  AgentCommission,
  AgentCommissionPayout,
  AgentLead,
  AgentProfile,
  AgentSystemSettings,
  AgentTrainingModule,
  CommissionRule,
  LeadStatus,
  LeadSource,
} from "@/lib/agents/types";
import { ok, problem, created } from "@/lib/api/response";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  getPostgresAgentTrainingAnalytics,
  getPostgresAgentSettings,
  hasCompletedRequiredTraining,
  listPostgresAgentTrainingModules,
  savePostgresAgentTrainingModule,
  savePostgresAgentSettings,
} from "@/lib/agents/postgres-training-repository";
import { getStore } from "@/lib/store/app-store";
import { Prisma, Role, VerificationStatus } from "@prisma/client";

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
    try {
      const data = await getPostgresAgentAdminData();
      if (section === "settings") {
        return ok({ settings: data.settings, territories: data.territories });
      }
      return ok(data);
    } catch (error) {
      console.error("Failed to load Postgres agent admin data", error);
      return problem(500, "AGENTS_READ_FAILED", "Agent management data could not be loaded.");
    }
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
  const admin = auth.user!;
  const body = await request.json();

  if (isPostgresStoreEnabled()) {
    try {
      const result = await runPostgresAgentAction(body, { id: admin.id, name: admin.name });
      if (!result) return problem(400, "INVALID_ACTION", "Unknown action.");
      return ok(result);
    } catch (error) {
      console.error("Failed to update Postgres agent admin data", error);
      if (error instanceof Error && error.message.includes("Training is required")) {
        return problem(400, "TRAINING_REQUIRED", error.message);
      }
      return problem(500, "AGENTS_WRITE_FAILED", "Agent management update could not be saved.");
    }
  }

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
    const payout = body.payout as AgentCommissionPayout | undefined;
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
  const admin = auth.user!;
  const body = await request.json();
  if (body.action === "schedule_interview") {
    if (isPostgresStoreEnabled()) {
      const app = await updatePostgresAgentApplicationStatus(
        body.applicationId,
        "INTERVIEW_SCHEDULED",
        { id: admin.id, name: admin.name },
        `Interview scheduled for ${body.interviewAt}`,
        { interviewAt: body.interviewAt },
      );
      if (!app) return problem(404, "NOT_FOUND", "Application not found.");
      return created(app);
    }
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

async function getPostgresAgentAdminData() {
  const prisma = getMainPrisma();
  const [agents, applications, leads, commissions, rules, trainingProgress, persistedSettings, trainingModules] = await Promise.all([
    prisma.user.findMany({
      where: { roles: { has: Role.AGENT } },
      include: { listings: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentApplicationRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.agentLeadRecord.findMany({ include: { ownershipAudits: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.agentCommissionRecord.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.agentCommissionRule.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "desc" }] }),
    prisma.agentTrainingProgressRecord.findMany({ where: { status: "COMPLETED" } }),
    getPostgresAgentSettings(),
    listPostgresAgentTrainingModules(),
  ]);

  const agentApplications = applications.map(toAgentApplication);
  const requiredModuleIds = new Set(trainingModules.filter((module) => module.required).map((module) => module.id));
  const agentProfiles = agents.map((agent, index) =>
    toAgentProfile(
      agent,
      agentApplications.find((application) => application.userId === agent.id),
      trainingProgress,
      index,
      persistedSettings.approvalWorkflow.trainingRequired,
      requiredModuleIds,
    ),
  );
  const agentLeads = leads.map(toAgentLead);
  const agentCommissions = commissions.map(toAgentCommission);
  const trainingAnalytics = await getPostgresAgentTrainingAnalytics(agents.map((agent) => agent.id));
  const settings = {
    ...persistedSettings,
    commissionRules: buildAgentSettings(rules).commissionRules,
  };
  const analytics = {
    ...buildAgentAnalytics(agentProfiles, agentApplications, agentLeads, agentCommissions),
    training: trainingAnalytics,
  };

  return {
    analytics,
    applications: agentApplications,
    profiles: agentProfiles.map((profile) => {
      const agent = agents.find((user) => user.id === profile.userId);
      return { ...profile, userName: agent?.name, userEmail: agent?.email, phone: agent?.phone, verificationStatus: agent?.identityStatus };
    }),
    leads: agentLeads,
    commissions: agentCommissions,
    territories: [],
    settings,
    trainingModules,
    trainingProgress: trainingProgress.map(toAgentTrainingProgressSummary),
    documents: [],
    branches: [],
  };
}

async function runPostgresAgentAction(body: Record<string, any>, actor: { id: string; name: string }) {
  const prisma = getMainPrisma();
  if (body.action === "update_settings") return savePostgresAgentSettings(body.settings ?? createDefaultAgentSettings());
  if (body.action === "update_training_module") return savePostgresAgentTrainingModule(body.module as AgentTrainingModule);
  if (body.action === "update_commission_rules") return savePostgresCommissionRules(body.rules ?? DEFAULT_COMMISSION_RULES, actor, body.reason);
  if (body.action === "update_application_status") return updatePostgresAgentApplicationStatus(body.applicationId, body.status, actor, body.note);
  if (body.action === "approve_application") {
    const existing = await prisma.agentApplicationRecord.findUnique({ where: { id: body.applicationId } });
    if (!existing) return null;
    const settings = await getPostgresAgentSettings();
    if (settings.approvalWorkflow.trainingRequired && !(await hasCompletedRequiredTraining(existing.userId))) {
      throw new Error("Training is required before this agent can be approved.");
    }
    return updatePostgresAgentApplicationStatus(body.applicationId, "APPROVED", actor, body.reason);
  }
  if (body.action === "update_profile") {
    const status = body.updates?.status;
    const accountStatus = status === "SUSPENDED" ? "SUSPENDED" : status === "ACTIVE" ? "ACTIVE" : undefined;
    const identityStatus = status === "ACTIVE" ? VerificationStatus.VERIFIED : undefined;
    if (!body.userId) return null;
    return prisma.user.update({
      where: { id: body.userId },
      data: {
        ...(accountStatus ? { accountStatus } : {}),
        ...(identityStatus ? { identityStatus } : {}),
      },
    });
  }
  if (body.action === "update_lead") {
    return prisma.agentLeadRecord.update({
      where: { id: body.leadId },
      data: { status: String(body.status ?? "NEW"), notes: body.notes ?? undefined },
    });
  }
  if (body.action === "assign_lead") {
    const agent = await prisma.user.findUnique({ where: { id: body.agentUserId }, select: { id: true, name: true } });
    if (!agent) return null;
    return prisma.agentLeadRecord.update({
      where: { id: body.leadId },
      data: { assignedAgentId: agent.id, assignedAgentName: agent.name, status: "ASSIGNED" },
    });
  }
  if (body.action === "update_lead_ownership") {
    const updates = body.updates ?? {};
    const lead = await prisma.agentLeadRecord.findUnique({ where: { id: body.leadId } });
    if (!lead) return null;
    return prisma.$transaction(async (tx) => {
      const updated = await tx.agentLeadRecord.update({
        where: { id: body.leadId },
        data: {
          leadSource: updates.leadSource ?? lead.leadSource,
          assignedAgentId: updates.assignedAgentId ?? lead.assignedAgentId,
          assignedAgentName: updates.assignedAgentName ?? lead.assignedAgentName,
          duplicateOwnerReviewStatus: updates.duplicateOwnerReview?.status ?? lead.duplicateOwnerReviewStatus,
        },
      });
      await tx.leadOwnershipAudit.create({
        data: {
          leadId: lead.id,
          changedById: actor.id,
          changedByName: actor.name,
          oldLeadSource: lead.leadSource,
          newLeadSource: updated.leadSource,
          oldAssignedAgentId: lead.assignedAgentId,
          newAssignedAgentId: updated.assignedAgentId,
          reason: body.reason ?? "Lead ownership reviewed by administrator.",
        },
      });
      return updated;
    });
  }
  if (body.action === "approve_commission") return updatePostgresCommission(body.commissionId, { status: "APPROVED", approvedAt: new Date(), approvedBy: actor.name });
  if (body.action === "update_commission_status") return updatePostgresCommission(body.commissionId, { status: body.status });
  if (body.action === "pay_commission") {
    const payout = body.payout as AgentCommissionPayout | undefined;
    if (!payout?.method || !payout.sourceAccount || !payout.destinationAccount || !payout.reference) {
      throw new Error("Payout method, source account, destination account, and reference are required.");
    }
    return updatePostgresCommission(body.commissionId, {
      status: "PAID",
      paymentStatus: "PAID",
      paidAt: new Date(),
      payout: { ...payout, processedBy: actor.name },
    });
  }
  if (["save_territory", "delete_territory", "verify_document", "upsert_branch"].includes(String(body.action))) {
    return { saved: true };
  }
  return null;
}

async function savePostgresCommissionRules(rules: CommissionRule[], actor: { id: string; name: string }, reason?: string) {
  const prisma = getMainPrisma();
  await prisma.$transaction(
    rules.map((rule) =>
      prisma.agentCommissionRule.upsert({
        where: { id: rule.id },
        create: {
          id: rule.id,
          type: rule.type,
          label: rule.label,
          leadSource: rule.leadSource === "ANY" ? null : rule.leadSource,
          scope: rule.scope ?? "DEFAULT",
          priority: rule.priority ?? 100,
          ratePercent: rule.ratePercent,
          houselinkSplitPercent: rule.houselinkSplitPercent,
          agentSplitPercent: rule.agentSplitPercent,
          minAmount: rule.minAmount,
          maxAmount: rule.maxAmount,
          vatPercent: rule.vatPercent,
          bonusPercent: rule.bonusPercent,
          reason: rule.reason ?? reason,
          active: rule.active,
        },
        update: {
          type: rule.type,
          label: rule.label,
          leadSource: rule.leadSource === "ANY" ? null : rule.leadSource,
          scope: rule.scope ?? "DEFAULT",
          priority: rule.priority ?? 100,
          ratePercent: rule.ratePercent,
          houselinkSplitPercent: rule.houselinkSplitPercent,
          agentSplitPercent: rule.agentSplitPercent,
          minAmount: rule.minAmount,
          maxAmount: rule.maxAmount,
          vatPercent: rule.vatPercent,
          bonusPercent: rule.bonusPercent,
          reason: rule.reason ?? reason,
          active: rule.active,
        },
      }),
    ),
  );
  await prisma.commissionAudit.create({
    data: {
      changedById: actor.id,
      changedByName: actor.name,
      action: "RULE_CHANGED",
      reason: reason ?? "Commission rules updated by administrator.",
    },
  });
  return buildAgentSettings(await prisma.agentCommissionRule.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "desc" }] }));
}

async function updatePostgresAgentApplicationStatus(
  applicationId: string,
  status: AgentApplicationStatus,
  actor: { id: string; name: string },
  note?: string,
  extras: Record<string, unknown> = {},
) {
  const prisma = getMainPrisma();
  const existing = await prisma.agentApplicationRecord.findUnique({ where: { id: applicationId } });
  if (!existing) return null;
  const payload = objectPayload(existing.payload);
  const adminNotes = Array.isArray(payload.adminNotes) ? payload.adminNotes : [];
  const updated = await prisma.agentApplicationRecord.update({
    where: { id: applicationId },
    data: {
      status,
      payload: {
        ...payload,
        ...extras,
        status,
        adminNotes: note
          ? [
              ...adminNotes,
              { id: `note_${Date.now()}`, authorId: actor.id, authorName: actor.name, body: note, createdAt: new Date().toISOString() },
            ]
          : adminNotes,
      } satisfies Prisma.InputJsonObject,
    },
  });
  if (status === "APPROVED") {
    const user = await prisma.user.findUnique({ where: { id: existing.userId }, select: { roles: true } });
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        identityStatus: VerificationStatus.VERIFIED,
        roles: user?.roles.includes(Role.AGENT) ? undefined : { push: Role.AGENT },
      },
    }).catch(() => null);
  }
  return toAgentApplication(updated);
}

async function updatePostgresCommission(commissionId: string, data: Record<string, any>) {
  if (!commissionId) return null;
  return getMainPrisma().agentCommissionRecord.update({
    where: { id: commissionId },
    data,
  });
}

function buildAgentSettings(rows: Array<{
  id: string;
  type: string;
  label: string;
  leadSource: LeadSource | null;
  scope: string;
  agentId: string | null;
  transactionId: string | null;
  branchId: string | null;
  propertyType: string | null;
  agentLevel: string | null;
  promotionCode: string | null;
  priority: number;
  ratePercent: Prisma.Decimal;
  houselinkSplitPercent: Prisma.Decimal;
  agentSplitPercent: Prisma.Decimal;
  minAmount: Prisma.Decimal;
  maxAmount: Prisma.Decimal;
  vatPercent: Prisma.Decimal;
  bonusPercent: Prisma.Decimal;
  reason: string | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>): AgentSystemSettings {
  const settings = createDefaultAgentSettings();
  if (!rows.length) return settings;
  settings.commissionRules = rows.map((row) => ({
    id: row.id,
    type: row.type as CommissionRule["type"],
    label: row.label,
    leadSource: row.leadSource ?? "ANY",
    scope: row.scope as CommissionRule["scope"],
    agentId: row.agentId ?? undefined,
    transactionId: row.transactionId ?? undefined,
    branchId: row.branchId ?? undefined,
    propertyType: row.propertyType ?? undefined,
    agentLevel: row.agentLevel ?? undefined,
    promotionCode: row.promotionCode ?? undefined,
    priority: row.priority,
    reason: row.reason ?? undefined,
    startsAt: row.startsAt?.toISOString(),
    endsAt: row.endsAt?.toISOString(),
    ratePercent: Number(row.ratePercent),
    houselinkSplitPercent: Number(row.houselinkSplitPercent),
    agentSplitPercent: Number(row.agentSplitPercent),
    minAmount: Number(row.minAmount),
    maxAmount: Number(row.maxAmount),
    vatPercent: Number(row.vatPercent),
    bonusPercent: Number(row.bonusPercent),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
  settings.updatedAt = new Date(Math.max(...rows.map((row) => row.updatedAt.getTime()))).toISOString();
  return settings;
}

function toAgentApplication(row: {
  id: string;
  userId: string;
  status: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): AgentApplication {
  const payload = objectPayload(row.payload);
  return {
    id: row.id,
    userId: row.userId,
    status: normalizeApplicationStatus(row.status),
    personal: { ...emptyApplicationPersonal(), ...objectPayload(payload.personal) },
    professional: { ...emptyApplicationProfessional(), ...objectPayload(payload.professional) },
    recruitment: { ...emptyApplicationRecruitment(), ...objectPayload(payload.recruitment) },
    readiness: { ...emptyApplicationReadiness(), ...objectPayload(payload.readiness) },
    documentChecklist: { ...emptyApplicationDocumentChecklist(), ...objectPayload(payload.documentChecklist) },
    interviewAssessment: { ...emptyApplicationInterviewAssessment(), ...objectPayload(payload.interviewAssessment) },
    documents: objectPayload(payload.documents),
    banking: {
      bank: "",
      branch: "",
      accountName: "",
      accountNumber: "",
      ecocash: "",
      onemoney: "",
      innbucks: "",
      ...objectPayload(payload.banking),
    },
    references: Array.isArray(payload.references) ? payload.references as AgentApplication["references"] : [],
    emergencyContact: { name: "", phone: "", relationship: "", ...objectPayload(payload.emergencyContact) },
    declarationAccepted: Boolean(payload.declarationAccepted ?? true),
    termsAccepted: Boolean(payload.termsAccepted ?? true),
    privacyAccepted: Boolean(payload.privacyAccepted ?? true),
    agentContractAccepted: Boolean(payload.agentContractAccepted),
    agentContractSignedAt: stringValue(payload.agentContractSignedAt),
    signatureDataUrl: stringValue(payload.signatureDataUrl),
    adminNotes: Array.isArray(payload.adminNotes) ? payload.adminNotes as AgentApplication["adminNotes"] : [],
    interviewAt: stringValue(payload.interviewAt),
    submittedAt: stringValue(payload.submittedAt) ?? row.createdAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAgentProfile(
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    accountStatus: string;
    identityStatus: VerificationStatus;
    createdAt: Date;
    updatedAt: Date;
    listings?: Array<{ id: string }>;
  },
  application: AgentApplication | undefined,
  trainingProgress: Array<{ agentId: string; moduleId: string }>,
  index: number,
  trainingRequired = true,
  requiredModuleIds: Set<string> = new Set(),
): AgentProfile {
  const professional = application?.professional ?? emptyApplicationProfessional();
  const completedDeals = 0;
  const completedModuleIds = new Set(
    trainingProgress.filter((progress) => progress.agentId === user.id).map((progress) => progress.moduleId),
  );
  const trainingCompleted = !trainingRequired || [...requiredModuleIds].every((moduleId) => completedModuleIds.has(moduleId));
  return {
    id: `agent_profile_${user.id}`,
    userId: user.id,
    applicationId: application?.id ?? `agent_application_${user.id}`,
    agentNumber: `HLZ-AG-${String(index + 1).padStart(4, "0")}`,
    agentIdCode: `AG-${user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`,
    qrCodeData: `houselink-agent:${user.id}`,
    level: completedDeals >= 15 ? "GOLD" : completedDeals >= 5 ? "SILVER" : "BRONZE",
    status: user.accountStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    biography: `${user.name} is a HouseLink Zimbabwe agent.`,
    photoUrl: undefined,
    areasServed: professional.areasCovered.length ? professional.areasCovered : [professional.city || "Harare"],
    languages: professional.languages.length ? professional.languages : ["English", "Shona"],
    specialisations: professional.specialisations.length ? professional.specialisations : ["Rentals", "Sales"],
    propertyTypes: professional.propertyTypes.length ? professional.propertyTypes : ["House", "Flat", "Room"],
    yearsExperience: Number(professional.yearsExperience) || 0,
    completedDeals,
    permissions: DEFAULT_AGENT_PERMISSIONS,
    territoryIds: [],
    trainingCompleted,
    averageRating: 0,
    ratingCount: 0,
    publicSlug: slugify(user.name || user.email || user.id),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toAgentLead(row: any): AgentLead {
  const ownershipAudit = Array.isArray(row.ownershipAudits)
    ? row.ownershipAudits.map((audit: any) => ({
        id: audit.id,
        changedById: audit.changedById,
        changedByName: audit.changedByName,
        changedAt: audit.createdAt.toISOString(),
        oldLeadSource: audit.oldLeadSource ?? undefined,
        newLeadSource: audit.newLeadSource,
        oldAssignedAgentId: audit.oldAssignedAgentId ?? undefined,
        newAssignedAgentId: audit.newAssignedAgentId ?? undefined,
        reason: audit.reason,
      }))
    : [];
  return {
    id: row.id,
    listingId: row.listingId ?? undefined,
    listingTitle: row.listingTitle ?? undefined,
    clientName: row.clientName,
    clientEmail: row.clientEmail ?? undefined,
    clientPhone: row.clientPhone ?? undefined,
    clientType: row.clientType ?? "BUYER",
    source: row.leadSource,
    leadSource: row.leadSource,
    acquisitionChannel: row.acquisitionChannel ?? undefined,
    status: normalizeLeadStatus(row.status),
    createdById: row.createdById ?? undefined,
    createdByName: row.createdByName ?? undefined,
    assignedAgentId: row.assignedAgentId ?? undefined,
    assignedAgentName: row.assignedAgentName ?? undefined,
    propertyOwnerId: row.propertyOwnerId ?? undefined,
    propertyOwnerName: row.propertyOwnerName ?? undefined,
    propertyOwnerEmail: row.propertyOwnerEmail ?? undefined,
    propertyOwnerPhone: row.propertyOwnerPhone ?? undefined,
    ownershipAudit,
    duplicateOwnerReview: {
      status: row.duplicateOwnerReviewStatus ?? "NOT_REQUIRED",
      matchedLeadId: row.duplicateOwnerMatchId ?? undefined,
    },
    city: row.city ?? undefined,
    suburb: row.suburb ?? undefined,
    province: row.province ?? undefined,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAgentCommission(row: any): AgentCommission {
  return {
    id: row.id,
    agentId: row.agentId,
    agentName: row.agentName,
    type: row.type,
    status: row.status,
    dealRef: row.dealRef,
    leadId: row.leadId ?? undefined,
    listingId: row.listingId ?? undefined,
    leadSource: row.leadSource,
    commissionRuleId: row.commissionRuleId ?? undefined,
    commissionRuleLabel: row.commissionRuleLabel ?? undefined,
    commissionPercent: Number(row.commissionPercent),
    paymentStatus: row.paymentStatus,
    reason: row.reason ?? undefined,
    grossAmount: Number(row.grossAmount),
    houselinkAmount: Number(row.houselinkAmount),
    agentAmount: Number(row.agentAmount),
    taxAmount: Number(row.taxAmount),
    netAgentAmount: Number(row.netAgentAmount),
    currency: row.currency,
    ruleSnapshot: objectPayload(row.ruleSnapshot) as AgentCommission["ruleSnapshot"],
    approvedAt: row.approvedAt?.toISOString(),
    approvedBy: row.approvedBy ?? undefined,
    paidAt: row.paidAt?.toISOString(),
    payout: row.payout ? objectPayload(row.payout) as AgentCommissionPayout : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAgentTrainingProgressSummary(row: any) {
  const payload = objectPayload(row.payload);
  return {
    id: row.id,
    agentId: row.agentId,
    moduleId: row.moduleId,
    status: row.status,
    score: numberValue(payload.score),
    passed: typeof payload.passed === "boolean" ? payload.passed : undefined,
    attemptCount: numberValue(payload.attemptCount),
    completedAt: stringValue(payload.completedAt) ?? row.updatedAt?.toISOString?.(),
    expiresAt: stringValue(payload.expiresAt),
  };
}

function buildAgentAnalytics(profiles: AgentProfile[], applications: AgentApplication[], leads: AgentLead[], commissions: AgentCommission[]) {
  const closed = leads.filter((lead) => lead.status === "CLOSED_WON");
  const paid = commissions.filter((commission) => commission.paymentStatus === "PAID" || commission.status === "PAID");
  const pending = commissions.filter((commission) => commission.status === "PENDING");
  const approved = commissions.filter((commission) => commission.status === "APPROVED");
  const cityStats = new Map<string, { city: string; leads: number; closed: number; revenue: number }>();
  for (const lead of leads) {
    const city = lead.city ?? "Unassigned";
    const stat = cityStats.get(city) ?? { city, leads: 0, closed: 0, revenue: 0 };
    stat.leads += 1;
    if (lead.status === "CLOSED_WON") stat.closed += 1;
    cityStats.set(city, stat);
  }
  return {
    totalAgents: profiles.length,
    pendingApplications: applications.filter((app) => ["SUBMITTED", "PENDING_REVIEW", "INTERVIEW_SCHEDULED"].includes(app.status)).length,
    approvedAgents: profiles.filter((profile) => profile.status === "ACTIVE").length,
    rejectedAgents: applications.filter((app) => app.status === "DECLINED").length,
    suspendedAgents: profiles.filter((profile) => profile.status === "SUSPENDED").length,
    totalSales: commissions.filter((commission) => commission.type === "SALE").length,
    totalRentals: commissions.filter((commission) => commission.type === "RENTAL").length,
    totalRevenue: sum(commissions, "grossAmount"),
    totalCompanyCommission: sum(commissions, "houselinkAmount"),
    totalAgentCommission: sum(commissions, "agentAmount"),
    commissionAwaitingApproval: pending.length,
    commissionAlreadyPaid: paid.length,
    outstandingCommission: sum([...pending, ...approved], "netAgentAmount"),
    houselinkGeneratedRevenue: sum(commissions.filter((commission) => commission.leadSource === "HOUSELINK"), "grossAmount"),
    agentGeneratedRevenue: sum(commissions.filter((commission) => commission.leadSource === "AGENT"), "grossAmount"),
    totalCommissionPaid: sum(paid, "netAgentAmount"),
    topAgents: profiles.slice(0, 5).map((profile) => ({ id: profile.userId, name: profile.publicSlug, deals: profile.completedDeals, revenue: 0, rating: profile.averageRating })),
    topCities: Array.from(cityStats.values()).slice(0, 5),
    topBranches: [],
    leadSourceStats: (["HOUSELINK", "AGENT"] as LeadSource[]).map((leadSource) => ({
      leadSource,
      leads: leads.filter((lead) => lead.leadSource === leadSource).length,
      closed: closed.filter((lead) => lead.leadSource === leadSource).length,
      revenue: sum(commissions.filter((commission) => commission.leadSource === leadSource), "grossAmount"),
    })),
    leadConversionRate: leads.length ? Math.round((closed.length / leads.length) * 1000) / 10 : 0,
    provincePerformance: Array.from(
      leads.reduce((map, lead) => {
        const province = lead.province ?? "Unassigned";
        const stat = map.get(province) ?? { province, leads: 0, closed: 0 };
        stat.leads += 1;
        if (lead.status === "CLOSED_WON") stat.closed += 1;
        map.set(province, stat);
        return map;
      }, new Map<string, { province: string; leads: number; closed: number }>()),
    ).map(([, stat]) => stat),
  };
}

function objectPayload(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeApplicationStatus(value: string): AgentApplicationStatus {
  const allowed = new Set(["DRAFT", "SUBMITTED", "PENDING_REVIEW", "INTERVIEW_SCHEDULED", "DOCUMENTS_REQUESTED", "TRAINING", "VERIFICATION", "APPROVED", "DECLINED", "SUSPENDED"]);
  return (allowed.has(value) ? value : "PENDING_REVIEW") as AgentApplicationStatus;
}

function normalizeLeadStatus(value: string): LeadStatus {
  const allowed = new Set(["NEW", "ASSIGNED", "ACCEPTED", "REJECTED", "CONTACTED", "VIEWING_SCHEDULED", "OFFER", "CLOSED_WON", "CLOSED_LOST"]);
  return (allowed.has(value) ? value : "NEW") as LeadStatus;
}

function sum(items: AgentCommission[], key: keyof Pick<AgentCommission, "grossAmount" | "houselinkAmount" | "agentAmount" | "netAgentAmount">) {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agent";
}
