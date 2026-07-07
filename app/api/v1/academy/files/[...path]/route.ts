import { isAllowedAcademyFilePath } from "@/lib/academy/academy-files";
import { serveAcademyPdf } from "@/lib/academy/academy-files-server";
import { problem } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const relativePath = segments.map(decodeURIComponent).join("/");

  if (!isAllowedAcademyFilePath(relativePath)) {
    return problem(404, "FILE_NOT_FOUND", "This Academy file is not available.");
  }

  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";
  const served = await serveAcademyPdf(request, relativePath, { inline });
  if (served) return served;

  return problem(404, "FILE_NOT_FOUND", "This Academy file could not be loaded. Run the Academy seed to regenerate resources.");
}
