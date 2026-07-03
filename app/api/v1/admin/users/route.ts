import { requireAdmin } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";
import type { AccountStatus, UserRole } from "@/lib/store/types";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const role = (searchParams.get("role") ?? "ALL") as UserRole | "ALL";
  const status = (searchParams.get("status") ?? "ALL") as AccountStatus | "ALL";
  const q = searchParams.get("q") ?? undefined;

  const store = getStore();
  const users = store.listUsers({ role, status, q });

  return ok({
    users,
    totals: {
      all: store.listUsers().length,
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
