import { FileText, Scale, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

const terms = [
  {
    title: "Use accurate information",
    body: "Listings, user profiles, documents, prices, availability, photos, and contact details must be truthful and current.",
    icon: FileText,
  },
  {
    title: "Respect other users",
    body: "Harassment, discrimination, scams, impersonation, and abusive messages can lead to restricted access or removal.",
    icon: UserCheck,
  },
  {
    title: "Follow housing laws",
    body: "Landlords, agents, property managers, and seekers remain responsible for local rental, sale, and consumer rules.",
    icon: Scale,
  },
  {
    title: "Protect marketplace trust",
    body: "HomeLink may review, flag, remove, or limit content that appears unsafe, duplicate, fraudulent, or misleading.",
    icon: ShieldCheck,
  },
];

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Terms"
      title="Clear rules for a safer property marketplace."
      description="These terms keep HomeLink useful, honest, and safe for seekers, landlords, agents, roommates, consultants, and property owners."
      highlights={[
        { value: "June 2026", label: "last updated" },
        { value: "4", label: "core standards" },
        { value: "1", label: "trusted marketplace" },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="surface-panel h-fit rounded-lg p-6">
          <p className="text-sm font-semibold uppercase text-emerald-700 dark:text-emerald-300">
            Plain-language summary
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-ink dark:text-white">
            Be honest, be lawful, and use HomeLink to help people make confident property decisions.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Property management services may also require separate signed agreements between owners and
            assigned consultants. Fees and responsibilities are disclosed before engagement.
          </p>
          <Link href="/contact" className="mt-5 inline-flex text-sm font-semibold text-emerald-700 hover:underline">
            Questions about the terms
          </Link>
        </aside>

        <div className="grid gap-4 sm:grid-cols-2">
          {terms.map(({ title, body, icon: Icon }) => (
            <article key={title} className="premium-card rounded-lg p-5">
              <span className="flex size-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-semibold text-ink dark:text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </div>

      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-ink dark:text-white">Additional platform terms</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 dark:text-slate-300 md:grid-cols-3">
          <p>Landlords are responsible for the accuracy of listings and availability.</p>
          <p>HomeLink may remove fraudulent, discriminatory, unsafe, or duplicate content.</p>
          <p>Users should verify listings, payment instructions, and counterparties before transacting.</p>
        </div>
      </section>
    </PageShell>
  );
}
