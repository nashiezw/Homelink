import { NextResponse } from "next/server";
import { academyRelativePathFromUrl, toAcademyFileDownloadUrl } from "@/lib/academy/academy-files";
import { serveAcademyPdf } from "@/lib/academy/academy-files-server";
import { problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

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
  await getMainPrisma().documentLibrary.update({
    where: { id },
    data: { downloadCount: { increment: 1 } },
  });

  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";
  const relativePath = academyRelativePathFromUrl(document.fileUrl);
  if (relativePath) {
    const served = await serveAcademyPdf(request, relativePath, {
      inline,
      fileName: document.fileName,
    });
    if (served) return served;
  }

  return NextResponse.redirect(new URL(toAcademyFileDownloadUrl(document.fileUrl), request.url));
}
