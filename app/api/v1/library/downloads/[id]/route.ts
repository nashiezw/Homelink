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
import { isPdfFile } from "@/lib/library/pdf-watermark";

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

  const shouldStampPdf = applyWatermark && settings.downloads.stampPdfBytes && isPdfFile(access.file.fileType, access.file.fileName);

  const publicFilePath = resolvePublicFilePath(access.file.fileUrl, request.url);
  if (publicFilePath) {
    const localBytes = await readPublicFile(publicFilePath.pathname);
    const fileBytes = localBytes ?? await fetchPublicFile(request.url, publicFilePath.pathname);
    if (!fileBytes) return problem(404, "FILE_NOT_FOUND", "The Library file could not be found.");
    const bytes = shouldStampPdf ? await stampPdf(fileBytes, watermark, settings.licence.licenceText) : fileBytes;
    await markLibraryDownload(id);
    await auditLibraryDownload({ accessId: id, userId, fileUrl: access.file.fileUrl, request });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        ...headers,
        "Content-Type": contentType(access.file.fileType, access.file.fileName),
        ...(shouldStampPdf ? { "X-HouseLink-Pdf-Stamped": "1" } : {}),
      },
    });
  }

  try {
    const remote = await fetch(access.file.fileUrl, {
      headers: { Accept: "*/*" },
      redirect: "follow",
      cache: "no-store",
    });
    if (!remote.ok) {
      const cloudinaryError = remote.headers.get("x-cld-error");
      if (cloudinaryError) {
        return problem(
          502,
          "CLOUDINARY_DELIVERY_BLOCKED",
          `Cloudinary blocked delivery for this Library file: ${cloudinaryError}. Enable PDF and ZIP delivery in Cloudinary Security settings or move the file to an app-served/durable storage URL.`,
        );
      }
      return problem(502, "UPSTREAM_FILE_FAILED", "The Library file could not be fetched from storage.");
    }
    const remoteType = remote.headers.get("content-type") || contentType(access.file.fileType, access.file.fileName);
    if (shouldStampPdf) {
      const remoteBytes = new Uint8Array(await remote.arrayBuffer());
      const stamped = await stampPdf(remoteBytes, watermark, settings.licence.licenceText);
      await markLibraryDownload(id);
      await auditLibraryDownload({ accessId: id, userId, fileUrl: access.file.fileUrl, request });
      return new NextResponse(Buffer.from(stamped), {
        headers: {
          ...headers,
          "Content-Type": "application/pdf",
          "X-HouseLink-Pdf-Stamped": "1",
        },
      });
    }
    if (!remote.body) return problem(502, "UPSTREAM_FILE_FAILED", "The Library file could not be fetched from storage.");
    await markLibraryDownload(id);
    await auditLibraryDownload({ accessId: id, userId, fileUrl: access.file.fileUrl, request });
    return new NextResponse(remote.body, {
      headers: {
        ...headers,
        "Content-Type": remoteType,
      },
    });
  } catch (error) {
    console.error("[library/download] upstream fetch failed", {
      fileUrl: access.file.fileUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return problem(502, "UPSTREAM_FILE_FAILED", "The Library file could not be fetched from storage.");
  }
}

async function stampPdf(bytes: Uint8Array | Buffer, label: string, licenceText: string) {
  try {
    const { watermarkPdfBuffer } = await import("@/lib/library/pdf-watermark");
    return await watermarkPdfBuffer({ bytes, label, licenceText });
  } catch (error) {
    console.error("[library/download] PDF watermark failed; serving original bytes.", error);
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  }
}

function watermarkLabel(name?: string | null, email?: string | null, orderNumber?: string | null) {
  return [name, email, orderNumber, new Date().toISOString()].filter(Boolean).join(" | ");
}

function resolvePublicFilePath(fileUrl: string, requestUrl: string) {
  try {
    const normalized = fileUrl.startsWith("uploads/") ? `/${fileUrl}` : fileUrl;
    const parsed = new URL(normalized, requestUrl);
    const requestOrigin = new URL(requestUrl).origin;
    if (parsed.origin !== requestOrigin) return null;
    if (!parsed.pathname.startsWith("/uploads/")) return null;
    return { pathname: decodeURIComponent(parsed.pathname) };
  } catch {
    return null;
  }
}

async function readPublicFile(publicPathname: string) {
  const parts = publicPathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.some((part) => part === ".." || part.includes("\\") || path.isAbsolute(part))) return null;
  const safeRelative = parts.join(path.sep);
  const publicRoot = path.join(process.cwd(), "public", "uploads");
  const absolute = path.join(process.cwd(), "public", safeRelative);
  const relativeToUploads = path.relative(publicRoot, absolute);
  if (relativeToUploads.startsWith("..") || path.isAbsolute(relativeToUploads)) return null;
  const buffer = await readFile(absolute).catch(() => null);
  return buffer ? new Uint8Array(buffer) : null;
}

async function fetchPublicFile(requestUrl: string, publicPathname: string) {
  try {
    const staticUrl = new URL(publicPathname.split("/").map((part) => encodeURIComponent(part)).join("/"), requestUrl);
    const response = await fetch(staticUrl.toString(), { cache: "force-cache", redirect: "follow" });
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
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
