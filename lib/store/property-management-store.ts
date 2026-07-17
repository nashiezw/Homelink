import type {
  CRMLead,
  InterestedParty,
  PMActivity,
  PMAgreement,
  PMDocument,
  PMInspection,
  PMInvoice,
  PMNote,
  PMOffer,
  PMQuotation,
  PMRequestStatus,
  PropertyManagementRequest,
  PMTimelineEntry,
  PMValuation,
  SubmitPMRequestInput,
} from "@/lib/property-management/types";
import type { AuditLogEntry, StoreUser } from "@/lib/store/types";

export type PMStoreState = {
  pmRequests: PropertyManagementRequest[];
  crmLeads: CRMLead[];
  pmRequestCounter: number;
  auditLog: AuditLogEntry[];
  users: Map<string, StoreUser>;
};

type Actor = { id: string; name: string; ip?: string };

type NotifyFn = (userId: string, channels: Array<{ channel: string; subject: string; body: string }>) => void;

function now() {
  return new Date().toISOString();
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function generateRequestNumber(counter: number) {
  const year = new Date().getFullYear();
  return `PM-${year}-${String(counter).padStart(5, "0")}`;
}

function defaultTimeline(): PMTimelineEntry[] {
  return [
    { id: "tl_1", label: "Request submitted", status: "completed" },
    { id: "tl_2", label: "Consultant assigned", status: "upcoming" },
    { id: "tl_3", label: "Inspection scheduled", status: "upcoming" },
    { id: "tl_4", label: "Valuation & quotation", status: "upcoming" },
    { id: "tl_5", label: "Agreement signed", status: "upcoming" },
    { id: "tl_6", label: "Property under management", status: "upcoming" },
  ];
}

export function recommendConsultant(
  state: PMStoreState,
  city: string,
): { consultantId: string; consultantName: string } | null {
  const consultants = [...state.users.values()].filter((u) => u.roles.includes("CONSULTANT") && u.accountStatus === "ACTIVE");
  if (consultants.length === 0) return null;

  const scored = consultants.map((c) => {
    const cityMatch = c.city?.toLowerCase() === city.toLowerCase() ? 30 : 0;
    const activeLeads = state.pmRequests.filter((r) => r.consultantId === c.id && !["CLOSED", "ARCHIVED", "REJECTED"].includes(r.status)).length;
    const loadPenalty = Math.min(activeLeads * 5, 25);
    const score = c.performanceScore + cityMatch - loadPenalty;
    return { consultant: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.consultant;
  if (!best) return null;
  return { consultantId: best.id, consultantName: best.name };
}

function logActivity(request: PropertyManagementRequest, actor: Actor, action: string, detail: string) {
  const entry: PMActivity = {
    id: `pma_${crypto.randomUUID()}`,
    actorId: actor.id,
    actorName: actor.name,
    action,
    detail,
    createdAt: now(),
  };
  request.activityLog.unshift(entry);
  request.updatedAt = now();
}

function audit(
  state: PMStoreState,
  entry: Omit<AuditLogEntry, "id" | "createdAt">,
) {
  const log: AuditLogEntry = { ...entry, id: `aud_${crypto.randomUUID()}`, createdAt: now() };
  state.auditLog.unshift(log);
  return log;
}

function updateTimeline(request: PropertyManagementRequest, stepLabel: string) {
  let foundCurrent = false;
  request.timeline = request.timeline.map((step) => {
    if (step.label === stepLabel) {
      foundCurrent = true;
      return { ...step, status: "current" as const, at: now() };
    }
    if (!foundCurrent && step.status !== "completed") {
      return { ...step, status: "completed" as const, at: now() };
    }
    return step;
  });
}

export function submitRequest(
  state: PMStoreState,
  input: SubmitPMRequestInput,
  notify: NotifyFn,
  systemActor: Actor = { id: "system", name: "HouseLink System", ip: "127.0.0.1" },
) {
  state.pmRequestCounter += 1;
  const requestNumber = generateRequestNumber(state.pmRequestCounter);
  const recommendation = recommendConsultant(state, input.city);
  const autoAssign = recommendation !== null;

  const request: PropertyManagementRequest = {
    id: `pmr_${crypto.randomUUID()}`,
    requestNumber,
    ...input,
    status: autoAssign ? "ASSIGNED" : "PENDING_ASSIGNMENT",
    consultantId: recommendation?.consultantId,
    consultantName: recommendation?.consultantName,
    aiRecommendedConsultantId: recommendation?.consultantId,
    slaDeadline: addHours(24),
    slaBreached: false,
    progressPercent: autoAssign ? 15 : 5,
    internalNotes: [],
    documents: [],
    inspections: [],
    valuations: [],
    quotations: [],
    agreements: [],
    invoices: [],
    offers: [],
    interestedParties: [],
    timeline: defaultTimeline().map((t, i) => (i === 0 ? { ...t, status: "completed" as const, at: now() } : t)),
    activityLog: [],
    paymentIds: [],
    createdAt: now(),
    updatedAt: now(),
  };

  if (autoAssign && recommendation) {
    updateTimeline(request, "Consultant assigned");
    logActivity(request, systemActor, "CONSULTANT_ASSIGNED", `AI assigned ${recommendation.consultantName}`);
  }

  logActivity(request, { id: input.ownerId, name: input.ownerName }, "REQUEST_SUBMITTED", `Request ${requestNumber} created`);

  const lead: CRMLead = {
    id: `lead_${crypto.randomUUID()}`,
    requestId: request.id,
    requestNumber,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    city: input.city,
    serviceType: input.serviceType,
    source: "property_management_form",
    status: autoAssign ? "ASSIGNED" : "NEW",
    assignedConsultantId: recommendation?.consultantId,
    score: recommendation ? 85 : 60,
    createdAt: now(),
    updatedAt: now(),
  };

  state.pmRequests.unshift(request);
  state.crmLeads.unshift(lead);

  audit(state, {
    actorId: input.ownerId,
    actorName: input.ownerName,
    action: "PM_REQUEST_SUBMITTED",
    target: request.id,
    targetType: "PM_REQUEST",
    metadata: { requestNumber, city: input.city, serviceType: input.serviceType, consultantId: recommendation?.consultantId },
    ip: systemActor.ip ?? "127.0.0.1",
  });

  notify(input.ownerId, [
    { channel: "email", subject: `Property Management Request ${requestNumber}`, body: `Your request has been received. Status: ${request.status}.` },
    { channel: "sms", subject: "PM Request received", body: `HouseLink: Request ${requestNumber} submitted successfully.` },
    { channel: "whatsapp", subject: "PM Request", body: `Your property management request ${requestNumber} is being processed.` },
  ]);

  const admins = [...state.users.values()].filter((u) => u.roles.includes("ADMIN"));
  for (const admin of admins) {
    notify(admin.id, [
      { channel: "email", subject: `New PM Request ${requestNumber}`, body: `New property management request from ${input.ownerName} in ${input.city}.` },
    ]);
  }

  if (recommendation) {
    notify(recommendation.consultantId, [
      { channel: "email", subject: `New lead assigned: ${requestNumber}`, body: `You have been assigned a new property management lead in ${input.city}.` },
      { channel: "sms", subject: "New PM lead", body: `New lead ${requestNumber} assigned to you.` },
    ]);
  }

  return { request, lead, recommendation };
}

export function listRequests(
  state: PMStoreState,
  filters?: { status?: PMRequestStatus; q?: string; ownerId?: string; consultantId?: string; includeDeleted?: boolean },
) {
  let items = state.pmRequests.filter((r) => filters?.includeDeleted || !r.deletedAt);
  if (filters?.status) items = items.filter((r) => r.status === filters.status);
  if (filters?.ownerId) items = items.filter((r) => r.ownerId === filters.ownerId);
  if (filters?.consultantId) items = items.filter((r) => r.consultantId === filters.consultantId);
  if (filters?.q?.trim()) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (r) =>
        r.requestNumber.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.propertyAddress.toLowerCase().includes(q),
    );
  }
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getRequest(state: PMStoreState, id: string) {
  return state.pmRequests.find((r) => r.id === id && !r.deletedAt) ?? null;
}

export function getRequestByNumber(state: PMStoreState, requestNumber: string) {
  return state.pmRequests.find((r) => r.requestNumber === requestNumber && !r.deletedAt) ?? null;
}

function syncLead(state: PMStoreState, request: PropertyManagementRequest) {
  const lead = state.crmLeads.find((l) => l.requestId === request.id);
  if (lead) {
    lead.status = request.status;
    lead.assignedConsultantId = request.consultantId;
    lead.updatedAt = now();
  }
}

export function assignConsultant(state: PMStoreState, requestId: string, consultantId: string, actor: Actor) {
  const request = getRequest(state, requestId);
  const consultant = state.users.get(consultantId);
  if (!request || !consultant) return null;

  const old = request.consultantId;
  request.consultantId = consultantId;
  request.consultantName = consultant.name;
  request.status = request.status === "PENDING_ASSIGNMENT" || request.status === "SUBMITTED" ? "ASSIGNED" : request.status;
  request.progressPercent = Math.max(request.progressPercent, 15);
  updateTimeline(request, "Consultant assigned");
  logActivity(request, actor, "ASSIGN_CONSULTANT", `Assigned to ${consultant.name}`);
  syncLead(state, request);

  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "PM_ASSIGN_CONSULTANT",
    target: requestId,
    targetType: "PM_REQUEST",
    metadata: { from: old, to: consultantId },
    ip: actor.ip ?? "127.0.0.1",
  });
  return request;
}

export function assignAgency(state: PMStoreState, requestId: string, agencyId: string, agencyName: string, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  request.agencyId = agencyId;
  request.agencyName = agencyName;
  logActivity(request, actor, "ASSIGN_AGENCY", `Agency: ${agencyName}`);
  audit(state, { actorId: actor.id, actorName: actor.name, action: "PM_ASSIGN_AGENCY", target: requestId, targetType: "PM_REQUEST", metadata: { agencyId }, ip: actor.ip ?? "127.0.0.1" });
  return request;
}

export function setStatus(state: PMStoreState, requestId: string, status: PMRequestStatus, actor: Actor, reason?: string) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const old = request.status;
  request.status = status;
  if (status === "APPROVED") request.progressPercent = Math.max(request.progressPercent, 50);
  if (status === "IN_PROGRESS") request.progressPercent = Math.max(request.progressPercent, 30);
  if (status === "CLOSED") request.progressPercent = 100;
  logActivity(request, actor, "STATUS_CHANGE", `${old}  ${status}${reason ? `: ${reason}` : ""}`);
  syncLead(state, request);
  audit(state, { actorId: actor.id, actorName: actor.name, action: "PM_STATUS_CHANGE", target: requestId, targetType: "PM_REQUEST", metadata: { old, new: status, reason }, ip: actor.ip ?? "127.0.0.1" });
  return request;
}

