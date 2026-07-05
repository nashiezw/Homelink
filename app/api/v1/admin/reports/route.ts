import { requireAdmin } from "@/lib/admin/require-admin";
import { rowsToCsv } from "@/lib/admin/csv";
import { ok, problem } from "@/lib/api/response";
import { getPostgresUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { shouldUsePostgresPersistence } from "@/lib/db/postgres-app-repository";
import { listAdminListingsFromPostgres } from "@/lib/listings/postgres-listing-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireReportsAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "revenue";
  const format = searchParams.get("format") ?? "json";
  const data = shouldUsePostgresPersistence()
    ? await generatePostgresReportData(type)
    : getStore().generateReportData(type);

  if (format === "csv") {
    const csv = rowsToCsv(data.rows as Array<Record<string, unknown>>);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="homelink-${type}-report.csv"`,
      },
    });
  }

  return ok(data);
}

async function requireReportsAdmin(request: Request) {
  if (!shouldUsePostgresAuth()) return requireAdmin(request);
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return { error: problem(401, "UNAUTHORIZED", "Sign in to access admin.") };
  const user = await getPostgresUserById(userId);
  if (!user?.roles.includes("ADMIN")) {
    return { error: problem(403, "FORBIDDEN", "Admin access required.") };
  }
  return { user: { id: user.id, name: user.name, roles: user.roles }, error: undefined };
}

async function generatePostgresReportData(type: string) {
  const prisma = getMainPrisma();
  if (type === "properties") {
    return {
      generatedAt: new Date().toISOString(),
      rows: await listAdminListingsFromPostgres({ includeDeleted: true }),
    };
  }
  if (type === "users") {
    const rows = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roles: true,
        identityStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      generatedAt: new Date().toISOString(),
      rows: rows.map((row) => ({
        ...row,
        roles: row.roles.join(", "),
        identityStatus: row.identityStatus,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
  if (type === "enquiries") {
    const rows = await prisma.propertyEnquiryRecord.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    return {
      generatedAt: new Date().toISOString(),
      rows: rows.map((row) => ({
        id: row.id,
        listingId: row.listingId,
        seekerId: row.seekerId,
        ownerId: row.ownerId,
        status: row.status,
        enquiryType: row.enquiryType,
        assignedAgentId: row.assignedAgentId,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
  if (type === "payments" || type === "revenue") {
    const rows = await prisma.payment.findMany({
      select: { id: true, userId: true, listingId: true, provider: true, status: true, amount: true, currency: true, description: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return {
      generatedAt: new Date().toISOString(),
      rows: rows.map((row) => ({ ...row, amount: Number(row.amount), createdAt: row.createdAt.toISOString() })),
    };
  }
  if (type === "reports") {
    const rows = await prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    return {
      generatedAt: new Date().toISOString(),
      rows: rows.map((row) => ({
        id: row.id,
        listingId: row.listingId,
        reporterId: row.reporterId,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
  return { generatedAt: new Date().toISOString(), rows: [] };
}
