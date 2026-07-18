import { AlertTriangle, BadgeCheck, Eye, LockKeyhole, MessageCircleWarning, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

const safetyCards = [
  {
    title: "Verify before paying",
    body: "Confirm the listing, contact details, viewing arrangement, and identity before sending money.",
    icon: BadgeCheck,
  },
  {
    title: "Watch for pressure",
    body: "Be careful with rushed deposits, vague addresses, copied photos, and refusal to share proof.",
    icon: AlertTriangle,
  },
  {
    title: "Use trusted channels",
    body: "Keep enquiries, messages, and property-management requests inside traceable HouseLink workflows where possible.",
    icon: LockKeyhole,
  },
  {
    title: "Report suspicious listings",
    body: "Duplicate, stale, fake, or abusive listings should be reported so the marketplace can respond.",
    icon: MessageCircleWarning,
  },
];

const checklist = [
  "View the property or use a trusted representative.",
  "Confirm the landlord, agent, or consultant identity.",
  "Check listing freshness, photos, price, suburb, and availability.",
  "Avoid cash transfers without a clear written agreement.",
  "Save messages and receipts for reference.",
  "Use HouseLink support for suspicious or unsafe interactions.",
];

export default function SafetyPage() {
  return (
    <PageShell
      eyebrow="Safety centre"
      title="Move with confidence, not pressure."
      description="HouseLink is designed around verified listings, safer contact, reporting loops, and practical checks that help seekers and owners avoid bad property experiences."
      highlights={[
        { value: "Verify", label: "identity and property" },
        { value: "Report", label: "fake or stale listings" },
        { value: "Protect", label: "money and documents" },
      ]}
      actions={
        <Link
          href="/contact"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          Contact safety support
        </Link>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {safetyCards.map(({ title, body, icon: Icon }) => (
          <article key={title} className="premium-card rounded-lg p-5">
            <span className="flex size-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-semibold text-ink dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
          </article>
        ))}
      </div>

      <section className="mt-10 grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-gradient-to-br from-ink via-ocean to-emerald-900 p-6 text-white lg:p-8">
          <ShieldCheck className="size-9 text-emerald-200" aria-hidden="true" />
          <h2 className="mt-4 text-3xl font-semibold leading-tight">Safety checklist before you commit.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The best property decision has three things: a real place, a verified person, and a clear paper trail.
          </p>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:p-8">
          {checklist.map((item) => (
            <div key={item} className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <Eye className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
