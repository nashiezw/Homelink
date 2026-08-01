"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LibraryDigitalUpsellSuggestion } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

export function LibraryUpsellRail({
  title,
  description,
  suggestions,
  mode = "add",
  busyId,
  onAddDigital,
  className,
}: {
  title: string;
  description?: string;
  suggestions: LibraryDigitalUpsellSuggestion[];
  mode?: "add" | "link";
  busyId?: string | null;
  onAddDigital?: (suggestion: LibraryDigitalUpsellSuggestion) => void;
  className?: string;
}) {
  if (!suggestions.length) return null;

  return (
    <section className={cn("surface-panel rounded-lg p-5", className)}>
      <h2 className="text-lg font-semibold text-ink dark:text-white">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-4 grid gap-3">
        {suggestions.map((item) => (
          <div
            key={item.productId}
            className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
          >
            <div className="flex gap-3">
              {item.coverUrl ? (
                <Link href={`/library/${item.slug}`} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                  <Image src={item.coverUrl} alt="" fill className="object-cover" sizes="64px" />
                </Link>
              ) : (
                <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Soft copy
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  {item.formatLabel}
                  {item.reason === "BUNDLE" ? " · Completes your set" : " · Same series"}
                </p>
                <Link
                  href={`/library/${item.slug}`}
                  className="mt-1 block font-semibold text-ink hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  {item.author ? `${item.author} · ` : ""}
                  Pairs with {item.sourceTitle}
                </p>
                {item.why ? (
                  <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.why}</p>
                ) : null}
                {item.shortDescription && item.shortDescription !== item.why ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.shortDescription}</p>
                ) : null}
                {item.promoLabel ? (
                  <p className="mt-2 inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    {item.promoLabel}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm font-semibold tabular-nums">
                    {item.currency} {item.price.toFixed(2)}
                    <span className="ml-1 text-xs font-medium text-slate-500">soft copy</span>
                  </p>
                  {item.reviewCount && item.reviewCount > 0 ? (
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {item.rating?.toFixed(1) ?? "—"} · {item.reviewCount} review{item.reviewCount === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              {mode === "add" && onAddDigital ? (
                <Button
                  disabled={busyId === item.productId}
                  onClick={() => onAddDigital(item)}
                  className="shrink-0"
                >
                  <ShoppingCart className="size-4" />
                  {busyId === item.productId
                    ? "Adding…"
                    : item.completesBundle && item.promoSavings
                      ? `Add digital · unlock save ${item.currency} ${item.promoSavings.toFixed(2)}`
                      : item.promoSavings
                        ? "Add digital toward set deal"
                        : "Add digital"}
                </Button>
              ) : (
                <Link
                  href={`/library/${item.slug}`}
                  className="inline-flex shrink-0 items-center rounded-lg border border-emerald-600/30 bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  {item.promoLabel ? "View deal" : "View book"}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
