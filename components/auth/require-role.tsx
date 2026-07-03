"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/components/providers/app-provider";
import { hasAnyRole } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/store/types";

type RequireRoleProps = {
  roles: UserRole[];
  children: ReactNode;
  /** If true, any signed-in user is allowed (roles ignored except for messaging). */
  anySignedIn?: boolean;
};

export function RequireRole({ roles, children, anySignedIn }: RequireRoleProps) {
  const { user, loading } = useApp();
  const router = useRouter();

  const allowed = anySignedIn ? Boolean(user) : hasAnyRole(user, roles);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-ink dark:text-white">Access not available</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Your account does not have permission to view this page.
        </p>
        <Link href="/" className="mt-6 inline-block font-semibold text-emerald-700 hover:underline">
          Back to homepage
        </Link>
      </div>
    );
  }

  return children;
}
