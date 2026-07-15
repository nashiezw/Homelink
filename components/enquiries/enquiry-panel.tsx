"use client";

import { MessageSquare, Phone, Send, User, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { Button } from "@/components/ui/button";
import { enquiryActionsForListing, ENQUIRY_TYPE_LABELS } from "@/lib/enquiries/labels";
import type { EnquiryType } from "@/lib/enquiries/types";
import { trackEvent } from "@/lib/analytics/client";
import { apiFetch } from "@/lib/api/client";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

type EnquiryPanelProps = {
  listing: Listing;
  className?: string;
};

export function EnquiryPanel({ listing, className }: EnquiryPanelProps) {
  const { user, showToast } = useApp();
  const { config } = usePlatformConfig();
  const router = useRouter();
  const actions = enquiryActionsForListing(listing.type, listing.intent);
  const [enquiryType, setEnquiryType] = useState<EnquiryType>(actions.find((a) => a.primary)?.type ?? actions[0].type);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const managed = config?.enquiries?.requireManagedEnquiries !== false;
  const showContact = config?.enquiries?.showPublicContactDetails === true;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() && !preferredDate) {
      showToast("Please add a message or preferred date.", "error");
      return;
    }

    setSubmitting(true);
    const result = await apiFetch<{ id: string }>("/api/v1/enquiries", {
      method: "POST",
      body: JSON.stringify({
        listingId: listing.id,
        enquiryType,
        name,
        email,
        phone,
        message: message || ENQUIRY_TYPE_LABELS[enquiryType],
        preferredDate: preferredDate || undefined,
        preferredTime: preferredTime || undefined,
      }),
    });
    setSubmitting(false);

    if (result.data) {
      trackEvent("enquiry_completed", listing.id, { enquiryId: result.data.id, enquiryType });
      setOpen(false);
      setMessage("");
      showToast("Your enquiry has been sent to HomeLink. A property consultant will contact you shortly.");
      if (user) router.push("/messages");
    } else {
      showToast(result.error?.message ?? "Could not submit enquiry.", "error");
    }
  }

  return (
    <div className={cn("max-w-full rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900", className)}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 sm:size-11">
          <MessageSquare className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink dark:text-white">Enquire through HomeLink</p>
          <p className="mt-1 text-sm leading-5 text-slate-500 sm:leading-6">
            {managed
              ? "A HomeLink consultant will handle your enquiry."
              : "Submit your enquiry and we will connect you with the right team."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {actions.map((action) => (
          <Button
            key={action.type}
            variant={action.primary ? "primary" : "secondary"}
            className="h-12 w-full justify-center px-3 text-sm sm:h-11"
            onClick={() => {
              setEnquiryType(action.type);
              trackEvent("enquiry_started", listing.id, { enquiryType: action.type });
              setOpen(true);
            }}
          >
            <span className="truncate">{action.label}</span>
          </Button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p className="font-semibold">Listed by {listing.landlordName}</p>
        <p className="mt-1 leading-5 text-emerald-800/80 dark:text-emerald-200/80">
          {listing.landlordVerified ? "Verified advertiser. " : ""}
          Contact details are managed by HomeLink.
        </p>
      </div>

      {showContact && listing.phone ? (
        <div className="mt-3 flex gap-2">
          <a href={`tel:${listing.phone}`} className="text-sm font-medium text-emerald-700 hover:underline">
            <Phone className="mr-1 inline size-3.5" />
            Call
          </a>
        </div>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <form
            onSubmit={(e) => void submit(e)}
            className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{ENQUIRY_TYPE_LABELS[enquiryType]}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{listing.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
                aria-label="Close enquiry form"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {!user && (
                <>
                  <label className="block text-sm font-medium">
                    Your name
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Phone
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                    />
                  </label>
                </>
              )}

              {(enquiryType === "REQUEST_VIEWING" ||
                enquiryType === "SCHEDULE_VIEWING" ||
                enquiryType === "BOOK_INSPECTION" ||
                enquiryType === "REQUEST_ROOM_VIEWING") && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Preferred date
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Preferred time
                    <input
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                    />
                  </label>
                </div>
              )}

              <label className="block text-sm font-medium">
                Message
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you are looking for..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-600 dark:bg-slate-950"
                />
              </label>

              <p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                <User className="mt-0.5 size-3.5 shrink-0" />
                Your enquiry enters the HomeLink CRM and is assigned to a property consultant.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
              <Button type="button" variant="secondary" className="w-full" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full" disabled={submitting}>
                <Send className="size-4 shrink-0" />
                {submitting ? "Sending..." : "Submit"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
