import Link from "next/link";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { OwnerPortal } from "@/components/property-management/owner-portal";
import { requireServerRole } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  await requireServerRole([], { anySignedIn: true, next: "/dashboard/owner" });
  return (
    <RequireRole roles={[]} anySignedIn>
      <PageShell
      eyebrow="Owner portal"
      title="Track property management from request to result."
      description="See requests, inspections, documents, invoices, offers, and consultant activity in one polished owner workspace."
      highlights={[
        { value: "Live", label: "request status" },
        { value: "Docs", label: "owner uploads" },
        { value: "Offers", label: "tracked decisions" },
      ]}
      actions={
        <Link
          href="/property-management"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          Property management
        </Link>
      }
    >
      <OwnerPortal />
    </PageShell>
    </RequireRole>
  );
}
