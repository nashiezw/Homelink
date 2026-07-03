import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view residence history.");
  }
  return ok({ records: getStore().listResidenceHistory(userId, userId) });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to add residence history.");
  }

  const body = await request.json();
  const record = getStore().addManualResidenceHistory(userId, {
    propertyTitle: String(body.propertyTitle ?? "Previous address"),
    city: String(body.city ?? ""),
    suburb: String(body.suburb ?? ""),
    role: body.role ?? "tenant",
    startDate: String(body.startDate ?? new Date().toISOString().slice(0, 10)),
    endDate: body.endDate ? String(body.endDate) : undefined,
    visibility: body.visibility ?? "public",
    notes: body.notes ? String(body.notes) : "Self-reported — not verified until payment or lease on HomeLink",
  });

  return created({ record: getStore().sanitizeResidenceForViewer(record, userId) });
}
