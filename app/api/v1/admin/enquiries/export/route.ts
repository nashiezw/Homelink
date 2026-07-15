import { requireAdminAsync } from "@/lib/admin/require-admin";
import { enquiriesToCsv } from "@/lib/enquiries/export";
import {
  listEnquiriesFromPostgres,
  shouldUsePostgresEnquiries,
} from "@/lib/enquiries/postgres-enquiry-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request, "enquiries:read");
  if ("error" in auth && auth.error) return auth.error;
  const userId = auth.user.id;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  if (shouldUsePostgresEnquiries()) {
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
