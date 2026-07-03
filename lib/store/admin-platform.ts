import { getPlanDefinition } from "@/lib/payments/plans";
import { defaultPaymentSettings, defaultPlatformSettings } from "@/lib/settings/defaults";
import { syncGeoToFlatLists } from "@/lib/settings/geo";
import { mergePaymentSettings, mergePlatformSettings } from "@/lib/settings/merge";
import { mergePaymentSecrets, mergePlatformSecrets } from "@/lib/settings/redact";
import { savePersistedSettings } from "@/lib/settings/persist";
import type { PaymentHealth, PaymentSettings, PlatformSettings, WebhookLog } from "@/lib/settings/types";
import type {
  Agency,
  AuditLogEntry,
  FinanceNote,
  ListingRecord,
  Payment,
  PaymentMethod,
  PaymentStatus,
  StoreUser,
  SupportTicket,
  UserSubscription,
  VerificationRequest,
} from "@/lib/store/types";

type Session = { id: string; userId: string; createdAt: string };

export type AdminPlatformState = {
  platformSettings: PlatformSettings;
  paymentSettings: PaymentSettings;
  supportTickets: SupportTicket[];
  verificationRequests: VerificationRequest[];
  userCredits: Map<string, number>;
  userSubscriptions: Map<string, UserSubscription>;
  webhookLogs: WebhookLog[];
  payments: Payment[];
  listings: ListingRecord[];
  users: Map<string, StoreUser>;
  agencies: Map<string, Agency>;
  sessions: Map<string, Session>;
  auditLog: AuditLogEntry[];
};

type Actor = { id: string; name: string };

