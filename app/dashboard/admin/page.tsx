import { Suspense } from "react";
import { AdminControlCenter } from "@/components/admin/admin-control-center";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireServerRole } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireServerRole(["ADMIN", "SUPER_ADMIN", "SUPPORT", "BILLING", "TECH_SUPPORT", "TRUST_SAFETY"], { next: "/dashboard/admin" });
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Loading control center...
        </div>
      }
    >
      <AdminShell>
        <AdminControlCenter />
      </AdminShell>
    </Suspense>
  );
}
