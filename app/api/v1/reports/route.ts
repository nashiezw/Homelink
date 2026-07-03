import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const body = await request.json();

  if (!body.listingId || !body.reason) {
    return problem(400, "INVALID_REPORT", "listingId and reason are required.");
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
