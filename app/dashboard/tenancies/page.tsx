import Link from "next/link";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { TenanciesDashboard } from "@/components/tenancies/tenancies-dashboard";
import { requireServerRole } from "@/lib/auth/server-session";

export default async function TenanciesPage() {
  await requireServerRole([], { anySignedIn: true, next: "/dashboard/tenancies" });
  return (
    <RequireRole roles={[]} anySignedIn>
      <PageShell
      eyebrow="Stay history"
      title="Tenancies and verified records that travel with you."
      description="Confirm stays, share addresses safely, leave references, and dispute incorrect records without losing control of your history."
      highlights={[
        { value: "Confirm", label: "verified stays" },
        { value: "Share", label: "address consent" },
        { value: "Resolve", label: "disputes" },
      ]}
      actions={
        <Link
          href="/roommates/profile"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          Roommate profile
        </Link>
      }
    >
      <section className="mx-auto max-w-4xl">
        <TenanciesDashboard />
      </section>
    </PageShell>
    </RequireRole>
  );
}