function now() {
  return new Date().toISOString();
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function seedAdminPlatformState(): Pick<
  AdminPlatformState,
  | "platformSettings"
  | "paymentSettings"
  | "supportTickets"
  | "verificationRequests"
  | "userCredits"
  | "userSubscriptions"
  | "webhookLogs"
> {
  const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
  return {
    platformSettings: { ...defaultPlatformSettings },
    paymentSettings: { ...defaultPaymentSettings, gateways: defaultPaymentSettings.gateways.map((g) => ({ ...g })) },
    supportTickets: [
      {
        id: "ticket_1",
        userId: "user_seeker_tinashe",
        userName: "Tinashe Dube",
        subject: "Cannot upload listing photos",
        category: "Technical",
        priority: "HIGH",
        status: "OPEN",
        team: "Technical Support",
        assignee: "Technical Support",
        customerEmail: "tinashe.dube@homelinkzim.co.zw",
        body: "Upload fails after selecting 5 images.",
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        id: "ticket_2",
        userId: "user_landlord_farai",
        userName: "Farai Dube",
        subject: "Account suspended appeal",
        category: "Account",
        priority: "MEDIUM",
        status: "PENDING",
        team: "Trust & Safety",
        assignee: "Trust & Safety",
        customerEmail: "farai.dube@homelinkzim.co.zw",
        body: "Requesting review of suspension.",
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
      },
    ],
    verificationRequests: [
      {
        id: "ver_1",
        userId: "user_landlord_grace",
        userName: "Grace Mutasa",
        type: "LANDLORD",
        subject: "National ID verification",
        priority: "HIGH",
        status: "PENDING",
        documentUrl: "/uploads/proof/grace-id.pdf",
        createdAt: daysAgo(2),
      },
      {
        id: "ver_2",
        userId: "user_agent_kudzai",
        userName: "Kudzai Mhlanga",
        type: "AGENCY",
        subject: "Agency registration documents",
        priority: "MEDIUM",
        status: "PENDING",
        createdAt: daysAgo(5),
      },
    ],
    userCredits: new Map([["user_landlord", 50], ["user_seeker_tinashe", 10]]),
    userSubscriptions: new Map(),
    webhookLogs: [
      {
        id: "wh_1",
        gateway: "paynow",
        event: "payment.completed",
        payload: { reference: "PN-12345", amount: 49 },
        status: "SUCCESS",
        createdAt: daysAgo(1),
      },
    ],
  };
}

export function seedPayments(state: AdminPlatformState) {
  const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
  state.payments = [
    {
      id: "pay_manual_1",
      userId: "user_landlord_chipo",
      userName: "Chipo Nyathi",
      provider: "bank_transfer",
      method: "bank_transfer",
      plan: "landlord_pro",
      amount: 49,
      currency: "USD",
      status: "MANUAL_REVIEW",
      manual: true,
      referenceNumber: "BT-2024-8891",
      proofUrl: "/uploads/proof/chipo-deposit.pdf",
      proofStatus: "UPLOADED",
      financeNotes: [],
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: "pay_ecocash_1",
      userId: "user_landlord",
      userName: "Tariro Moyo",
      provider: "ecocash",
      method: "ecocash",
      plan: "featured_listing",
      amount: 15,
      currency: "USD",
      status: "PAID",
      manual: false,
      referenceNumber: "EC-77821",
      proofStatus: "VERIFIED",
      financeNotes: [],
      listingId: "harare-avondale-cottage",
      receiptNumber: "RCP-001",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
      completedAt: daysAgo(3),
    },
    {
      id: "pay_pending_1",
      userId: "user_seeker_tinashe",
      userName: "Tinashe Dube",
      provider: "paynow",
      method: "paynow",
      plan: "landlord_pro",
      amount: 49,
      currency: "USD",
      status: "AWAITING_PROOF",
      manual: true,
      proofStatus: "REQUESTED",
      financeNotes: [],
      createdAt: daysAgo(0.5),
      updatedAt: daysAgo(0.5),
    },
  ];
}

export function audit(
  state: AdminPlatformState,
  entry: Omit<AuditLogEntry, "id" | "createdAt">,
) {
  const log: AuditLogEntry = { ...entry, id: `aud_${crypto.randomUUID()}`, createdAt: now() };
  state.auditLog.unshift(log);
  return log;
}

export function getPlatformSettings(state: AdminPlatformState) {
  const settings = mergePlatformSettings(defaultPlatformSettings, state.platformSettings);
  return {
    ...settings,
    enquiries: {
      ...defaultPlatformSettings.enquiries,
      ...settings.enquiries,
    },
  };
}

export function updatePlatformSettings(
  state: AdminPlatformState,
  updates: Partial<PlatformSettings>,
  actor: Actor,
  options?: { ip?: string; preserveSecrets?: boolean },
) {
  const merged = mergePlatformSettings(state.platformSettings, updates);
  const withSecrets = options?.preserveSecrets
    ? mergePlatformSecrets(merged, state.platformSettings)
    : merged;
  state.platformSettings = syncGeoToFlatLists({
    ...withSecrets,
    updatedAt: now(),
    updatedBy: actor.id,
  });
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "UPDATE_PLATFORM_SETTINGS",
    target: "platform",
    targetType: "SETTINGS",
    metadata: { keys: Object.keys(updates) },
    ip: options?.ip ?? "127.0.0.1",
  });
  void savePersistedSettings(state.platformSettings, state.paymentSettings);
  return state.platformSettings;
}

export function getPaymentSettings(state: AdminPlatformState) {
  return state.paymentSettings;
}

export function updatePaymentSettings(
  state: AdminPlatformState,
  updates: Partial<PaymentSettings>,
  actor: Actor,
  options?: { ip?: string; preserveSecrets?: boolean },
) {
  const merged = mergePaymentSettings(state.paymentSettings, updates);
  const withSecrets = options?.preserveSecrets ? mergePaymentSecrets(merged, state.paymentSettings) : merged;
  state.paymentSettings = withSecrets;
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "UPDATE_PAYMENT_SETTINGS",
    target: "payments",
    targetType: "SETTINGS",
    metadata: { keys: Object.keys(updates) },
    ip: options?.ip ?? "127.0.0.1",
  });
  void savePersistedSettings(state.platformSettings, state.paymentSettings);
  return state.paymentSettings;
}

