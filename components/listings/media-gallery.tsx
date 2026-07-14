"use client";

import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isListingPlaceholderArt, isSvgImageUrl, resolvePublicImageUrl } from "@/lib/media/resolve-public-image";
import { cn } from "@/lib/utils";

type MediaGalleryProps = {
  images: string[];
  title: string;
};

export function MediaGallery({ images, title }: MediaGalleryProps) {
  const unique = useMemo(
    () =>
      [...new Set(images.map((src) => resolvePublicImageUrl(src) ?? src).filter(Boolean))],
    [images],
  );
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const go = useCallback(
    (delta: number) => {
      setActive((i) => (i + delta + unique.length) % unique.length);
    },
    [unique.length],
  );

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, go]);

  if (unique.length === 0) {
    return (
      <div className="mt-6 flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center sm:aspect-[16/10] dark:border-slate-700 dark:bg-slate-900">
        <ImageOff className="size-8 text-slate-400" />
        <div>
          <p className="font-semibold text-ink dark:text-white">Photos coming soon</p>
          <p className="mt-1 text-sm text-slate-500">The advertiser has not uploaded property photos yet.</p>
        </div>
      </div>
    );
  }

  const main = unique[active] ?? unique[0];
  const thumbs = unique.slice(0, 8);
  const mainIsPlaceholder = isListingPlaceholderArt(main) || isSvgImageUrl(main);

  return (
    <>
      <div className="mt-5 space-y-3 sm:mt-6">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className={cn(
            "relative block w-full overflow-hidden rounded-xl ring-1 ring-slate-200/70 dark:ring-slate-800",
            mainIsPlaceholder
              ? "aspect-[4/3] bg-emerald-50 sm:aspect-[16/10] dark:bg-emerald-950/30"
              : "aspect-[4/3] max-h-[58vh] bg-slate-100 shadow-soft sm:aspect-[16/10] sm:max-h-[70vh] dark:bg-slate-900",
          )}
        >
          <Image
            src={main}
            alt={title}
            fill
            priority
            unoptimized={isSvgImageUrl(main)}
            className={cn(
              "transition",
              mainIsPlaceholder ? "object-contain p-4 sm:p-8" : "object-cover hover:scale-[1.02]",
            )}
            sizes="(min-width: 1024px) 70vw, 100vw"
          />
          {mainIsPlaceholder ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-100">
              <ImageOff className="size-3.5" />
              Photos pending
            </span>
          ) : null}
          {unique.length > 1 && (
            <span className="absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white">
              <span className="sm:hidden">{active + 1} / {unique.length}</span>
              <span className="hidden sm:inline">{active + 1} / {unique.length} - Tap to enlarge</span>
            </span>
          )}
        </button>

        {unique.length > 1 && (
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
            {thumbs.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "relative size-16 shrink-0 snap-start overflow-hidden rounded-lg bg-slate-100 ring-2 transition sm:size-20 dark:bg-slate-900",
                  index === active ? "ring-emerald-600" : "ring-transparent opacity-80 hover:opacity-100",
                )}
              >
                <Image
                  src={src}
                  alt={`${title} photo ${index + 1}`}
                  fill
                  unoptimized={isSvgImageUrl(src)}
                  className={isListingPlaceholderArt(src) || isSvgImageUrl(src) ? "object-contain p-1" : "object-cover"}
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4 sm:top-4"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="size-6" />
          </button>
          {unique.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4 sm:size-12"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous"
              >
                <ChevronLeft className="size-7 sm:size-8" />
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4 sm:size-12"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next"
              >
                <ChevronRight className="size-7 sm:size-8" />
              </button>
            </>
          )}
          <div className="relative max-h-[85vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
              <Image
                src={unique[active]}
                alt={title}
                fill
                unoptimized={isSvgImageUrl(unique[active])}
                className="object-contain"
                sizes="90vw"
              />
            </div>
            <p className="mt-3 text-center text-sm text-white/80">
              {active + 1} of {unique.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
