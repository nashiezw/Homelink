import { BadgeCheck, Building2, Phone, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

const checks = [
  {
    title: "Landlord & agent identity",
    body: "Phone, email, and profile checks help seekers know who they are contacting before they pay or visit.",
    icon: UserCheck,
  },
  {
    title: "Listing freshness",
    body: "Stale, duplicate, and suspicious listings are flagged through automated checks and community reports.",
    icon: ShieldCheck,
  },
  {
    title: "Property signals",
    body: "Verified badges, suburb context, and clear availability help you compare options with confidence.",
    icon: Building2,
  },
  {
    title: "Tenancy records",
    body: "Verified stays through payment or lease on HomeLink build trusted reference history for both parties.",
    icon: BadgeCheck,
  },
];

const steps = [
  "Browse listings with the verified filter enabled.",
  "Check the landlord or agent profile and contact details.",
  "Confirm availability, suburb, and viewing arrangements before paying.",
  "Use in-app messaging and report tools if something looks wrong.",
];

export default function VerificationPage() {
  return (
    <PageShell
      eyebrow="Verification"
      title="How HomeLink verifies people, listings, and tenancies."
      description="Verification is not a badge for decoration — it is how we reduce fake listings, protect seekers, and give serious owners a trusted marketplace."
      highlights={[
        { value: "92%", label: "verified contacts" },
        { value: "24h", label: "freshness reviews" },
        { value: "100%", label: "reportable listings" },
      ]}
      actions={
        <Link
          href="/search?verifiedOnly=true"
          rel="nofollow"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          Browse verified listings
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {checks.map(({ title, body, icon: Icon }) => (
          <article key={title} className="premium-card rounded-lg p-5">
            <span className="flex size-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-semibold text-ink dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
          </article>
        ))}
      </div>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="premium-card rounded-lg p-6">
          <h2 className="text-xl font-semibold text-ink dark:text-white">What to look for as a seeker</h2>
          <ol className="mt-4 grid gap-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <aside className="surface-panel h-fit rounded-lg p-6">
          <Phone className="size-8 text-emerald-700" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-ink dark:text-white">Need help verifying a listing?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Our team can help with identity checks, suspicious listings, and verification questions.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/report-listing"
              className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Report a listing
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
            >
              Contact support
            </Link>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
