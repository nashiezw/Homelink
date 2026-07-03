"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/components/providers/app-provider";
import { getDefaultDashboard } from "@/lib/auth/roles";

export function AuthPageGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading || !user) return;
    const next = searchParams.get("next");
    const destination =
      next && next.startsWith("/") && !next.startsWith("/auth") ? next : getDefaultDashboard(user);
    router.replace(destination);
  }, [user, loading, router, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Checking your session...
      </div>
    );
  }

  if (user) {
    return null;
  }

  return children;
}
