import { ok, problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getStore } from "@/lib/store/app-store";
import { createDownloadToken, getDownloadForUser, shouldUsePostgresLibrary } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!shouldUsePostgresLibrary()) return problem(503, "DOWNLOADS_NOT_PERSISTED", "Library downloads require the database-backed Library.");
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to download Library files.");
  const user = shouldUsePostgresAuth() ? await getPostgresPublicUserById(userId) : getStore().getUserById(userId);
  const { id } = await context.params;
  const access = await getDownloadForUser(id, userId, user?.roles);
  if (!access || access === "FORBIDDEN") return problem(403, "ACCESS_DENIED", "You do not have access to this download.");
  if (access === "EXPIRED") return problem(403, "DOWNLOAD_EXPIRED", "This download link has expired.");
  if (access === "LIMIT_REACHED") return problem(403, "DOWNLOAD_LIMIT_REACHED", "Download limit reached.");
  if (access === "DISABLED") return problem(403, "DOWNLOAD_DISABLED", "This download is not active.");
  return ok({ token: await createDownloadToken(id, userId), downloadUrl: `/api/v1/library/downloads/${id}` });
}
