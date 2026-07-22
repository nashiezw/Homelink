import { requireAdmin } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getPostgresUserById, shouldUsePostgresAuth, toPublicPostgresUser } from "@/lib/auth/postgres-auth";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";
import type { AccountStatus, UserRole } from "@/lib/store/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireUsersAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const role = (searchParams.get("role") ?? "ALL") as UserRole | "ALL";
  const status = (searchParams.get("status") ?? "ALL") as AccountStatus | "ALL";
  const q = searchParams.get("q") ?? undefined;
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  if (shouldUsePostgresAuth()) {
    const prisma = getMainPrisma();
    const users = await prisma.user.findMany({
      where: {
        ...(!includeDeleted && status === "ALL" ? { accountStatus: { not: "DELETED" } } : {}),
        ...(role !== "ALL" ? { roles: { has: role as never } } : {}),
        ...(status !== "ALL" ? { accountStatus: status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    const all = await prisma.user.findMany({ select: { roles: true, accountStatus: true } });
    const visible = includeDeleted ? all : all.filter((u) => u.accountStatus !== "DELETED");
    return ok({
      users: users.map(toPublicPostgresUser),
      totals: {
        all: visible.length,
        active: visible.filter((u) => u.accountStatus === "ACTIVE").length,
        suspended: visible.filter((u) => u.accountStatus === "SUSPENDED").length,
        blocked: visible.filter((u) => u.accountStatus === "BLOCKED").length,
        landlords: visible.filter((u) => u.roles.includes("LANDLORD")).length,
        agents: visible.filter((u) => u.roles.includes("AGENT")).length,
        seekers: visible.filter((u) => u.roles.includes("SEEKER")).length,
        premium: 0,
      },
    });
  }

  const store = getStore();
  const users = store.listUsers({ role, status, q });
  const visibleUsers = store.listUsers();

  return ok({
    users,
    totals: {
      all: visibleUsers.length,
      active: store.listUsers({ status: "ACTIVE" }).length,
      suspended: store.listUsers({ status: "SUSPENDED" }).length,
      blocked: store.listUsers({ status: "BLOCKED" }).length,
      landlords: store.listUsers({ role: "LANDLORD" }).length,
      agents: store.listUsers({ role: "AGENT" }).length,
      seekers: store.listUsers({ role: "SEEKER" }).length,
      premium: store.listUsers().filter((u) => u.premium).length,
    },
  });
}

async function requireUsersAdmin(request: Request) {
  if (!shouldUsePostgresAuth()) return requireAdmin(request);
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return { error: new Response(null, { status: 401 }) };
  const user = await getPostgresUserById(userId);
  if (!user?.roles.includes("ADMIN")) return { error: new Response(null, { status: 403 }) };
  return { user: { id: user.id, name: user.name }, error: undefined };
}
