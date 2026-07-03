import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import type { CmsBanner } from "@/lib/homepage/cms-types";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<CmsBanner["tone"], string> = {
  emerald: "border-emerald-200/80 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  slate: "border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60",
  amber: "border-amber-200/80 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
};

type HomeBannerStripProps = {
  banners: CmsBanner[];
  placement: CmsBanner["placement"];
};

export function HomeBannerStrip({ banners, placement }: HomeBannerStripProps) {
  const items = banners.filter((b) => b.placement === placement);
  if (!items.length) return null;

  return (
    <FadeIn>
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          {items.map((banner) => (
            <div
              key={banner.id}
              className={cn(
                "flex flex-col items-start justify-between gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center",
                TONE_CLASS[banner.tone],
              )}
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{banner.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{banner.description}</p>
              </div>
              <Link
                href={banner.href}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                {banner.ctaLabel}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}
