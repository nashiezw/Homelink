"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdvancedBehaviorTracker } from "@/components/analytics/advanced-behavior-tracker";
import { SiteAnalyticsTracker } from "@/components/analytics/site-analytics-tracker";
import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppStickyFab } from "@/components/layout/whatsapp-sticky-fab";

export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/dashboard/admin") ?? false;

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
      {!isAdmin && (
        <Suspense fallback={null}>
          <SiteAnalyticsTracker />
          <AdvancedBehaviorTracker />
        </Suspense>
      )}
      {!isAdmin && <WhatsAppStickyFab />}
    </>
  );
}