export function addNote(state: PMStoreState, requestId: string, note: Omit<PMNote, "id" | "createdAt">, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const entry: PMNote = { ...note, id: `pmn_${crypto.randomUUID()}`, createdAt: now() };
  request.internalNotes.push(entry);
  logActivity(request, actor, "ADD_NOTE", note.internal ? "Internal note added" : "Note added");
  return entry;
}

export function uploadDocument(state: PMStoreState, requestId: string, doc: Omit<PMDocument, "id" | "createdAt" | "updatedAt" | "status">, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const document: PMDocument = { ...doc, id: `pmd_${crypto.randomUUID()}`, status: "UPLOADED", createdAt: now(), updatedAt: now() };
  request.documents.push(document);
  logActivity(request, actor, "UPLOAD_DOCUMENT", document.name);
  audit(state, { actorId: actor.id, actorName: actor.name, action: "PM_UPLOAD_DOCUMENT", target: requestId, targetType: "PM_REQUEST", metadata: { docId: document.id }, ip: actor.ip ?? "127.0.0.1" });
  return document;
}

export function reviewDocument(state: PMStoreState, requestId: string, docId: string, approved: boolean, actor: Actor, reason?: string) {
  const request = getRequest(state, requestId);
  const doc = request?.documents.find((d) => d.id === docId);
  if (!request || !doc) return null;
  doc.status = approved ? "APPROVED" : "REJECTED";
  doc.reviewedBy = actor.id;
  doc.rejectionReason = reason;
  doc.updatedAt = now();
  logActivity(request, actor, approved ? "APPROVE_DOCUMENT" : "REJECT_DOCUMENT", doc.name);
  return doc;
}

