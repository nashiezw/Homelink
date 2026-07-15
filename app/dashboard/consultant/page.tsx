import Link from "next/link";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { ConsultantDashboard } from "@/components/property-management/consultant-dashboard";
import { requireServerRole } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ConsultantDashboardPage() {
  await requireServerRole(["CONSULTANT", "ADMIN"], { next: "/dashboard/consultant" });
  return (
    <RequireRole roles={["CONSULTANT", "ADMIN"]}>
      <PageShell
      eyebrow="Consultant portal"
      title="Move property-management requests forward with clarity."
      description="Prioritize leads, schedule inspections, generate quotes, log offers, and keep owners informed from one focused operations surface."
      highlights={[
        { value: "Leads", label: "assigned requests" },
        { value: "SLA", label: "deadline awareness" },
        { value: "Actions", label: "one-click workflow" },
      ]}
      actions={
        <Link
          href="/dashboard/owner"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          Owner view
        </Link>
      }
    >
      <ConsultantDashboard />
    </PageShell>
    </RequireRole>
  );
}
