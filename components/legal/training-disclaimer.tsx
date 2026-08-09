import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import {
  ACADEMY_REGULATORY_DISCLAIMER,
  ACADEMY_TRAINING_DISCLAIMER,
  ACADEMY_TRAINING_DISCLAIMER_TITLE,
} from "@/lib/legal/disclaimers";
import { cn } from "@/lib/utils";

export function TrainingDisclaimer({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100", className)}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{ACADEMY_TRAINING_DISCLAIMER_TITLE}</p>
          <p className="mt-1 text-sm leading-6">{ACADEMY_TRAINING_DISCLAIMER}</p>
          {!compact && <p className="mt-2 text-sm leading-6">{ACADEMY_REGULATORY_DISCLAIMER}</p>}
          <Link href="/legal-disclaimer" className="mt-2 inline-flex text-sm font-bold underline-offset-2 hover:underline">
            Read the full legal disclaimer
          </Link>
        </div>
      </div>
    </section>
  );
}
