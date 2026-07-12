import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

export function shouldUsePostgresTourAnalytics() {
  return isPostgresStoreEnabled();
}

export async function recordVirtualTourEvent(input: {
  tourId: string;
  listingId: string;
  sceneId?: string;
  eventType: "VIEW" | "SCENE_VIEW" | "HOTSPOT_CLICK" | "FULLSCREEN";
  metadata?: Record<string, unknown>;
}) {
  return getMainPrisma().virtualTourEvent.create({
    data: {
      tourId: input.tourId,
      listingId: input.listingId,
      sceneId: input.sceneId,
      eventType: input.eventType,
      metadata: JSON.parse(JSON.stringify(input.metadata ?? {})),
    },
  });
}

export async function summarizeVirtualTourAnalytics(tourId: string) {
  const events = await getMainPrisma().virtualTourEvent.findMany({
    where: { tourId },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return {
    totalViews: events.filter((event) => event.eventType === "VIEW").length,
    sceneViews: events.filter((event) => event.eventType === "SCENE_VIEW").length,
    hotspotClicks: events.filter((event) => event.eventType === "HOTSPOT_CLICK").length,
    fullscreenOpens: events.filter((event) => event.eventType === "FULLSCREEN").length,
    uniqueScenesViewed: new Set(events.map((event) => event.sceneId).filter(Boolean)).size,
    lastViewedAt: events[0]?.createdAt.toISOString(),
  };
}
