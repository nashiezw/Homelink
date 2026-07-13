import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Palette,
  Star,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import type { CmsAgentPromo } from "@/lib/homepage/cms-types";

const PERKS: Array<{ title: string; icon: LucideIcon }> = [
  { title: "Lead generation", icon: Megaphone },
  { title: "Commission tracking", icon: Wallet },
  { title: "Agent technology", icon: BarChart3 },
  { title: "Training & compliance", icon: GraduationCap },
  { title: "Professional branding", icon: Palette },
  { title: "Agent dashboard", icon: LayoutDashboard },
  { title: "Verified badge", icon: BadgeCheck },
];

function AgentPreviewPanel() {
  return (
    <div className="relative flex flex-col gap-3">
      <div className="pointer-events-none absolute -right-6 top-0 size-32 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="relative rounded-xl border border-white/12 bg-white/[0.08] p-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative size-10 overflow-hidden rounded-lg shadow-lg ring-2 ring-emerald-300/40">
              <Image
                src="/images/roommates/portrait-blessing.jpg"
                alt="Blessing Muzenda"
                fill
                className="object-cover"
                sizes="40px"
              />
            </span>
            <div>
              <p className="font-semibold text-white">Blessing Muzenda</p>
              <p className="text-xs text-emerald-200/90">Gold agent · Harare</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">
            <BadgeCheck className="size-3" />
            Verified
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1 text-amber-300">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-current" />
          ))}
          <span className="ml-1 text-xs text-slate-300">4.9 · 48 reviews</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-md">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">This month</p>
          <p className="mt-1 text-xl font-semibold text-white">$1,240</p>
          <p className="text-xs text-emerald-200/80">Commission</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-md">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Active</p>
          <p className="mt-1 text-xl font-semibold text-white">12</p>
          <p className="text-xs text-emerald-200/80">Leads</p>
        </div>
      </div>
    </div>
  );
}

type BecomeAgentPromoProps = {
  content: CmsAgentPromo;
};

export function BecomeAgentPromo({ content }: BecomeAgentPromoProps) {
  if (!content.enabled) return null;

  return (
    <FadeIn>
      <section aria-label="Become a HomeLink agent" className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="gpu-card mx-auto max-w-7xl rounded-2xl border border-slate-200/80 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-9">
              <p className="section-eyebrow">{content.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-ink dark:text-white sm:text-3xl">
                {content.title}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{content.description}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {PERKS.map(({ title, icon: Icon }) => (
                  <li
                    key={title}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                  >
                    <Icon className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    {title}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={content.primaryCta.href}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                >
                  {content.primaryCta.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href={content.secondaryCta.href}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-100"
                >
                  {content.secondaryCta.label}
                </Link>
              </div>
            </div>
            <div className="relative flex flex-col justify-center bg-ink p-6 sm:p-8 lg:border-l lg:border-white/10 lg:p-9">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(16,185,129,0.2),transparent_50%),radial-gradient(circle_at_15%_85%,rgba(14,165,233,0.1),transparent_45%)]" />
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/80">Agent dashboard preview</p>
                <p className="mt-0.5 text-xs text-slate-400">Leads, commissions, and reputation in one place.</p>
                <div className="mt-5">
                  <AgentPreviewPanel />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
