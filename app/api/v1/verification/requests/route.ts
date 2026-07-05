import { created, ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getPostgresVerificationQueue } from "@/lib/admin/postgres-analytics";

export async function GET() {
  if (isPostgresStoreEnabled()) return ok(await getPostgresVerificationQueue());
  return ok([]);
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit verification documents.");
  const body = await request.json();

  if (!body.targetType) {
    return problem(400, "INVALID_VERIFICATION", "targetType is required.");
  }
  if (!Array.isArray(body.documents) || body.documents.length === 0) {
    return problem(400, "DOCUMENTS_REQUIRED", "Upload at least one verification document.");
  }

  if (isPostgresStoreEnabled()) {
    try {
      const rows = await getMainPrisma().$transaction(body.documents.map((document: { url?: string; publicId?: string; type?: string }, index: number) => {
        const publicId = document.publicId || `verification_${crypto.randomUUID()}`;
        return getMainPrisma().userDocument.create({
          data: {
            userId,
            url: document.url || publicId,
            publicId,
            type: document.type || body.targetType || `document_${index + 1}`,
          },
        });
      }));
      return created({ status: "PENDING", documents: rows });
    } catch (error) {
      console.error("Failed to persist verification documents", { userId, error });
      return problem(500, "VERIFICATION_SAVE_FAILED", "Verification documents could not be saved.");
    }
  }

  return created({ id: `verify_${crypto.randomUUID()}`, status: "PENDING", ...body });
}
