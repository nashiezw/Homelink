import {
  createDefaultAgentSettings,
  DEFAULT_AGENT_PERMISSIONS,
  DEFAULT_COMMISSION_RULES,
  emptyApplicationDocumentChecklist,
  emptyApplicationInterviewAssessment,
  defaultAgentTrainingModules,
  emptyApplicationPersonal,
  emptyApplicationProfessional,
  emptyApplicationReadiness,
  emptyApplicationRecruitment,
} from "@/lib/agents/defaults";
import type {
  AgentAdminAnalytics,
  AgentApplication,
  AgentApplicationStatus,
  AgentCommission,
  AgentCommissionPayout,
  AgentDashboardStats,
  AgentLead,
  AgentLevel,
  AgentPlatformState,
  AgentProfile,
  AgentRating,
  AgentSystemSettings,
  AgentTask,
  CommissionRule,
  CommissionStatus,
  CommissionType,
  LeadSource,
  LeadStatus,
} from "@/lib/agents/types";
import type { StoreUser } from "@/lib/store/types";

type NotifyFn = (userId: string, subject: string, body: string) => void;
type GetUserFn = (id: string) => StoreUser | undefined;

export type CommissionCalculationContext = {
  leadSource?: LeadSource;
  leadId?: string;
  listingId?: string;
  agentId?: string;
  transactionId?: string;
  branchId?: string;
  propertyType?: string;
  agentLevel?: string;
  promotionCode?: string;
  now?: string;
};

function normalizeLeadSource(source?: LeadSource | string): LeadSource {
  return source === "AGENT" ? "AGENT" : "HOUSELINK";
}

function inferLeadSourceFromLegacy(source?: string): LeadSource {
  const normalized = (source ?? "").toUpperCase();
  return normalized.includes("AGENT") ? "AGENT" : "HOUSELINK";
}

function scopePriority(scope?: CommissionRule["scope"]) {
  switch (scope) {
    case "TRANSACTION":
      return 700;
    case "AGENT":
      return 600;
    case "PROMOTION":
      return 500;
    case "BRANCH":
      return 400;
    case "PROPERTY_TYPE":
      return 300;
    case "AGENT_LEVEL":
      return 200;
    case "DEFAULT":
    default:
      return 100;
  }
}

function ruleMatchesContext(rule: CommissionRule, type: CommissionType, context: CommissionCalculationContext) {
  if (!rule.active || rule.type !== type) return false;
  const leadSource = normalizeLeadSource(context.leadSource);
  if (rule.leadSource && rule.leadSource !== "ANY" && rule.leadSource !== leadSource) return false;
  const now = new Date(context.now ?? new Date().toISOString()).getTime();
  if (rule.startsAt && new Date(rule.startsAt).getTime() > now) return false;
  if (rule.endsAt && new Date(rule.endsAt).getTime() < now) return false;
  if (rule.agentId && rule.agentId !== context.agentId) return false;
  if (rule.transactionId && rule.transactionId !== context.transactionId) return false;
  if (rule.branchId && rule.branchId !== context.branchId) return false;
  if (rule.propertyType && rule.propertyType !== context.propertyType) return false;
  if (rule.agentLevel && rule.agentLevel !== context.agentLevel) return false;
  if (rule.promotionCode && rule.promotionCode !== context.promotionCode) return false;
  return true;
}

function ruleScore(rule: CommissionRule, context: CommissionCalculationContext) {
  const leadSource = normalizeLeadSource(context.leadSource);
  const sourceScore = rule.leadSource === leadSource ? 10000 : rule.leadSource === "ANY" ? 500 : rule.leadSource ? 0 : 100;
  return sourceScore + (rule.priority ?? scopePriority(rule.scope));
}

export function ensureCommissionRuleCoverage(state: AgentPlatformState) {
  const required = DEFAULT_COMMISSION_RULES.filter((rule) =>
    ["SALE", "RENTAL", "MANAGEMENT"].includes(rule.type) && (rule.leadSource === "HOUSELINK" || rule.leadSource === "AGENT"),
  );
  for (const rule of required) {
    const exists = state.settings.commissionRules.some(
      (candidate) => candidate.type === rule.type && candidate.leadSource === rule.leadSource && candidate.scope === rule.scope,
    );
    if (!exists) state.settings.commissionRules.push({ ...rule });
  }
  return state.settings.commissionRules;
}

export function resolveCommissionRule(
  state: AgentPlatformState,
  type: CommissionType,
  context: CommissionCalculationContext = {},
) {
  ensureCommissionRuleCoverage(state);
  const matches = state.settings.commissionRules
    .filter((rule) => ruleMatchesContext(rule, type, context))
    .sort((a, b) => ruleScore(b, context) - ruleScore(a, context));
  return matches[0] ?? state.settings.commissionRules.find((r) => r.type === type && r.active);
}

export function createEmptyAgentPlatformState(): AgentPlatformState {
  return {
    settings: createDefaultAgentSettings(),
    applications: [],
    profiles: [],
    territories: [],
    leads: [],
    commissions: [],
    trainingModules: defaultAgentTrainingModules(),
    trainingProgress: [],
    ratings: [],
    appointments: [],
    tasks: [],
    walletEntries: [],
    roundRobinIndex: 0,
  };
}

