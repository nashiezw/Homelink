import { isAllowedAcademyFilePath } from "@/lib/academy/academy-files";
import { serveAcademyPdf } from "@/lib/academy/academy-files-server";
import { canDownloadAcademyPath } from "@/lib/academy/academy-resource-access";
import { problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const relativePath = segments.map(decodeURIComponent).join("/");

  if (!isAllowedAcademyFilePath(relativePath)) {
    return problem(404, "FILE_NOT_FOUND", "This Academy file is not available.");
  }

  const userId = getSessionUserIdFromRequest(request);
  const user = userId
    ? shouldUsePostgresAuth()
      ? await getPostgresPublicUserById(userId)
      : getStore().getUserById(userId)
    : null;
  const allowed = await canDownloadAcademyPath({
    relativePath,
    userId,
    roles: user?.roles,
  });
  if (!allowed) {
    return problem(403, "ACCESS_DENIED", "Purchase and admin approval are required before downloading this resource.");
  }

  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";
  const served = await serveAcademyPdf(request, relativePath, { inline });
  if (served) return served;

  return problem(404, "FILE_NOT_FOUND", "This Academy file could not be loaded. Run the Academy seed to regenerate resources.");
}
