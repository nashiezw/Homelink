import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import {
  ACADEMY_REGULATORY_DISCLAIMER,
  ACADEMY_TRAINING_DISCLAIMER,
  ACADEMY_TRAINING_DISCLAIMER_TITLE,
  MARKETPLACE_DISCLAIMER,
} from "@/lib/legal/disclaimers";

export const metadata: Metadata = {
  title: "Legal Disclaimer | HouseLink Zimbabwe",
  description: "Legal disclaimer for HouseLink Zimbabwe marketplace services and HouseLink Zimbabwe Academy training certificates.",
  alternates: { canonical: "/legal-disclaimer" },
};

export default function LegalDisclaimerPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Legal Disclaimer"
      description="Important distinctions about HouseLink's marketplace services, Academy training programmes, and third-party regulated professional requirements."
      compactHero
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="space-y-5">
          <LegalSection title={ACADEMY_TRAINING_DISCLAIMER_TITLE}>
            <p>{ACADEMY_TRAINING_DISCLAIMER}</p>
            <p>{ACADEMY_REGULATORY_DISCLAIMER}</p>
            <p>
              HouseLink's training programmes are intended to provide practical education, skills development and knowledge relevant to the property industry and to HouseLink's own platform, systems and operational standards.
            </p>
          </LegalSection>

          <LegalSection title="Marketplace & Property Services Disclaimer">
            <p>{MARKETPLACE_DISCLAIMER}</p>
            <p>
              Property users remain responsible for carrying out their own checks, obtaining appropriate professional advice, confirming legal ownership or authority, reviewing documents, and complying with applicable laws, regulations, by-laws and professional requirements.
            </p>
            <p>
              HouseLink may provide platform tools, listing visibility, training materials, communication channels, verification prompts, payment proof workflows, or operational support, but these do not replace advice or approval from qualified and authorised professionals or public bodies.
            </p>
          </LegalSection>

          <LegalSection title="Relationship With Terms">
            <p>
              This disclaimer forms part of the wider HouseLink website terms and should be read together with the{" "}
              <Link href="/terms" className="font-bold text-emerald-700 underline-offset-2 hover:underline">Terms of Service</Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-bold text-emerald-700 underline-offset-2 hover:underline">Privacy Policy</Link>.
            </p>
          </LegalSection>
        </article>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <p className="font-bold text-slate-950 dark:text-white">Plain-language summary</p>
          <ul className="mt-3 space-y-2">
            <li>HouseLink Academy certificates are internal training credentials.</li>
            <li>They are not statutory licences or regulatory approvals.</li>
            <li>Property transactions may require registered professionals or public authorities.</li>
            <li>Users remain responsible for legal and regulatory compliance.</li>
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}
