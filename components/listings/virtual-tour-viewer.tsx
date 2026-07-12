"use client";

import { Compass, ExternalLink, Maximize2, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { ListingVirtualTour } from "@/lib/types";

type VirtualTourViewerProps = {
  tour: ListingVirtualTour;
  listingId: string;
  listingTitle: string;
};

export function VirtualTourViewer({ tour, listingId, listingTitle }: VirtualTourViewerProps) {
  const scenes = useMemo(() => [...tour.scenes].sort((a, b) => a.sortOrder - b.sortOrder), [tour.scenes]);
  const initialScene = scenes.find((scene) => scene.id === tour.coverSceneId) ?? scenes[0];
  const [activeSceneId, setActiveSceneId] = useState(initialScene?.id);
  const [pan, setPan] = useState(50);
  const [open, setOpen] = useState(false);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? initialScene;

  useEffect(() => {
    if (!tour.id || tour.status !== "PUBLISHED") return;
    void recordTourEvent(tour.id, listingId, "VIEW", activeScene?.id);
  }, [tour.id, tour.status, listingId, activeScene?.id]);

  if (tour.status !== "PUBLISHED") return null;

  if (tour.provider === "EXTERNAL" && tour.externalUrl) {
    return (
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Compass className="size-5 text-emerald-700" />
              Virtual tour
            </h2>
            {tour.adminVerifiedAt && (
              <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-700">
                <ShieldCheck className="size-4" />
                Admin verified
              </p>
            )}
          </div>
          <a
            href={tour.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <ExternalLink className="size-4" />
            Open tour
          </a>
        </div>
        <div className="surface-panel mt-4 overflow-hidden rounded-lg p-2">
          <iframe
            title={`${listingTitle} virtual tour`}
            src={tour.externalUrl}
            className="aspect-video w-full rounded-md bg-slate-950"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    );
  }

  if (!activeScene) return null;

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Compass className="size-5 text-emerald-700" />
            {tour.title || "Virtual tour"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{scenes.length} room scene{scenes.length === 1 ? "" : "s"}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseDown={() => tour.id && void recordTourEvent(tour.id, listingId, "FULLSCREEN", activeScene.id)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Maximize2 className="size-4" />
          Full screen
        </button>
      </div>

      <TourStage
        scene={activeScene}
        scenes={scenes}
        pan={pan}
        onPan={setPan}
        onReset={() => setPan(50)}
        onScene={(id) => {
          setActiveSceneId(id);
          setPan(50);
          if (tour.id) void recordTourEvent(tour.id, listingId, "SCENE_VIEW", id);
        }}
        onHotspot={(targetSceneId) => {
          if (tour.id) void recordTourEvent(tour.id, listingId, "HOTSPOT_CLICK", activeScene.id, { targetSceneId });
        }}
      />

      {tour.adminVerifiedAt && (
        <p className="mt-3 flex items-center gap-1 text-sm font-medium text-emerald-700">
          <ShieldCheck className="size-4" />
          This virtual tour has been reviewed by HomeLink admin.
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950 p-4 text-white sm:p-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close virtual tour"
          >
            <X className="size-5" />
          </button>
          <div className="mx-auto flex h-full max-w-7xl flex-col justify-center">
            <TourStage
              scene={activeScene}
              scenes={scenes}
              pan={pan}
              onPan={setPan}
              onReset={() => setPan(50)}
              onScene={(id) => {
                setActiveSceneId(id);
                setPan(50);
                if (tour.id) void recordTourEvent(tour.id, listingId, "SCENE_VIEW", id);
              }}
              onHotspot={(targetSceneId) => {
                if (tour.id) void recordTourEvent(tour.id, listingId, "HOTSPOT_CLICK", activeScene.id, { targetSceneId });
              }}
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
  onPan,
  onReset,
  onScene,
  onHotspot,
  immersive = false,
}: {
  scene: ListingVirtualTour["scenes"][number];
  scenes: ListingVirtualTour["scenes"];
  pan: number;
  onPan: (value: number) => void;
  onReset: () => void;
  onScene: (id: string) => void;
  onHotspot: (targetSceneId?: string) => void;
  immersive?: boolean;
}) {
  return (
    <div className={immersive ? "mt-0" : "mt-4"}>
      <div className={`relative overflow-hidden rounded-lg bg-black ${immersive ? "h-[72vh]" : "aspect-[16/9]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scene.imageUrl}
          alt={scene.title}
          className="absolute inset-y-0 left-1/2 h-full max-w-none object-cover transition-transform duration-300"
          style={{ width: "160%", transform: `translateX(-${pan}%)` }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4">
          <p className="text-sm font-semibold text-white sm:text-base">{scene.title}</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="range"
              min={25}
              max={75}
              value={pan}
              onChange={(event) => onPan(Number(event.target.value))}
              className="w-full accent-emerald-500"
              aria-label="Pan virtual tour scene"
            />
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          </div>
        </div>
        {scene.hotspots?.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            onClick={() => {
              onHotspot(hotspot.targetSceneId);
              if (hotspot.targetSceneId) onScene(hotspot.targetSceneId);
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-emerald-500"
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
          >
            {hotspot.label}
          </button>
        ))}
      </div>

      {scenes.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {scenes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onScene(item.id)}
              className={`relative h-16 w-28 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                item.id === scene.id ? "ring-emerald-600" : "ring-transparent opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-left text-[11px] font-medium text-white">
                {item.title}
              </span>
            </button>
          ))}
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
