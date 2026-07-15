import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";
import { parseSignedSessionValue, SESSION_COOKIE } from "@/lib/auth/session";

export type ServerUser = {
  id: string;
  roles: string[];
};

export async function getServerSessionUser(): Promise<ServerUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  const signed = parseSignedSessionValue(cookie);
  if (signed) {
    if (isPostgresStoreEnabled()) {
      const user = await getMainPrisma().user.findUnique({
        where: { id: signed.userId },
        select: { id: true, roles: true },
      });
      return user ? { id: user.id, roles: user.roles.map(String) } : null;
    }
    const user = getStore().getUserById(signed.userId);
    return user ? { id: user.id, roles: user.roles } : null;
  }

  if (isPostgresStoreEnabled()) return null;
  const legacy = getStore().getSession(cookie);
  const user = legacy ? getStore().getUserById(legacy.userId) : null;
  return user ? { id: user.id, roles: user.roles } : null;
}

export async function requireServerRole(roles: string[], options?: { anySignedIn?: boolean; next?: string }) {
  const user = await getServerSessionUser();
  const next = options?.next ?? "/dashboard";
  if (!user) redirect(`/auth?next=${encodeURIComponent(next)}`);
  if (options?.anySignedIn) return user;
  if (!roles.length || roles.some((role) => user.roles.includes(role))) return user;
  redirect("/dashboard/owner");
}