export function requestDocument(
  state: PMStoreState,
  requestId: string,
  name: string,
  type: string,
  actor: Actor,
  options?: { dueDate?: string; instructions?: string; requestedFrom?: string },
) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const document: PMDocument = {
    id: `pmd_${crypto.randomUUID()}`,
    name,
    type,
    status: "REQUESTED",
    requestedBy: actor.id,
    requestedFrom: options?.requestedFrom,
    dueDate: options?.dueDate,
    instructions: options?.instructions,
    createdAt: now(),
    updatedAt: now(),
  };
  request.documents.push(document);
  logActivity(request, actor, "REQUEST_DOCUMENT", `${name}${options?.dueDate ? ` due ${options.dueDate}` : ""}`);
  return document;
}

export function scheduleInspection(state: PMStoreState, requestId: string, scheduledAt: string, actor: Actor, assignedTo?: string) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const inspection: PMInspection = { id: `pmi_${crypto.randomUUID()}`, scheduledAt, status: "SCHEDULED", assignedTo, createdAt: now(), updatedAt: now() };
  request.inspections.push(inspection);
  updateTimeline(request, "Inspection scheduled");
  request.progressPercent = Math.max(request.progressPercent, 25);
  logActivity(request, actor, "SCHEDULE_INSPECTION", scheduledAt);
  return inspection;
}

