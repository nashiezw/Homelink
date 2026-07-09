import type { Listing, ListingIntent } from "@/lib/types";

export type ListingWorkflowStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "VIEWING_IN_PROGRESS"
  | "RENTED"
  | "SOLD"
  | "EXPIRED"
  | "REJECTED"
  | "ARCHIVED"
  | "DELETED";

export type PublicListingStatusKey =
  | "available"
  | "viewing"
  | "let"
  | "for_sale"
  | "sold"
  | "pending"
  | "off_market";

export type ListingStatusMeta = {
  key: PublicListingStatusKey;
  label: string;
  shortLabel: string;
  tone: "green" | "yellow" | "red" | "blue" | "slate";
  description: string;
};

export const LISTING_WORKFLOW_STATUSES: ListingWorkflowStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "VIEWING_IN_PROGRESS",
  "RENTED",
  "SOLD",
  "EXPIRED",
  "REJECTED",
  "ARCHIVED",
  "DELETED",
];

export const PUBLIC_LISTING_STATUSES = ["ACTIVE", "VIEWING_IN_PROGRESS"] as const;

export function isPublicListingStatus(status?: string) {
  return status === "ACTIVE" || status === "VIEWING_IN_PROGRESS";
}

export function listingStatusMeta(input: Pick<Listing, "intent"> & { status?: string }): ListingStatusMeta {
  return listingStatusMetaFromValues(input.status, input.intent);
}

export function listingStatusMetaFromValues(status?: string, intent?: ListingIntent | string): ListingStatusMeta {
  const normalizedStatus = status ?? "ACTIVE";
  if (intent === "buy" && normalizedStatus === "ACTIVE") {
    return {
      key: "for_sale",
      label: "FOR SALE",
      shortLabel: "For sale",
      tone: "blue",
      description: "This property is actively listed for purchase.",
    };
  }

  switch (normalizedStatus) {
    case "ACTIVE":
      return {
        key: "available",
        label: "AVAILABLE",
        shortLabel: "Available",
        tone: "green",
        description: "This listing is open for enquiries and viewings.",
      };
    case "VIEWING_IN_PROGRESS":
      return {
        key: "viewing",
        label: "VIEWING IN PROGRESS",
        shortLabel: "Viewing in progress",
        tone: "yellow",
        description: "A serious viewing is underway. Ask HomeLink before travelling or paying.",
      };
    case "RENTED":
      return {
        key: "let",
        label: "LET",
        shortLabel: "Let",
        tone: "red",
        description: "This rental has already been taken.",
      };
    case "SOLD":
      return {
        key: "sold",
        label: "SOLD",
        shortLabel: "Sold",
        tone: "blue",
        description: "This property has been sold.",
      };
    case "PENDING_REVIEW":
    case "DRAFT":
      return {
        key: "pending",
        label: normalizedStatus.replace(/_/g, " "),
        shortLabel: normalizedStatus === "DRAFT" ? "Draft" : "Pending review",
        tone: "slate",
        description: "This listing is not live yet.",
      };
    default:
      const fallback = status ? status.replace(/_/g, " ") : "OFF MARKET";
      return {
        key: "off_market",
        label: fallback,
        shortLabel: status ? fallback.toLowerCase() : "Off market",
        tone: "slate",
        description: "This listing is not currently available.",
      };
  }
}
