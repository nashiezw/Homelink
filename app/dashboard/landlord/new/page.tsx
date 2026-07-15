import Link from "next/link";
import { RequireRole } from "@/components/auth/require-role";
import { CreateListingForm } from "@/components/listings/create-listing-form";
import { PageShell } from "@/components/layout/page-shell";
import { requireServerRole } from "@/lib/auth/server-session";

export default async function NewListingPage() {
  await requireServerRole(["LANDLORD", "AGENT", "AGENCY_ADMIN", "ADMIN"], { next: "/dashboard/landlord/new" });
  return (
    <RequireRole roles={["LANDLORD", "AGENT", "AGENCY_ADMIN", "ADMIN"]}>
      <PageShell
      eyebrow="List property"
      title="Create a listing that feels verified, fresh, and easy to trust."
      description="Add rooms, houses, flats, land, and commercial spaces with the local details Zimbabwean seekers actually use to decide."
      highlights={[
        { value: "Photos", label: "build confidence" },
        { value: "Amenities", label: "show essentials" },
        { value: "Trust", label: "reduce friction" },
      ]}
      actions={
        <Link
          href="/dashboard/landlord"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          Back to dashboard
        </Link>
      }
    >
      <section className="mx-auto max-w-3xl">
        <CreateListingForm />
      </section>
    </PageShell>
    </RequireRole>
  );
}
