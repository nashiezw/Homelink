import type { EnquiryType } from "@/lib/enquiries/types";
import type { ListingIntent, PropertyType } from "@/lib/types";

export const ENQUIRY_TYPE_LABELS: Record<EnquiryType, string> = {
  REQUEST_VIEWING: "Request viewing",
  SCHEDULE_VIEWING: "Schedule viewing",
  BOOK_INSPECTION: "Book inspection",
  ENQUIRE_PROPERTY: "Enquire about property",
  TALK_TO_CONSULTANT: "Talk to a HouseLink consultant",
  REQUEST_INFO: "Request more information",
  ASK_QUESTION: "Ask a question",
  BOOK_HOLIDAY: "Book holiday home",
  CHECK_AVAILABILITY: "Check availability",
  REQUEST_ROOM_VIEWING: "Request room viewing",
  CONTACT_HOUSELINK: "Contact HouseLink",
  ROOMMATE_MATCH: "Roommate enquiry",
};

export const ENQUIRY_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  CONTACTED: "Contacted",
  CUSTOMER_RESPONDED: "Customer responded",
  VIEWING_SCHEDULED: "Viewing scheduled",
  VIEWING_COMPLETED: "Viewing completed",
  FOLLOW_UP_REQUIRED: "Follow-up required",
  NEGOTIATING: "Negotiating",
  OFFER_SUBMITTED: "Offer submitted",
  OFFER_ACCEPTED: "Offer accepted",
  OFFER_DECLINED: "Offer declined",
  BOOKING_CONFIRMED: "Booking confirmed",
  RENTAL_APPROVED: "Rental approved",
  SALE_COMPLETED: "Sale completed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  LOST_LEAD: "Lost lead",
  SENT: "New",
};

export function enquiryActionsForListing(
  type: PropertyType | string,
  intent: ListingIntent | string,
): Array<{ type: EnquiryType; label: string; primary?: boolean }> {
  if (type === "holiday_home") {
    return [
      { type: "CHECK_AVAILABILITY", label: "Check availability", primary: true },
      { type: "BOOK_HOLIDAY", label: "Book through HouseLink" },
      { type: "TALK_TO_CONSULTANT", label: "Talk to a consultant" },
    ];
  }
  if (type === "room") {
    return [
      { type: "REQUEST_ROOM_VIEWING", label: "Request room viewing", primary: true },
      { type: "ENQUIRE_PROPERTY", label: "Enquire about this room" },
      { type: "TALK_TO_CONSULTANT", label: "Talk to a HouseLink consultant" },
    ];
  }
  if (intent === "buy") {
    return [
      { type: "BOOK_INSPECTION", label: "Book inspection", primary: true },
      { type: "ASK_QUESTION", label: "Ask about price or title deeds" },
      { type: "TALK_TO_CONSULTANT", label: "Speak to a buyer consultant" },
    ];
  }
  if (type === "commercial" || type === "land") {
    return [
      { type: "ENQUIRE_PROPERTY", label: "Enquire about property", primary: true },
      { type: "BOOK_INSPECTION", label: "Book inspection" },
      { type: "TALK_TO_CONSULTANT", label: "Talk to a consultant" },
    ];
  }
  return [
    { type: "REQUEST_VIEWING", label: "Request viewing", primary: true },
    { type: "ASK_QUESTION", label: "Ask about rent, deposit, or lease" },
    { type: "TALK_TO_CONSULTANT", label: "Speak to a rental consultant" },
  ];
}

export function defaultEnquiryType(type: PropertyType | string, intent: ListingIntent | string): EnquiryType {
  return enquiryActionsForListing(type, intent).find((a) => a.primary)?.type ?? "CONTACT_HOUSELINK";
}
