import { cn } from "@/lib/utils";
import { ENQUIRY_STATUS_LABELS } from "@/lib/enquiries/labels";
import type { EnquiryStatus } from "@/lib/enquiries/types";

const TONE: Partial<Record<EnquiryStatus, string>> = {
  NEW: "bg-sky-100 text-sky-800",
  ASSIGNED: "bg-violet-100 text-violet-800",
  CONTACTED: "bg-blue-100 text-blue-800",
  VIEWING_SCHEDULED: "bg-amber-100 text-amber-900",
  VIEWING_COMPLETED: "bg-emerald-100 text-emerald-800",
  NEGOTIATING: "bg-orange-100 text-orange-900",
  OFFER_SUBMITTED: "bg-indigo-100 text-indigo-800",
  OFFER_ACCEPTED: "bg-emerald-100 text-emerald-900",
  BOOKING_CONFIRMED: "bg-teal-100 text-teal-900",
  SALE_COMPLETED: "bg-emerald-200 text-emerald-950",
  RENTAL_APPROVED: "bg-emerald-200 text-emerald-950",
  CLOSED: "bg-slate-200 text-slate-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  LOST_LEAD: "bg-rose-100 text-rose-900",
};

export function EnquiryStatusBadge({ status, className }: { status: string; className?: string }) {
  const label = ENQUIRY_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  const tone = TONE[status as EnquiryStatus] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", tone, className)}>
      {label}
    </span>
  );
}