export function getPaymentHealth(state: AdminPlatformState): PaymentHealth[] {
  return state.paymentSettings.gateways.map((gw) => {
    const logs = state.webhookLogs.filter((l) => l.gateway === gw.id);
    const success = logs.filter((l) => l.status === "SUCCESS").length;
    const rate = logs.length ? Math.round((success / logs.length) * 100) : 0;
    return {
      gateway: gw.id,
      status: !gw.enabled ? "down" : !logs.length ? "degraded" : rate > 90 ? "healthy" : "degraded",
      lastCheck: now(),
      successRate: rate,
      pendingWebhooks: logs.filter((l) => l.status === "PENDING").length,
    };
  });
}

export function listAllPayments(state: AdminPlatformState, filters?: { status?: PaymentStatus; manual?: boolean; q?: string }) {
  let items = [...state.payments];
  if (filters?.status) items = items.filter((p) => p.status === filters.status);
  if (filters?.manual != null) items = items.filter((p) => p.manual === filters.manual);
  if (filters?.q?.trim()) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.userName?.toLowerCase().includes(q) ?? false) ||
        (p.referenceNumber?.toLowerCase().includes(q) ?? false),
    );
  }
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPaymentById(state: AdminPlatformState, id: string) {
  return state.payments.find((p) => p.id === id) ?? null;
}

export function createPaymentRecord(
  state: AdminPlatformState,
  input: {
    userId: string;
    provider: string;
    method: PaymentMethod;
    plan: string;
    amount: number;
    currency?: string;
    manual?: boolean;
    listingId?: string;
    referenceNumber?: string;
  },
) {
  const user = state.users.get(input.userId);
  const ts = now();
  const isManual = input.manual ?? ["bank_transfer", "cash", "zipit", "ecocash", "onemoney", "manual"].includes(input.method);
  const payment: Payment = {
    id: `payment_${crypto.randomUUID()}`,
    userId: input.userId,
    userName: user?.name,
    provider: input.provider,
    method: input.method,
    plan: input.plan,
    amount: input.amount,
    currency: input.currency ?? state.paymentSettings.currency,
    status: isManual ? "MANUAL_REVIEW" : "PENDING",
    manual: isManual,
    referenceNumber: input.referenceNumber,
    proofStatus: isManual ? "NONE" : undefined,
    financeNotes: [],
    listingId: input.listingId,
    createdAt: ts,
    updatedAt: ts,
  };
  state.payments.unshift(payment);
  return payment;
}

export function applyPaymentBenefits(state: AdminPlatformState, payment: Payment) {
  const plan = getPlanDefinition(payment.plan);
  const user = state.users.get(payment.userId);
  if (!user) return;

  if (plan.grantsPremium) {
    user.premium = true;
    state.userSubscriptions.set(payment.userId, {
      userId: payment.userId,
      plan: payment.plan,
      startsAt: now(),
      endsAt: addDays(plan.durationDays),
      complimentary: payment.manual,
      grantedBy: payment.adminApprovedBy,
    });
  }

  if (plan.grantsFeatured && payment.listingId) {
    const listing = state.listings.find((l) => l.id === payment.listingId);
    if (listing) {
      listing.featured = true;
      listing.featuredUntil = addDays(plan.durationDays);
    }
  }

  if (plan.credits) {
    const current = state.userCredits.get(payment.userId) ?? 0;
    state.userCredits.set(payment.userId, current + plan.credits);
  }
}

export function completePaymentRecord(state: AdminPlatformState, paymentId: string, actor?: Actor) {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  payment.status = "PAID";
  payment.updatedAt = now();
  payment.completedAt = now();
  if (actor) payment.adminApprovedBy = actor.id;
  payment.receiptNumber = payment.receiptNumber ?? `RCP-${payment.id.slice(-8).toUpperCase()}`;
  applyPaymentBenefits(state, payment);
  return payment;
}