export function seedAgentPlatform(
  state: AgentPlatformState,
  users: StoreUser[],
): AgentPlatformState {
  const blessing = users.find((u) => u.id === "user_agent_blessing");
  const tendai = users.find((u) => u.id === "user_agent_tendai");

  state.territories = [
    {
      id: "terr_harare_north",
      name: "Harare North",
      province: "Harare",
      city: "Harare",
      suburbs: ["Avondale", "Borrowdale", "Mount Pleasant", "Greendale"],
      postalCodes: [],
      agentIds: blessing ? [blessing.id] : [],
      active: true,
    },
    {
      id: "terr_bulawayo",
      name: "Bulawayo Metro",
      province: "Bulawayo",
      city: "Bulawayo",
      suburbs: ["Hillside", "Suburbs", "CBD"],
      postalCodes: [],
      agentIds: tendai ? [tendai.id] : [],
      active: true,
    },
  ];

  if (blessing) {
    state.profiles.push(
      buildProfileFromUser(blessing, "AG-1001", "GOLD", 24, {
        photoUrl: "/images/roommates/portrait-blessing.jpg",
        biography:
          "With over 8 years in Harare's rental and sales market, Blessing specialises in matching families and professionals with verified homes across northern suburbs. She is known for transparent viewings, fast WhatsApp responses, and end-to-end lease support — from first enquiry through move-in.",
        areasServed: ["Avondale", "Borrowdale", "Mount Pleasant", "Greendale", "Highlands", "Gunhill"],
        languages: ["English", "Shona", "Ndebele"],
        specialisations: [
          "Residential rentals",
          "Family homes",
          "Executive lets",
          "Tenant placement",
          "Lease renewals",
        ],
        propertyTypes: ["house", "flat", "cottage", "townhouse"],
        yearsExperience: 8,
        territoryIds: ["terr_harare_north"],
        averageRating: 4.7,
        ratingCount: 18,
      }),
    );
  }
  if (tendai) {
    state.profiles.push(
      buildProfileFromUser(tendai, "AG-1002", "PLATINUM", 38, {
        photoUrl: "/images/roommates/portrait-tendai.jpg",
        biography:
          "Tendai is a top-performing Bulawayo agent with deep knowledge of Hillside, Suburbs, and the CBD corridor. He handles sales and long-term rentals for families and investors, with a track record of 38 completed deals and consistent five-star feedback on communication and market knowledge.",
        areasServed: ["Hillside", "Suburbs", "Bulawayo CBD", "Burnside", "Khumalo"],
        languages: ["English", "Ndebele", "Shona"],
        specialisations: ["Residential sales", "Family rentals", "Investment property", "Commercial introductions"],
        propertyTypes: ["house", "flat", "commercial", "land"],
        yearsExperience: 11,
        territoryIds: ["terr_bulawayo"],
        averageRating: 4.9,
        ratingCount: 31,
      }),
    );
  }

  state.leads.push(
    {
      id: "lead_seed_1",
      listingId: "harare-avondale-cottage",
      listingTitle: "Verified garden cottage near Avondale shops",
      clientUserId: "user_seeker_nyasha",
      clientName: "Nyasha Moyo",
      clientEmail: "nyasha.m@example.co.zw",
      clientPhone: "+263779012345",
      clientType: "TENANT",
      source: "LISTING_ENQUIRY",
      status: "ASSIGNED",
      assignedAgentId: blessing?.id,
      assignedAgentName: blessing?.name,
      city: "Harare",
      suburb: "Avondale",
      province: "Harare",
      notes: "Interested in viewing this weekend.",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "lead_seed_rating",
      listingId: "harare-avondale-cottage",
      listingTitle: "Verified garden cottage near Avondale shops",
      clientUserId: "user_seeker_tinashe",
      clientName: "Tinashe Dube",
      clientEmail: "tinashe.dube@houselinkzim.co.zw",
      clientType: "TENANT",
      source: "LISTING_ENQUIRY",
      status: "CLOSED_WON",
      assignedAgentId: blessing?.id,
      assignedAgentName: blessing?.name,
      city: "Harare",
      suburb: "Avondale",
      province: "Harare",
      notes: "Rental completed via HouseLink — please rate your agent.",
      dealRef: "deal_seed_rating",
      closedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      ratingSubmitted: false,
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: "lead_seed_2",
      listingTitle: "3-bed house in Hillside",
      clientName: "David Ncube",
      clientPhone: "+263771112233",
      clientType: "BUYER",
      source: "WEBSITE",
      status: "NEW",
      city: "Bulawayo",
      suburb: "Hillside",
      province: "Bulawayo",
      notes: "Cash buyer, ready to view.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  );

  if (blessing) {
    state.commissions.push(
      createCommissionRecord(state, blessing.id, blessing.name, "RENTAL", 450, "deal_rent_001", "harare-avondale-cottage", "APPROVED", {
        leadSource: "HOUSELINK",
        agentId: blessing.id,
        listingId: "harare-avondale-cottage",
      }),
      createCommissionRecord(state, blessing.id, blessing.name, "SALE", 1200, "deal_sale_001", undefined, "PENDING", {
        leadSource: "HOUSELINK",
        agentId: blessing.id,
      }),
    );
    state.ratings.push(
      {
        id: "rating_1",
        agentId: blessing.id,
        customerId: "user_seeker_nyasha",
        customerName: "Nyasha Moyo",
        dealRef: "deal_rent_001",
        professionalism: 5,
        communication: 5,
        knowledge: 4,
        responsiveness: 5,
        overall: 4.8,
        comment: "Very professional and responsive. Found us a cottage in Avondale within a week.",
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: "rating_2",
        agentId: blessing.id,
        customerId: "user_seeker_tinashe",
        customerName: "Tinashe Dube",
        dealRef: "deal_rent_002",
        professionalism: 5,
        communication: 4,
        knowledge: 5,
        responsiveness: 5,
        overall: 4.8,
        comment: "Blessing knew every suburb we looked at and negotiated a fair lease on our behalf.",
        createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
      },
      {
        id: "rating_3",
        agentId: blessing.id,
        customerId: "user_landlord_grace",
        customerName: "Grace Mutasa",
        dealRef: "deal_rent_003",
        professionalism: 5,
        communication: 5,
        knowledge: 4,
        responsiveness: 4,
        overall: 4.5,
        comment: "Reliable tenant screening and clear updates throughout the letting process.",
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      },
    );
    state.tasks.push({
      id: "task_1",
      agentId: blessing.id,
      title: "Follow up with Nyasha Moyo",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      status: "OPEN",
      priority: "HIGH",
      createdAt: new Date().toISOString(),
    });
  }

  return state;
}

function buildProfileFromUser(
  user: StoreUser,
  agentNumber: string,
  level: AgentLevel,
  deals: number,
  overrides: Partial<
    Pick<
      AgentProfile,
      | "photoUrl"
      | "biography"
      | "areasServed"
      | "languages"
      | "specialisations"
      | "propertyTypes"
      | "yearsExperience"
      | "territoryIds"
      | "averageRating"
      | "ratingCount"
    >
  > = {},
): AgentProfile {
  const slug = user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `profile_${user.id}`,
    userId: user.id,
    applicationId: `app_${user.id}`,
    agentNumber,
    agentIdCode: `HL-${agentNumber}`,
    qrCodeData: `https://houselinkzim.co.zw/agents/${slug}`,
    level,
    status: "ACTIVE",
    biography:
      overrides.biography ??
      `${user.name} is a verified HouseLink agent helping clients across ${user.city ?? "Zimbabwe"}.`,
    areasServed: overrides.areasServed ?? [user.city ?? "Harare"],
    languages: overrides.languages ?? ["English", "Shona"],
    specialisations: overrides.specialisations ?? ["Residential rentals", "Family homes"],
    propertyTypes: overrides.propertyTypes ?? ["house", "flat", "cottage"],
    yearsExperience: overrides.yearsExperience ?? 5,
    completedDeals: deals,
    permissions: { ...DEFAULT_AGENT_PERMISSIONS },
    territoryIds: overrides.territoryIds ?? [],
    trainingCompleted: true,
    averageRating: overrides.averageRating ?? 4.7,
    ratingCount: overrides.ratingCount ?? 12,
    publicSlug: slug,
    photoUrl: overrides.photoUrl,
    createdAt: user.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function createApplicationDraft(userId?: string, email = ""): AgentApplication {
  const now = new Date().toISOString();
  return {
    id: `app_${crypto.randomUUID()}`,
    userId,
    status: "DRAFT",
    personal: { ...emptyApplicationPersonal(), email },
    professional: emptyApplicationProfessional(),
    recruitment: emptyApplicationRecruitment(),
    readiness: emptyApplicationReadiness(),
    documentChecklist: emptyApplicationDocumentChecklist(),
    interviewAssessment: emptyApplicationInterviewAssessment(),
    documents: {},
    banking: { bank: "", branch: "", accountName: "", accountNumber: "", ecocash: "", onemoney: "", innbucks: "" },
    references: [],
    emergencyContact: { name: "", phone: "", relationship: "" },
    declarationAccepted: false,
    termsAccepted: false,
    privacyAccepted: false,
    agentContractAccepted: false,
    adminNotes: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertApplication(state: AgentPlatformState, application: AgentApplication) {
  const idx = state.applications.findIndex((a) => a.id === application.id);
  application.updatedAt = new Date().toISOString();
  if (idx >= 0) state.applications[idx] = application;
  else state.applications.unshift(application);
  return application;
}

export function submitApplication(
  state: AgentPlatformState,
  applicationId: string,
  notify: NotifyFn,
) {
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app) return null;
  app.status = "SUBMITTED";
  app.submittedAt = new Date().toISOString();
  app.updatedAt = app.submittedAt;
  if (app.userId) {
    notify(app.userId, "Application submitted", state.settings.notificationTemplates.application_submitted);
  }
  return app;
}

export function updateApplicationStatus(
  state: AgentPlatformState,
  applicationId: string,
  status: AgentApplicationStatus,
  actor: { id: string; name: string },
  note?: string,
  notify?: NotifyFn,
) {
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app) return null;
  app.status = status;
  app.updatedAt = new Date().toISOString();
  if (note) {
    app.adminNotes.unshift({
      id: `note_${crypto.randomUUID()}`,
      authorId: actor.id,
      authorName: actor.name,
      body: note,
      createdAt: new Date().toISOString(),
    });
  }
  if (app.userId && notify) {
    const templateKey =
      status === "APPROVED"
        ? "application_approved"
        : status === "DECLINED"
          ? "application_declined"
          : status === "INTERVIEW_SCHEDULED"
            ? "interview_scheduled"
            : status === "TRAINING"
              ? "training_assigned"
              : null;
    if (templateKey) {
      notify(app.userId, `Application ${status.toLowerCase()}`, state.settings.notificationTemplates[templateKey]);
    }
  }
  return app;
}

export function approveApplication(
  state: AgentPlatformState,
  applicationId: string,
  getUser: GetUserFn,
  assignRole: (userId: string) => void,
  actor: { id: string; name: string },
  notify: NotifyFn,
) {
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app) return null;

  const userId = app.userId;
  if (!userId) return null;

  assignRole(userId);
  const agentNumber = `AG-${1000 + state.profiles.length + 1}`;
  const slug = app.personal.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `agent-${agentNumber}`;
  const profile: AgentProfile = {
    id: `profile_${userId}`,
    userId,
    applicationId: app.id,
    agentNumber,
    agentIdCode: `HL-${agentNumber}`,
    qrCodeData: `https://houselinkzim.co.zw/agents/${slug}`,
    level: "BRONZE",
    status: "ACTIVE",
    biography: `${app.personal.fullName} is a verified HouseLink agent serving ${app.professional.city || "Zimbabwe"}.`,
    photoUrl: app.documents.profilePictureUrl,
    areasServed: app.professional.areasCovered.length ? app.professional.areasCovered : [app.professional.city],
    languages: app.professional.languages,
    specialisations: app.professional.specialisations,
    propertyTypes: app.professional.propertyTypes,
    yearsExperience: app.professional.yearsExperience,
    completedDeals: 0,
    permissions: { ...DEFAULT_AGENT_PERMISSIONS },
    territoryIds: [],
    trainingCompleted: !state.settings.approvalWorkflow.trainingRequired,
    averageRating: 0,
    ratingCount: 0,
    publicSlug: slug,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.profiles.push(profile);
  app.status = "APPROVED";
  app.updatedAt = new Date().toISOString();
  notify(userId, "Application approved", state.settings.notificationTemplates.application_approved);
  return profile;
}

export function getAgentProfileByUserId(state: AgentPlatformState, userId: string) {
  return state.profiles.find((p) => p.userId === userId);
}

export function getAgentProfileBySlug(state: AgentPlatformState, slug: string) {
  return state.profiles.find((p) => p.publicSlug === slug || p.id === slug);
}

export function updateAgentSettings(state: AgentPlatformState, settings: Partial<AgentSystemSettings>) {
  state.settings = { ...state.settings, ...settings, updatedAt: new Date().toISOString() };
  ensureCommissionRuleCoverage(state);
  return state.settings;
}

export function updateCommissionRules(state: AgentPlatformState, rules: CommissionRule[]) {
  state.settings.commissionRules = rules;
  ensureCommissionRuleCoverage(state);
  state.settings.updatedAt = new Date().toISOString();
  return state.settings.commissionRules;
}

export function calculateCommission(
  state: AgentPlatformState,
  type: CommissionType,
  dealAmount: number,
  context: CommissionCalculationContext = {},
): { gross: number; houselink: number; agent: number; tax: number; netAgent: number; rule: CommissionRule; leadSource: LeadSource } {
  const rule = resolveCommissionRule(state, type, context);
  if (!rule) {
    return {
      gross: 0,
      houselink: 0,
      agent: 0,
      tax: 0,
      netAgent: 0,
      rule: state.settings.commissionRules[0],
      leadSource: normalizeLeadSource(context.leadSource),
    };
  }
  let gross = (dealAmount * rule.ratePercent) / 100;
  gross = Math.max(rule.minAmount, Math.min(rule.maxAmount, gross));
  const agent = (gross * rule.agentSplitPercent) / 100;
  const houselink = (gross * rule.houselinkSplitPercent) / 100;
  const tax = (agent * rule.vatPercent) / 100;
  const netAgent = agent - tax;
  return { gross, houselink, agent, tax, netAgent, rule, leadSource: normalizeLeadSource(context.leadSource) };
}

export function createCommissionRecord(
  state: AgentPlatformState,
  agentId: string,
  agentName: string,
  type: CommissionType,
  dealAmount: number,
  dealRef: string,
  listingId?: string,
  status: CommissionStatus = "PENDING",
  context: CommissionCalculationContext = {},
): AgentCommission {
  const calc = calculateCommission(state, type, dealAmount, { ...context, listingId });
  const createdAt = new Date().toISOString();
  const record: AgentCommission = {
    id: `comm_${crypto.randomUUID()}`,
    agentId,
    agentName,
    type,
    status,
    dealRef,
    leadId: context.leadId,
    listingId,
    leadSource: calc.leadSource,
    commissionRuleId: calc.rule?.id,
    commissionRuleLabel: calc.rule?.label,
    commissionPercent: calc.rule?.ratePercent ?? 0,
    paymentStatus: status,
    reason:
      calc.rule?.reason ??
      (calc.leadSource === "AGENT"
        ? "Agent-sourced lead: the agent acquired the client and HouseLink provided platform support."
        : "HouseLink-sourced lead: HouseLink generated the enquiry and assigned an agent to close it."),
    grossAmount: calc.gross,
    houselinkAmount: calc.houselink,
    agentAmount: calc.agent,
    taxAmount: calc.tax,
    netAgentAmount: calc.netAgent,
    currency: "USD",
    ruleSnapshot: {
      ratePercent: calc.rule.ratePercent,
      houselinkSplitPercent: calc.rule.houselinkSplitPercent,
      agentSplitPercent: calc.rule.agentSplitPercent,
      vatPercent: calc.rule.vatPercent,
      leadSource: calc.leadSource,
      ruleId: calc.rule.id,
      ruleLabel: calc.rule.label,
      scope: calc.rule.scope,
      reason: calc.rule.reason,
    },
    auditHistory: [
      {
        id: `audit_${crypto.randomUUID()}`,
        changedById: "system",
        changedByName: "HouseLink System",
        changedAt: createdAt,
        action: "CREATED",
        newHouselinkSplitPercent: calc.rule.houselinkSplitPercent,
        newAgentSplitPercent: calc.rule.agentSplitPercent,
        reason: "Commission calculated automatically from the active commission rule.",
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };
  state.commissions.unshift(record);
  return record;
}

export function normalizeCommissionRecord(state: AgentPlatformState, commission: AgentCommission) {
  const lead = commission.leadId ? state.leads.find((item) => item.id === commission.leadId) : undefined;
  const leadSource = normalizeLeadSource(commission.leadSource ?? lead?.leadSource ?? inferLeadSourceFromLegacy(lead?.source));
  const rule = resolveCommissionRule(state, commission.type, {
    leadSource,
    leadId: commission.leadId,
    listingId: commission.listingId,
    agentId: commission.agentId,
  });
  if (!rule) return commission;

  const isLegacyOrWrongRule =
    !commission.commissionRuleId ||
    !commission.commissionRuleLabel ||
    !commission.ruleSnapshot.ruleLabel ||
    commission.ruleSnapshot.leadSource !== leadSource ||
    (rule.leadSource === leadSource &&
      (commission.ruleSnapshot.houselinkSplitPercent !== rule.houselinkSplitPercent ||
        commission.ruleSnapshot.agentSplitPercent !== rule.agentSplitPercent));

  if (!isLegacyOrWrongRule) return commission;

  const agentAmount = (commission.grossAmount * rule.agentSplitPercent) / 100;
  const houselinkAmount = (commission.grossAmount * rule.houselinkSplitPercent) / 100;
  const taxAmount = (agentAmount * rule.vatPercent) / 100;
  commission.leadSource = leadSource;
  commission.commissionRuleId = rule.id;
  commission.commissionRuleLabel = rule.label;
  commission.commissionPercent = rule.ratePercent;
  commission.houselinkAmount = houselinkAmount;
  commission.agentAmount = agentAmount;
  commission.taxAmount = taxAmount;
  commission.netAgentAmount = agentAmount - taxAmount;
  commission.reason =
    rule.reason ??
    (leadSource === "HOUSELINK"
      ? "HouseLink generated the lead; HouseLink receives the company share and the assigned agent receives the agent share."
      : "The agent generated the lead; the agent receives the larger share while HouseLink provides platform support.");
  commission.ruleSnapshot = {
    ratePercent: rule.ratePercent,
    houselinkSplitPercent: rule.houselinkSplitPercent,
    agentSplitPercent: rule.agentSplitPercent,
    vatPercent: rule.vatPercent,
    leadSource,
    ruleId: rule.id,
    ruleLabel: rule.label,
    scope: rule.scope,
    reason: rule.reason,
  };
  commission.updatedAt = new Date().toISOString();
  return commission;
}

export function normalizeCommissionRecords(state: AgentPlatformState) {
  state.commissions.forEach((commission) => normalizeCommissionRecord(state, commission));
  return state.commissions;
}

export function assignLead(
  state: AgentPlatformState,
  leadInput: Omit<AgentLead, "id" | "status" | "createdAt" | "updatedAt" | "assignedAgentId" | "assignedAgentName">,
  getUser: GetUserFn,
): AgentLead {
  const now = new Date().toISOString();
  const leadSource = leadInput.leadSource ?? inferLeadSourceFromLegacy(leadInput.source);
  const lead: AgentLead = {
    ...leadInput,
    leadSource,
    ownershipLocked: leadInput.ownershipLocked ?? true,
    ownershipAudit: leadInput.ownershipAudit ?? [
      {
        id: `audit_${crypto.randomUUID()}`,
        changedById: leadInput.createdById ?? "system",
        changedByName: leadInput.createdByName ?? "HouseLink System",
        changedAt: now,
        newLeadSource: leadSource,
        reason: "Initial lead ownership recorded.",
      },
    ],
    id: `lead_${crypto.randomUUID()}`,
    status: "NEW",
    createdAt: now,
    updatedAt: now,
  };

  const agent = pickAgentForLead(state, lead, getUser);
  if (agent) {
    lead.assignedAgentId = agent.userId;
    lead.assignedAgentName = getUser(agent.userId)?.name ?? "Agent";
    lead.status = "ASSIGNED";
  }

  state.leads.unshift(lead);
  return lead;
}

function pickAgentForLead(
  state: AgentPlatformState,
  lead: AgentLead,
  getUser: GetUserFn,
): AgentProfile | undefined {
  const active = state.profiles.filter((p) => p.status === "ACTIVE");
  if (!active.length) return undefined;

  const strategy = state.settings.leadAssignmentStrategy;

  if (strategy === "TERRITORY" && (lead.city || lead.suburb)) {
    const territory = state.territories.find(
      (t) =>
        t.active &&
        (t.city.toLowerCase() === (lead.city ?? "").toLowerCase() ||
          t.suburbs.some((s) => s.toLowerCase() === (lead.suburb ?? "").toLowerCase())),
    );
    if (territory?.agentIds.length) {
      const profile = active.find((p) => territory.agentIds.includes(p.userId));
      if (profile) return profile;
    }
  }

  if (strategy === "HIGHEST_RATED") {
    return [...active].sort((a, b) => b.averageRating - a.averageRating)[0];
  }

  if (strategy === "PREMIUM_PRIORITY") {
    const premium = active.filter((p) => getUser(p.userId)?.premium);
    if (premium.length) return premium[0];
  }

  if (strategy === "ROUND_ROBIN") {
    const agent = active[state.roundRobinIndex % active.length];
    state.roundRobinIndex += 1;
    return agent;
  }

  return active[0];
}

export function updateLeadStatus(state: AgentPlatformState, leadId: string, status: LeadStatus, notes?: string) {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  lead.status = status;
  if (notes) lead.notes = notes;
  lead.updatedAt = new Date().toISOString();
  return lead;
}

export function reassignLead(
  state: AgentPlatformState,
  leadId: string,
  agentUserId: string,
  getUser: GetUserFn,
) {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  const profile = state.profiles.find((p) => p.userId === agentUserId && p.status === "ACTIVE");
  if (!profile) return null;
  lead.assignedAgentId = agentUserId;
  lead.assignedAgentName = getUser(agentUserId)?.name ?? profile.agentIdCode;
  if (lead.status === "NEW") lead.status = "ASSIGNED";
  lead.updatedAt = new Date().toISOString();
  return lead;
}

export function updateLeadOwnership(
  state: AgentPlatformState,
  leadId: string,
  updates: { leadSource?: LeadSource; assignedAgentId?: string },
  actor: { id: string; name: string },
  reason: string,
  getUser: GetUserFn,
) {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  const previousSource = lead.leadSource ?? inferLeadSourceFromLegacy(lead.source);
  const previousAgentId = lead.assignedAgentId;
  const nextSource = updates.leadSource ?? previousSource;
  lead.leadSource = nextSource;
  if (updates.assignedAgentId) {
    const profile = state.profiles.find((p) => p.userId === updates.assignedAgentId && p.status === "ACTIVE");
    if (!profile) return null;
    lead.assignedAgentId = updates.assignedAgentId;
    lead.assignedAgentName = getUser(updates.assignedAgentId)?.name ?? profile.agentIdCode;
  }
  const changedAt = new Date().toISOString();
  lead.ownershipLocked = true;
  lead.ownershipAudit = lead.ownershipAudit ?? [];
  lead.ownershipAudit.unshift({
    id: `audit_${crypto.randomUUID()}`,
    changedById: actor.id,
    changedByName: actor.name,
    changedAt,
    oldLeadSource: previousSource,
    newLeadSource: nextSource,
    oldAssignedAgentId: previousAgentId,
    newAssignedAgentId: lead.assignedAgentId,
    reason,
  });
  lead.updatedAt = changedAt;
  return lead;
}

export function completeLeadAsDeal(
  state: AgentPlatformState,
  leadId: string,
  type: CommissionType,
  dealAmount: number,
  getUser: GetUserFn,
) {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead?.assignedAgentId) return null;
  if (lead.dealRef) {
    const existing = state.commissions.find((c) => c.dealRef === lead.dealRef);
    if (existing) return existing;
  }
  const dealRef = `deal_${leadId}`;
  lead.status = "CLOSED_WON";
  lead.dealRef = dealRef;
  lead.closedAt = new Date().toISOString();
  lead.ratingSubmitted = false;
  lead.updatedAt = lead.closedAt;
  const user = getUser(lead.assignedAgentId);
  const commission = createCommissionRecord(
    state,
    lead.assignedAgentId,
    user?.name ?? lead.assignedAgentName ?? "Agent",
    type,
    dealAmount,
    dealRef,
    lead.listingId,
    "PENDING",
    {
      leadId,
      leadSource: lead.leadSource ?? inferLeadSourceFromLegacy(lead.source),
      agentId: lead.assignedAgentId,
      propertyType: lead.clientType,
    },
  );
  const profile = state.profiles.find((p) => p.userId === lead.assignedAgentId);
  if (profile) {
    profile.completedDeals += 1;
    profile.level = computeAgentLevel(state, profile);
    profile.updatedAt = new Date().toISOString();
  }
  return commission;
}

export function approveCommission(state: AgentPlatformState, commissionId: string, actor: { id: string; name: string }, reason = "Approved by administrator.") {
  const commission = state.commissions.find((c) => c.id === commissionId);
  if (!commission || commission.status !== "PENDING") return null;
  const now = new Date().toISOString();
  commission.status = "APPROVED";
  commission.paymentStatus = "APPROVED";
  commission.approvedAt = now;
  commission.approvedBy = actor.name;
  commission.updatedAt = now;
  commission.auditHistory = commission.auditHistory ?? [];
  commission.auditHistory.unshift({
    id: `audit_${crypto.randomUUID()}`,
    changedById: actor.id,
    changedByName: actor.name,
    changedAt: now,
    action: "APPROVED",
    reason,
  });
  return commission;
}

export function updateCommissionStatus(
  state: AgentPlatformState,
  commissionId: string,
  status: Exclude<CommissionStatus, "PAID">,
  actor: { id: string; name: string },
  reason: string,
) {
  const commission = state.commissions.find((c) => c.id === commissionId);
  if (!commission || commission.status === "PAID") return null;
  const now = new Date().toISOString();
  commission.status = status;
  commission.paymentStatus = status;
  commission.updatedAt = now;
  commission.auditHistory = commission.auditHistory ?? [];
  commission.auditHistory.unshift({
    id: `audit_${crypto.randomUUID()}`,
    changedById: actor.id,
    changedByName: actor.name,
    changedAt: now,
    action: status,
    reason,
  });
  return commission;
}

function computeAgentLevel(state: AgentPlatformState, profile: AgentProfile): AgentLevel {
  const levels: AgentLevel[] = ["ELITE", "PLATINUM", "GOLD", "SILVER", "BRONZE"];
  for (const level of levels) {
    const t = state.settings.levelThresholds[level];
    if (profile.completedDeals >= t.minDeals && profile.averageRating >= t.minRating) return level;
  }
  return "BRONZE";
}

export function addAgentRating(
  state: AgentPlatformState,
  input: Omit<AgentRating, "id" | "createdAt" | "overall">,
) {
  const existing = state.ratings.find(
    (r) => r.customerId === input.customerId && r.dealRef === input.dealRef,
  );
  if (existing) return existing;

  const overall =
    (input.professionalism + input.communication + input.knowledge + input.responsiveness) / 4;
  const rating: AgentRating = { ...input, overall, id: `rating_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
  state.ratings.unshift(rating);

  const lead = state.leads.find((l) => l.dealRef === input.dealRef);
  if (lead) lead.ratingSubmitted = true;

  const profile = state.profiles.find((p) => p.userId === input.agentId);
  if (profile) {
    const total = profile.averageRating * profile.ratingCount + overall;
    profile.ratingCount += 1;
    profile.averageRating = Math.round((total / profile.ratingCount) * 10) / 10;
    profile.level = computeAgentLevel(state, profile);
    profile.updatedAt = new Date().toISOString();
  }
  return rating;
}

export type RateableAgentDeal = {
  agentId: string;
  agentName: string;
  agentSlug: string;
  dealRef: string;
  listingId?: string;
  listingTitle?: string;
  closedAt?: string;
};

export function findRateableDeal(
  state: AgentPlatformState,
  customerId: string,
  listingId: string,
  getUser: GetUserFn,
): RateableAgentDeal | null {
  const lead = state.leads.find(
    (l) =>
      l.clientUserId === customerId &&
      l.listingId === listingId &&
      l.status === "CLOSED_WON" &&
      l.assignedAgentId &&
      !l.ratingSubmitted &&
      l.dealRef &&
      !state.ratings.some((r) => r.customerId === customerId && r.dealRef === l.dealRef),
  );
  if (!lead?.assignedAgentId || !lead.dealRef) return null;
  const profile = state.profiles.find((p) => p.userId === lead.assignedAgentId);
  const user = getUser(lead.assignedAgentId);
  return {
    agentId: lead.assignedAgentId,
    agentName: user?.name ?? lead.assignedAgentName ?? "HouseLink Agent",
    agentSlug: profile?.publicSlug ?? lead.assignedAgentId,
    dealRef: lead.dealRef,
    listingId: lead.listingId,
    listingTitle: lead.listingTitle,
    closedAt: lead.closedAt,
  };
}

export function deleteTerritory(state: AgentPlatformState, territoryId: string) {
  const idx = state.territories.findIndex((t) => t.id === territoryId);
  if (idx < 0) return false;
  state.territories.splice(idx, 1);
  return true;
}

export function completeTrainingModule(state: AgentPlatformState, agentId: string, moduleId: string, score?: number) {
  let progress = state.trainingProgress.find((p) => p.agentId === agentId && p.moduleId === moduleId);
  if (!progress) {
    progress = {
      id: `tp_${crypto.randomUUID()}`,
      agentId,
      moduleId,
      status: "COMPLETED",
      score,
      completedAt: new Date().toISOString(),
    };
    state.trainingProgress.push(progress);
  } else {
    progress.status = "COMPLETED";
    progress.score = score;
    progress.completedAt = new Date().toISOString();
  }

  const required = state.trainingModules.filter((m) => m.required);
  const done = required.every((m) =>
    state.trainingProgress.some((p) => p.agentId === agentId && p.moduleId === m.id && p.status === "COMPLETED"),
  );
  const profile = state.profiles.find((p) => p.userId === agentId);
  if (profile && done) {
    profile.trainingCompleted = true;
    profile.certificateUrl = "/uploads/agents/training-certificate.pdf";
    profile.updatedAt = new Date().toISOString();
  }
  return progress;
}

export function addAgentTask(
  state: AgentPlatformState,
  input: Omit<AgentTask, "id" | "createdAt" | "status"> & { status?: AgentTask["status"] },
) {
  const task: AgentTask = {
    id: `task_${crypto.randomUUID()}`,
    status: input.status ?? "OPEN",
    createdAt: new Date().toISOString(),
    ...input,
  };
  state.tasks.unshift(task);
  return task;
}

export function completeAgentTask(state: AgentPlatformState, taskId: string, agentId: string) {
  const task = state.tasks.find((row) => row.id === taskId && row.agentId === agentId);
  if (!task) return null;
  task.status = "DONE";
  return task;
}

export function getAgentDashboardStats(
  state: AgentPlatformState,
  agentId: string,
  listingsCount: number,
  activeListings = listingsCount,
): AgentDashboardStats {
  const leads = state.leads.filter((l) => l.assignedAgentId === agentId);
  const commissions = state.commissions.filter((c) => c.agentId === agentId);
  const wallet = state.walletEntries.filter((e) => e.agentId === agentId);
  const balance = wallet.reduce((sum, e) => sum + (e.type === "CREDIT" ? e.amount : -e.amount), 0);
  const profile = state.profiles.find((p) => p.userId === agentId);
  const today = new Date().toISOString().slice(0, 10);

  return {
    activeLeads: leads.filter((l) => !["CLOSED_WON", "CLOSED_LOST", "REJECTED"].includes(l.status)).length,
    pendingCommissions: commissions.filter((c) => c.status === "PENDING" || c.status === "APPROVED").length,
    walletBalance: balance,
    completedDeals: profile?.completedDeals ?? 0,
    averageRating: profile?.averageRating ?? 0,
    listingsCount,
    totalListings: listingsCount,
    activeListings,
    houselinkLeads: leads.filter((l) => (l.leadSource ?? inferLeadSourceFromLegacy(l.source)) === "HOUSELINK").length,
    agentLeads: leads.filter((l) => (l.leadSource ?? inferLeadSourceFromLegacy(l.source)) === "AGENT").length,
    closedDeals: leads.filter((l) => l.status === "CLOSED_WON").length,
    pendingDeals: leads.filter((l) => ["NEW", "ASSIGNED", "CONTACTED", "VIEWING_BOOKED", "NEGOTIATION"].includes(l.status)).length,
    expectedEarnings: commissions.filter((c) => c.status !== "CANCELLED" && c.status !== "DISPUTED").reduce((s, c) => s + c.netAgentAmount, 0),
    pendingCommissionAmount: commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.netAgentAmount, 0),
    approvedCommissionAmount: commissions.filter((c) => c.status === "APPROVED").reduce((s, c) => s + c.netAgentAmount, 0),
    paidCommissionAmount: commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.netAgentAmount, 0),
    averageMonthlyEarnings: Math.round(
      commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.netAgentAmount, 0) /
        Math.max(1, new Set(commissions.filter((c) => c.status === "PAID").map((c) => c.paidAt?.slice(0, 7) ?? c.createdAt.slice(0, 7))).size),
    ),
    leadConversionRate: leads.length ? Math.round((leads.filter((l) => l.status === "CLOSED_WON").length / leads.length) * 100) : 0,
    appointmentsToday: state.appointments.filter(
      (a) => a.agentId === agentId && a.startsAt.startsWith(today) && a.status === "SCHEDULED",
    ).length,
    openTasks: state.tasks.filter((t) => t.agentId === agentId && t.status === "OPEN").length,
  };
}

export function getAgentAdminAnalytics(state: AgentPlatformState, getUserName: (id: string) => string): AgentAdminAnalytics {
  const apps = state.applications;
  const profiles = state.profiles;
  const commissions = state.commissions;
  const closedLeads = state.leads.filter((l) => l.status === "CLOSED_WON");
  const companyCommission = commissions.reduce((s, c) => s + c.houselinkAmount, 0);
  const agentCommission = commissions.reduce((s, c) => s + c.netAgentAmount, 0);

  const provinceMap = new Map<string, { leads: number; closed: number }>();
  const cityMap = new Map<string, { leads: number; closed: number; revenue: number }>();
  const leadSourceMap = new Map<LeadSource, { leads: number; closed: number; revenue: number }>();
  for (const lead of state.leads) {
    const key = lead.province || lead.city || "Unknown";
    const row = provinceMap.get(key) ?? { leads: 0, closed: 0 };
    row.leads += 1;
    if (lead.status === "CLOSED_WON") row.closed += 1;
    provinceMap.set(key, row);

    const cityKey = lead.city || "Unknown";
    const cityRow = cityMap.get(cityKey) ?? { leads: 0, closed: 0, revenue: 0 };
    cityRow.leads += 1;
    if (lead.status === "CLOSED_WON") cityRow.closed += 1;
    cityRow.revenue += commissions.filter((c) => c.leadId === lead.id || c.listingId === lead.listingId).reduce((s, c) => s + c.houselinkAmount, 0);
    cityMap.set(cityKey, cityRow);

    const source = lead.leadSource ?? inferLeadSourceFromLegacy(lead.source);
    const sourceRow = leadSourceMap.get(source) ?? { leads: 0, closed: 0, revenue: 0 };
    sourceRow.leads += 1;
    if (lead.status === "CLOSED_WON") sourceRow.closed += 1;
    sourceRow.revenue += commissions.filter((c) => c.leadId === lead.id || c.listingId === lead.listingId).reduce((s, c) => s + c.houselinkAmount, 0);
    leadSourceMap.set(source, sourceRow);
  }

  return {
    totalAgents: profiles.length,
    pendingApplications: apps.filter((a) => !["APPROVED", "DECLINED", "DRAFT"].includes(a.status)).length,
    approvedAgents: profiles.filter((p) => p.status === "ACTIVE").length,
    rejectedAgents: apps.filter((a) => a.status === "DECLINED").length,
    suspendedAgents: profiles.filter((p) => p.status === "SUSPENDED").length,
    totalSales: commissions.filter((c) => c.type === "SALE").length,
    totalRentals: commissions.filter((c) => c.type === "RENTAL").length,
    totalRevenue: commissions.reduce((s, c) => s + c.houselinkAmount, 0),
    totalCompanyCommission: companyCommission,
    totalAgentCommission: agentCommission,
    commissionAwaitingApproval: commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.netAgentAmount, 0),
    commissionAlreadyPaid: commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.netAgentAmount, 0),
    outstandingCommission: commissions.filter((c) => c.status === "PENDING" || c.status === "APPROVED").reduce((s, c) => s + c.netAgentAmount, 0),
    houselinkGeneratedRevenue: commissions.filter((c) => c.leadSource === "HOUSELINK").reduce((s, c) => s + c.houselinkAmount, 0),
    agentGeneratedRevenue: commissions.filter((c) => c.leadSource === "AGENT").reduce((s, c) => s + c.houselinkAmount, 0),
    totalCommissionPaid: commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.netAgentAmount, 0),
    topAgents: [...profiles]
      .sort((a, b) => b.completedDeals - a.completedDeals)
      .slice(0, 5)
      .map((p) => ({
        id: p.userId,
        name: getUserName(p.userId),
        deals: p.completedDeals,
        revenue: commissions.filter((c) => c.agentId === p.userId).reduce((s, c) => s + c.netAgentAmount, 0),
        rating: p.averageRating,
      })),
    topCities: [...cityMap.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 6)
      .map(([city, data]) => ({ city, ...data })),
    topBranches: [{ branch: "Zimbabwe network", leads: state.leads.length, revenue: companyCommission }],
    leadSourceStats: [...leadSourceMap.entries()].map(([leadSource, data]) => ({ leadSource, ...data })),
    leadConversionRate: state.leads.length ? Math.round((closedLeads.length / state.leads.length) * 100) : 0,
    provincePerformance: [...provinceMap.entries()].map(([province, data]) => ({ province, ...data })),
  };
}

export function payCommission(state: AgentPlatformState, commissionId: string, payout: AgentCommissionPayout) {
  const commission = state.commissions.find((c) => c.id === commissionId);
  if (!commission || commission.status === "PAID" || commission.status === "CANCELLED") return null;
  commission.status = "PAID";
  commission.paymentStatus = "PAID";
  commission.paidAt = new Date().toISOString();
  commission.payout = payout;
  commission.updatedAt = commission.paidAt;
  commission.auditHistory = commission.auditHistory ?? [];
  commission.auditHistory.unshift({
    id: `audit_${crypto.randomUUID()}`,
    changedById: payout.processedBy,
    changedByName: payout.processedBy,
    changedAt: commission.paidAt,
    action: "PAID",
    reason: payout.note ?? "Commission payout recorded.",
  });

  const lastBalance =
    state.walletEntries.filter((e) => e.agentId === commission.agentId).reduce((s, e) => s + (e.type === "CREDIT" ? e.amount : -e.amount), 0);
  state.walletEntries.unshift({
    id: `wallet_${crypto.randomUUID()}`,
    agentId: commission.agentId,
    type: "CREDIT",
    amount: commission.netAgentAmount,
    balanceAfter: lastBalance + commission.netAgentAmount,
    reference: payout.reference,
    description: `${commission.type} commission — ${commission.dealRef}`,
    createdAt: commission.paidAt,
  });
  return commission;
}
