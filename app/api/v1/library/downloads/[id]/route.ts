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
import { getLibraryStoreSettings } from "@/lib/library/settings";

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

  const settings = await getLibraryStoreSettings();
  const productWatermark = Boolean((access.product as { watermarking?: boolean } | null)?.watermarking);
  const applyWatermark = settings.downloads.enforceWatermarkFlag ? productWatermark || settings.downloads.watermarkByDefault : true;
  const watermark = applyWatermark ? watermarkLabel(access.user?.name, access.user?.email, access.order?.orderNumber) : "";
  const headers = {
    "Content-Disposition": `attachment; filename="${(access.file.fileName || "library-file").replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
    "X-HouseLink-License": settings.licence.showOnDownload ? (access.licenseKey ?? "") : "",
    "X-HouseLink-Watermark": watermark,
    "X-HouseLink-Licence-Text": settings.licence.showOnDownload ? settings.licence.licenceText : "",
    "X-Robots-Tag": "noindex, nofollow",
  } as Record<string, string>;

  if (access.file.fileUrl.startsWith("/uploads/")) {
    const safeRelative = access.file.fileUrl.replace(/^\/+/, "").split("/").filter((part) => part && part !== "..").join(path.sep);
    const absolute = path.join(process.cwd(), "public", safeRelative);
    const publicRoot = path.join(process.cwd(), "public", "uploads");
    if (!absolute.startsWith(publicRoot)) return problem(403, "INVALID_FILE_PATH", "Download path is not allowed.");
    const buffer = await readFile(absolute).catch(() => null);
    if (!buffer) return problem(404, "FILE_NOT_FOUND", "The Library file could not be found.");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...headers,
        "Content-Type": contentType(access.file.fileType, access.file.fileName),
      },
    });
  }

  // Proxy remote/CDN files so buyers never receive a naked long-lived URL.
  try {
    const remote = await fetch(access.file.fileUrl, {
      headers: { Accept: "*/*" },
      redirect: "follow",
      cache: "no-store",
    });
    if (!remote.ok || !remote.body) {
      return problem(502, "UPSTREAM_FILE_FAILED", "The Library file could not be fetched from storage.");
    }
    const remoteType = remote.headers.get("content-type") || contentType(access.file.fileType, access.file.fileName);
    return new NextResponse(remote.body, {
      headers: {
        ...headers,
        "Content-Type": remoteType,
      },
    });
  } catch {
    return problem(502, "UPSTREAM_FILE_FAILED", "The Library file could not be fetched from storage.");
  }
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