export function rescheduleInspection(state: PMStoreState, requestId: string, inspectionId: string, scheduledAt: string, actor: Actor) {
  const request = getRequest(state, requestId);
  const inspection = request?.inspections.find((i) => i.id === inspectionId);
  if (!request || !inspection) return null;
  inspection.scheduledAt = scheduledAt;
  inspection.status = "RESCHEDULED";
  inspection.updatedAt = now();
  logActivity(request, actor, "RESCHEDULE_INSPECTION", scheduledAt);
  return inspection;
}

export function cancelInspection(state: PMStoreState, requestId: string, inspectionId: string, actor: Actor) {
  const request = getRequest(state, requestId);
  const inspection = request?.inspections.find((i) => i.id === inspectionId);
  if (!request || !inspection) return null;
  inspection.status = "CANCELLED";
  inspection.updatedAt = now();
  logActivity(request, actor, "CANCEL_INSPECTION", inspectionId);
  return inspection;
}

export function assignValuation(state: PMStoreState, requestId: string, amount: number, currency: string, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const valuation: PMValuation = { id: `pmv_${crypto.randomUUID()}`, amount, currency, status: "PENDING", createdAt: now() };
  request.valuations.push(valuation);
  updateTimeline(request, "Valuation & quotation");
  logActivity(request, actor, "ASSIGN_VALUATION", `$${amount}`);
  return valuation;
}

export function approveValuation(state: PMStoreState, requestId: string, valuationId: string, actor: Actor) {
  const request = getRequest(state, requestId);
  const val = request?.valuations.find((v) => v.id === valuationId);
  if (!request || !val) return null;
  val.status = "APPROVED";
  val.approvedBy = actor.id;
  logActivity(request, actor, "APPROVE_VALUATION", `$${val.amount}`);
  return val;
}

