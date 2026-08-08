import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await context.params;

  const prisma = getMainPrisma();
  
  try {
    const certificate = await prisma.certificateIssue.findUnique({
      where: { id },
      include: {
        course: true,
        template: true,
      },
    });

    if (!certificate) {
      return problem(404, "NOT_FOUND", "Certificate not found");
    }

    // Generate PDF URL for client-side rendering
    const pdfUrl = `/dashboard/academy/certificate/${certificate.id}`;
    
    return ok({
      certificate,
      pdfUrl,
      message: "PDF generation URL generated successfully",
    });
  } catch (error) {
    console.error("Failed to generate PDF URL:", error);
    return problem(500, "SERVER_ERROR", "Failed to generate PDF");
  }
}
