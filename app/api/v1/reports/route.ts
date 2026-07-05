import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import { createReportInPostgres, shouldUsePostgresPersistence } from "@/lib/db/postgres-app-repository";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const body = await request.json();

  if (!body.listingId || !body.reason) {
    return problem(400, "INVALID_REPORT", "listingId and reason are required.");
  }

  if (shouldUsePostgresPersistence()) {
    try {
      return created(
        await createReportInPostgres({
          listingId: body.listingId,
          reporterId: userId ?? undefined,
          reason: body.reason,
          details: body.details,
        }),
      );
    } catch (error) {
      console.error("Failed to create report", error);
      return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
    }
  }

  return created(
    getStore().createReport({
      listingId: body.listingId,
      reporterId: userId ?? undefined,
      reason: body.reason,
      details: body.details,
    }),
  );
}