export function approveManualPayment(state: AdminPlatformState, paymentId: string, actor: Actor, note?: string) {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  if (note) addFinanceNote(state, paymentId, actor, note);
  payment.proofStatus = "VERIFIED";
  completePaymentRecord(state, paymentId, actor);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "APPROVE_MANUAL_PAYMENT",
    target: paymentId,
    targetType: "PAYMENT",
    metadata: { amount: payment.amount, userId: payment.userId },
    ip: "127.0.0.1",
  });
  return payment;
}

export function rejectManualPayment(state: AdminPlatformState, paymentId: string, actor: Actor, reason?: string) {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  payment.status = "FAILED";
  payment.proofStatus = "REJECTED";
  payment.updatedAt = now();
  if (reason) addFinanceNote(state, paymentId, actor, `Rejected: ${reason}`);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "REJECT_MANUAL_PAYMENT",
    target: paymentId,
    targetType: "PAYMENT",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return payment;
}

export function requestPaymentProof(state: AdminPlatformState, paymentId: string, actor: Actor) {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  payment.proofStatus = "REQUESTED";
  payment.status = "AWAITING_PROOF";
  payment.updatedAt = now();
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "REQUEST_PAYMENT_PROOF",
    target: paymentId,
    targetType: "PAYMENT",
    metadata: {},
    ip: "127.0.0.1",
  });
  return payment;
}

export function uploadPaymentProof(state: AdminPlatformState, paymentId: string, proofUrl: string) {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  payment.proofUrl = proofUrl;
  payment.proofStatus = "UPLOADED";
  payment.status = "MANUAL_REVIEW";
  payment.updatedAt = now();
  return payment;
}

export function addFinanceNote(state: AdminPlatformState, paymentId: string, actor: Actor, note: string) {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  const entry: FinanceNote = {
    id: `fn_${crypto.randomUUID()}`,
    authorId: actor.id,
    authorName: actor.name,
    note,
    createdAt: now(),
  };
  payment.financeNotes.push(entry);
  payment.updatedAt = now();
  return entry;
}

export function reversePayment(state: AdminPlatformState, paymentId: string, actor: Actor, reason?: string) {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  payment.status = "REVERSED";
  payment.updatedAt = now();
  if (reason) addFinanceNote(state, paymentId, actor, `Reversed: ${reason}`);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "REVERSE_PAYMENT",
    target: paymentId,
    targetType: "PAYMENT",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return payment;
}

export function refundPayment(state: AdminPlatformState, paymentId: string, actor: Actor, reason?: string) {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  payment.status = "REFUNDED";
  payment.updatedAt = now();
  if (reason) addFinanceNote(state, paymentId, actor, `Refunded: ${reason}`);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "REFUND_PAYMENT",
    target: paymentId,
    targetType: "PAYMENT",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return payment;
}

export function recordManualPayment(
  state: AdminPlatformState,
  input: {
    userId: string;
    method: PaymentMethod;
    plan: string;
    amount: number;
    referenceNumber: string;
    proofUrl?: string;
    listingId?: string;
    autoApprove?: boolean;
  },
  actor: Actor,
) {
  const payment = createPaymentRecord(state, {
    userId: input.userId,
    provider: input.method,
    method: input.method,
    plan: input.plan,
    amount: input.amount,
    manual: true,
    listingId: input.listingId,
    referenceNumber: input.referenceNumber,
  });
  if (input.proofUrl) uploadPaymentProof(state, payment.id, input.proofUrl);
  if (input.autoApprove) approveManualPayment(state, payment.id, actor, "Recorded and approved by admin");
  else
    audit(state, {
      actorId: actor.id,
      actorName: actor.name,
      action: "RECORD_MANUAL_PAYMENT",
      target: payment.id,
      targetType: "PAYMENT",
      metadata: input,
      ip: "127.0.0.1",
    });
  return payment;
}

