"use client";

import { Flag, Heart, Scale, Share2 } from "lucide-react";
import { useState } from "react";
import { EnquiryPanel } from "@/components/enquiries/enquiry-panel";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { listingStatusMeta } from "@/lib/listings/status";
import type { Listing } from "@/lib/types";

type ListingDetailActionsProps = {
  listing: Listing;
};

export function ListingDetailActions({ listing }: ListingDetailActionsProps) {
  const { toggleFavourite, toggleCompare, isFavourite, isCompared, showToast } = useApp();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("stale");
  const status = listingStatusMeta(listing);
  const unavailable = status.key === "let" || status.key === "sold" || status.key === "off_market";

  async function shareListing() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: listing.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard.");
    }
  }

  async function submitReport() {
    await apiFetch("/api/v1/reports", {
      method: "POST",
      body: JSON.stringify({
        listingId: listing.id,
        reason: reportReason,
        details: "Reported from listing detail page",
      }),
    });
    setReportOpen(false);
    showToast("Report submitted. Our team will review it.");
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={shareListing}>
          <Share2 className="size-4" aria-hidden="true" />
          Share
        </Button>
        <Button
          variant="secondary"
          onClick={() => void toggleFavourite(listing.id)}
          className={isFavourite(listing.id) ? "border-emerald-300 bg-emerald-50" : ""}
        >
          <Heart className="size-4" aria-hidden="true" />
          {isFavourite(listing.id) ? "Saved" : "Save"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            toggleCompare(listing.id);
            showToast(isCompared(listing.id) ? "Removed from compare." : "Added to compare (max 3).");
          }}
        >
          <Scale className="size-4" aria-hidden="true" />
          Compare
        </Button>
        <Button variant="secondary" onClick={() => setReportOpen(true)}>
          <Flag className="size-4" aria-hidden="true" />
          Report
        </Button>
      </div>

      {status.key === "viewing" ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          A viewing is already in progress. You can still enquire, but confirm with HomeLink before travelling or paying.
        </div>
      ) : null}

      {unavailable ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
          This listing is marked {status.shortLabel.toLowerCase()}, so new enquiries are closed to prevent wasted calls and viewings.
        </div>
      ) : (
        <EnquiryPanel listing={listing} className="mt-5" />
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft dark:bg-slate-900">
            <h3 className="font-semibold">Report listing</h3>
            <select
              className="mt-4 h-11 w-full rounded-md border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            >
              <option value="fake">Fake listing</option>
              <option value="duplicate">Duplicate listing</option>
              <option value="stale">Stale / unavailable</option>
              <option value="scam">Scam</option>
            </select>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => void submitReport()}>Submit report</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setReportOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
