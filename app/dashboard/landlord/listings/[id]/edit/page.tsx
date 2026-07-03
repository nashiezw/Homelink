import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { EditListingForm } from "@/components/listings/edit-listing-form";

export default function EditListingPage() {
  return (
    <PageShell
      eyebrow="Listing studio"
      title="Refine the details, media, and trust signals that make this listing perform."
      description="Keep photos, availability, amenities, and location context current so serious seekers know the listing is worth contacting."
      highlights={[
        { value: "Fresh", label: "updated listings convert" },
        { value: "Clear", label: "media reduces doubt" },
        { value: "Local", label: "amenities matter" },
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
        <EditListingForm />
      </section>
    </PageShell>
  );
}
