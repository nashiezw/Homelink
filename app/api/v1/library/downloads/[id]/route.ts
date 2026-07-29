import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { ok, problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getStore } from "@/lib/store/app-store";
import {
  getDownloadForUser,
  auditLibraryDownload,
  markLibraryDownload,
  shouldUsePostgresLibrary,
  verifyDownloadToken,
} from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!shouldUsePostgresLibrary()) return problem(503, "DOWNLOADS_NOT_PERSISTED", "Library downloads require the database-backed Library.");
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to download Library files.");
  const user = shouldUsePostgresAuth() ? await getPostgresPublicUserById(userId) : getStore().getUserById(userId);
  const { id } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || !verifyDownloadToken(token, id, userId)) {
    return problem(403, "INVALID_DOWNLOAD_TOKEN", "Generate a fresh secure download link.");
  }
  const access = await getDownloadForUser(id, userId, user?.roles);
  if (!access || access === "FORBIDDEN") return problem(403, "ACCESS_DENIED", "You do not have access to this download.");
  if (access === "EXPIRED") return problem(403, "DOWNLOAD_EXPIRED", "This download link has expired.");
  if (access === "LIMIT_REACHED") return problem(403, "DOWNLOAD_LIMIT_REACHED", "Download limit reached.");
  if (access === "DISABLED") return problem(403, "DOWNLOAD_DISABLED", "This download is not active.");
  await markLibraryDownload(id);
  await auditLibraryDownload({ accessId: id, userId, fileUrl: access.file?.fileUrl, request });
  if (!access.file?.fileUrl) return ok({ message: "Access confirmed. This product does not have a downloadable file yet." });
  if (access.file.fileUrl.startsWith("/uploads/")) {
    const safeRelative = access.file.fileUrl.replace(/^\/+/, "").split("/").filter((part) => part && part !== "..").join(path.sep);
    const absolute = path.join(process.cwd(), "public", safeRelative);
    const publicRoot = path.join(process.cwd(), "public", "uploads");
    if (!absolute.startsWith(publicRoot)) return problem(403, "INVALID_FILE_PATH", "Download path is not allowed.");
    const buffer = await readFile(absolute).catch(() => null);
    if (!buffer) return problem(404, "FILE_NOT_FOUND", "The Library file could not be found.");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType(access.file.fileType, access.file.fileName),
        "Content-Disposition": `attachment; filename="${access.file.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-HouseLink-License": access.licenseKey ?? "",
        "X-HouseLink-Watermark": watermarkLabel(access.user?.name, access.user?.email, access.order?.orderNumber),
      },
    });
  }
  return NextResponse.redirect(new URL(access.file.fileUrl, request.url));
}

function watermarkLabel(name?: string | null, email?: string | null, orderNumber?: string | null) {
  return [name, email, orderNumber, new Date().toISOString()].filter(Boolean).join(" | ");
}

function contentType(fileType: string, fileName: string) {
  const type = fileType.toLowerCase();
  if (type === "pdf" || fileName.endsWith(".pdf")) return "application/pdf";
  if (type === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (type === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (type === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (type === "zip") return "application/zip";
  return "application/octet-stream";
}
