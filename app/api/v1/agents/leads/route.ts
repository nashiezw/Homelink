import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem, created } from "@/lib/api/response";
import {
  closeAgentLeadInPostgres,
  listAgentLeadsFromPostgres,
  shouldUsePostgresAgents,
  updateAgentLeadInPostgres,
} from "@/lib/agents/postgres-agent-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? userId;
  if (!agentId) return problem(401, "UNAUTHORIZED", "Sign in required.");

  if (shouldUsePostgresAgents()) {
    const isOwner = userId === agentId;
    const leads = isOwner ? await listAgentLeadsFromPostgres(agentId) : [];
    return ok({ leads: isOwner ? leads : undefined, assigned: leads });
  }

  const store = getStore();
  const profile = store.getAgentProfileByUserId(agentId);
  if (!profile) return problem(404, "NOT_FOUND", "Agent not found.");

  const isOwner = userId === agentId;
  const leads = isOwner ? store.listAgentLeads(agentId) : [];

  return ok({
    leads: isOwner ? leads : undefined,
    assigned: leads,
  });
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const body = await request.json();
  if (shouldUsePostgresAgents()) {
    const lead = await updateAgentLeadInPostgres(body.leadId, userId, body.status, body.notes);
    if (!lead) return problem(404, "NOT_FOUND", "Lead not found.");
    return ok(lead);
  }
  const lead = getStore().updateAgentLeadStatus(body.leadId, body.status, body.notes);
  if (!lead || lead.assignedAgentId !== userId) {
    return problem(404, "NOT_FOUND", "Lead not found.");
  }
  return ok(lead);
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const body = await request.json();

  if (body.action === "close") {
    if (shouldUsePostgresAgents()) {
      const commission = await closeAgentLeadInPostgres(body.leadId, userId, body.type, Number(body.dealAmount));
      if (!commission) return problem(400, "FAILED", "Could not close lead.");
      return ok(commission);
    }
    const store = getStore();
    const lead = store.listAgentLeads().find((l) => l.id === body.leadId);
    if (!lead || lead.assignedAgentId !== userId) {
      return problem(404, "NOT_FOUND", "Lead not found.");
    }
    const commission = store.closeAgentLead(body.leadId, body.type, Number(body.dealAmount));
    if (!commission) return problem(400, "FAILED", "Could not close lead.");
    return ok(commission);
  }

  if (body.action === "appointment") {
    if (shouldUsePostgresAgents()) {
      return problem(501, "APPOINTMENTS_NOT_MIGRATED", "Agent appointments need a durable appointment model before production use.");
    }
    const appt = getStore().createAgentAppointment({
      agentId: userId,
      leadId: body.leadId,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      listingId: body.listingId,
      title: body.title,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      location: body.location,
      status: "SCHEDULED",
      notes: body.notes,
    });
    return created(appt);
  }

  return problem(400, "INVALID_ACTION", "Unknown action.");
}
