"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isSvgImageUrl, resolvePublicImageUrl } from "@/lib/media/resolve-public-image";

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

  if (unique.length === 0) return null;

  const main = unique[active] ?? unique[0];
  const thumbs = unique.slice(0, 8);

  return (
    <>
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative block w-full aspect-[4/3] max-h-[70vh] overflow-hidden rounded-xl shadow-soft ring-1 ring-slate-200/70 sm:aspect-[16/10] dark:ring-slate-800"
        >
          <Image
            src={main}
            alt={title}
            fill
            priority
            unoptimized={isSvgImageUrl(main)}
            className="object-cover transition hover:scale-[1.02]"
            sizes="(min-width: 1024px) 70vw, 100vw"
          />
          {unique.length > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              {active + 1} / {unique.length} · Tap to enlarge
            </span>
          )}
        </button>

        {unique.length > 1 && (
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
            {thumbs.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(index)}
                className={`relative size-16 shrink-0 snap-start overflow-hidden rounded-lg ring-2 transition sm:size-20 ${
                  index === active ? "ring-emerald-600" : "ring-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt={`${title} photo ${index + 1}`}
                  fill
                  unoptimized={isSvgImageUrl(src)}
                  className="object-cover"
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
            className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4 sm:top-4"
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
