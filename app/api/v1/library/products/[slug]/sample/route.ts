import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { problem } from "@/lib/api/response";
import { getLibraryProductSampleFile, shouldUsePostgresLibrary } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!shouldUsePostgresLibrary()) return problem(503, "SAMPLE_UNAVAILABLE", "Library samples require the database-backed Library.");
  const { slug } = await context.params;
  const sample = await getLibraryProductSampleFile(slug);
  if (!sample) return problem(404, "SAMPLE_NOT_FOUND", "No previewable sample file is available for this product.");

  if (sample.fileUrl.startsWith("/uploads/")) {
    const safeRelative = sample.fileUrl.replace(/^\/+/, "").split("/").filter((part) => part && part !== "..").join(path.sep);
    const absolute = path.join(process.cwd(), "public", safeRelative);
    const publicRoot = path.join(process.cwd(), "public", "uploads");
    if (!absolute.startsWith(publicRoot)) return problem(403, "INVALID_FILE_PATH", "Sample path is not allowed.");
    const buffer = await readFile(absolute).catch(() => null);
    if (!buffer) return problem(404, "FILE_NOT_FOUND", "The sample file could not be found.");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": sample.fileType.toLowerCase() === "pdf" || sample.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
        "Content-Disposition": `inline; filename="${sample.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "public, max-age=300",
        "X-HouseLink-Sample": sample.productTitle,
      },
    });
  }

  // External/CDN URLs: redirect so the browser can still render inline PDFs where allowed.
  return NextResponse.redirect(new URL(sample.fileUrl, request.url));
}
