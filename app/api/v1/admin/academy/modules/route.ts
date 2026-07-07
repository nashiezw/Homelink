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
    const modules = await prisma.trainingModule.findMany({
      where: courseId ? { courseId } : undefined,
      include: {
        course: true,
        sections: {
          include: {
            lessons: true,
          },
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: { sortOrder: "asc" },
    });
    
    return ok(modules);
  } catch (error) {
    console.error("Failed to load modules", error);
    return problem(500, "MODULES_LOAD_FAILED", "Modules could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  try {
    const body = await request.json();
    const prisma = getMainPrisma();
    
    const trainingModule = await prisma.trainingModule.create({
      data: {
        courseId: body.courseId,
        title: body.title,
        description: body.description || null,
        sortOrder: body.sortOrder || 0,
      }
    });
    
    // Create default section
    await prisma.trainingSection.create({
      data: {
        moduleId: trainingModule.id,
        title: "Default Section",
        sortOrder: 0,
      }
    });
    
    return ok(trainingModule);
  } catch (error) {
    console.error("Failed to create module", error);
    return problem(500, "MODULE_CREATE_FAILED", "Module could not be created.");
  }
}