export function grantComplimentary(
  state: AdminPlatformState,
  input: { userId: string; plan: string; days?: number; listingId?: string; credits?: number },
  actor: Actor,
) {
  const plan = getPlanDefinition(input.plan);
  const days = input.days ?? plan.durationDays;
  const user = state.users.get(input.userId);
  if (!user) return null;

  if (plan.grantsPremium || input.plan.includes("pro") || input.plan === "agency") {
    user.premium = true;
    state.userSubscriptions.set(input.userId, {
      userId: input.userId,
      plan: input.plan,
      startsAt: now(),
      endsAt: addDays(days),
      complimentary: true,
      grantedBy: actor.id,
    });
  }

  if (input.listingId || plan.grantsFeatured) {
    const lid = input.listingId;
    if (lid) {
      const listing = state.listings.find((l) => l.id === lid);
      if (listing) {
        listing.featured = true;
        listing.featuredUntil = addDays(days || 7);
      }
    }
  }

  if (input.credits ?? plan.credits) {
    const add = input.credits ?? plan.credits ?? 0;
    state.userCredits.set(input.userId, (state.userCredits.get(input.userId) ?? 0) + add);
  }

  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "GRANT_COMPLIMENTARY",
    target: input.userId,
    targetType: "USER",
    metadata: input,
    ip: "127.0.0.1",
  });
  return { userId: input.userId, plan: input.plan, days };
}

export function adjustUserCredits(state: AdminPlatformState, userId: string, delta: number, actor: Actor, reason?: string) {
  const current = state.userCredits.get(userId) ?? 0;
  state.userCredits.set(userId, Math.max(0, current + delta));
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "ADJUST_CREDITS",
    target: userId,
    targetType: "USER",
    metadata: { delta, reason, balance: state.userCredits.get(userId) },
    ip: "127.0.0.1",
  });
  return state.userCredits.get(userId)!;
}

export function getSupportTickets(state: AdminPlatformState) {
  return [...state.supportTickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function resolveSupportTicket(state: AdminPlatformState, ticketId: string, actor: Actor, reason?: string) {
  const ticket = state.supportTickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  ticket.status = "RESOLVED";
  ticket.resolutionNote = reason || ticket.resolutionNote || "Resolved by support team.";
  ticket.updatedAt = now();
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "RESOLVE_TICKET",
    target: ticketId,
    targetType: "SUPPORT",
    metadata: { reason: ticket.resolutionNote },
    ip: "127.0.0.1",
  });
  return ticket;
}

export function createSupportTicket(
  state: AdminPlatformState,
  input: Omit<SupportTicket, "id" | "createdAt" | "updatedAt">,
  actor: Actor,
) {
  const ticket: SupportTicket = {
    ...input,
    team: input.team ?? defaultSupportTeam(input.category),
    assignee: input.assignee ?? defaultSupportTeam(input.category),
    id: `ticket_${crypto.randomUUID()}`,
    createdAt: now(),
    updatedAt: now(),
  };
  state.supportTickets.unshift(ticket);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "CREATE_TICKET",
    target: ticket.id,
    targetType: "SUPPORT",
    metadata: { subject: ticket.subject },
    ip: "127.0.0.1",
  });
  return ticket;
}

export function escalateSupportTicket(state: AdminPlatformState, ticketId: string, actor: Actor, escalation?: { team?: string; reason?: string }) {
  const ticket = state.supportTickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  ticket.status = "ESCALATED";
  ticket.priority = "HIGH";
  if (escalation?.team) {
    ticket.team = escalation.team as SupportTicket["team"];
    ticket.assignee = escalation.team;
  }
  ticket.escalationReason = escalation?.reason;
  ticket.updatedAt = now();
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "ESCALATE_TICKET",
    target: ticketId,
    targetType: "SUPPORT",
    metadata: { team: escalation?.team, reason: escalation?.reason },
    ip: "127.0.0.1",
  });
  return ticket;
}

