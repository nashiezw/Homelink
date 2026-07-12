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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { ListingVirtualTour } from "@/lib/types";
import { virtualTourImageFallbacks } from "@/lib/media/resolve-public-image";
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
  const [imageReady, setImageReady] = useState(false);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? initialScene;
  const activeIndex = scenes.findIndex((scene) => scene.id === activeScene?.id);

  const goToScene = useCallback(
    (id: string, source: "SCENE_VIEW" | "HOTSPOT_CLICK" = "SCENE_VIEW", metadata?: Record<string, unknown>) => {
      setActiveSceneId(id);
      setPan(50);
      setImageReady(false);
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
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-white">
              <Compass className="size-5 text-emerald-700" />
              Virtual tour
            </h2>
            <p className="mt-1 text-sm text-slate-500">Walk through this property in 3D or panoramic view.</p>
            {tour.adminVerifiedAt && (
              <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-700">
                <ShieldCheck className="size-4" />
                Verified by HomeLink
              </p>
            )}
          </div>
          <a
            href={tour.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            <ExternalLink className="size-4" />
            Open full tour
          </a>
        </div>
        <div className="relative bg-slate-950">
          <iframe
            title={`${listingTitle} virtual tour`}
            src={tour.externalUrl}
            className="aspect-[16/10] w-full"
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-white">
            <Compass className="size-5 text-emerald-700" />
            {tour.title || "Virtual tour"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {scenes.length} room{scenes.length === 1 ? "" : "s"} · drag to look around
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            if (tour.id) void recordTourEvent(tour.id, listingId, "FULLSCREEN", activeScene.id);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          <Maximize2 className="size-4" />
          Immersive view
        </button>
      </div>

      <TourStage
        scene={activeScene}
        scenes={scenes}
        pan={pan}
        imageReady={imageReady}
        listingImage={listingImage}
        onImageReady={() => setImageReady(true)}
        onImageReset={() => setImageReady(false)}
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
        <p className="flex items-center gap-1 border-t border-slate-100 px-5 py-3 text-sm font-medium text-emerald-700 dark:border-slate-800">
          <ShieldCheck className="size-4" />
          Reviewed by HomeLink admin
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Virtual tour</p>
              <p className="text-sm font-semibold text-white">{listingTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close virtual tour"
            >
              <Minimize2 className="size-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-center px-2 pb-4 sm:px-6">
            <TourStage
              scene={activeScene}
              scenes={scenes}
              pan={pan}
              imageReady={imageReady}
              listingImage={listingImage}
        onImageReady={() => setImageReady(true)}
        onImageReset={() => setImageReady(false)}
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

function TourStage({
  scene,
  scenes,
  pan,
  imageReady,
  listingImage,
  onImageReady,
  onImageReset,
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
  imageReady: boolean;
  listingImage?: string;
  onImageReady: () => void;
  onImageReset: () => void;
  onPan: (value: number) => void;
  onScene: (id: string) => void;
  onHotspot: (targetSceneId?: string) => void;
  onPrev: () => void;
  onNext: () => void;
  showNav: boolean;
  immersive?: boolean;
}) {
  const dragRef = useRef<{ active: boolean; startX: number; startPan: number } | null>(null);
  const fallbackChain = useMemo(
    () => virtualTourImageFallbacks(scene.imageUrl, listingImage),
    [scene.imageUrl, listingImage],
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = fallbackChain[imageIndex];

  useEffect(() => {
    setImageIndex(0);
    setImageFailed(false);
    onImageReset();
  }, [scene.id, scene.imageUrl, listingImage, onImageReset]);

  useEffect(() => {
    if (imageIndex > 0) onImageReset();
  }, [imageIndex, onImageReset]);

  const bindPan = useCallback(
    (clientX: number) => {
      if (!dragRef.current?.active) return;
      const delta = (clientX - dragRef.current.startX) * 0.08;
      onPan(Math.max(20, Math.min(80, dragRef.current.startPan + delta)));
    },
    [onPan],
  );

  return (
    <div className={immersive ? "" : ""}>
      <div
        className={cn(
          "group relative overflow-hidden bg-slate-950",
          immersive ? "mx-auto h-[min(72vh,720px)] w-full max-w-6xl rounded-2xl" : "aspect-[16/10]",
        )}
        onPointerDown={(event) => {
          dragRef.current = { active: true, startX: event.clientX, startPan: pan };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => bindPan(event.clientX)}
        onPointerUp={(event) => {
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
        onWheel={(event) => {
          event.preventDefault();
          onPan(Math.max(20, Math.min(80, pan + event.deltaY * 0.04)));
        }}
      >
        {!imageReady && !imageFailed && <div className="absolute inset-0 animate-pulse bg-slate-800" />}
        {imageFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 px-6 text-center">
            <p className="text-sm text-slate-300">Tour image unavailable. Re-upload this scene in admin.</p>
          </div>
        )}
        {imageSrc && !imageFailed && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${scene.id}:${imageSrc}`}
              src={imageSrc}
              alt={scene.title}
              draggable={false}
              onLoad={onImageReady}
              onError={() => {
                const nextIndex = imageIndex + 1;
                if (nextIndex < fallbackChain.length) {
                  setImageIndex(nextIndex);
                  return;
                }
                setImageFailed(true);
              }}
              className={cn(
                "absolute inset-y-0 left-1/2 h-full max-w-none select-none object-cover transition-opacity duration-500",
                imageReady ? "opacity-100" : "opacity-0",
              )}
              style={{ width: "180%", transform: `translateX(-${pan}%)` }}
            />
          </>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

        {showNav && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPrev();
              }}
              className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/60"
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
              className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/60"
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
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition hover:scale-105 hover:bg-emerald-500"
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
          >
            <span className="flex items-center gap-1.5">
              <span className="size-2 animate-pulse rounded-full bg-white" />
              {hotspot.label}
            </span>
          </button>
        ))}

        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          <Move className="size-3.5" />
          Drag to explore
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">Now viewing</p>
              <p className="text-lg font-semibold text-white sm:text-xl">{scene.title}</p>
            </div>
            <p className="text-xs text-white/70">
              {scenes.findIndex((item) => item.id === scene.id) + 1} of {scenes.length}
            </p>
          </div>
        </div>
      </div>

      {scenes.length > 1 && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Rooms</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onScene(item.id)}
                className={cn(
                  "relative h-20 w-32 shrink-0 overflow-hidden rounded-xl ring-2 transition",
                  item.id === scene.id
                    ? "ring-emerald-600"
                    : "ring-transparent opacity-75 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={virtualTourImageFallbacks(item.imageUrl, listingImage)[0]} alt="" className="h-full w-full object-cover" />
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