export function generateQuotation(state: PMStoreState, requestId: string, title: string, lineItems: Array<{ label: string; amount: number }>, currency: string, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const total = lineItems.reduce((s, i) => s + i.amount, 0);
  const quotation: PMQuotation = { id: `pmq_${crypto.randomUUID()}`, title, lineItems, total, currency, status: "SENT", createdAt: now() };
  request.quotations.push(quotation);
  request.progressPercent = Math.max(request.progressPercent, 40);
  logActivity(request, actor, "GENERATE_QUOTATION", title);
  return quotation;
}

export function generateAgreement(state: PMStoreState, requestId: string, type: "MANAGEMENT" | "TENANCY", title: string, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const agreement: PMAgreement = {
    id: `pmag_${crypto.randomUUID()}`,
    type,
    title,
    content: `Agreement for ${request.propertyAddress}, ${request.city}. Service: ${request.serviceType}. Parties: ${request.ownerName} and HouseLink Zimbabwe.`,
    status: "SENT",
    createdAt: now(),
  };
  request.agreements.push(agreement);
  request.progressPercent = Math.max(request.progressPercent, 70);
  logActivity(request, actor, "GENERATE_AGREEMENT", title);
  return agreement;
}

export function signAgreement(state: PMStoreState, requestId: string, agreementId: string | undefined, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const agreement = agreementId ? request.agreements.find((item) => item.id === agreementId) : request.agreements[0];
  if (!agreement) return null;
  agreement.status = "SIGNED";
  updateTimeline(request, "Agreement signed");
  request.progressPercent = Math.max(request.progressPercent, 85);
  logActivity(request, actor, "SIGN_AGREEMENT", agreement.title);
  return agreement;
}

export function activateManagement(state: PMStoreState, requestId: string, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  request.status = "IN_PROGRESS";
  request.progressPercent = 100;
  updateTimeline(request, "Property under management");
  logActivity(request, actor, "ACTIVATE_MANAGEMENT", "Property moved under active management");
  syncLead(state, request);
  audit(state, {
    actorId: actor.id,
    actorName: actor.name,
    action: "PM_ACTIVATE_MANAGEMENT",
    target: requestId,
    targetType: "PM_REQUEST",
    metadata: {},
    ip: actor.ip ?? "127.0.0.1",
  });
  return request;
}

export function generateInvoice(state: PMStoreState, requestId: string, title: string, amount: number, currency: string, dueDate: string, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const invoice: PMInvoice = { id: `pminv_${crypto.randomUUID()}`, title, amount, currency, status: "SENT", dueDate, createdAt: now() };
  request.invoices.push(invoice);
  logActivity(request, actor, "GENERATE_INVOICE", `${title}: $${amount}`);
  audit(state, { actorId: actor.id, actorName: actor.name, action: "PM_GENERATE_INVOICE", target: requestId, targetType: "PM_REQUEST", metadata: { invoiceId: invoice.id, amount }, ip: actor.ip ?? "127.0.0.1" });
  return invoice;
}

export function linkPayment(state: PMStoreState, requestId: string, paymentId: string, invoiceId: string | undefined, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  if (!request.paymentIds.includes(paymentId)) request.paymentIds.push(paymentId);
  if (invoiceId) {
    const inv = request.invoices.find((i) => i.id === invoiceId);
    if (inv) {
      inv.status = "PAID";
      inv.paymentId = paymentId;
    }
  }
  logActivity(request, actor, "PAYMENT_LINKED", paymentId);
  return request;
}

export function addOffer(state: PMStoreState, requestId: string, offer: Omit<PMOffer, "id" | "createdAt" | "status">, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const entry: PMOffer = { ...offer, id: `pmo_${crypto.randomUUID()}`, status: "PENDING", createdAt: now() };
  request.offers.push(entry);
  logActivity(request, actor, "ADD_OFFER", `${offer.partyName}: $${offer.amount}`);
  return entry;
}

