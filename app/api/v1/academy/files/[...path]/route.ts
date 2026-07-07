import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { isAllowedAcademyFilePath, resolveAcademyFilePath } from "@/lib/academy/academy-files";
import { problem } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const relativePath = segments.map(decodeURIComponent).join("/");

  if (!isAllowedAcademyFilePath(relativePath)) {
    return problem(404, "FILE_NOT_FOUND", "This Academy file is not available.");
  }

  const absolutePath = resolveAcademyFilePath(relativePath);
  if (!absolutePath) {
    return problem(404, "FILE_NOT_FOUND", "This Academy file is not available.");
  }

  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return problem(404, "FILE_NOT_FOUND", "This Academy file is not available.");
    }

    const buffer = await readFile(absolutePath);
    const fileName = path.basename(absolutePath);
    const url = new URL(request.url);
    const inline = url.searchParams.get("inline") === "1";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return problem(404, "FILE_NOT_FOUND", "This Academy file could not be loaded. Run the Academy seed to regenerate resources.");
  }
}
