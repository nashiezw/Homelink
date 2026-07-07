import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const body = await request.json();
  const prisma = getMainPrisma();
  
  try {
    const trainingModule = await prisma.trainingModule.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        sortOrder: body.sortOrder,
      }
    });
    return ok(trainingModule);
  } catch (error) {
    console.error("Failed to update module", error);
    return problem(500, "MODULE_UPDATE_FAILED", "Module could not be updated.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const prisma = getMainPrisma();
  
  try {
    await prisma.trainingModule.delete({ where: { id } });
    return ok({ deleted: id });
  } catch (error) {
    console.error("Failed to delete module", error);
    return problem(500, "MODULE_DELETE_FAILED", "Module could not be deleted.");
  }
}
