import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
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

export function LegalPageView({ page, fallbackTitle }: LegalPageViewProps) {
  if (!page || page.status !== "published") {
    return (
      <PageShell
        eyebrow="Legal"
        title={`${fallbackTitle} is being updated.`}
        description="This page is currently unavailable while the HomeLink team reviews the latest copy."
        highlights={[{ value: "Draft", label: "status" }]}
      >
        <div className="surface-panel rounded-lg p-6">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Please contact HomeLink support if you need the current policy details.
          </p>
          <Link href="/contact" className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:underline">
            Contact support
          </Link>
        </div>
      </PageShell>
    );
  }

  const sections = splitLegalBody(page.body);

  return (
    <PageShell
      eyebrow="Legal"
      title={page.title}
      description={page.summary}
      highlights={[
        { value: page.effectiveDate, label: "effective date" },
        { value: page.updatedAt.slice(0, 10), label: "last updated" },
        { value: String(sections.length), label: "sections" },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="surface-panel h-fit rounded-lg p-6">
          <span className="flex size-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-ink dark:text-white">Plain-language summary</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{page.summary}</p>
          <Link href="/contact" className="mt-5 inline-flex text-sm font-semibold text-emerald-700 hover:underline">
            Questions about this page
          </Link>
        </aside>

        <div className="grid gap-4">
          {sections.map((section) => (
            <article key={section.heading} className="premium-card rounded-lg p-5">
              <div className="flex gap-3">
                <FileText className="mt-1 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-ink dark:text-white">{section.heading}</h2>
                  {section.body ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{section.body}</p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
