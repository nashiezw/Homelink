import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  FileCheck2,
  FileText,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import type { LegalPage } from "@/lib/legal-pages/types";

type LegalPageViewProps = {
  page: LegalPage | null;
  fallbackTitle: string;
};

function splitLegalBody(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [heading, ...lines] = block.split("\n").map((line) => line.trim()).filter(Boolean);
      return {
        heading,
        body: lines.join(" "),
      };
    });
}

const termsPrinciples = [
  { label: "Accurate listings", value: "Truthful prices, photos, availability, and locations" },
  { label: "Safer contact", value: "Respectful enquiries, messages, reports, and support" },
  { label: "Verified signals", value: "Trust badges help decision-making but do not replace checks" },
] as const;

const privacyPrinciples = [
  { label: "Purpose-led data", value: "Collected to operate search, matching, safety, and support" },
  { label: "Controlled visibility", value: "Public profiles and sensitive documents are handled differently" },
  { label: "User choice", value: "Profiles, photos, listings, alerts, and support requests can be managed" },
] as const;

const iconMap: Record<string, LucideIcon> = {
  using: Sparkles,
  account: UserCheck,
  listings: Building2,
  enquiries: MessageCircle,
  verification: BadgeCheck,
  payments: WalletCards,
  property: Building2,
  roommates: UserCheck,
  moderation: ShieldCheck,
  limits: Scale,
  changes: Clock3,
  information: FileText,
  photos: FileCheck2,
  location: MapPin,
  sharing: KeyRound,
  safety: ShieldCheck,
  choices: UserCheck,
  data: LockKeyhole,
  contact: Mail,
};

function sectionIcon(heading: string) {
  const key = Object.keys(iconMap).find((item) => heading.toLowerCase().includes(item));
  return key ? iconMap[key] : FileText;
}

function pageTone(page: LegalPage) {
  if (page.id === "privacy") {
    return {
      eyebrow: "Privacy & data",
      promiseTitle: "Your data should make the platform safer, not noisier.",
      promiseCopy:
        "HouseLink uses information to power matching, search, verification, support, and marketplace safety across Zimbabwe.",
      principles: privacyPrinciples,
      primaryHref: "/contact",
      primaryLabel: "Ask a privacy question",
    };
  }

  return {
    eyebrow: "Terms & trust",
    promiseTitle: "Clear rules for a safer property marketplace.",
    promiseCopy:
      "These terms set expectations for seekers, landlords, agents, roommates, owners, consultants, and admins using HouseLink.",
    principles: termsPrinciples,
    primaryHref: "/safety",
    primaryLabel: "Review safety tips",
  };
}

export function LegalPageView({ page, fallbackTitle }: LegalPageViewProps) {
  if (!page || page.status !== "published") {
    return (
      <PageShell
        eyebrow="Legal"
        title={`${fallbackTitle} is being updated.`}
        description="This page is currently unavailable while the HouseLink team reviews the latest copy."
        highlights={[{ value: "Draft", label: "status" }]}
      >
        <div className="surface-panel rounded-lg p-6">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Please contact HouseLink support if you need the current policy details.
          </p>
          <Link href="/contact" className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:underline">
            Contact policy support
          </Link>
        </div>
      </PageShell>
    );
  }

  const sections = splitLegalBody(page.body);
  const tone = pageTone(page);

  return (
    <PageShell
      eyebrow={tone.eyebrow}
      title={page.title}
      description={page.summary}
      highlights={[
        { value: page.effectiveDate, label: "effective date" },
        { value: page.updatedAt.slice(0, 10), label: "last updated" },
        { value: `${sections.length}`, label: "clear sections" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2 sm:grid sm:w-auto sm:min-w-56 sm:gap-3">
          <Link
            href={tone.primaryHref}
            className="inline-flex min-h-12 items-center justify-between gap-3 rounded-lg bg-white px-5 text-sm font-semibold leading-none text-ink shadow-lg shadow-black/10 transition hover:bg-emerald-50 sm:min-h-11"
          >
            <span>{tone.primaryLabel}</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
          <Link
            href={page.id === "privacy" ? "/terms" : "/privacy"}
            className="inline-flex min-h-12 items-center justify-between gap-3 rounded-lg border border-white/25 bg-white/15 px-5 text-sm font-semibold leading-none text-white backdrop-blur transition hover:bg-white/20 sm:min-h-11"
          >
            <span>{page.id === "privacy" ? "View terms" : "View privacy"}</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="surface-panel overflow-hidden rounded-lg">
            <div className="border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="flex size-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <ShieldCheck className="size-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink dark:text-white">{tone.promiseTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{tone.promiseCopy}</p>
            </div>
            <div className="grid gap-px bg-slate-200 dark:bg-slate-800">
              {tone.principles.map((item) => (
                <div key={item.label} className="bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="text-sm font-semibold text-ink dark:text-white">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <nav className="surface-panel rounded-lg p-4" aria-label={`${page.title} sections`}>
            <p className="px-2 text-xs font-bold uppercase tracking-wide text-slate-400">On this page</p>
            <div className="mt-3 grid gap-1">
              {sections.map((section, index) => (
                <a
                  key={section.heading}
                  href={`#legal-${index + 1}`}
                  className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-200"
                >
                  {section.heading}
                </a>
              ))}
            </div>
          </nav>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Need help with this page?</p>
            <p className="mt-2 text-sm leading-6 text-emerald-900/75 dark:text-emerald-100/75">
              Contact HouseLink support for safety reports, data questions, takedown requests, or account help.
            </p>
            <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-200">
              Contact legal support
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>

        <div className="space-y-5">
          {sections.map((section, index) => {
            const Icon = sectionIcon(section.heading);
            return (
              <article
                key={section.heading}
                id={`legal-${index + 1}`}
                className="premium-card scroll-mt-28 rounded-lg p-5 sm:p-6"
              >
                <div className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-emerald-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-emerald-300 dark:ring-slate-800">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-lg font-semibold tracking-tight text-ink dark:text-white">{section.heading}</h2>
                    </div>
                    {section.body ? (
                      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{section.body}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-3">
              {[
                { label: "Marketplace", value: "Listings, agents, rooms, and property management" },
                { label: "Trust", value: "Verification, reports, moderation, and safety reviews" },
                { label: "Support", value: "Questions handled through HouseLink support" },
              ].map((item) => (
                <div key={item.label} className="bg-white p-5 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-ink dark:text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
