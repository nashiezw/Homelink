import { Briefcase, Globe2, HeartHandshake, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getMailtoHref } from "@/lib/settings/contact";
import { getRuntimePlatformSettings } from "@/lib/settings/runtime";

const roles = [
  {
    title: "Customer support specialist",
    location: "Harare / remote",
    type: "Full-time",
    body: "Help seekers and landlords get unstuck — verification questions, listing issues, and account access.",
  },
  {
    title: "Property operations associate",
    location: "Harare",
    type: "Full-time",
    body: "Support property management workflows, owner onboarding, and consultant coordination.",
  },
  {
    title: "Frontend engineer",
    location: "Remote (Zimbabwe-friendly)",
    type: "Full-time",
    body: "Build premium marketplace experiences — search, listings, tenancies, and trust tooling.",
  },
];

const perks = [
  { label: "Mission-led work", icon: HeartHandshake },
  { label: "Remote-friendly roles", icon: Globe2 },
  { label: "Growth in proptech", icon: Sparkles },
  { label: "Harare HQ culture", icon: MapPin },
];

export default function CareersPage() {
  const { contact } = getRuntimePlatformSettings();
  return (
    <PageShell
      eyebrow="Careers"
      title="Build the trusted property marketplace Zimbabwe deserves."
      description="HomeLink is growing across search, verification, property management, and tenancy tooling. If you care about trust and great product craft, we want to hear from you."
      highlights={[
        { value: "3", label: "open roles" },
        { value: "Hybrid", label: "work model" },
        { value: "ZW", label: "focused mission" },
      ]}
      actions={
        <Link
          href={getMailtoHref(contact.careersEmail, "HomeLink careers enquiry")}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:w-auto"
        >
          Email {contact.careersEmail}
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {perks.map(({ label, icon: Icon }) => (
          <article key={label} className="premium-card rounded-lg p-5">
            <Icon className="size-6 text-emerald-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-ink dark:text-white">{label}</p>
          </article>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <Briefcase className="size-5 text-emerald-700" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-ink dark:text-white">Open roles</h2>
        </div>
        <div className="mt-4 grid gap-4">
          {roles.map((role) => (
            <article key={role.title} className="premium-card rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-ink dark:text-white">{role.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {role.location} · {role.type}
                  </p>
                </div>
                <Link
                  href={getMailtoHref(contact.careersEmail, `Application: ${role.title}`)}
                  className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Apply
                </Link>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{role.body}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-8 text-sm text-slate-600 dark:text-slate-300">
        Don&apos;t see your role?{" "}
        <Link href="/contact" className="font-semibold text-emerald-700 hover:underline">
          Contact us
        </Link>{" "}
        with your CV and what you&apos;d like to build at HomeLink.
      </p>
    </PageShell>
  );
}
