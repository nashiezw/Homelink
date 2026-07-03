import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/enquiries/labels";
import type { PropertyEnquiry } from "@/lib/enquiries/types";

function csvEscape(value: string | number | undefined) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function enquiriesToCsv(enquiries: PropertyEnquiry[]) {
  const headers = [
    "ID",
    "Subject",
    "Type",
    "Status",
    "Customer",
    "Email",
    "Phone",
    "Property",
    "Owner",
    "Agent",
    "Created",
    "Updated",
    "Message",
  ];
  const rows = enquiries.map((e) =>
    [
      e.id,
      e.subjectType,
      ENQUIRY_TYPE_LABELS[e.enquiryType],
      ENQUIRY_STATUS_LABELS[e.status] ?? e.status,
      e.seekerName,
      e.seekerEmail ?? "",
      e.seekerPhone ?? "",
      e.listingTitle,
      e.ownerName,
      e.assignedAgentName ?? "",
      e.createdAt,
      e.updatedAt,
      e.message,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
