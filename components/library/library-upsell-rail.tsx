"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
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
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
          >
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
                From {item.sourceTitle}
              </p>
              <p className="mt-2 text-sm font-semibold tabular-nums">
                {item.currency} {item.price.toFixed(2)}
              </p>
            </div>
            {mode === "add" && onAddDigital ? (
              <Button
                variant="secondary"
                disabled={busyId === item.productId}
                onClick={() => onAddDigital(item)}
                className="shrink-0"
              >
                <ShoppingCart className="size-4" />
                {busyId === item.productId ? "Adding…" : "Add digital"}
              </Button>
            ) : (
              <Link
                href={`/library/${item.slug}`}
                className="inline-flex shrink-0 items-center rounded-lg border border-emerald-600/30 bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                View book
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
