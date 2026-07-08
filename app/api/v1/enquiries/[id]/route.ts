import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import type { EnquiryStatus } from "@/lib/enquiries/types";
import {
  addEnquiryNoteInPostgres,
  assignEnquiryAgentInPostgres,
  canAccessPostgresEnquiry,
  completeFollowUpTaskInPostgres,
  completeViewingInPostgres,
  getEnquiryActor,
  getEnquiryFromPostgres,
  scheduleViewingInPostgres,
  shouldUsePostgresEnquiries,
  updateEnquiryStatusInPostgres,
} from "@/lib/enquiries/postgres-enquiry-repository";
import { defaultPlatformSettings } from "@/lib/settings/defaults";
import { getStore } from "@/lib/store/app-store";

function actorFromRequest(request: Request, userId: string) {
  const store = getStore();
  const user = store.getUserById(userId);
  return { id: userId, name: user?.name ?? "User" };
}

import type { PropertyEnquiry } from "@/lib/enquiries/types";

function canAccessEnquiry(enquiry: PropertyEnquiry | undefined, userId: string, roles: string[]) {
  if (!enquiry) return false;
  if (roles.includes("ADMIN")) return true;
  if (roles.includes("AGENT") && enquiry.assignedAgentId === userId) return true;
  if (roles.includes("LANDLORD") && enquiry.ownerId === userId) return true;
  if (enquiry.seekerId === userId) return true;
  return false;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const { id } = await params;
  if (shouldUsePostgresEnquiries()) {
    const actor = await getEnquiryActor(userId);
    if (!actor) return problem(401, "UNAUTHORIZED", "Invalid session.");
    const enquiry = await getEnquiryFromPostgres(id);
    if (!enquiry) return problem(404, "NOT_FOUND", "Enquiry not found.");
    if (!canAccessPostgresEnquiry(enquiry, userId, actor.roles)) {
      return problem(403, "FORBIDDEN", "You cannot view this enquiry.");
    }
    return ok({ enquiry });
  }
  const store = getStore();
  const user = store.getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "Invalid session.");
  const enquiry = store.getEnquiryById(id);
  if (!enquiry) return problem(404, "NOT_FOUND", "Enquiry not found.");
  if (!canAccessEnquiry(enquiry, userId, user.roles)) {
    return problem(403, "FORBIDDEN", "You cannot view this enquiry.");
  }
  return ok({ enquiry });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const { id } = await params;
  const body = await request.json();
  if (shouldUsePostgresEnquiries()) {
    const actor = await getEnquiryActor(userId);
    if (!actor) return problem(401, "UNAUTHORIZED", "Invalid session.");
    const enquiry = await getEnquiryFromPostgres(id);
    if (!enquiry) return problem(404, "NOT_FOUND", "Enquiry not found.");
    if (!canAccessPostgresEnquiry(enquiry, userId, actor.roles)) {
      return problem(403, "FORBIDDEN", "You cannot update this enquiry.");
    }
    try {
      switch (body.action) {
        case "update_status":
          if (!body.status) return problem(400, "INVALID", "status is required.");
          return ok({ enquiry: await updateEnquiryStatusInPostgres(id, body.status as EnquiryStatus, actor, body.reason) });
        case "assign_agent":
          if (!actor.roles.includes("ADMIN")) return problem(403, "FORBIDDEN", "Admin only.");
          if (!body.agentId) return problem(400, "INVALID", "agentId is required.");
          return ok({ enquiry: await assignEnquiryAgentInPostgres(id, body.agentId, actor) });
        case "add_note":
          return ok({
            enquiry: await addEnquiryNoteInPostgres(id, {
              authorId: userId,
              authorName: actor.name,
              body: body.body ?? "",
              internal: Boolean(body.internal),
            }),
          });
        case "schedule_viewing":
          if (!body.scheduledAt) return problem(400, "INVALID", "scheduledAt is required.");
          return ok({
            enquiry: await scheduleViewingInPostgres(
              id,
              {
                scheduledAt: body.scheduledAt,
                location: body.location ?? enquiry.listingTitle,
                agentId: body.agentId ?? userId,
                agentName: actor.name,
              },
              actor,
            ),
          });
        case "complete_viewing":
          if (!body.viewingId) return problem(400, "INVALID", "viewingId is required.");
          return ok({
            enquiry: await completeViewingInPostgres(
              id,
              body.viewingId,
              body.outcome ?? "COMPLETED",
              body.feedback ?? "",
              actor,
              {
                followUpDate: body.followUpDate,
                clientInterested: body.clientInterested,
                followUpReminderHours: defaultPlatformSettings.enquiries.followUpReminderHours,
              },
            ),
          });
        case "complete_follow_up":
          if (!body.taskId) return problem(400, "INVALID", "taskId is required.");
          return ok({ enquiry: await completeFollowUpTaskInPostgres(id, body.taskId, actor) });
        default:
          if (body.status) {
            return ok({ enquiry: await updateEnquiryStatusInPostgres(id, body.status as EnquiryStatus, actor, body.reason) });
          }
          return problem(400, "INVALID_ACTION", "Unknown action.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Action failed.";
      return problem(400, "ENQUIRY_ACTION_FAILED", message);
    }
  }
  const store = getStore();
  const user = store.getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "Invalid session.");
  const enquiry = store.getEnquiryById(id);
  if (!enquiry) return problem(404, "NOT_FOUND", "Enquiry not found.");

  const isStaff = user.roles.some((r) => ["ADMIN", "AGENT", "LANDLORD"].includes(r));
  if (!isStaff && enquiry.seekerId !== userId) {
    return problem(403, "FORBIDDEN", "You cannot update this enquiry.");
  }

  const actor = actorFromRequest(request, userId);

  try {
    switch (body.action) {
      case "update_status": {
        if (!body.status) return problem(400, "INVALID", "status is required.");
        const updated = store.updateEnquiryStatus(id, body.status as EnquiryStatus, actor, body.reason);
        return ok({ enquiry: updated });
      }
      case "assign_agent": {
        if (!user.roles.includes("ADMIN")) return problem(403, "FORBIDDEN", "Admin only.");
        if (!body.agentId) return problem(400, "INVALID", "agentId is required.");
        return ok({ enquiry: store.assignEnquiryAgent(id, body.agentId, actor) });
      }
      case "add_note":
        return ok({
          enquiry: store.addEnquiryNote(id, {
            authorId: userId,
            authorName: actor.name,
            body: body.body ?? "",
            internal: Boolean(body.internal),
          }),
        });
      case "schedule_viewing":
        return ok({
          enquiry: store.scheduleEnquiryViewing(
            id,
            {
              scheduledAt: body.scheduledAt,
              location: body.location ?? enquiry.listingTitle,
              agentId: body.agentId ?? userId,
              agentName: actor.name,
            },
            actor,
          ),
        });
      case "complete_viewing":
        return ok({
          enquiry: store.completeEnquiryViewing(
            id,
            body.viewingId,
            body.outcome,
            body.feedback ?? "",
            actor,
            {
              followUpDate: body.followUpDate,
              clientInterested: body.clientInterested,
              followUpReminderHours: store.getPlatformSettings().enquiries.followUpReminderHours,
            },
          ),
        });
      case "complete_follow_up":
        return ok({ enquiry: store.completeEnquiryFollowUpTask(id, body.taskId, actor) });
      case "submit_offer":
        return ok({
          enquiry: store.submitEnquiryOffer(
            id,
            {
              amount: Number(body.amount),
              currency: body.currency ?? "USD",
              terms: body.terms,
              submittedById: userId,
              submittedByName: actor.name,
            },
            actor,
          ),
        });
      case "respond_offer":
        return ok({
          enquiry: store.respondEnquiryOffer(id, body.offerId, Boolean(body.accepted), actor),
        });
      case "add_document":
        return ok({
          enquiry: store.addEnquiryDocument(
            id,
            {
              name: body.name,
              url: body.url,
              uploadedById: userId,
              uploadedByName: actor.name,
            },
            actor,
          ),
        });
      case "record_commission":
        if (!user.roles.includes("ADMIN") && !user.roles.includes("AGENT")) {
          return problem(403, "FORBIDDEN", "Staff only.");
        }
        return ok({ enquiry: store.recordEnquiryCommission(id, Number(body.amount), actor) });
      case "merge":
        if (!user.roles.includes("ADMIN")) return problem(403, "FORBIDDEN", "Admin only.");
        return ok({ enquiry: store.mergeEnquiries(id, body.sourceId, actor) });
      default:
        if (body.status) {
          return ok({ enquiry: store.updateEnquiryStatus(id, body.status as EnquiryStatus, actor, body.reason) });
        }
        return problem(400, "INVALID_ACTION", "Unknown action.");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Action failed.";
    return problem(400, "ENQUIRY_ACTION_FAILED", message);
  }
}
