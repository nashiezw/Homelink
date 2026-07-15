import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import { defaultEnquiryType } from "@/lib/enquiries/labels";
import type { CreateEnquiryInput, EnquiryType } from "@/lib/enquiries/types";
import {
  createEnquiryInPostgres,
  getEnquiryActor,
  listEnquiriesFromPostgres,
  shouldUsePostgresEnquiries,
  summarizeEnquiries,
} from "@/lib/enquiries/postgres-enquiry-repository";
import { getListingFromPostgres } from "@/lib/listings/postgres-listing-repository";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const body = await request.json();

  if (!body.listingId) {
    return problem(400, "INVALID_ENQUIRY", "listingId is required.");
  }
  if (!String(body.phone ?? "").trim()) {
    return problem(400, "INVALID_ENQUIRY", "Phone number is required so HomeLink can contact the client.");
  }

  if (shouldUsePostgresEnquiries()) {
    const listing = await getListingFromPostgres(body.listingId);
    if (!listing) {
      return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
    }
    const actor = userId ? await getEnquiryActor(userId) : null;
    const seekerName = actor?.name ?? String(body.name ?? "").trim();
    if (!seekerName) {
      return problem(400, "INVALID_ENQUIRY", "Client name is required.");
    }
    const enquiryType = (body.enquiryType as EnquiryType) ?? defaultEnquiryType(listing.type, listing.intent);
    const input: CreateEnquiryInput = {
      listingId: body.listingId,
      seekerId: userId ?? "guest",
      seekerName,
      seekerEmail: body.email,
      seekerPhone: String(body.phone).trim(),
      enquiryType,
      message: body.message ?? "",
      preferredDate: body.preferredDate,
      preferredTime: body.preferredTime,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: body.guests,
      channel: body.channel ?? "WEB",
      source: body.source ?? "LISTING",
    };
    if (!input.message.trim()) {
      return problem(400, "INVALID_ENQUIRY", "Please include a message or enquiry details.");
    }
    const enquiry = await createEnquiryInPostgres(input);
    if (!enquiry) return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
    return created(enquiry);
  }

  const store = getStore();
  const listing = store.getListing(body.listingId);
  if (!listing) {
    return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  }

  const user = userId ? store.getUserById(userId) : null;
  const seekerName = user?.name ?? String(body.name ?? "").trim();
  if (!seekerName) {
    return problem(400, "INVALID_ENQUIRY", "Client name is required.");
  }
  const enquiryType = (body.enquiryType as EnquiryType) ?? defaultEnquiryType(listing.type, listing.intent);

  const input: CreateEnquiryInput = {
    listingId: body.listingId,
    seekerId: user?.id ?? "guest",
    seekerName,
    seekerEmail: body.email ?? user?.email,
    seekerPhone: String(body.phone).trim(),
    enquiryType,
    message: body.message ?? "",
    preferredDate: body.preferredDate,
    preferredTime: body.preferredTime,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: body.guests,
    channel: body.channel ?? "WEB",
    source: body.source ?? "LISTING",
  };

  if (!input.message.trim()) {
    return problem(400, "INVALID_ENQUIRY", "Please include a message or enquiry details.");
  }

  return created(store.createEnquiry(input));
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view enquiries.");
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  if (shouldUsePostgresEnquiries()) {
    const actor = await getEnquiryActor(userId);
    if (!actor) return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
    const enquiries = await listEnquiriesFromPostgres({
      status: status as import("@/lib/enquiries/types").EnquiryStatus | undefined,
      q,
      userId,
      roles: actor.roles,
    });
    return actor.roles.includes("ADMIN") ? ok({ enquiries, analytics: summarizeEnquiries(enquiries) }) : ok({ enquiries });
  }

  const store = getStore();
  const user = store.getUserById(userId);
  if (!user) {
    return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
  }

  if (user.roles.includes("ADMIN")) {
    return ok({
      enquiries: store.listEnquiries({
        status: status as import("@/lib/enquiries/types").EnquiryStatus | undefined,
        q,
      }),
      analytics: store.getEnquiryAnalytics(),
    });
  }
  if (user.roles.includes("AGENT")) {
    return ok({ enquiries: store.getEnquiriesForAgent(userId) });
  }
  if (user.roles.includes("LANDLORD")) {
    return ok({ enquiries: store.getEnquiriesForOwner(userId) });
  }
  return ok({ enquiries: store.getEnquiriesForSeeker(userId) });
}
