import { createDefaultHolidayHomeDetails } from "@/lib/holiday-homes/defaults";
import type {
  HolidayBookingEnquiry,
  HolidayBookingStatus,
  HolidayHomeAnalytics,
  HolidayHomeDetails,
  HolidayHomePlatformState,
  HolidayHomeReview,
  HolidayHomeSettings,
} from "@/lib/holiday-homes/types";
import type { ListingRecord } from "@/lib/store/types";

export function createEmptyHolidayHomeState(): HolidayHomePlatformState {
  return {
    bookingEnquiries: [],
    reviews: [],
    settings: {
      minNightlyRate: 25,
      maxNightlyRate: 2500,
      defaultCheckInTime: "14:00",
      defaultCheckOutTime: "10:00",
      requireAdminApproval: true,
      allowInstantEnquiry: true,
    },
  };
}

export function normalizeHolidayHomeDetails(
  input: Partial<HolidayHomeDetails> | undefined,
  nightlyRate: number,
): HolidayHomeDetails | undefined {
  if (!input && nightlyRate <= 0) return undefined;
  return createDefaultHolidayHomeDetails(nightlyRate, input);
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

export function estimateBookingTotal(listing: ListingRecord, checkIn: string, checkOut: string, guests: number) {
  const nights = nightsBetween(checkIn, checkOut);
  const nightly = listing.holidayHome?.nightlyRate ?? listing.price;
  const cleaning = listing.holidayHome?.cleaningFee ?? 0;
  const minStay = listing.holidayHome?.minimumStay ?? 1;
  const maxGuests = listing.holidayHome?.maximumGuests ?? listing.bedrooms * 2;
  if (nights < minStay) {
    return { nights, total: 0, valid: false, reason: `Minimum stay is ${minStay} night(s).` };
  }
  if (guests > maxGuests) {
    return { nights, total: 0, valid: false, reason: `Maximum ${maxGuests} guests allowed.` };
  }
  return { nights, total: nights * nightly + cleaning, valid: true as const };
}

export function createHolidayBookingEnquiry(
  state: HolidayHomePlatformState,
  input: {
    listing: ListingRecord;
    guestUserId: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    message?: string;
    agentId?: string;
  },
): { enquiry: HolidayBookingEnquiry; error?: string } {
  const estimate = estimateBookingTotal(input.listing, input.checkIn, input.checkOut, input.guests);
  if (!estimate.valid) {
    return { enquiry: {} as HolidayBookingEnquiry, error: estimate.reason };
  }

  const enquiry: HolidayBookingEnquiry = {
    id: `hbook_${crypto.randomUUID()}`,
    listingId: input.listing.id,
    listingTitle: input.listing.title,
    ownerId: input.listing.ownerId,
    agentId: input.agentId,
    guestUserId: input.guestUserId,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    message: input.message,
    estimatedNights: estimate.nights,
    estimatedTotal: estimate.total,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.bookingEnquiries.unshift(enquiry);
  return { enquiry };
}

export function updateHolidayBookingStatus(
  state: HolidayHomePlatformState,
  enquiryId: string,
  status: HolidayBookingStatus,
) {
  const enquiry = state.bookingEnquiries.find((e) => e.id === enquiryId);
  if (!enquiry) return null;
  enquiry.status = status;
  enquiry.updatedAt = new Date().toISOString();
  return enquiry;
}

export function addHolidayHomeReview(
  state: HolidayHomePlatformState,
  input: Omit<HolidayHomeReview, "id" | "createdAt" | "overallExperience"> & {
    overallExperience?: number;
  },
) {
  const overallExperience =
    input.overallExperience ??
    Math.round(
      ((input.cleanliness + input.location + input.communication + input.valueForMoney) / 4) * 10,
    ) / 10;

  const review: HolidayHomeReview = {
    ...input,
    overallExperience,
    id: `hrev_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  };
  state.reviews.unshift(review);
  return review;
}

export function removeHolidayHomeReview(state: HolidayHomePlatformState, reviewId: string) {
  const idx = state.reviews.findIndex((r) => r.id === reviewId);
  if (idx < 0) return null;
  const [removed] = state.reviews.splice(idx, 1);
  return removed;
}

export function getHolidayHomeReviewSummary(state: HolidayHomePlatformState, listingId: string) {
  const reviews = state.reviews.filter((r) => r.listingId === listingId);
  if (!reviews.length) return null;
  const avg = (key: keyof HolidayHomeReview) =>
    reviews.reduce((s, r) => s + (r[key] as number), 0) / reviews.length;
  return {
    count: reviews.length,
    cleanliness: avg("cleanliness"),
    location: avg("location"),
    communication: avg("communication"),
    valueForMoney: avg("valueForMoney"),
    overallExperience: avg("overallExperience"),
    reviews: reviews.slice(0, 10),
  };
}

export function computeHolidayHomeAnalytics(
  state: HolidayHomePlatformState,
  listings: ListingRecord[],
): HolidayHomeAnalytics {
  const holidayListings = listings.filter((l) => l.type === "holiday_home");
  const listingIds = new Set(holidayListings.map((l) => l.id));
  const enquiries = state.bookingEnquiries.filter((e) => listingIds.has(e.listingId));
  const views = holidayListings.reduce((s, l) => s + l.views, 0);
  const destinationMap = new Map<string, number>();

  for (const listing of holidayListings) {
    const dest = listing.holidayHome?.destination ?? listing.city;
    destinationMap.set(dest, (destinationMap.get(dest) ?? 0) + 1);
  }

  const averageNightlyPrice =
    holidayListings.length > 0
      ? holidayListings.reduce((s, l) => s + (l.holidayHome?.nightlyRate ?? l.price), 0) /
        holidayListings.length
      : 0;

  return {
    views,
    bookingEnquiries: enquiries.length,
    conversionRate: views > 0 ? Math.round((enquiries.length / views) * 1000) / 10 : 0,
    averageNightlyPrice: Math.round(averageNightlyPrice),
    popularDestinations: [...destinationMap.entries()]
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topListings: [...holidayListings]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        title: l.title,
        views: l.views,
        enquiries: l.enquiries,
      })),
  };
}

export function updateHolidayHomeSettings(
  state: HolidayHomePlatformState,
  settings: Partial<HolidayHomeSettings>,
) {
  state.settings = { ...state.settings, ...settings };
  return state.settings;
}

export function matchesHolidayFilters(
  listing: ListingRecord,
  filters: {
    destination?: string;
    maxNightlyPrice?: number;
    minGuests?: number;
    pool?: boolean;
    wifi?: boolean;
    petFriendly?: boolean;
    checkIn?: string;
  },
) {
  if (listing.type !== "holiday_home" || !listing.holidayHome) return listing.type !== "holiday_home";

  const hh = listing.holidayHome;
  if (filters.destination && !`${hh.destination ?? listing.city}`.toLowerCase().includes(filters.destination.toLowerCase())) {
    return false;
  }
  if (filters.maxNightlyPrice && hh.nightlyRate > filters.maxNightlyPrice) return false;
  if (filters.minGuests && hh.maximumGuests < filters.minGuests) return false;
  if (filters.pool && !hh.swimmingPool) return false;
  if (filters.wifi && !hh.wifiAvailable) return false;
  if (filters.petFriendly && !hh.petFriendly) return false;
  if (filters.checkIn && listing.availableFrom !== "Available now") {
    const available = new Date(listing.availableFrom);
    const requested = new Date(filters.checkIn);
    if (!Number.isNaN(available.getTime()) && requested < available) return false;
  }
  return true;
}