export function assignSupportTicket(state: AdminPlatformState, ticketId: string, assignee: string, actor: Actor) {
  const ticket = state.supportTickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  ticket.assignee = assignee;
  if (["Support Team", "Billing Team", "Trust & Safety", "Technical Support"].includes(assignee)) {
    ticket.team = assignee as SupportTicket["team"];
  }
  ticket.status = ticket.status === "OPEN" ? "PENDING" : ticket.status;
  ticket.updatedAt = now();
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "ASSIGN_TICKET",
    target: ticketId,
    targetType: "SUPPORT",
    metadata: { assignee },
    ip: "127.0.0.1",
  });
  return ticket;
}

function defaultSupportTeam(category: string): SupportTicket["team"] {
  const normalized = category.toLowerCase();
  if (normalized.includes("billing") || normalized.includes("payment")) return "Billing Team";
  if (normalized.includes("technical")) return "Technical Support";
  if (normalized.includes("trust") || normalized.includes("safety") || normalized.includes("account")) return "Trust & Safety";
  return "Support Team";
}

export function getVerificationRequests(state: AdminPlatformState) {
  return state.verificationRequests.filter((v) => v.status === "PENDING");
}

export function approveVerification(state: AdminPlatformState, id: string, actor: Actor) {
  const req = state.verificationRequests.find((v) => v.id === id);
  if (!req) return null;
  req.status = "APPROVED";
  const user = state.users.get(req.userId);
  if (user && (req.type === "LANDLORD" || req.type === "IDENTITY")) {
    user.verification.identity = "VERIFIED";
    user.verification.phone = "VERIFIED";
  }
  if (req.type === "AGENCY" && user?.agencyId) {
    const agency = state.agencies.get(user.agencyId);
    if (agency) agency.verificationStatus = "VERIFIED";
  }
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "APPROVE_VERIFICATION",
    target: id,
    targetType: "VERIFICATION",
    metadata: { userId: req.userId },
    ip: "127.0.0.1",
  });
  return req;
}

export function rejectVerification(state: AdminPlatformState, id: string, actor: Actor, reason?: string) {
  const req = state.verificationRequests.find((v) => v.id === id);
  if (!req) return null;
  req.status = "REJECTED";
  const user = state.users.get(req.userId);
  if (user) user.verification.identity = "REJECTED";
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "REJECT_VERIFICATION",
    target: id,
    targetType: "VERIFICATION",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return req;
}

export function adminApproveListing(state: AdminPlatformState, listingId: string, actor: Actor) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.status = "ACTIVE";
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "APPROVE_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: {},
    ip: "127.0.0.1",
  });
  return listing;
}

export function adminRejectListing(state: AdminPlatformState, listingId: string, actor: Actor, reason?: string) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.status = "REJECTED";
  if (reason) listing.adminNotes = reason;
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "REJECT_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return listing;
}

export function adminEditListing(state: AdminPlatformState, listingId: string, updates: Partial<ListingRecord>, actor: Actor) {
  const index = state.listings.findIndex((l) => l.id === listingId);
  if (index === -1) return null;
  state.listings[index] = { ...state.listings[index], ...updates, id: listingId };
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "EDIT_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: { keys: Object.keys(updates) },
    ip: "127.0.0.1",
  });
  return state.listings[index];
}

export function transferListingOwnership(
  state: AdminPlatformState,
  listingId: string,
  newOwnerId: string,
  actor: Actor,
) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  const prev = listing.ownerId;
  listing.ownerId = newOwnerId;
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "TRANSFER_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: { from: prev, to: newOwnerId },
    ip: "127.0.0.1",
  });
  return listing;
}

export function featureListing(state: AdminPlatformState, listingId: string, days: number, actor: Actor) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.featured = true;
  listing.featuredUntil = addDays(days);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "FEATURE_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: { days },
    ip: "127.0.0.1",
  });
  return listing;
}

