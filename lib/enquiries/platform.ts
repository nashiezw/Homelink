import { assignLead } from "@/lib/agents/platform";
import type { AgentLead, AgentPlatformState } from "@/lib/agents/types";
import type { EnquirySettings } from "@/lib/enquiries/types";
import {
  type CreateEnquiryInput,
  type CreateRoommateEnquiryInput,
  type EnquiryActivity,
  type EnquiryAnalytics,
  type EnquiryDocument,
  type EnquiryListFilters,
  type EnquiryNote,
  type EnquiryOffer,
  type EnquiryStatus,
  type EnquiryViewing,
  type PropertyEnquiry,
} from "@/lib/enquiries/types";
import { createFollowUpTaskForViewing, defaultFollowUpDueAt } from "@/lib/enquiries/follow-up-tasks";
import { collectViewingReferenceNumbers, generateViewingReference } from "@/lib/enquiries/viewing-reference";
import type { Listing } from "@/lib/types";
import type { StoreUser } from "@/lib/store/types";

type EnquiryStoreSlice = {
  enquiries: PropertyEnquiry[];
};

type EnquiryDeps = {
  getListing: (id: string) => Listing | null | undefined;
  getUserById: (id: string) => StoreUser | undefined;
  getAdminUserIds: () => string[];
  getEnquirySettings: () => EnquirySettings;
  incrementListingMetric: (id: string, metric: "enquiries") => void;
  agents: AgentPlatformState;
  createNotification: (
    userId: string,
    input: { channel: "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP"; subject: string; body: string },
  ) => void;
  ensureConversation: (input: {
    listingId: string;
    listingTitle: string;
    seekerId: string;
    seekerName: string;
    ownerId: string;
    ownerName: string;
    message: string;
    createdAt: string;
  }) => string;
  renderTemplate: (key: string, vars: Record<string, string>) => string | null;
  onEnquiryCreated?: (enquiry: PropertyEnquiry) => void;
};

function now() {
  return new Date().toISOString();
}

function activity(
  type: EnquiryActivity["type"],
  actorId: string,
  actorName: string,
  message: string,
  extra?: Partial<EnquiryActivity>,
): EnquiryActivity {
  return {
    id: `enqact_${crypto.randomUUID()}`,
    type,
    actorId,
    actorName,
    message,
    createdAt: now(),
    ...extra,
  };
}

function normalizeLegacy(enquiry: PropertyEnquiry): PropertyEnquiry {
  if ((enquiry.status as string) === "SENT") {
    return { ...enquiry, status: "NEW" };
  }
  const viewings = (() => {
    const refs: string[] = [];
    return (enquiry.viewings ?? []).map((viewing) => {
      if (viewing.referenceNumber) {
        refs.push(viewing.referenceNumber);
        return viewing;
      }
      const referenceNumber = generateViewingReference(refs);
      refs.push(referenceNumber);
      return { ...viewing, referenceNumber };
    });
  })();
  return {
    ...enquiry,
    notes: enquiry.notes ?? [],
    activities: enquiry.activities ?? [],
    viewings,
    followUpTasks: enquiry.followUpTasks ?? [],
    offers: enquiry.offers ?? [],
    documents: enquiry.documents ?? [],
    tags: enquiry.tags ?? [],
    commissionRecorded: enquiry.commissionRecorded ?? false,
    priority: enquiry.priority ?? "NORMAL",
    channel: enquiry.channel ?? "WEB",
    source: enquiry.source ?? "LISTING",
    subjectType: enquiry.subjectType ?? "LISTING",
    listingTitle: enquiry.listingTitle ?? "",
    listingType: enquiry.listingType ?? "house",
    listingIntent: enquiry.listingIntent ?? "rent",
    ownerId: enquiry.ownerId ?? "",
    ownerName: enquiry.ownerName ?? "",
    enquiryType: enquiry.enquiryType ?? "CONTACT_HOUSELINK",
    updatedAt: enquiry.updatedAt ?? enquiry.createdAt,
  };
}

