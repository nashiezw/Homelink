import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const prisma = getMainPrisma();
  const includeCourses = new URL(request.url).searchParams.get("includeCourses") === "1";
  
  try {
    const templates = await prisma.certificateTemplate.findMany({
      orderBy: { updatedAt: "desc" },
    });
    if (includeCourses) {
      const courses = await prisma.trainingCourse.findMany({
        select: { id: true, title: true, status: true },
        orderBy: [{ title: "asc" }],
      });
      return ok({ templates, courses });
    }
    
    return ok(templates);
  } catch (error) {
    console.error("Failed to fetch certificate templates:", error);
    return problem(500, "SERVER_ERROR", "Failed to fetch certificate templates");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const prisma = getMainPrisma();
  
  try {
    const body = await request.json();
    const { name, backgroundUrl, logoUrl, signatureUrl, templateJson, active } = body;

    if (!name) {
      return problem(400, "MISSING_FIELDS", "Template name is required");
    }

    const template = await prisma.certificateTemplate.create({
      data: {
        name,
        backgroundUrl,
        logoUrl,
        signatureUrl,
        templateJson: templateJson || {},
        active: active !== undefined ? active : true,
      },
    });

    return ok({ message: "Certificate template created successfully", template });
  } catch (error) {
    console.error("Failed to create certificate template:", error);
    return problem(500, "SERVER_ERROR", "Failed to create certificate template");
  }
}
