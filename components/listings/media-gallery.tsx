"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type MediaGalleryProps = {
  images: string[];
  title: string;
};

export function MediaGallery({ images, title }: MediaGalleryProps) {
  const unique = [...new Set(images.filter(Boolean))];
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
          className="relative block w-full min-h-[420px] overflow-hidden rounded-xl shadow-soft ring-1 ring-slate-200/70 dark:ring-slate-800"
        >
          <Image src={main} alt={title} fill priority className="object-cover transition hover:scale-[1.02]" sizes="100vw" />
          {unique.length > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              {active + 1} / {unique.length} · Click to enlarge
            </span>
          )}
        </button>

        {unique.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {thumbs.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(index)}
                className={`relative size-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                  index === active ? "ring-emerald-600" : "ring-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Image src={src} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="size-6" />
          </button>
          {unique.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous"
              >
                <ChevronLeft className="size-8" />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next"
              >
                <ChevronRight className="size-8" />
              </button>
            </>
          )}
          <div className="relative max-h-[85vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[16/10] w-full">
              <Image src={unique[active]} alt={title} fill className="object-contain" sizes="90vw" />
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
