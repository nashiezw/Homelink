import Link from "next/link";
import { ArrowRight, BookOpen, Home, KeyRound, ShieldCheck } from "lucide-react";

const resources = [
  {
    title: "Renting in Zimbabwe",
    href: "/blog/category/renting-in-zimbabwe",
    icon: KeyRound,
    body: "Rental costs, viewing checks, lease questions, and moving decisions.",
  },
  {
    title: "Landlord advice",
    href: "/blog/category/landlord-advice",
    icon: Home,
    body: "Listing quality, tenant screening, rent collection, and property care.",
  },
  {
    title: "Property safety",
    href: "/blog/category/tenant-advice",
    icon: ShieldCheck,
    body: "Spot fake listings, verify contacts, and avoid rushed payments.",
  },
];

export function ResourceCentreSection() {
  return (
    <section className="bg-white px-4 py-14 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <div>
          <p className="section-eyebrow">HouseLink Property Blog</p>
          <h2 className="section-title">Property advice built for Zimbabwe</h2>
          <p className="section-copy mt-4 max-w-2xl">
            Practical guides for renting, buying, selling, safety, property management, and agent growth, written for the decisions people actually face here.
          </p>
          <Link href="/blog" className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 sm:w-auto">
            Visit Property Blog
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {resources.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900/80"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900/50">
                  <Icon className="size-5" />
                </span>
                <p className="mt-5 font-semibold text-ink dark:text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>
              </Link>
            );
          })}
          <Link href="/blog" className="group rounded-xl bg-ink p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:col-span-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex size-11 items-center justify-center rounded-lg bg-white/10 text-emerald-300 ring-1 ring-white/10">
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">More HouseLink property guides</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">Market explainers, templates, safety notes, and practical next steps for property decisions.</p>
              </div>
              <ArrowRight className="hidden size-5 shrink-0 text-emerald-300 transition group-hover:translate-x-1 sm:block" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
