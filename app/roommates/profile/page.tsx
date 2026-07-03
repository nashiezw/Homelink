import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { RoommateProfileEditor } from "@/components/roommates/roommate-profile-editor";

export default function RoommateProfilePage() {
  return (
    <PageShell
      eyebrow="Roommates"
      title="Shape a profile that helps the right people choose you."
      description="Edit preferences, upload photos, and control how you appear to potential roommates before anyone shares a home."
      highlights={[
        { value: "Lifestyle", label: "matched preferences" },
        { value: "Budget", label: "clear expectations" },
        { value: "Photos", label: "stronger trust" },
      ]}
      actions={
        <Link
          href="/roommates"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          Back to roommates
        </Link>
      }
    >
      <section className="mx-auto max-w-5xl">
        <RoommateProfileEditor />
      </section>
    </PageShell>
  );
}
