"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  LibraryDigitalUpsellPack,
  LibraryDigitalUpsellSuggestion,
} from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

function CoverThumb({
  coverUrl,
  href,
  size = "md",
}: {
  coverUrl?: string;
  href: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "size-11" : "size-14";
  if (coverUrl) {
    return (
      <Link href={href} className={cn("relative shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-900", box)}>
        <Image src={coverUrl} alt="" fill className="object-cover" sizes="56px" />
      </Link>
    );
  }
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-md bg-emerald-50 text-[0.6rem] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        box,
      )}
    >
      PDF
    </div>
  );
}

/** Compact single-title rows for confirmation / My Library. */
function LibraryUpsellList({
  suggestions,
  mode,
  busyId,
  onAddDigital,
}: {
  suggestions: LibraryDigitalUpsellSuggestion[];
  mode: "add" | "link";
  busyId?: string | null;
  onAddDigital?: (suggestion: LibraryDigitalUpsellSuggestion) => void;
}) {
  return (
    <div className="mt-4 grid min-w-0 gap-2">
      {suggestions.map((item) => (
        <div
          key={item.productId}
          className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800"
        >
          <CoverThumb coverUrl={item.coverUrl} href={`/library/${item.slug}`} size="sm" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/library/${item.slug}`}
              className="block truncate text-sm font-semibold text-ink hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
            >
              {item.title}
            </Link>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {item.currency} {item.price.toFixed(2)} soft copy
              {item.reviewCount && item.reviewCount > 0 ? (
                <span className="ml-2 inline-flex items-center gap-0.5 font-semibold">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {item.rating?.toFixed(1)}
                </span>
              ) : null}
            </p>
          </div>
          {mode === "add" && onAddDigital ? (
            <Button
              disabled={busyId === item.productId}
              onClick={() => onAddDigital(item)}
              className="min-h-9 shrink-0 px-2.5 py-1.5 text-xs"
            >
              <ShoppingCart className="size-3.5" />
              {busyId === item.productId ? "Adding…" : "Add"}
            </Button>
          ) : (
            <Link
              href={`/library/${item.slug}`}
              className="inline-flex shrink-0 items-center rounded-lg border border-emerald-600/30 bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              View
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

/** One pack block: all missing titles + one Add set CTA. */
function LibraryUpsellPackBlock({
  pack,
  busy,
  onAddSet,
}: {
  pack: LibraryDigitalUpsellPack;
  busy?: boolean;
  onAddSet?: (pack: LibraryDigitalUpsellPack) => void;
}) {
  const ctaMobile =
    pack.completesBundle && pack.promoSavings
      ? `Add set · save ${pack.currency} ${pack.promoSavings.toFixed(2)}`
      : `Add set · ${pack.currency} ${pack.listSubtotal.toFixed(2)}`;
  const ctaDesktop =
    pack.completesBundle && pack.promoSavings
      ? `Add set · unlock save ${pack.currency} ${pack.promoSavings.toFixed(2)}`
      : pack.promoSavings
        ? `Add set toward deal · ${pack.currency} ${pack.listSubtotal.toFixed(2)}`
        : `Add set · ${pack.currency} ${pack.listSubtotal.toFixed(2)}`;

  return (
    <div className="mt-4 min-w-0 max-w-full rounded-xl border border-slate-200 p-3 sm:p-4 dark:border-slate-800">
      {pack.promoLabel ? (
        <p className="max-w-full break-words rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold leading-5 text-emerald-800 dark:text-emerald-200">
          {pack.promoLabel}
        </p>
      ) : (
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Soft-copy set · {pack.itemCount} title{pack.itemCount === 1 ? "" : "s"}
        </p>
      )}
      <p className="mt-2 break-words text-sm leading-5 text-slate-600 dark:text-slate-300">{pack.why}</p>

      <ul className="mt-3 min-w-0 divide-y divide-slate-100 dark:divide-slate-800">
        {pack.items.map((item) => (
          <li key={item.productId} className="flex min-w-0 items-center gap-2.5 py-2.5 first:pt-0 last:pb-0 sm:gap-3">
            <CoverThumb coverUrl={item.coverUrl} href={`/library/${item.slug}`} size="sm" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/library/${item.slug}`}
                className="block truncate text-sm font-semibold text-ink hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
              >
                {item.title}
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">{item.formatLabel}</p>
            </div>
            <p className="shrink-0 text-xs font-semibold tabular-nums sm:text-sm">
              {item.currency} {item.price.toFixed(2)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid min-w-0 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="min-w-0">
          <p className="text-sm font-semibold tabular-nums">
            Soft-copy total{" "}
            <span className="text-ink dark:text-white">
              {pack.currency} {pack.listSubtotal.toFixed(2)}
            </span>
          </p>
          {pack.promoSavings ? (
            <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Save {pack.currency} {pack.promoSavings.toFixed(2)} on the set
            </p>
          ) : null}
        </div>
        {onAddSet ? (
          <Button disabled={busy} onClick={() => onAddSet(pack)} className="w-full max-w-full sm:w-auto sm:justify-self-end">
            <ShoppingCart className="size-4 shrink-0" />
            <span className="min-w-0 text-center sm:hidden">{busy ? "Adding set…" : ctaMobile}</span>
            <span className="hidden min-w-0 text-center sm:inline">{busy ? "Adding set…" : ctaDesktop}</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function LibraryUpsellRail({
  title,
  description,
  suggestions,
  pack,
  mode = "add",
  busyId,
  busy,
  onAddDigital,
  onAddSet,
  className,
}: {
  title: string;
  description?: string;
  suggestions?: LibraryDigitalUpsellSuggestion[];
  /** When set, renders one compact pack with a single Add set button (checkout). */
  pack?: LibraryDigitalUpsellPack | null;
  mode?: "add" | "link";
  busyId?: string | null;
  busy?: boolean;
  onAddDigital?: (suggestion: LibraryDigitalUpsellSuggestion) => void;
  onAddSet?: (pack: LibraryDigitalUpsellPack) => void;
  className?: string;
}) {
  const list = suggestions ?? [];
  if (pack?.items?.length) {
    return (
      <section className={cn("surface-panel min-w-0 max-w-full rounded-lg p-4 sm:p-5", className)}>
        <h2 className="text-lg font-semibold text-ink dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-1 break-words text-sm leading-5 text-slate-500">{description}</p>
        ) : null}
        <LibraryUpsellPackBlock pack={pack} busy={busy} onAddSet={onAddSet} />
      </section>
    );
  }
  if (!list.length) return null;

  return (
    <section className={cn("surface-panel min-w-0 max-w-full rounded-lg p-4 sm:p-5", className)}>
      <h2 className="text-lg font-semibold text-ink dark:text-white">{title}</h2>
      {description ? (
        <p className="mt-1 break-words text-sm leading-5 text-slate-500">{description}</p>
      ) : null}
      <LibraryUpsellList
        suggestions={list}
        mode={mode}
        busyId={busyId}
        onAddDigital={onAddDigital}
      />
    </section>
  );
}
