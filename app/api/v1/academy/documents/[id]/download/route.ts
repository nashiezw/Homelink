import { NextResponse } from "next/server";
import { academyRelativePathFromUrl, toAcademyFileDownloadUrl } from "@/lib/academy/academy-files";
import { serveAcademyPdf } from "@/lib/academy/academy-files-server";
import { canDownloadAcademyPath } from "@/lib/academy/academy-resource-access";
import { problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const document = await getMainPrisma().documentLibrary.findUnique({
    where: { id },
    select: { id: true, fileUrl: true, fileName: true, downloadable: true, visible: true, active: true },
  });
  if (!document || !document.active || !document.visible) {
    return problem(404, "DOCUMENT_NOT_FOUND", "This training resource is not available.");
  }
  if (!document.downloadable) {
    return problem(403, "DOWNLOAD_DISABLED", "Downloads are disabled for this training resource.");
  }

  const userId = getSessionUserIdFromRequest(request);
  const user = userId
    ? shouldUsePostgresAuth()
      ? await getPostgresPublicUserById(userId)
      : getStore().getUserById(userId)
    : null;
  const relativePath = academyRelativePathFromUrl(document.fileUrl);
  if (relativePath) {
    const allowed = await canDownloadAcademyPath({
      relativePath,
      userId,
      roles: user?.roles,
    });
    if (!allowed) {
      return problem(403, "ACCESS_DENIED", "Purchase and admin approval are required before downloading this resource.");
    }
  }

  await getMainPrisma().documentLibrary.update({
    where: { id },
    data: { downloadCount: { increment: 1 } },
  });

  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";
  if (relativePath) {
    const served = await serveAcademyPdf(request, relativePath, {
      inline,
      fileName: document.fileName,
    });
    if (served) return served;
  }

  return NextResponse.redirect(new URL(toAcademyFileDownloadUrl(document.fileUrl), request.url));
}
