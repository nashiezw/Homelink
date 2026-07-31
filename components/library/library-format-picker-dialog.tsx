"use client";

import { ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/library/book-cover";
import { LibraryPriceBits } from "@/components/library/library-product-card";
import { Button } from "@/components/ui/button";
import {
  enabledLibraryFormats,
  libraryFormatCompareAt,
  primaryLibraryFormat,
  type LibraryProduct,
  type LibraryProductFormat,
} from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

export function LibraryFormatPickerDialog({
  product,
  hidePrice,
  onClose,
  onConfirm,
}: {
  product: LibraryProduct;
  hidePrice?: boolean;
  onClose: () => void;
  onConfirm: (format: LibraryProductFormat) => void;
}) {
  const formats = enabledLibraryFormats(product);
  const [selectedId, setSelectedId] = useState(
    () => primaryLibraryFormat(formats, product.productType, product.price).id,
  );
  const selected = formats.find((format) => format.id === selectedId) ?? formats[0];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1a3560]/45 backdrop-blur-[2px]"
        aria-label="Close format picker"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-format-picker-title"
        className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#dfe8e5] bg-white shadow-[0_28px_80px_rgba(16,32,36,0.28)] sm:rounded-3xl dark:border-slate-700 dark:bg-slate-950"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e8f0ed] bg-[linear-gradient(135deg,#e8f4ef_0%,#f4f8f7_55%,#e7eef5_100%)] px-4 py-3.5 sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#22a54b]">Choose format</p>
            <h2 id="library-format-picker-title" className="mt-1 line-clamp-2 text-base font-bold text-[#1a3560] sm:text-lg dark:text-white">
              {product.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{product.author}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-[#22a54b] hover:text-[#22a54b] dark:border-slate-700 dark:bg-slate-900"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-4 p-4 sm:grid-cols-[7.5rem_1fr] sm:gap-5 sm:p-5">
            <BookCover product={product} variant="shop" interactive={false} className="mx-auto hidden w-28 shadow-md sm:block sm:w-full" sizes="140px" />
            <div className="space-y-2.5 sm:space-y-3">
              {formats.map((format) => {
                const selectedFormat = format.id === selected?.id;
                return (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => setSelectedId(format.id)}
                    className={cn(
                      "w-full rounded-2xl border px-3.5 py-3 text-left transition sm:px-4 sm:py-3.5",
                      selectedFormat
                        ? "border-[#22a54b] bg-[#e8f4ef] ring-2 ring-[#22a54b]/20 dark:bg-emerald-950/35"
                        : "border-slate-200 bg-white hover:border-[#22a54b]/70 dark:border-slate-700 dark:bg-slate-900",
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#1a3560] dark:text-white">{format.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {format.type === "PRINTED_BOOK" ? "Printed copy · shipping after payment" : "Digital copy · instant after payment"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {hidePrice ? (
                          <span className="text-sm font-black text-[#1a3560] dark:text-white">—</span>
                        ) : (
                          <LibraryPriceBits
                            currency={product.currency}
                            price={format.price}
                            compareAtPrice={libraryFormatCompareAt(format)}
                            align="right"
                          />
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#e8f0ed] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:p-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-[#1a3560] transition hover:border-[#22a54b] dark:border-slate-700 dark:text-white"
          >
            Cancel
          </button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
            className="h-11 rounded-full bg-[#22a54b] hover:bg-[#1e9443] hover:from-[#22a54b] hover:to-[#22a54b]"
          >
            <ShoppingCart className="size-4" /> Add to bag
            {!hidePrice && selected ? ` · ${product.currency} ${selected.price.toFixed(2)}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
