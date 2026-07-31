"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart, Star } from "lucide-react";
import { BookCover } from "@/components/library/book-cover";
import { Button } from "@/components/ui/button";
import {
  libraryDiscountPercent,
  libraryFormatsLabel,
  libraryPriceDisplay,
  type LibraryProduct,
} from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

function productCardBlurb(product: LibraryProduct) {
  const raw = (product.shortDescription || product.description || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= 160) return raw;
  return `${raw.slice(0, 157).trimEnd()}…`;
}

export function LibraryPriceBits({
  currency,
  price,
  compareAtPrice,
  from = false,
  align = "left",
  size = "md",
}: {
  currency: string;
  price: number;
  compareAtPrice?: number;
  from?: boolean;
  align?: "left" | "right";
  size?: "sm" | "md" | "lg";
}) {
  const discount = libraryDiscountPercent(price, compareAtPrice);
  const priceClass =
    size === "lg"
      ? "text-[2rem] font-semibold tracking-tight"
      : size === "sm"
        ? "text-sm font-black"
        : "text-sm font-black sm:text-base";
  return (
    <span className={cn("inline-flex flex-col gap-0.5", align === "right" ? "items-end" : "items-start")}>
      <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", align === "right" ? "justify-end" : "justify-start")}>
        <span className={cn(priceClass, "text-[#1a3560] dark:text-white")}>
          {from ? "From " : ""}
          {currency} {price.toFixed(2)}
        </span>
        {compareAtPrice != null && (
          <span className="text-xs font-semibold text-slate-400 line-through sm:text-sm">
            {currency} {compareAtPrice.toFixed(2)}
          </span>
        )}
      </span>
      {discount != null && discount > 0 && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Save {discount}%
        </span>
      )}
    </span>
  );
}

export function LibraryProductCard({
  product,
  quantity,
  hidePrice,
  onAdd,
}: {
  product: LibraryProduct;
  quantity: number;
  hidePrice?: boolean;
  onAdd: () => void;
}) {
  const blurb = productCardBlurb(product);
  const pricing = libraryPriceDisplay(product);
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[#dfe8e5] bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:border-[#22a54b] hover:shadow-xl sm:p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="relative overflow-hidden rounded-xl bg-[#f4f8f7] dark:bg-slate-950/60">
        {pricing.onSale && !hidePrice && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            Sale
          </span>
        )}
        <BookCover
          product={product}
          variant="shop"
          className="w-full max-w-none rounded-xl shadow-none ring-0"
          sizes="(max-width: 640px) 92vw, (max-width: 1280px) 45vw, 420px"
        />
      </div>
      <div className="mt-3 flex min-w-0 flex-1 flex-col sm:mt-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#22a54b] sm:text-xs dark:text-emerald-300">
          {libraryFormatsLabel(product)}
        </p>
        <Link
          href={`/library/${product.slug}`}
          className="mt-1 line-clamp-2 text-sm font-black leading-snug text-[#1a3560] hover:text-[#22a54b] sm:text-base dark:text-white"
        >
          {product.title}
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-slate-500 sm:text-sm">{product.author}</p>
        {blurb ? (
          <p className="mt-2 line-clamp-3 overflow-hidden text-sm leading-6 text-slate-600 sm:mt-3 dark:text-slate-300">
            {blurb}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-bold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span>
          </span>
          {hidePrice ? (
            <Link href={`/login?next=/library/${product.slug}`} className="text-sm font-bold text-[#22a54b] underline-offset-2 hover:underline">
              Sign in for price
            </Link>
          ) : (
            <LibraryPriceBits
              currency={pricing.currency}
              price={pricing.price}
              compareAtPrice={pricing.compareAtPrice}
              from={pricing.from}
              align="right"
            />
          )}
        </div>
        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-3 sm:pt-4">
          <Button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAdd();
            }}
            disabled={product.comingSoon && !product.preorder}
            className="min-h-11 rounded-full bg-[#22a54b] shadow-md shadow-emerald-900/10 hover:bg-[#1e9443] hover:from-[#22a54b] hover:to-[#22a54b]"
          >
            <ShoppingCart className="size-4" />{" "}
            {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link
            href={`/library/${product.slug}`}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-[#22a54b] hover:text-[#22a54b] dark:border-slate-700 dark:text-slate-300"
            aria-label={`View ${product.title}`}
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
