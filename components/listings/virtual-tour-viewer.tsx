"use client";

import {
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Maximize2,
  Minimize2,
  Move,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api/client";
import type { ListingVirtualTour } from "@/lib/types";
import {
  isListingPlaceholderArt,
  isSvgImageUrl,
  virtualTourImageFallbacks,
} from "@/lib/media/resolve-public-image";
import { cn } from "@/lib/utils";

type VirtualTourViewerProps = {
  tour: ListingVirtualTour;
  listingId: string;
  listingTitle: string;
  listingImage?: string;
};

export function VirtualTourViewer({ tour, listingId, listingTitle, listingImage }: VirtualTourViewerProps) {
  const scenes = useMemo(() => [...tour.scenes].sort((a, b) => a.sortOrder - b.sortOrder), [tour.scenes]);
  const initialScene = scenes.find((scene) => scene.id === tour.coverSceneId) ?? scenes[0];
  const [activeSceneId, setActiveSceneId] = useState(initialScene?.id);
  const [pan, setPan] = useState(50);
  const [open, setOpen] = useState(false);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? initialScene;
  const activeIndex = scenes.findIndex((scene) => scene.id === activeScene?.id);

  const goToScene = useCallback(
    (id: string, source: "SCENE_VIEW" | "HOTSPOT_CLICK" = "SCENE_VIEW", metadata?: Record<string, unknown>) => {
      setActiveSceneId(id);
      setPan(50);
      if (tour.id) void recordTourEvent(tour.id, listingId, source, id, metadata);
    },
    [tour.id, listingId],
  );

  const goRelative = useCallback(
    (delta: number) => {
      if (scenes.length < 2 || activeIndex < 0) return;
      const next = scenes[(activeIndex + delta + scenes.length) % scenes.length];
      if (next) goToScene(next.id);
    },
    [scenes, activeIndex, goToScene],
  );

  useEffect(() => {
    if (!tour.id || tour.status !== "PUBLISHED") return;
    void recordTourEvent(tour.id, listingId, "VIEW", activeScene?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial view only
  }, [tour.id, tour.status, listingId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") goRelative(-1);
      if (event.key === "ArrowRight") goRelative(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goRelative]);

  if (tour.status !== "PUBLISHED") return null;

  if (tour.provider === "EXTERNAL" && tour.externalUrl) {
    return (
      <section className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <TourHeader
          title="Virtual tour"
          subtitle="Walk through this property in 3D or panoramic view."
          verified={Boolean(tour.adminVerifiedAt)}
          action={
            <a
              href={tour.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <ExternalLink className="size-4 shrink-0" />
              Open full tour
            </a>
          }
        />
        <div className="relative bg-slate-900">
          <iframe
            title={`${listingTitle} virtual tour`}
            src={tour.externalUrl}
            className="aspect-[4/3] w-full sm:aspect-[16/10]"
            loading="lazy"
            allow="fullscreen; xr-spatial-tracking"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    );
  }

  if (!activeScene) return null;

  return (
    <section className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <TourHeader
        title={tour.title || "Virtual tour"}
        subtitle={`${scenes.length} room${scenes.length === 1 ? "" : "s"} · drag or swipe to look around`}
        verified={false}
        action={
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              if (tour.id) void recordTourEvent(tour.id, listingId, "FULLSCREEN", activeScene.id);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            <Maximize2 className="size-4 shrink-0" />
            Immersive view
          </button>
        }
      />

      <TourStage
        scene={activeScene}
        scenes={scenes}
        pan={pan}
        listingImage={listingImage}
        onPan={setPan}
        onScene={goToScene}
        onHotspot={(targetSceneId) => {
          if (targetSceneId) goToScene(targetSceneId, "HOTSPOT_CLICK", { targetSceneId });
        }}
        onPrev={() => goRelative(-1)}
        onNext={() => goRelative(1)}
        showNav={scenes.length > 1}
      />

      {tour.adminVerifiedAt && (
        <p className="flex items-center gap-1 border-t border-slate-100 px-4 py-3 text-sm font-medium text-emerald-700 sm:px-5 dark:border-slate-800">
          <ShieldCheck className="size-4 shrink-0" />
          Reviewed by HomeLink admin
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Virtual tour</p>
              <p className="truncate text-sm font-semibold text-white">{listingTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close virtual tour"
            >
              <Minimize2 className="size-5" />
            </button>
          </div>
          <div className="min-w-0 flex-1 px-2 pb-4 sm:px-6">
            <TourStage
              scene={activeScene}
              scenes={scenes}
              pan={pan}
              listingImage={listingImage}
              onPan={setPan}
              onScene={goToScene}
              onHotspot={(targetSceneId) => {
                if (targetSceneId) goToScene(targetSceneId, "HOTSPOT_CLICK", { targetSceneId });
              }}
              onPrev={() => goRelative(-1)}
              onNext={() => goRelative(1)}
              showNav={scenes.length > 1}
              immersive
            />
          </div>
        </div>
      )}
    </section>
  );
}

function TourHeader({
  title,
  subtitle,
  verified,
  action,
}: {
  title: string;
  subtitle: string;
  verified: boolean;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
      <div className="min-w-0">
        <h2 className="flex min-w-0 items-start gap-2 text-lg font-semibold text-ink sm:text-xl dark:text-white">
          <Compass className="mt-0.5 size-5 shrink-0 text-emerald-700" />
          <span className="min-w-0 break-words">{title}</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        {verified && (
          <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-700">
            <ShieldCheck className="size-4" />
            Verified by HomeLink
          </p>
        )}
      </div>
      <div className="w-full shrink-0">{action}</div>
    </div>
  );
}

function TourStage({
  scene,
  scenes,
  pan,
  listingImage,
  onPan,
  onScene,
  onHotspot,
  onPrev,
  onNext,
  showNav,
  immersive = false,
}: {
  scene: ListingVirtualTour["scenes"][number];
  scenes: ListingVirtualTour["scenes"];
  pan: number;
  listingImage?: string;
  onPan: (value: number) => void;
  onScene: (id: string) => void;
  onHotspot: (targetSceneId?: string) => void;
  onPrev: () => void;
  onNext: () => void;
  showNav: boolean;
  immersive?: boolean;
}) {
  const dragRef = useRef<{ active: boolean; startX: number; startPan: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fallbackChain = useMemo(
    () => virtualTourImageFallbacks(scene.imageUrl, listingImage),
    [scene.imageUrl, listingImage],
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const imageSrc = fallbackChain[imageIndex];
  const isPlaceholder = isListingPlaceholderArt(imageSrc) || isSvgImageUrl(imageSrc);

  useEffect(() => {
    setImageIndex(0);
    setImageFailed(false);
    setImageReady(false);
  }, [scene.id, scene.imageUrl, listingImage]);

  useEffect(() => {
    setImageReady(false);
  }, [imageIndex]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || imageFailed) return;
    if (img.complete && img.naturalWidth > 0) {
      setImageReady(true);
    }
  }, [imageSrc, imageFailed, imageIndex]);

  // Never leave users on a blank dark stage if the network hangs.
  useEffect(() => {
    if (imageReady || imageFailed || !imageSrc) return;
    const timer = window.setTimeout(() => {
      const nextIndex = imageIndex + 1;
      if (nextIndex < fallbackChain.length) {
        setImageIndex(nextIndex);
        return;
      }
      setImageFailed(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [imageReady, imageFailed, imageSrc, imageIndex, fallbackChain.length]);

  const bindPan = useCallback(
    (clientX: number) => {
      if (!dragRef.current?.active || isPlaceholder) return;
      const delta = (clientX - dragRef.current.startX) * 0.08;
      onPan(Math.max(20, Math.min(80, dragRef.current.startPan + delta)));
    },
    [onPan, isPlaceholder],
  );

  return (
    <div className="min-w-0 max-w-full">
      <div
        className={cn(
          "group relative max-w-full touch-pan-y overflow-hidden bg-emerald-950",
          immersive ? "mx-auto h-[min(70vh,720px)] w-full max-w-6xl rounded-2xl" : "aspect-[4/3] w-full sm:aspect-[16/10]",
        )}
        onPointerDown={(event) => {
          if (isPlaceholder) return;
          dragRef.current = { active: true, startX: event.clientX, startPan: pan };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => bindPan(event.clientX)}
        onPointerUp={(event) => {
          dragRef.current = null;
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            /* already released */
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {!imageReady && !imageFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="size-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        )}

        {imageFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 px-6 text-center">
            <div>
              <p className="text-sm font-semibold text-white">Tour image unavailable</p>
              <p className="mt-2 text-sm text-slate-300">Upload room photos in Admin → Properties → Virtual tour.</p>
            </div>
          </div>
        )}

        {imageSrc && !imageFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${scene.id}:${imageSrc}`}
            ref={imgRef}
            src={imageSrc}
            alt={scene.title}
            draggable={false}
            onLoad={() => setImageReady(true)}
            onError={() => {
              const nextIndex = imageIndex + 1;
              if (nextIndex < fallbackChain.length) {
                setImageIndex(nextIndex);
                return;
              }
              setImageFailed(true);
            }}
            className={cn(
              "absolute inset-0 h-full w-full select-none transition-opacity duration-300",
              isPlaceholder ? "object-contain bg-emerald-50 p-4 sm:p-8" : "object-cover",
              imageReady ? "opacity-100" : "opacity-0",
            )}
            style={
              isPlaceholder
                ? undefined
                : {
                    // Keep the image fully covering the stage; pan by shifting background-like position.
                    objectPosition: `${pan}% 50%`,
                  }
            }
          />
        )}

        {!isPlaceholder && imageReady && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
        )}

        {isPlaceholder && imageReady && (
          <div className="absolute inset-x-3 top-3 z-10 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 shadow-sm sm:inset-x-4 sm:max-w-sm">
            <p className="font-semibold">Tour photos not uploaded yet</p>
            <p className="mt-1 text-xs leading-5 text-emerald-900/80">
              Showing a property illustration until real room photos or panoramas are added.
            </p>
          </div>
        )}

        {showNav && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPrev();
              }}
              className="absolute left-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white sm:left-3"
              aria-label="Previous room"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNext();
              }}
              className="absolute right-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white sm:right-3"
              aria-label="Next room"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {scene.hotspots?.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onHotspot(hotspot.targetSceneId);
              if (hotspot.targetSceneId) onScene(hotspot.targetSceneId);
            }}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-lg"
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
          >
            {hotspot.label}
          </button>
        ))}

        {!isPlaceholder && imageReady && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">
            <Move className="size-3.5" />
            Drag to explore
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("text-[11px] font-bold uppercase tracking-widest", isPlaceholder ? "text-emerald-700" : "text-emerald-300")}>
                Now viewing
              </p>
              <p className={cn("truncate text-base font-semibold sm:text-xl", isPlaceholder ? "text-ink" : "text-white")}>
                {scene.title}
              </p>
            </div>
            <p className={cn("shrink-0 text-xs", isPlaceholder ? "text-slate-600" : "text-white/70")}>
              {scenes.findIndex((item) => item.id === scene.id) + 1} of {scenes.length}
            </p>
          </div>
        </div>
      </div>

      {scenes.length > 1 && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Rooms</p>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
            {scenes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onScene(item.id)}
                className={cn(
                  "relative h-20 w-28 shrink-0 snap-start overflow-hidden rounded-xl ring-2 transition sm:w-32",
                  item.id === scene.id ? "ring-emerald-600" : "ring-transparent opacity-75",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={virtualTourImageFallbacks(item.imageUrl, listingImage)[0]}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-left text-[11px] font-semibold text-white">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function recordTourEvent(
  tourId: string,
  listingId: string,
  eventType: "VIEW" | "SCENE_VIEW" | "HOTSPOT_CLICK" | "FULLSCREEN",
  sceneId?: string,
  metadata?: Record<string, unknown>,
) {
  return apiFetch("/api/v1/virtual-tours/events", {
    method: "POST",
    body: JSON.stringify({ tourId, listingId, sceneId, eventType, metadata }),
  });
}
