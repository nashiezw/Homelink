import { Suspense } from "react";
import { AdminControlCenter } from "@/components/admin/admin-control-center";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
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
