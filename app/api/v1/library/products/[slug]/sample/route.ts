import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getLibraryProductSampleFile } from "@/lib/library/repository";
import { findPreparedLibrarySample } from "@/lib/library/sample-preview";
import { getLibraryStoreSettings } from "@/lib/library/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const settings = await getLibraryStoreSettings();
  if (!settings.preview.enabled) return problem(403, "PREVIEW_DISABLED", "Library previews are currently disabled.");
  if (settings.preview.requireLogin && !getSessionUserIdFromRequest(request)) {
    return problem(401, "UNAUTHORIZED", "Sign in to preview Library samples.");
  }
  const { slug } = await context.params;
  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  const sample = await getLibraryProductSampleFile(slug);
  if (!sample) {
    const fallback = await preparedSampleResponse(slug, slug, disposition, settings.preview.maxSamplePages, settings.preview.watermarkSamples);
    if (fallback) return fallback;
    return problem(404, "SAMPLE_NOT_FOUND", "No previewable sample file is available for this product.");
  }
  const headers = sampleHeaders(sample, disposition, settings.preview.maxSamplePages, settings.preview.watermarkSamples);

  const publicFilePath = resolvePublicFilePath(sample.fileUrl, request.url);
  if (publicFilePath) {
    const buffer = await readPublicFile(publicFilePath.pathname);
    if (!buffer) return problem(404, "FILE_NOT_FOUND", "The sample file could not be found.");
    return new NextResponse(buffer, { headers });
  }

  const remoteUrl = parseRemoteFileUrl(sample.fileUrl, request.url);
  if (!remoteUrl) return problem(400, "INVALID_FILE_URL", "The sample file URL is not valid.");

  try {
    const remote = await fetch(remoteUrl.toString(), {
      headers: { Accept: "application/pdf,application/octet-stream,*/*" },
      redirect: "follow",
      cache: "force-cache",
    });
    if (!remote.ok) {
      const cloudinaryError = remote.headers.get("x-cld-error");
      if (cloudinaryError) {
        const fallback = await preparedSampleResponse(slug, sample.productTitle, disposition, settings.preview.maxSamplePages, settings.preview.watermarkSamples);
        if (fallback) return fallback;
        return problem(
          502,
          "CLOUDINARY_DELIVERY_BLOCKED",
          `Cloudinary blocked delivery for this Library sample: ${cloudinaryError}. Enable PDF and ZIP delivery in Cloudinary Security settings or upload the sample to app-served storage.`,
        );
      }
      const fallback = await preparedSampleResponse(slug, sample.productTitle, disposition, settings.preview.maxSamplePages, settings.preview.watermarkSamples);
      if (fallback) return fallback;
      return problem(502, "UPSTREAM_SAMPLE_FAILED", "The sample file could not be fetched from storage.");
    }
    if (!remote.body) return problem(502, "UPSTREAM_SAMPLE_FAILED", "The sample file could not be fetched from storage.");
    return new NextResponse(remote.body, {
      headers: {
        ...headers,
        "Content-Type": normalizeRemoteContentType(remote.headers.get("content-type"), headers["Content-Type"]),
      },
    });
  } catch (error) {
    console.error("[library/sample] upstream fetch failed", {
      fileUrl: sample.fileUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    const fallback = await preparedSampleResponse(slug, sample.productTitle, disposition, settings.preview.maxSamplePages, settings.preview.watermarkSamples);
    if (fallback) return fallback;
    return problem(502, "UPSTREAM_SAMPLE_FAILED", "The sample file could not be fetched from storage.");
  }
}

type LibrarySampleFile = NonNullable<Awaited<ReturnType<typeof getLibraryProductSampleFile>>>;

function sampleHeaders(sample: LibrarySampleFile, disposition: "inline" | "attachment", maxSamplePages: number, watermarkSamples: boolean) {
  return {
    "Content-Type": contentType(sample.fileType, sample.fileName),
    "Content-Disposition": `${disposition}; filename="${sample.fileName.replace(/"/g, "")}"`,
    "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    "X-HouseLink-Sample": sample.productTitle,
    "X-HouseLink-Sample-Pages": String(maxSamplePages),
    "X-HouseLink-Sample-Watermark": watermarkSamples ? "1" : "0",
    "X-Robots-Tag": "noindex, nofollow",
  };
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

async function preparedSampleResponse(slug: string, productTitle: string, disposition: "inline" | "attachment", maxSamplePages: number, watermarkSamples: boolean) {
  const prepared = findPreparedLibrarySample({ slug, title: productTitle });
  if (!prepared?.fileUrl) return null;
  const publicFilePath = resolvePublicFilePath(prepared.fileUrl, "https://www.houselink.co.zw");
  if (!publicFilePath) return null;
  const buffer = await readPublicFile(publicFilePath.pathname);
  if (!buffer) return null;
  return new NextResponse(buffer, {
    headers: sampleHeaders(
      {
        productTitle: prepared.title || productTitle,
        fileName: prepared.fileName,
        fileType: prepared.fileType,
      } as LibrarySampleFile,
      disposition,
      maxSamplePages,
      watermarkSamples,
    ),
  });
}

function parseRemoteFileUrl(fileUrl: string, requestUrl: string) {
  try {
    const parsed = new URL(fileUrl, requestUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.origin === new URL(requestUrl).origin) return null;
    return parsed;
  } catch {
    return null;
  }
}

function contentType(fileType: string, fileName: string) {
  const type = fileType.toLowerCase();
  const name = fileName.toLowerCase();
  if (type === "pdf" || name.endsWith(".pdf")) return "application/pdf";
  if (type === "docx" || name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (type === "xlsx" || name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (type === "pptx" || name.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (type === "zip" || name.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

function normalizeRemoteContentType(remoteType: string | null, fallback: string) {
  if (fallback === "application/pdf") return "application/pdf";
  return remoteType || fallback;
}
