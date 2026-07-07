import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const prisma = getMainPrisma();
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  
  try {
    const certificates = await prisma.certificateIssue.findMany({
      where: courseId ? { courseId } : undefined,
      include: {
        course: true,
        template: true,
      },
      orderBy: { issuedAt: "desc" },
    });
    
    return ok(certificates);
  } catch (error) {
    console.error("Failed to load certificates", error);
    return problem(500, "CERTIFICATES_LOAD_FAILED", "Certificates could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  try {
    const body = await request.json();
    const prisma = getMainPrisma();
    
    // Generate certificate number
    const prefix = body.prefix || "HLA";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const certificateNumber = `${prefix}-${timestamp}-${random}`;
    
    const certificate = await prisma.certificateIssue.create({
      data: {
        certificateNumber,
        courseId: body.courseId,
        agentId: body.agentId,
        templateId: body.templateId,
        issuedAt: new Date(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        status: "ACTIVE",
      }
    });
    
    return ok(certificate);
  } catch (error) {
    console.error("Failed to issue certificate", error);
    return problem(500, "CERTIFICATE_ISSUE_FAILED", "Certificate could not be issued.");
  }
}