export function featureAgency(state: AdminPlatformState, agencyId: string, actor: Actor) {
  const agency = state.agencies.get(agencyId);
  if (!agency) return null;
  agency.subscriptionTier = "ENTERPRISE";
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "FEATURE_AGENCY",
    target: agencyId,
    targetType: "AGENCY",
    metadata: {},
    ip: "127.0.0.1",
  });
  return agency;
}

export function adminDeleteListing(state: AdminPlatformState, listingId: string, actor: Actor, reason?: string) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.status = "DELETED";
  if (reason) listing.adminNotes = reason;
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "DELETE_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return listing;
}

export function adminArchiveListing(state: AdminPlatformState, listingId: string, actor: Actor, reason?: string) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.status = "ARCHIVED";
  if (reason) listing.adminNotes = reason;
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "ARCHIVE_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return listing;
}

export function adminRestoreListing(state: AdminPlatformState, listingId: string, actor: Actor) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.status = "ACTIVE";
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "RESTORE_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: {},
    ip: "127.0.0.1",
  });
  return listing;
}

export function adminUnfeatureListing(state: AdminPlatformState, listingId: string, actor: Actor) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.featured = false;
  listing.featuredUntil = undefined;
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "UNFEATURE_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: {},
    ip: "127.0.0.1",
  });
  return listing;
}

export function adminSetListingVerified(state: AdminPlatformState, listingId: string, verified: boolean, actor: Actor) {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.verified = verified;
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: verified ? "VERIFY_LISTING" : "UNVERIFY_LISTING",
    target: listingId,
    targetType: "LISTING",
    metadata: {},
    ip: "127.0.0.1",
  });
  return listing;
}

export function updateAgency(
  state: AdminPlatformState,
  agencyId: string,
  updates: Partial<Pick<import("@/lib/store/types").Agency, "name" | "email" | "phone" | "city" | "subscriptionTier">>,
  actor: Actor,
) {
  const agency = state.agencies.get(agencyId);
  if (!agency || agency.accountStatus === "DELETED") return null;
  Object.assign(agency, updates);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "UPDATE_AGENCY",
    target: agencyId,
    targetType: "AGENCY",
    metadata: { keys: Object.keys(updates) },
    ip: "127.0.0.1",
  });
  return agency;
}

export function suspendAgency(state: AdminPlatformState, agencyId: string, actor: Actor, reason?: string) {
  const agency = state.agencies.get(agencyId);
  if (!agency) return null;
  agency.accountStatus = "SUSPENDED";
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "SUSPEND_AGENCY",
    target: agencyId,
    targetType: "AGENCY",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return agency;
}

export function activateAgency(state: AdminPlatformState, agencyId: string, actor: Actor) {
  const agency = state.agencies.get(agencyId);
  if (!agency) return null;
  agency.accountStatus = "ACTIVE";
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "ACTIVATE_AGENCY",
    target: agencyId,
    targetType: "AGENCY",
    metadata: {},
    ip: "127.0.0.1",
  });
  return agency;
}

export function deleteAgency(state: AdminPlatformState, agencyId: string, actor: Actor, reason?: string) {
  const agency = state.agencies.get(agencyId);
  if (!agency) return null;
  agency.accountStatus = "DELETED";
  for (const user of state.users.values()) {
    if (user.agencyId === agencyId) {
      user.agencyId = undefined;
    }
  }
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "DELETE_AGENCY",
    target: agencyId,
    targetType: "AGENCY",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return agency;
}

export function verifyAgency(state: AdminPlatformState, agencyId: string, actor: Actor) {
  const agency = state.agencies.get(agencyId);
  if (!agency) return null;
  agency.verificationStatus = "VERIFIED";
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "VERIFY_AGENCY",
    target: agencyId,
    targetType: "AGENCY",
    metadata: {},
    ip: "127.0.0.1",
  });
  return agency;
}

