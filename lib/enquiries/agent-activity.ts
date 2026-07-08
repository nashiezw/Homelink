import type { EnquirySettings, PropertyEnquiry } from "@/lib/enquiries/types";

export type AgentActivityRow = {
  agentId: string;
  agentName: string;
  pendingViewings: number;
  overdueFollowUps: number;
  dealsClosed: number;
  upcomingViewings: Array<{
    referenceNumber: string;
    scheduledAt: string;
    propertyTitle: string;
    customerName: string;
    enquiryId: string;
  }>;
};

const CLOSED_DEAL_STATUSES = new Set(["BOOKING_CONFIRMED", "RENTAL_APPROVED", "SALE_COMPLETED", "CLOSED"]);

export function buildAgentActivitySummary(
  enquiries: PropertyEnquiry[],
  settings: Pick<EnquirySettings, "followUpReminderHours">,
): AgentActivityRow[] {
  const now = Date.now();
  const followUpMs = settings.followUpReminderHours * 60 * 60 * 1000;
  const byAgent = new Map<string, AgentActivityRow>();

  for (const enquiry of enquiries) {
    const agentId = enquiry.assignedAgentId;
    if (!agentId) continue;
    const agentName = enquiry.assignedAgentName ?? "Agent";
    const row =
      byAgent.get(agentId) ??
      ({
        agentId,
        agentName,
        pendingViewings: 0,
        overdueFollowUps: 0,
        dealsClosed: 0,
        upcomingViewings: [],
      } satisfies AgentActivityRow);
    byAgent.set(agentId, row);

    if (CLOSED_DEAL_STATUSES.has(enquiry.status)) {
      row.dealsClosed += 1;
    }

    if (enquiry.status === "FOLLOW_UP_REQUIRED") {
      const updatedAt = new Date(enquiry.updatedAt).getTime();
      if (now - updatedAt > followUpMs) row.overdueFollowUps += 1;
    }

    for (const viewing of enquiry.viewings ?? []) {
      if (viewing.completedAt) continue;
      row.pendingViewings += 1;
      row.upcomingViewings.push({
        referenceNumber: viewing.referenceNumber ?? viewing.id,
        scheduledAt: viewing.scheduledAt,
        propertyTitle: enquiry.listingTitle,
        customerName: enquiry.seekerName,
        enquiryId: enquiry.id,
      });
    }
  }

  return Array.from(byAgent.values())
    .map((row) => ({
      ...row,
      upcomingViewings: row.upcomingViewings
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, 5),
    }))
    .sort((a, b) => b.pendingViewings + b.overdueFollowUps - (a.pendingViewings + a.overdueFollowUps));
}
