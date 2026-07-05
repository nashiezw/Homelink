import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import {
  addTenancyReferenceInPostgres,
  shouldUsePostgresTenancies,
} from "@/lib/residence/postgres-tenancy-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to leave a reference.");
  }

  const { id: tenancyId } = await params;
  const body = await request.json();
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) {
    return problem(400, "INVALID_INPUT", "Reference note is required.");
  }

  if (shouldUsePostgresTenancies()) {
    const ref = await addTenancyReferenceInPostgres(tenancyId, userId, {
      note,
      rating: body.rating ? Number(body.rating) : undefined,
    });
    if (!ref) {
      return problem(403, "FORBIDDEN", "You cannot reference this tenancy.");
    }
    return created({ reference: ref });
  }
  const ref = getStore().addTenancyReference(tenancyId, userId, {
    note,
    rating: body.rating ? Number(body.rating) : undefined,
    targetUserId: typeof body.targetUserId === "string" ? body.targetUserId : undefined,
  });

  if (!ref) {
    return problem(403, "FORBIDDEN", "You cannot reference this tenancy.");
  }

  return created({ reference: ref });
}
