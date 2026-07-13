"use client";

import { MessageSquare, Phone, Send, User } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { Button } from "@/components/ui/button";
import { enquiryActionsForListing, ENQUIRY_TYPE_LABELS } from "@/lib/enquiries/labels";
import type { EnquiryType } from "@/lib/enquiries/types";
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
      setOpen(false);
      setMessage("");
      showToast("Your enquiry has been sent to HomeLink. A property consultant will contact you shortly.");
      if (user) router.push("/messages");
    } else {
      showToast(result.error?.message ?? "Could not submit enquiry.", "error");
    }
  }

  return (
    <div className={cn("max-w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900", className)}>
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <MessageSquare className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-ink dark:text-white">Enquire through HomeLink</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {managed
              ? "A verified HomeLink property consultant will manage your enquiry professionally."
              : "Submit your enquiry and we will connect you with the right team."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {actions.map((action) => (
          <Button
            key={action.type}
            variant={action.primary ? "primary" : "secondary"}
            className="h-11 w-full justify-start"
            onClick={() => {
              setEnquiryType(action.type);
              setOpen(true);
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/80 p-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p className="font-semibold">Listed by {listing.landlordName}</p>
        <p className="mt-1 text-emerald-800/80 dark:text-emerald-200/80">
          {listing.landlordVerified ? "Verified advertiser · " : ""}
          Contact details are managed by HomeLink to protect all parties.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(e) => void submit(e)}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <h3 className="text-lg font-semibold">{ENQUIRY_TYPE_LABELS[enquiryType]}</h3>
            <p className="mt-1 text-sm text-slate-500">{listing.title}</p>

            {!user && (
              <>
                <label className="mt-4 block text-sm font-medium">
                  Your name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium">
                  Phone
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
              </>
            )}

            {(enquiryType === "REQUEST_VIEWING" ||
              enquiryType === "SCHEDULE_VIEWING" ||
              enquiryType === "BOOK_INSPECTION" ||
              enquiryType === "REQUEST_ROOM_VIEWING") && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Preferred date
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Preferred time
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
              </div>
            )}

            <label className="mt-3 block text-sm font-medium">
              Message
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you are looking for..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              />
            </label>

            <div className="mt-5 flex gap-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                <Send className="size-4" />
                {submitting ? "Sending..." : "Submit enquiry"}
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>

            <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
              <User className="size-3.5" />
              Your enquiry enters the HomeLink CRM and is assigned to a property consultant.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
