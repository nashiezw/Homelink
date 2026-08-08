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
    const template = await prisma.certificateTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return problem(404, "NOT_FOUND", "Certificate template not found");
    }

    return ok(template);
  } catch (error) {
    console.error("Failed to fetch certificate template:", error);
    return problem(500, "SERVER_ERROR", "Failed to fetch certificate template");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await context.params;

  const prisma = getMainPrisma();
  
  try {
    const body = await request.json();
    const { name, backgroundUrl, logoUrl, signatureUrl, templateJson, active } = body;

    const template = await prisma.certificateTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(backgroundUrl !== undefined && { backgroundUrl }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(signatureUrl !== undefined && { signatureUrl }),
        ...(templateJson !== undefined && { templateJson }),
        ...(active !== undefined && { active }),
      },
    });

    return ok({ message: "Certificate template updated successfully", template });
  } catch (error) {
    console.error("Failed to update certificate template:", error);
    return problem(500, "SERVER_ERROR", "Failed to update certificate template");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await context.params;

  const prisma = getMainPrisma();
  
  try {
    await prisma.certificateTemplate.delete({
      where: { id },
    });

    return ok({ message: "Certificate template deleted successfully" });
  } catch (error) {
    console.error("Failed to delete certificate template:", error);
    return problem(500, "SERVER_ERROR", "Failed to delete certificate template");
  }
}