export function rejectAgency(state: AdminPlatformState, agencyId: string, actor: Actor, reason?: string) {
  const agency = state.agencies.get(agencyId);
  if (!agency) return null;
  agency.verificationStatus = "REJECTED";
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "REJECT_AGENCY",
    target: agencyId,
    targetType: "AGENCY",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return agency;
}

export function deleteUser(state: AdminPlatformState, userId: string, actor: Actor, reason?: string) {
  const user = state.users.get(userId);
  if (!user) return null;
  user.accountStatus = "DELETED";
  terminateUserSessions(state, userId, actor);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "DELETE_USER",
    target: userId,
    targetType: "USER",
    metadata: { reason },
    ip: "127.0.0.1",
  });
  return user;
}

export function terminateUserSessions(state: AdminPlatformState, userId: string, actor: Actor) {
  let count = 0;
  for (const [id, session] of state.sessions.entries()) {
    if (session.userId === userId) {
      state.sessions.delete(id);
      count++;
    }
  }
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "TERMINATE_SESSIONS",
    target: userId,
    targetType: "USER",
    metadata: { count },
    ip: "127.0.0.1",
  });
  return count;
}

export function terminateAllSessions(state: AdminPlatformState, actor: Actor) {
  const count = state.sessions.size;
  state.sessions.clear();
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "FORCE_LOGOUT_ALL",
    target: "all",
    targetType: "SESSION",
    metadata: { count },
    ip: "127.0.0.1",
  });
  return count;
}

export function resetUserVerification(state: AdminPlatformState, userId: string, actor: Actor) {
  const user = state.users.get(userId);
  if (!user) return null;
  user.verification = { identity: "PENDING", phone: "PENDING", email: user.verification.email };
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "RESET_VERIFICATION",
    target: userId,
    targetType: "USER",
    metadata: {},
    ip: "127.0.0.1",
  });
  return user;
}

export function extendSubscription(state: AdminPlatformState, userId: string, days: number, actor: Actor) {
  const sub = state.userSubscriptions.get(userId);
  const endsAt = addDays(days);
  if (sub) {
    sub.endsAt = endsAt;
  } else {
    state.userSubscriptions.set(userId, {
      userId,
      plan: "landlord_pro",
      startsAt: now(),
      endsAt,
      complimentary: true,
      grantedBy: actor.id,
    });
  }
  const user = state.users.get(userId);
  if (user) user.premium = true;
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "EXTEND_SUBSCRIPTION",
    target: userId,
    targetType: "USER",
    metadata: { days },
    ip: "127.0.0.1",
  });
  return state.userSubscriptions.get(userId)!;
}

export function generateReportData(state: AdminPlatformState, type: string) {
  switch (type) {
    case "revenue":
      return {
        type,
        generatedAt: now(),
        rows: listAllPayments(state).map((p) => ({
          id: p.id,
          user: p.userName,
          amount: p.amount,
          status: p.status,
          plan: p.plan,
          date: p.createdAt,
        })),
      };
    case "users":
      return {
        type,
        generatedAt: now(),
        rows: [...state.users.values()].map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.accountStatus,
          roles: u.roles.join(", "),
        })),
      };
    case "properties":
      return {
        type,
        generatedAt: now(),
        rows: state.listings.map((l) => ({
          id: l.id,
          title: l.title,
          city: l.city,
          status: l.status,
          featured: l.featured ?? false,
          ownerId: l.ownerId,
        })),
      };
    default:
      return { type, generatedAt: now(), rows: state.auditLog.slice(0, 100) };
  }
}

export function logWebhook(
  state: AdminPlatformState,
  gateway: WebhookLog["gateway"],
  event: string,
  payload: Record<string, unknown>,
  status: WebhookLog["status"],
) {
  const log: WebhookLog = {
    id: `wh_${crypto.randomUUID()}`,
    gateway,
    event,
    payload,
    status,
    createdAt: now(),
  };
  state.webhookLogs.unshift(log);
  return log;
}
