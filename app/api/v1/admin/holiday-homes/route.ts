import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  if (isPostgresStoreEnabled()) {
    return ok({
      listings: [],
      enquiries: [],
      reviews: [],
      analytics: {},
      settings: {},
      seasonalRates: [],
      refundRequests: [],
    });
  }

  const store = getStore();
  return ok({
    listings: store.listHolidayHomeListings().map((l) => ({
      id: l.id,
      title: l.title,
      city: l.city,
      suburb: l.suburb,
      status: l.status,
      verified: l.verified,
      featured: l.featured ?? false,
      nightlyRate: l.holidayHome?.nightlyRate ?? l.price,
      destination: l.holidayHome?.destination ?? l.city,
      views: l.views,
      enquiries: l.enquiries,
    })),
    enquiries: store.listHolidayBookingEnquiries(),
    reviews: store.listHolidayHomeReviews().map((r) => {
      const listing = store.listHolidayHomeListings().find((l) => l.id === r.listingId);
      return {
        id: r.id,
        listingId: r.listingId,
        listingTitle: listing?.title ?? r.listingId,
        guestName: r.reviewerName,
        rating: r.overallExperience,
        comment: r.comment ?? "",
        createdAt: r.createdAt,
      };
    }),
    analytics: store.getHolidayHomeAnalytics(),
    settings: store.getHolidayHomeSettings(),
    seasonalRates: store.listSeasonalRates(),
    refundRequests: store.listRefundRequests(),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  if (!auth.user) return ok({});
  if (isPostgresStoreEnabled()) return ok({ error: "not_available_in_production" });

  const body = await request.json();
  const store = getStore();

  if (body.settings) {
    store.updateHolidayHomeSettings(body.settings, { id: auth.user.id, name: auth.user.name });
  }

  if (body.listingId && body.featured !== undefined) {
    store.updateListing(body.listingId, { featured: body.featured });
  }

  if (body.listingId && body.status) {
    store.updateListing(body.listingId, { status: body.status });
  }

  if (body.enquiryId && body.enquiryStatus) {
    store.updateHolidayBookingEnquiryStatus(
      body.enquiryId as string,
      body.enquiryStatus as import("@/lib/holiday-homes/types").HolidayBookingStatus,
      auth.user.id,
      body.note as string | undefined,
    );
  }

  if (body.reviewId) {
    store.removeHolidayHomeReview(body.reviewId as string, { id: auth.user.id, name: auth.user.name });
  }

  if (body.listingId && body.verified !== undefined) {
    store.updateListing(body.listingId, { verified: Boolean(body.verified) });
  }

  if (body.action === "upsert_seasonal_rate") {
    return ok({ rate: store.upsertSeasonalRate(body.rate) });
  }

  if (body.action === "update_refund" && body.refundId && body.refundStatus) {
    const result = store.updateRefundRequest(
      body.refundId as string,
      body.refundStatus as import("@/lib/admin/enterprise-types").RefundRequest["status"],
      { id: auth.user.id, name: auth.user.name },
    );
    if (!result) return ok({ error: "not_found" });
    return ok({ refund: result });
  }

  return ok({
    settings: store.getHolidayHomeSettings(),
    analytics: store.getHolidayHomeAnalytics(),
  });
}
