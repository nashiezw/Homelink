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
    const certificate = await prisma.certificateIssue.update({
      where: { id },
      data: {
        status: body.status,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        revokedAt: body.status === "REVOKED" ? new Date() : undefined,
      }
    });
    return ok(certificate);
  } catch (error) {
    console.error("Failed to update certificate", error);
    return problem(500, "CERTIFICATE_UPDATE_FAILED", "Certificate could not be updated.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const prisma = getMainPrisma();
  
  try {
    await prisma.certificateIssue.delete({ where: { id } });
    return ok({ deleted: id });
  } catch (error) {
    console.error("Failed to delete certificate", error);
    return problem(500, "CERTIFICATE_DELETE_FAILED", "Certificate could not be deleted.");
  }
}
