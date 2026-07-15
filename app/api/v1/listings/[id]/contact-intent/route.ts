import { created, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { defaultEnquiryType } from "@/lib/enquiries/labels";
import type { CreateEnquiryInput } from "@/lib/enquiries/types";
import {
  createEnquiryInPostgres,
  getEnquiryActor,
  shouldUsePostgresEnquiries,
} from "@/lib/enquiries/postgres-enquiry-repository";
import {
  getListingFromPostgres,
  shouldUsePostgresListings,
} from "@/lib/listings/postgres-listing-repository";
import { getStore } from "@/lib/store/app-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ContactChannel = "phone" | "whatsapp";

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const userId = getSessionUserIdFromRequest(request);
  const body = await request.json().catch(() => ({}));
  const channel = normalizeChannel(body.channel);

  if (!channel) {
    return problem(400, "INVALID_CONTACT_CHANNEL", "Choose phone or WhatsApp.");
  }

  if (shouldUsePostgresListings() || shouldUsePostgresEnquiries()) {
    const listing = await getListingFromPostgres(id);
    if (!listing) return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");

    const contactValue = getContactValue(listing, channel);
    if (!contactValue) {
      return problem(404, "CONTACT_UNAVAILABLE", "This listing does not have a contact number available.");
    }

    const actor = userId ? await getEnquiryActor(userId) : null;
    const enquiry = await createEnquiryInPostgres(buildContactEnquiryInput({
      listing,
      userId,
      actorName: actor?.name,
      channel,
      fallbackName: body.name,
      fallbackEmail: body.email,
      fallbackPhone: body.phone,
    }));

    if (!enquiry) return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
    return created({
      enquiryId: enquiry.id,
      channel,
      contact: contactValue,
    });
  }

  const store = getStore();
  const listing = store.getListing(id);
  if (!listing) return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");

  const contactValue = getContactValue(listing, channel);
  if (!contactValue) {
    return problem(404, "CONTACT_UNAVAILABLE", "This listing does not have a contact number available.");
  }

  const user = userId ? store.getUserById(userId) : null;
  const enquiry = store.createEnquiry(buildContactEnquiryInput({
    listing,
    userId: user?.id,
    actorName: user?.name,
    channel,
    fallbackName: body.name,
    fallbackEmail: body.email ?? user?.email,
    fallbackPhone: body.phone ?? user?.phone,
  }));

  return created({
    enquiryId: enquiry.id,
    channel,
    contact: contactValue,
  });
}

function normalizeChannel(value: unknown): ContactChannel | null {
  return value === "phone" || value === "whatsapp" ? value : null;
}

function getContactValue(listing: { phone?: string; whatsapp?: string; propertyOwnerPhone?: string }, channel: ContactChannel) {
  return (channel === "whatsapp" ? listing.whatsapp || listing.propertyOwnerPhone : listing.phone || listing.propertyOwnerPhone)?.trim() ?? "";
}

function buildContactEnquiryInput({
  listing,
  userId,
  actorName,
  channel,
  fallbackName,
  fallbackEmail,
  fallbackPhone,
}: {
  listing: {
    id: string;
    title: string;
    type: string;
    intent: string;
  };
  userId?: string | null;
  actorName?: string | null;
  channel: ContactChannel;
  fallbackName?: string;
  fallbackEmail?: string;
  fallbackPhone?: string;
}): CreateEnquiryInput {
  const label = channel === "whatsapp" ? "WhatsApp" : "phone";
  const enquiryChannel = channel === "whatsapp" ? "WHATSAPP" : "PHONE";
  return {
    listingId: listing.id,
    seekerId: userId ?? "guest",
    seekerName: actorName ?? fallbackName ?? "Guest",
    seekerEmail: fallbackEmail,
    seekerPhone: fallbackPhone,
    enquiryType: defaultEnquiryType(listing.type, listing.intent),
    channel: enquiryChannel,
    source: "CONTACT_REVEAL",
    message: `User requested ${label} contact details for ${listing.title}.`,
  };
}
