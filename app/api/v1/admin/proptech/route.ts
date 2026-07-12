import { ok, problem } from "@/lib/api/response";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { latestMarketInsights } from "@/lib/market-insights/postgres-market-insights";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if (auth.error) return auth.error;
  if (!isPostgresStoreEnabled()) return problem(503, "POSTGRES_REQUIRED", "PropTech dashboard requires PostgreSQL.");

  const prisma = getMainPrisma();
  const [appointments, signedAgreements, insights, tourRows, notificationRows] = await Promise.all([
    prisma.viewingAppointment.findMany({
      orderBy: { startAt: "asc" },
      take: 120,
      include: { listing: { select: { title: true, suburb: true, city: true } } },
    }),
    prisma.signedAgreement.findMany({
      orderBy: { signedAt: "desc" },
      take: 80,
      include: { listing: { select: { title: true, suburb: true, city: true } } },
    }),
    latestMarketInsights(30),
    prisma.virtualTourEvent.groupBy({
      by: ["tourId", "listingId", "eventType"],
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _count: { id: "desc" } },
      take: 100,
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, channel: true, status: true, subject: true, body: true, createdAt: true, sentAt: true },
    }),
  ]);

  const listingIds = [...new Set(tourRows.map((row) => row.listingId))];
  const tourIds = [...new Set(tourRows.map((row) => row.tourId))];
  const [listings, tours] = await Promise.all([
    listingIds.length
      ? prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true, suburb: true, city: true } })
      : Promise.resolve([]),
    tourIds.length
      ? prisma.listingVirtualTour.findMany({ where: { id: { in: tourIds } }, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const tourById = new Map(tours.map((tour) => [tour.id, tour]));
  const tourMap = new Map<string, {
    tourId: string;
    listingId: string;
    tourTitle: string;
    listingTitle: string;
    location: string;
    totalEvents: number;
    views: number;
    sceneViews: number;
    hotspotClicks: number;
    fullscreenOpens: number;
    lastViewedAt?: string;
  }>();

  for (const row of tourRows) {
    const key = `${row.tourId}:${row.listingId}`;
    const listing = listingById.get(row.listingId);
    const current = tourMap.get(key) ?? {
      id: key,
      tourId: row.tourId,
      listingId: row.listingId,
      tourTitle: tourById.get(row.tourId)?.title ?? "Virtual tour",
      listingTitle: listing?.title ?? "Listing",
      location: [listing?.suburb, listing?.city].filter(Boolean).join(", "),
      totalEvents: 0,
      views: 0,
      sceneViews: 0,
      hotspotClicks: 0,
      fullscreenOpens: 0,
      lastViewedAt: undefined,
    };
    const count = row._count._all;
    current.totalEvents += count;
    if (row.eventType === "VIEW") current.views += count;
    if (row.eventType === "SCENE_VIEW") current.sceneViews += count;
    if (row.eventType === "HOTSPOT_CLICK") current.hotspotClicks += count;
    if (row.eventType === "FULLSCREEN") current.fullscreenOpens += count;
    const last = row._max.createdAt?.toISOString();
    if (last && (!current.lastViewedAt || last > current.lastViewedAt)) current.lastViewedAt = last;
    tourMap.set(key, current);
  }

  return ok({
    appointments: appointments.map((item) => ({
      id: item.id,
      referenceNumber: item.referenceNumber,
      listingId: item.listingId,
      listingTitle: item.listing.title,
      location: item.location || [item.listing.suburb, item.listing.city].filter(Boolean).join(", "),
      seekerName: item.seekerName,
      seekerEmail: item.seekerEmail,
      agentName: item.agentName,
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      status: item.status,
      reminderAt: item.reminderAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
    })),
    signedAgreements: signedAgreements.map((item) => ({
      id: item.id,
      title: item.title,
      subjectType: item.subjectType,
      subjectId: item.subjectId,
      listingTitle: item.listing?.title,
      signerName: item.signerName,
      signerEmail: item.signerEmail,
      signerRole: item.signerRole,
      contentHash: item.contentHash,
      signedAt: item.signedAt.toISOString(),
      downloadUrl: `/api/v1/signatures/${item.id}/download`,
    })),
    insights,
    tourAnalytics: [...tourMap.values()].sort((a, b) => b.totalEvents - a.totalEvents),
    notifications: notificationRows.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      sentAt: item.sentAt?.toISOString(),
    })),
  });
}
