import type { EnquiryFollowUpTask, PropertyEnquiry } from "@/lib/enquiries/types";

export function defaultFollowUpDueAt(reminderHours: number, explicit?: string) {
  if (explicit) return explicit;
  return new Date(Date.now() + reminderHours * 60 * 60 * 1000).toISOString();
}

export function createFollowUpTaskForViewing(
  enquiry: Pick<PropertyEnquiry, "seekerName" | "listingTitle">,
  viewing: { id: string; referenceNumber: string },
  dueAt: string,
): EnquiryFollowUpTask {
  return {
    id: `fup_${crypto.randomUUID()}`,
    viewingId: viewing.id,
    referenceNumber: viewing.referenceNumber,
    title: `Follow up ${enquiry.seekerName} after ${viewing.referenceNumber}`,
    description: `${enquiry.listingTitle} · Check interest and next steps`,
    dueAt,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };
}

export function openFollowUpTasksForAgent(
  enquiries: PropertyEnquiry[],
  agentId: string,
) {
  return enquiries.flatMap((enquiry) => {
    if (enquiry.assignedAgentId !== agentId) return [];
    return (enquiry.followUpTasks ?? [])
      .filter((task) => task.status === "OPEN")
      .map((task) => ({
        id: task.id,
        agentId,
        title: task.title,
        dueAt: task.dueAt,
        status: "OPEN" as const,
        priority: "HIGH" as const,
        createdAt: task.createdAt,
        enquiryId: enquiry.id,
        viewingId: task.viewingId,
        referenceNumber: task.referenceNumber,
      }));
  });
}
