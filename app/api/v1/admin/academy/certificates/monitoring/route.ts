import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const prisma = getMainPrisma();
  
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalIssued, active, revoked, expired, recentIssued, recentRevoked, recentCertificates] = await Promise.all([
      prisma.certificateIssue.count(),
      prisma.certificateIssue.count({ where: { status: "ACTIVE" } }),
      prisma.certificateIssue.count({ where: { status: "REVOKED" } }),
      prisma.certificateIssue.count({ 
        where: { 
          status: "ACTIVE",
          expiresAt: { lt: now }
        }
      }),
      prisma.certificateIssue.count({
        where: {
          issuedAt: { gte: weekAgo },
          status: "ACTIVE"
        }
      }),
      prisma.certificateIssue.count({
        where: {
          revokedAt: { gte: weekAgo },
          status: "REVOKED"
        }
      }),
      prisma.certificateIssue.findMany({
        where: {
          issuedAt: { gte: weekAgo }
        },
        orderBy: { issuedAt: "desc" },
        take: 10,
        select: {
          id: true,
          certificateNumber: true,
          agentId: true,
          courseId: true,
          status: true,
          issuedAt: true,
          expiresAt: true,
        }
      })
    ]);

    const stats = {
      totalIssued,
      active,
      revoked,
      expired,
      pending: 0,
      recentIssued,
      recentRevoked,
    };

    return ok({ stats, recentCertificates });
  } catch (error) {
    console.error("Failed to fetch certificate monitoring data:", error);
    return problem(500, "SERVER_ERROR", "Failed to fetch monitoring data");
  }
}
