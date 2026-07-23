import Link from "next/link";
import { ArrowRight, BookOpen, Home, KeyRound, ShieldCheck } from "lucide-react";

const resources = [
  { title: "Renting in Zimbabwe", href: "/blog/category/renting-in-zimbabwe", icon: KeyRound },
  { title: "Landlord advice", href: "/blog/category/landlord-advice", icon: Home },
  { title: "Property safety", href: "/blog/category/tenant-advice", icon: ShieldCheck },
];

export function ResourceCentreSection() {
  return (
    <section className="bg-white px-4 py-14 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="section-eyebrow">Property Resource Centre</p>
          <h2 className="section-title">Zimbabwe-focused property knowledge, not generic advice.</h2>
          <p className="section-copy mt-4 max-w-2xl">
            Read practical HouseLink guides for renting, buying, selling, listing, moving, safety checks, property management, and agent growth.
          </p>
          <Link href="/blog" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
            Visit Resource Centre
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {resources.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="rounded-lg border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-emerald-950/30">
                <Icon className="size-6 text-emerald-700 dark:text-emerald-300" />
                <p className="mt-4 font-semibold text-ink dark:text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Guides, checklists, and next steps.</p>
              </Link>
            );
          })}
          <Link href="/blog" className="rounded-lg bg-ink p-5 text-white transition hover:bg-slate-800 sm:col-span-3">
            <BookOpen className="size-6 text-emerald-300" />
            <p className="mt-4 font-semibold">Advice, news, templates, and future moving resources.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
