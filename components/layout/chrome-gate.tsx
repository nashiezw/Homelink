"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/dashboard/admin");

  return (
    <>
      {!isAdmin && <MaintenanceBanner />}
      {!isAdmin && (
        <Suspense fallback={<header className="h-20 border-b border-slate-200/60 bg-white" aria-hidden />}>
          <SiteHeader />
        </Suspense>
      )}
      {children}
      {!isAdmin && <SiteFooter />}
    </>
  );
}