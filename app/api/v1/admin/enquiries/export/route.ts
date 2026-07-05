import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { problem } from "@/lib/api/response";
import { enquiriesToCsv } from "@/lib/enquiries/export";
import {
  getEnquiryActor,
  listEnquiriesFromPostgres,
  shouldUsePostgresEnquiries,
} from "@/lib/enquiries/postgres-enquiry-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Admin access required.");
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  if (shouldUsePostgresEnquiries()) {
    const actor = await getEnquiryActor(userId);
    if (!actor?.roles.includes("ADMIN")) return problem(403, "FORBIDDEN", "Admin only.");
    const enquiries = await listEnquiriesFromPostgres({
      status: status as import("@/lib/enquiries/types").EnquiryStatus | undefined,
      q,
      userId,
      roles: ["ADMIN"],
    });
    const csv = enquiriesToCsv(enquiries);
    const filename = `homelink-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const store = getStore();
  const user = store.getUserById(userId);
  if (!user?.roles.includes("ADMIN")) return problem(403, "FORBIDDEN", "Admin only.");

  const enquiries = store.listEnquiries({
    status: status as import("@/lib/enquiries/types").EnquiryStatus | undefined,
    q,
  });
  const csv = enquiriesToCsv(enquiries);
  const filename = `homelink-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
