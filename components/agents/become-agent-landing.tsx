"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Users, title: "Qualified buyer leads", body: "Receive matched buyer and tenant enquiries automatically." },
  { icon: Wallet, title: "Attractive commissions", body: "Transparent splits with downloadable statements." },
  { icon: Briefcase, title: "Manage your listings", body: "Create, edit, and promote properties from one dashboard." },
  { icon: ShieldCheck, title: "Verified HomeLink badge", body: "Stand out with trusted branding and a public profile." },
  { icon: BarChart3, title: "Analytics dashboard", body: "Track leads, conversions, revenue, and performance." },
  { icon: GraduationCap, title: "Ongoing training", body: "Videos, documents, quizzes, and certification." },
  { icon: MapPin, title: "Nationwide exposure", body: "Reach seekers across Zimbabwe with territory-based leads." },
  { icon: Star, title: "Customer ratings", body: "Build reputation with verified client reviews." },
];

const steps = [
  "Apply Online",
  "Verification",
  "Training",
  "Approval",
  "Receive Leads",
  "Earn Commission",
];

export function BecomeAgentLanding() {
  return (
    <PageShell
      eyebrow="Become an Agent"
      title="Become a HomeLink Agent"
      description="Join Zimbabwe's trusted property platform and grow your real estate career with powerful technology, verified branding, quality leads, and attractive commissions."
      highlights={[
        { value: "500+", label: "Active agents" },
        { value: "18k+", label: "Listings" },
        { value: "92%", label: "Verified contacts" },
        { value: "24h", label: "Lead response SLA" },
      ]}
      actions={
        <div className="flex w-full flex-col gap-3 sm:w-auto">
          <Link href="/become-agent/apply">
            <Button className="h-12 w-full px-6 text-base sm:w-auto">Start application</Button>
          </Link>
          <Link href="/agents/blessing-muzenda">
            <Button variant="secondary" className="h-12 w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
              View agent profile
            </Button>
          </Link>
        </div>
      }
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Why HomeLink</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink dark:text-white sm:text-3xl">
          Everything you need to grow a modern real estate business.
        </h2>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          From verified branding to lead distribution, commissions, contracts, and analytics — HomeLink gives agents
          enterprise-grade tools.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map(({ icon: Icon, title, body }) => (
          <article key={title} className="premium-card rounded-xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold text-ink dark:text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
          </article>
        ))}
      </div>

      <section className="mt-14">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-700" />
          <h2 className="text-2xl font-semibold text-ink dark:text-white">How it works</h2>
        </div>
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-0">
          {steps.map((step, index) => (
            <div key={step} className="flex flex-1 items-center gap-3">
              <div className="premium-card flex min-h-[88px] flex-1 flex-col justify-center rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Step {index + 1}</p>
                <p className="mt-1 font-semibold text-ink dark:text-white">{step}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="hidden size-5 shrink-0 text-slate-400 lg:block" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-2xl bg-gradient-to-br from-emerald-700 to-ocean p-8 text-white shadow-soft lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold">Ready to represent HomeLink?</h2>
            <p className="mt-3 max-w-xl text-emerald-50">
              Complete the online application, upload your documents, and track your approval status from your agent dashboard.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-emerald-50">
              {["Digital application", "Document verification", "Training & certification", "Lead assignment"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/become-agent/apply" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 font-semibold text-ink hover:bg-emerald-50">
              Apply now
              <TrendingUp className="ml-2 size-4" />
            </Link>
            <p className="text-center text-xs text-emerald-100">
              Already an agent?{" "}
              <Link href="/dashboard/agent" className="font-semibold underline">
                Open dashboard
              </Link>
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
