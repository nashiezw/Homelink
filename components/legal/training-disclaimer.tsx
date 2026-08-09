import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import {
  ACADEMY_REGULATORY_DISCLAIMER,
  ACADEMY_TRAINING_DISCLAIMER,
  ACADEMY_TRAINING_DISCLAIMER_TITLE,
} from "@/lib/legal/disclaimers";
import { cn } from "@/lib/utils";

export function TrainingDisclaimer({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <section className={cn("rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-100", className)}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800">
            <BadgeCheck className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">HouseLink-issued training credential</p>
            <p className="mt-1 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">
              Complete the programme to earn a client-verifiable HouseLink Academy certificate. It confirms HouseLink training completion and is separate from any statutory licence or regulatory approval.
            </p>
            <Link href="/legal-disclaimer" className="mt-2 inline-flex text-sm font-bold text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-100">
              View credential details
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100", className)}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{ACADEMY_TRAINING_DISCLAIMER_TITLE}</p>
          <p className="mt-1 text-sm leading-6">{ACADEMY_TRAINING_DISCLAIMER}</p>
          <p className="mt-2 text-sm leading-6">{ACADEMY_REGULATORY_DISCLAIMER}</p>
          <Link href="/legal-disclaimer" className="mt-2 inline-flex text-sm font-bold underline-offset-2 hover:underline">
            Read the full legal disclaimer
          </Link>
        </div>
      </div>
    </section>
  );
}