export const EnquiryPlatform = {
  normalizeAll(enquiries: PropertyEnquiry[]) {
    return enquiries.map(normalizeLegacy);
  },

  list(enquiries: PropertyEnquiry[], filters: EnquiryListFilters = {}) {
    let rows = EnquiryPlatform.normalizeAll(enquiries);
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      rows = rows.filter((e) => statuses.includes(e.status));
    }
    if (filters.listingId) rows = rows.filter((e) => e.listingId === filters.listingId);
    if (filters.ownerId) rows = rows.filter((e) => e.ownerId === filters.ownerId);
    if (filters.assignedAgentId) rows = rows.filter((e) => e.assignedAgentId === filters.assignedAgentId);
    if (filters.seekerId) rows = rows.filter((e) => e.seekerId === filters.seekerId);
    if (filters.subjectType) rows = rows.filter((e) => e.subjectType === filters.subjectType);
    if (filters.roommateUserId) rows = rows.filter((e) => e.roommateUserId === filters.roommateUserId);
    if (filters.holidayBookingId) rows = rows.filter((e) => e.holidayBookingId === filters.holidayBookingId);
    if (filters.from) rows = rows.filter((e) => e.createdAt >= filters.from!);
    if (filters.to) rows = rows.filter((e) => e.createdAt <= filters.to!);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.seekerName.toLowerCase().includes(q) ||
          e.listingTitle.toLowerCase().includes(q) ||
          e.message.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q),
      );
    }
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  analytics(enquiries: PropertyEnquiry[]): EnquiryAnalytics {
    const rows = EnquiryPlatform.normalizeAll(enquiries);
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let responseTotal = 0;
    let responseCount = 0;
    for (const e of rows) {
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      byType[e.enquiryType] = (byType[e.enquiryType] ?? 0) + 1;
      if (e.responseTimeMinutes) {
        responseTotal += e.responseTimeMinutes;
        responseCount += 1;
      }
    }
    const closedWon = (byStatus.SALE_COMPLETED ?? 0) + (byStatus.RENTAL_APPROVED ?? 0) + (byStatus.BOOKING_CONFIRMED ?? 0) + (byStatus.CLOSED ?? 0);
    const lost = (byStatus.LOST_LEAD ?? 0) + (byStatus.CANCELLED ?? 0) + (byStatus.OFFER_DECLINED ?? 0);
    const active = rows.filter((e) => !["CLOSED", "CANCELLED", "LOST_LEAD", "SALE_COMPLETED", "RENTAL_APPROVED", "BOOKING_CONFIRMED"].includes(e.status)).length;
    return {
      total: rows.length,
      newCount: byStatus.NEW ?? 0,
      activeCount: active,
      closedWonCount: closedWon,
      lostCount: lost,
      avgResponseMinutes: responseCount ? Math.round(responseTotal / responseCount) : 0,
      conversionRate: rows.length ? Math.round((closedWon / rows.length) * 100) : 0,
      byStatus,
      byType,
    };
  },

  create(
    state: EnquiryStoreSlice,
    input: CreateEnquiryInput,
    deps: EnquiryDeps,
  ): PropertyEnquiry {
    const listing = deps.getListing(input.listingId);
    if (!listing) throw new Error("LISTING_NOT_FOUND");

    const settings = deps.getEnquirySettings();
    const owner = deps.getUserById((listing as Listing & { ownerId?: string }).ownerId ?? "");
    const ownerId = (listing as Listing & { ownerId?: string }).ownerId ?? owner?.id ?? "unknown";
    const ownerName = owner?.name ?? listing.landlordName;
    const ts = now();

    let assignedAgentId: string | undefined;
    let assignedAgentName: string | undefined;
    let agentLeadId: string | undefined;
    let status: EnquiryStatus = "NEW";

    let lead: AgentLead | null = null;
    if (settings.autoAssignAgents) {
      lead = assignLead(
        deps.agents,
        {
          listingId: input.listingId,
          listingTitle: listing.title,
          clientName: input.seekerName,
          clientUserId: input.seekerId,
          clientType: listing.intent === "buy" ? "BUYER" : "TENANT",
          source: "LISTING_ENQUIRY",
          city: listing.city,
          suburb: listing.suburb,
          province: listing.city,
          notes: input.message,
        },
        (id: string) => deps.getUserById(id),
      );
      if (lead.assignedAgentId) {
        assignedAgentId = lead.assignedAgentId;
        assignedAgentName = deps.getUserById(lead.assignedAgentId)?.name;
        agentLeadId = lead.id;
        status = "ASSIGNED";
      }
    }

    const conversationId = deps.ensureConversation({
      listingId: input.listingId,
      listingTitle: listing.title,
      seekerId: input.seekerId,
      seekerName: input.seekerName,
      ownerId,
      ownerName,
      message: input.message,
      createdAt: ts,
    });

    const enquiry: PropertyEnquiry = {
      id: `enquiry_${crypto.randomUUID()}`,
      subjectType: input.subjectType ?? (input.holidayBookingId ? "HOLIDAY" : "LISTING"),
      listingId: input.listingId,
      listingTitle: listing.title,
      listingType: listing.type,
      listingIntent: listing.intent,
      holidayBookingId: input.holidayBookingId,
      estimatedNights: input.estimatedNights,
      estimatedTotal: input.estimatedTotal,
      ownerId,
      ownerName,
      seekerId: input.seekerId,
      seekerName: input.seekerName,
      seekerEmail: input.seekerEmail,
      seekerPhone: input.seekerPhone,
      enquiryType: input.enquiryType,
      channel: input.channel ?? "WEB",
      message: input.message,
      status,
      priority: "NORMAL",
      assignedAgentId,
      assignedAgentName,
      agentLeadId,
      conversationId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      source: input.source ?? "LISTING",
      tags: [],
      notes: [],
      activities: [
        activity("CREATED", input.seekerId, input.seekerName, `Enquiry submitted: ${input.enquiryType}`, {
          toStatus: status,
        }),
      ],
      viewings: [],
      followUpTasks: [],
      offers: [],
      documents: [],
      commissionRecorded: false,
      createdAt: ts,
      updatedAt: ts,
    };

    if (assignedAgentId) {
      enquiry.activities.push(
        activity("ASSIGNED", "system", "HouseLink", `Assigned to ${assignedAgentName ?? assignedAgentId}`, {
          metadata: { agentId: assignedAgentId, leadId: agentLeadId },
        }),
      );
    }

    state.enquiries.unshift(enquiry);
    deps.incrementListingMetric(input.listingId, "enquiries");

    const templateVars = {
      listingTitle: listing.title,
      seekerName: input.seekerName,
      enquiryType: input.enquiryType,
      platformName: "HouseLink",
    };

    if (settings.notifyAgentOnAssignment && assignedAgentId) {
      deps.createNotification(assignedAgentId, {
        channel: "IN_APP",
        subject: "New enquiry assigned",
        body: deps.renderTemplate("new_enquiry_assigned", templateVars) ?? `New enquiry on ${listing.title} from ${input.seekerName}.`,
      });
    }
    if (settings.notifyOwnerOnNewEnquiry && ownerId !== "unknown") {
      deps.createNotification(ownerId, {
        channel: "IN_APP",
        subject: "New property enquiry",
        body: deps.renderTemplate("new_enquiry_owner", templateVars) ?? `${input.seekerName} enquired about ${listing.title}. A HouseLink agent will manage this lead.`,
      });
    }
    if (settings.notifyAdminOnNewEnquiry) {
      for (const adminId of deps.getAdminUserIds()) {
        deps.createNotification(adminId, {
          channel: "IN_APP",
          subject: "New platform enquiry",
          body: `${input.seekerName} · ${listing.title} · ${input.enquiryType}`,
        });
      }
    }

    deps.onEnquiryCreated?.(enquiry);
    return enquiry;
  },

  createRoommate(
    state: EnquiryStoreSlice,
    input: CreateRoommateEnquiryInput,
    deps: EnquiryDeps,
  ): PropertyEnquiry {
    const settings = deps.getEnquirySettings();
    const roommate = deps.getUserById(input.roommateUserId);
    const ts = now();
    const enquiryType = input.enquiryType ?? "ROOMMATE_MATCH";
    const title = `${input.roommateName} — roommate profile`;

    let assignedAgentId: string | undefined;
    let assignedAgentName: string | undefined;
    let agentLeadId: string | undefined;
    let status: EnquiryStatus = "NEW";

    if (settings.autoAssignAgents) {
      const lead = assignLead(
        deps.agents,
        {
          listingId: `roommate_${input.roommateUserId}`,
          listingTitle: title,
          clientName: input.seekerName,
          clientUserId: input.seekerId,
          clientType: "TENANT",
          source: "ROOMMATE_ENQUIRY",
          city: roommate?.city ?? "",
          suburb: "",
          province: roommate?.city ?? "",
          notes: input.message,
        },
        (id: string) => deps.getUserById(id),
      );
      if (lead.assignedAgentId) {
        assignedAgentId = lead.assignedAgentId;
        assignedAgentName = deps.getUserById(lead.assignedAgentId)?.name;
        agentLeadId = lead.id;
        status = "ASSIGNED";
      }
    }

    const conversationId = deps.ensureConversation({
      listingId: `roommate_${input.roommateUserId}`,
      listingTitle: title,
      seekerId: input.seekerId,
      seekerName: input.seekerName,
      ownerId: input.roommateUserId,
      ownerName: input.roommateName,
      message: input.message,
      createdAt: ts,
    });

    const enquiry: PropertyEnquiry = {
      id: `enquiry_${crypto.randomUUID()}`,
      subjectType: "ROOMMATE",
      listingId: `roommate_${input.roommateUserId}`,
      listingTitle: title,
      listingType: "room",
      listingIntent: "rent",
      roommateUserId: input.roommateUserId,
      ownerId: input.roommateUserId,
      ownerName: input.roommateName,
      seekerId: input.seekerId,
      seekerName: input.seekerName,
      seekerEmail: input.seekerEmail,
      seekerPhone: input.seekerPhone,
      enquiryType,
      channel: input.channel ?? "WEB",
      message: input.message,
      status,
      priority: "NORMAL",
      assignedAgentId,
      assignedAgentName,
      agentLeadId,
      conversationId,
      preferredDate: input.preferredDate,
      source: "ROOMMATE",
      tags: ["roommate"],
      notes: [],
      activities: [
        activity("CREATED", input.seekerId, input.seekerName, `Roommate enquiry: ${enquiryType}`, {
          toStatus: status,
        }),
      ],
      viewings: [],
      followUpTasks: [],
      offers: [],
      documents: [],
      commissionRecorded: false,
      createdAt: ts,
      updatedAt: ts,
    };

    if (assignedAgentId) {
      enquiry.activities.push(
        activity("ASSIGNED", "system", "HouseLink", `Assigned to ${assignedAgentName ?? assignedAgentId}`),
      );
    }

    state.enquiries.unshift(enquiry);

    if (settings.notifyOwnerOnNewEnquiry) {
      deps.createNotification(input.roommateUserId, {
        channel: "IN_APP",
        subject: "New roommate enquiry",
        body: `${input.seekerName} enquired about your roommate profile via HouseLink.`,
      });
    }
    if (settings.notifyAgentOnAssignment && assignedAgentId) {
      deps.createNotification(assignedAgentId, {
        channel: "IN_APP",
        subject: "Roommate enquiry assigned",
        body: `New roommate match enquiry from ${input.seekerName}.`,
      });
    }
    if (settings.notifyAdminOnNewEnquiry) {
      for (const adminId of deps.getAdminUserIds()) {
        deps.createNotification(adminId, {
          channel: "IN_APP",
          subject: "New roommate enquiry",
          body: `${input.seekerName} → ${input.roommateName}`,
        });
      }
    }

    deps.onEnquiryCreated?.(enquiry);
    return enquiry;
  },

  getById(state: EnquiryStoreSlice, id: string) {
    const row = state.enquiries.find((e) => e.id === id);
    return row ? normalizeLegacy(row) : undefined;
  },

  updateStatus(
    state: EnquiryStoreSlice,
    id: string,
    status: EnquiryStatus,
    actor: { id: string; name: string },
    reason?: string,
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const fromStatus = normalized.status;
    if (fromStatus === status) return normalized;

    normalized.status = status;
    normalized.updatedAt = now();
    if (status === "CONTACTED" && !normalized.firstContactedAt) {
      normalized.firstContactedAt = now();
      const created = new Date(normalized.createdAt).getTime();
      normalized.responseTimeMinutes = Math.max(1, Math.round((Date.now() - created) / 60000));
    }
    if (["CLOSED", "CANCELLED", "LOST_LEAD", "SALE_COMPLETED", "RENTAL_APPROVED", "BOOKING_CONFIRMED"].includes(status)) {
      normalized.closedAt = now();
      normalized.closedReason = reason;
    }
    normalized.activities.unshift(
      activity("STATUS_CHANGED", actor.id, actor.name, reason ?? `Status updated to ${status}`, {
        fromStatus,
        toStatus: status,
      }),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  assignAgent(
    state: EnquiryStoreSlice,
    id: string,
    agentId: string,
    actor: { id: string; name: string },
    agentName?: string,
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const prev = normalized.assignedAgentId;
    normalized.assignedAgentId = agentId;
    normalized.assignedAgentName = agentName ?? agentId;
    if (normalized.status === "NEW") normalized.status = "ASSIGNED";
    normalized.updatedAt = now();
    normalized.activities.unshift(
      activity("REASSIGNED", actor.id, actor.name, prev ? `Reassigned from ${prev} to ${agentId}` : `Assigned to ${agentId}`, {
        metadata: { previousAgentId: prev, agentId },
        toStatus: normalized.status,
      }),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  addNote(
    state: EnquiryStoreSlice,
    id: string,
    note: Omit<EnquiryNote, "id" | "createdAt">,
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const entry: EnquiryNote = { ...note, id: `enqnote_${crypto.randomUUID()}`, createdAt: now() };
    normalized.notes.unshift(entry);
    normalized.activities.unshift(
      activity("NOTE_ADDED", note.authorId, note.authorName, note.internal ? "(Internal note)" : note.body.slice(0, 120)),
    );
    normalized.updatedAt = now();
    Object.assign(enquiry, normalized);
    return normalized;
  },

  scheduleViewing(
    state: EnquiryStoreSlice,
    id: string,
    viewing: Omit<EnquiryViewing, "id" | "referenceNumber" | "createdAt">,
    actor: { id: string; name: string },
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const referenceNumber = generateViewingReference(collectViewingReferenceNumbers(state.enquiries));
    const entry: EnquiryViewing = {
      ...viewing,
      referenceNumber,
      id: `enqview_${crypto.randomUUID()}`,
      createdAt: now(),
    };
    normalized.viewings.unshift(entry);
    normalized.status = "VIEWING_SCHEDULED";
    normalized.updatedAt = now();
    normalized.activities.unshift(
      activity(
        "VIEWING_SCHEDULED",
        actor.id,
        actor.name,
        `Viewing ${referenceNumber} scheduled for ${viewing.scheduledAt}`,
        {
          toStatus: "VIEWING_SCHEDULED",
          metadata: { viewingId: entry.id, referenceNumber },
        },
      ),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  completeViewing(
    state: EnquiryStoreSlice,
    id: string,
    viewingId: string,
    outcome: EnquiryViewing["outcome"],
    feedback: string,
    actor: { id: string; name: string },
    extras?: { followUpDate?: string; clientInterested?: boolean; followUpReminderHours?: number },
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const viewing = normalized.viewings.find((v) => v.id === viewingId);
    if (!viewing) throw new Error("VIEWING_NOT_FOUND");
    viewing.outcome = outcome;
    viewing.feedback = feedback;
    viewing.completedAt = now();
    const dueAt = defaultFollowUpDueAt(extras?.followUpReminderHours ?? 24, extras?.followUpDate ?? viewing.followUpDate);
    viewing.followUpDate = dueAt;
    if (typeof extras?.clientInterested === "boolean") viewing.clientInterested = extras.clientInterested;
    normalized.status =
      outcome === "COMPLETED" && extras?.clientInterested === false
        ? "FOLLOW_UP_REQUIRED"
        : outcome === "COMPLETED"
          ? "VIEWING_COMPLETED"
          : "FOLLOW_UP_REQUIRED";
    normalized.updatedAt = now();
    const alreadyHasTask = normalized.followUpTasks.some((task) => task.viewingId === viewingId && task.status === "OPEN");
    if (!alreadyHasTask && (outcome === "COMPLETED" || normalized.status === "FOLLOW_UP_REQUIRED")) {
      normalized.followUpTasks.unshift(createFollowUpTaskForViewing(normalized, viewing, dueAt));
    }
    normalized.activities.unshift(
      activity(
        "VIEWING_COMPLETED",
        actor.id,
        actor.name,
        feedback || `Viewing ${viewing.referenceNumber ?? viewingId} ${outcome?.toLowerCase()}`,
        {
          toStatus: normalized.status,
          metadata: { viewingId, referenceNumber: viewing.referenceNumber },
        },
      ),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  completeFollowUpTask(
    state: EnquiryStoreSlice,
    id: string,
    taskId: string,
    actor: { id: string; name: string },
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const task = normalized.followUpTasks.find((row) => row.id === taskId);
    if (!task) throw new Error("FOLLOW_UP_TASK_NOT_FOUND");
    task.status = "DONE";
    task.completedAt = now();
    normalized.updatedAt = now();
    normalized.activities.unshift(
      activity("NOTE_ADDED", actor.id, actor.name, `Follow-up completed for ${task.referenceNumber}.`),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  submitOffer(
    state: EnquiryStoreSlice,
    id: string,
    offer: Omit<EnquiryOffer, "id" | "createdAt" | "status">,
    actor: { id: string; name: string },
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const entry: EnquiryOffer = {
      ...offer,
      id: `enqoffer_${crypto.randomUUID()}`,
      status: "PENDING",
      createdAt: now(),
    };
    normalized.offers.unshift(entry);
    normalized.status = "OFFER_SUBMITTED";
    normalized.updatedAt = now();
    normalized.activities.unshift(
      activity("OFFER_SUBMITTED", actor.id, actor.name, `Offer submitted: ${offer.currency} ${offer.amount}`, {
        toStatus: "OFFER_SUBMITTED",
      }),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  respondOffer(
    state: EnquiryStoreSlice,
    id: string,
    offerId: string,
    accepted: boolean,
    actor: { id: string; name: string },
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const offer = normalized.offers.find((o) => o.id === offerId);
    if (!offer) throw new Error("OFFER_NOT_FOUND");
    offer.status = accepted ? "ACCEPTED" : "DECLINED";
    offer.respondedAt = now();
    normalized.status = accepted ? "OFFER_ACCEPTED" : "OFFER_DECLINED";
    normalized.updatedAt = now();
    normalized.activities.unshift(
      activity("OFFER_UPDATED", actor.id, actor.name, `Offer ${accepted ? "accepted" : "declined"}`, {
        toStatus: normalized.status,
      }),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  addDocument(
    state: EnquiryStoreSlice,
    id: string,
    doc: Omit<EnquiryDocument, "id" | "createdAt">,
    actor: { id: string; name: string },
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    const entry: EnquiryDocument = { ...doc, id: `enqdoc_${crypto.randomUUID()}`, createdAt: now() };
    normalized.documents.unshift(entry);
    normalized.updatedAt = now();
    normalized.activities.unshift(
      activity("DOCUMENT_UPLOADED", actor.id, actor.name, `Document uploaded: ${doc.name}`),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  recordCommission(
    state: EnquiryStoreSlice,
    id: string,
    amount: number,
    actor: { id: string; name: string },
  ) {
    const enquiry = state.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
    const normalized = normalizeLegacy(enquiry);
    normalized.commissionRecorded = true;
    normalized.commissionAmount = amount;
    normalized.updatedAt = now();
    normalized.activities.unshift(
      activity("COMMISSION_RECORDED", actor.id, actor.name, `Commission recorded: USD ${amount}`),
    );
    Object.assign(enquiry, normalized);
    return normalized;
  },

  merge(
    state: EnquiryStoreSlice,
    targetId: string,
    sourceId: string,
    actor: { id: string; name: string },
  ) {
    const target = state.enquiries.find((e) => e.id === targetId);
    const source = state.enquiries.find((e) => e.id === sourceId);
    if (!target || !source) throw new Error("ENQUIRY_NOT_FOUND");
    const t = normalizeLegacy(target);
    const s = normalizeLegacy(source);
    t.notes = [...t.notes, ...s.notes];
    t.activities = [...t.activities, ...s.activities];
    t.viewings = [...t.viewings, ...s.viewings];
    t.offers = [...t.offers, ...s.offers];
    t.documents = [...t.documents, ...s.documents];
    t.updatedAt = now();
    s.status = "CLOSED";
    s.mergedIntoId = targetId;
    s.closedAt = now();
    s.closedReason = `Merged into ${targetId}`;
    s.activities.unshift(activity("MERGED", actor.id, actor.name, `Merged into ${targetId}`));
    Object.assign(target, t);
    Object.assign(source, s);
    return t;
  },
};
