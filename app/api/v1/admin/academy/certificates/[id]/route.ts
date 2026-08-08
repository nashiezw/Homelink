import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const prisma = getMainPrisma();
  
  try {
    const certificate = await prisma.certificateIssue.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            title: true,
          },
        },
        template: true,
      },
    });

    if (!certificate) {
      return problem(404, "NOT_FOUND", "Certificate not found");
    }

    return ok(certificate);
  } catch (error) {
    console.error("Failed to fetch certificate", error);
    return problem(500, "CERTIFICATE_FETCH_FAILED", "Certificate could not be fetched.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const body = await request.json();
  const prisma = getMainPrisma();
  const actorId = getSessionUserIdFromRequest(request);
  const rawStatus = String(body.status ?? "ACTIVE").toUpperCase();
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
  const status = rawStatus === "ACTIVE" ? "ACTIVE" : reason ? `${rawStatus}: ${reason}` : rawStatus;
  
  try {
    const certificate = await prisma.certificateIssue.update({
      where: { id },
      data: {
        status,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        revokedAt: rawStatus === "ACTIVE" ? null : new Date(),
      }
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        actorId,
        action: `CERTIFICATE_${rawStatus}`,
        target: `Certificate:${id}`,
        metadata: {
          previousStatus: certificate.status,
          newStatus: status,
          reason,
        } as any,
      },
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
  const actorId = getSessionUserIdFromRequest(request);
  
  try {
    const certificate = await prisma.certificateIssue.findUnique({
      where: { id },
      select: { certificateNumber: true },
    });

    await prisma.certificateIssue.delete({ where: { id } });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        actorId,
        action: "CERTIFICATE_DELETED",
        target: `Certificate:${id}`,
        metadata: {
          certificateNumber: certificate?.certificateNumber,
        } as any,
      },
    });

    return ok({ deleted: id });
  } catch (error) {
    console.error("Failed to delete certificate", error);
    return problem(500, "CERTIFICATE_DELETE_FAILED", "Certificate could not be deleted.");
  }
}
