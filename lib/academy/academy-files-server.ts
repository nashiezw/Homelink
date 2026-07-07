import { readFile } from "fs/promises";
import path from "path";
import { isAllowedAcademyFilePath } from "@/lib/academy/academy-files";

const ACADEMY_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "academy");

export function resolveAcademyFilePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!isAllowedAcademyFilePath(normalized)) return null;
  const absolute = path.join(ACADEMY_UPLOAD_ROOT, normalized);
  if (!absolute.startsWith(ACADEMY_UPLOAD_ROOT)) return null;
  return absolute;
}

export async function verifyAcademyAssets(manifestRelativePaths: string[]) {
  const { access } = await import("fs/promises");
  const missing: string[] = [];
  for (const relativePath of manifestRelativePaths) {
    const absolute = resolveAcademyFilePath(relativePath);
    if (!absolute) {
      missing.push(relativePath);
      continue;
    }
    try {
      await access(absolute);
    } catch {
      missing.push(relativePath);
    }
  }
  return { ok: missing.length === 0, missing };
}

function pdfResponseHeaders(fileName: string, inline: boolean, contentLength: number) {
  return {
    "Content-Type": "application/pdf",
    "Content-Length": String(contentLength),
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
    "Cache-Control": "public, max-age=86400, immutable",
  };
}

/**
 * Serve an academy PDF from disk (standalone/Docker) or same-origin static assets (Vercel CDN).
 */
export async function serveAcademyPdf(
  request: Request,
  relativePath: string,
  options?: { inline?: boolean; fileName?: string },
) {
  if (!isAllowedAcademyFilePath(relativePath)) return null;

  const fileName = options?.fileName ?? path.basename(relativePath);
  const inline = options?.inline ?? false;

  const absolutePath = resolveAcademyFilePath(relativePath);
  if (absolutePath) {
    try {
      const buffer = await readFile(absolutePath);
      return new Response(buffer, {
        status: 200,
        headers: pdfResponseHeaders(fileName, inline, buffer.length),
      });
    } catch {
      // Fall through to static fetch (Vercel serverless has no local public/ filesystem).
    }
  }

  const staticPath = `/uploads/academy/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const staticUrl = new URL(staticPath, request.url);
    const response = await fetch(staticUrl.toString(), { cache: "force-cache" });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return new Response(buffer, {
      status: 200,
      headers: pdfResponseHeaders(fileName, inline, buffer.length),
    });
  } catch {
    return null;
  }
}
