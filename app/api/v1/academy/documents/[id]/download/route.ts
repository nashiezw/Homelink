import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { problem } from "@/lib/api/response";
import { resolveAcademyFilePath, toAcademyFileDownloadUrl } from "@/lib/academy/academy-files";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

async function streamAcademyPdf(fileUrl: string, fileName: string, inline: boolean) {
  const relativePath = fileUrl.startsWith("/uploads/academy/")
    ? fileUrl.slice("/uploads/academy/".length)
    : fileUrl.replace("/api/v1/academy/files/", "");
  const absolutePath = resolveAcademyFilePath(relativePath);
  if (!absolutePath) return null;
  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) return null;
    const buffer = await readFile(absolutePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName || path.basename(absolutePath)}"`,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return null;
  }
}

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
  const streamed = await streamAcademyPdf(document.fileUrl, document.fileName, inline);
  if (streamed) return streamed;

  return NextResponse.redirect(new URL(toAcademyFileDownloadUrl(document.fileUrl), request.url));
}
