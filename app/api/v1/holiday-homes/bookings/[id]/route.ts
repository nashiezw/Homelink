import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";
import type { HolidayBookingStatus } from "@/lib/holiday-homes/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to update booking enquiries.");
  }

  const { id } = await context.params;
  const body = (await request.json()) as { status?: HolidayBookingStatus };
  const store = getStore();
  const enquiry = store.listHolidayBookingEnquiries().find((e) => e.id === id);
  if (!enquiry) {
    return problem(404, "NOT_FOUND", "Booking enquiry not found.");
  }

  const user = store.getUserById(userId);
  const canManage =
    user?.roles.includes("ADMIN") ||
    enquiry.ownerId === userId ||
    enquiry.agentId === userId;

  if (!canManage) {
    return problem(403, "FORBIDDEN", "You cannot manage this booking enquiry.");
  }

  if (!body.status || !["ACCEPTED", "DECLINED", "CANCELLED"].includes(body.status)) {
    return problem(400, "INVALID_STATUS", "Provide a valid status.");
  }

  const updated = store.updateHolidayBookingEnquiryStatus(id, body.status, userId);
  return ok({ enquiry: updated });
}