export function addInterestedParty(state: PMStoreState, requestId: string, party: Omit<InterestedParty, "id" | "createdAt">, actor: Actor) {
  const request = getRequest(state, requestId);
  if (!request) return null;
  const entry: InterestedParty = { ...party, id: `pip_${crypto.randomUUID()}`, createdAt: now() };
  request.interestedParties.push(entry);
  logActivity(request, actor, "ADD_INTERESTED_PARTY", party.name);
  return entry;
}

export function archiveRequest(state: PMStoreState, requestId: string, actor: Actor) {
  return setStatus(state, requestId, "ARCHIVED", actor);
}

export function deleteRequest(state: PMStoreState, requestId: string, actor: Actor) {
  const request = state.pmRequests.find((r) => r.id === requestId);
  if (!request) return null;
  request.deletedAt = now();
  logActivity(request, actor, "DELETE", "Request soft-deleted");
  audit(state, { actorId: actor.id, actorName: actor.name, action: "PM_DELETE", target: requestId, targetType: "PM_REQUEST", metadata: {}, ip: actor.ip ?? "127.0.0.1" });
  return request;
}

export function restoreRequest(state: PMStoreState, requestId: string, actor: Actor) {
  const request = state.pmRequests.find((r) => r.id === requestId);
  if (!request) return null;
  request.deletedAt = undefined;
  logActivity(request, actor, "RESTORE", "Request restored");
  return request;
}

export function mergeRequests(state: PMStoreState, targetId: string, sourceId: string, actor: Actor) {
  const target = getRequest(state, targetId);
  const source = state.pmRequests.find((r) => r.id === sourceId);
  if (!target || !source) return null;
  source.mergedIntoId = targetId;
  source.status = "ARCHIVED";
  source.deletedAt = now();
  logActivity(target, actor, "MERGE", `Merged ${source.requestNumber} into ${target.requestNumber}`);
  audit(state, { actorId: actor.id, actorName: actor.name, action: "PM_MERGE", target: targetId, targetType: "PM_REQUEST", metadata: { sourceId }, ip: actor.ip ?? "127.0.0.1" });
  return target;
}

export function transferOwnership(state: PMStoreState, requestId: string, newOwnerId: string, actor: Actor) {
  const request = getRequest(state, requestId);
  const owner = state.users.get(newOwnerId);
  if (!request || !owner) return null;
  const old = request.ownerId;
  request.ownerId = newOwnerId;
  request.ownerName = owner.name;
  request.ownerEmail = owner.email;
  request.ownerPhone = owner.phone ?? "";
  logActivity(request, actor, "TRANSFER_OWNERSHIP", `${old}  ${newOwnerId}`);
  audit(state, { actorId: actor.id, actorName: actor.name, action: "PM_TRANSFER", target: requestId, targetType: "PM_REQUEST", metadata: { from: old, to: newOwnerId }, ip: actor.ip ?? "127.0.0.1" });
  return request;
}

export function listCRMLeads(state: PMStoreState) {
  return [...state.crmLeads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getConsultantMetrics(state: PMStoreState, consultantId: string) {
  const assigned = state.pmRequests.filter((r) => r.consultantId === consultantId && !r.deletedAt);
  const active = assigned.filter((r) => !["CLOSED", "ARCHIVED", "REJECTED"].includes(r.status));
  const completed = assigned.filter((r) => r.status === "CLOSED");
  return {
    totalLeads: assigned.length,
    activeLeads: active.length,
    completedRequests: completed.length,
    conversionRate: assigned.length ? Math.round((completed.length / assigned.length) * 100) : 0,
  };
}

export function checkSLABreaches(state: PMStoreState) {
  const ts = Date.now();
  for (const request of state.pmRequests) {
    if (!["CLOSED", "ARCHIVED", "REJECTED"].includes(request.status) && new Date(request.slaDeadline).getTime() < ts) {
      request.slaBreached = true;
    }
  }
}
