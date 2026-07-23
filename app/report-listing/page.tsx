"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Flag } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

const REASONS = [
  { value: "stale", label: "Stale or already rented" },
  { value: "fake", label: "Fake or misleading listing" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "scam", label: "Suspected scam" },
  { value: "other", label: "Other concern" },
];

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-600 dark:bg-slate-900";

function ReportListingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, showToast } = useApp();
  const [listingId, setListingId] = useState(searchParams.get("listing") ?? "");
  const [reason, setReason] = useState("stale");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const id = listingId.trim();
    if (!id) {
      showToast("Enter a listing ID or link.", "error");
      return;
    }

    const normalizedId = id.includes("/listings/") ? id.split("/listings/").pop()?.split(/[?#]/)[0] ?? id : id;

    setSubmitting(true);
    const result = await apiFetch("/api/v1/reports", {
      method: "POST",
      body: JSON.stringify({
        listingId: normalizedId,
        reason,
        details: details.trim() || "Reported from report listing page",
      }),
    });
    setSubmitting(false);

    if (result.error) {
      showToast(result.error.message ?? "Could not submit report.", "error");
      return;
    }

    showToast("Report submitted. Our team will review it.");
    router.push("/safety");
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="premium-card mx-auto max-w-xl rounded-lg p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <Flag className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink dark:text-white">Submit a listing report</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {user ? "Signed in as " + user.email : "You can report without signing in."}
          </p>
        </div>
      </div>

      <label className="mt-6 block text-sm font-medium">
        Listing ID or URL *
        <input
          required
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          placeholder="e.g. harare-avondale-cottage or full listing link"
          className={fieldClass}
        />
      </label>

      <label className="mt-4 block text-sm font-medium">
        Reason *
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={fieldClass}>
          {REASONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm font-medium">
        Details
        <textarea
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="What looks wrong? Include anything that helps our team review faster."
          className={fieldClass}
        />
      </label>

      <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit report"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/search")}>
          Browse listings
        </Button>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Tip: open any listing and use the Report button on the listing page for the fastest flow.{" "}
        <Link href="/safety" className="font-medium text-emerald-700 hover:underline">
          Read safety guidance
        </Link>
      </p>
    </form>
  );
}

export default function ReportListingPage() {
  return (
    <PageShell
      eyebrow="Report listing"
      title="Help us remove fake, stale, or abusive listings."
      description="Reports go straight to the HouseLink review queue. Include the listing link or ID and as much detail as you can."
      highlights={[
        { value: "<24h", label: "typical review time" },
        { value: "Free", label: "for all users" },
        { value: "Private", label: "reporter details protected" },
      ]}
    >
      <Suspense fallback={<p className="text-center text-slate-500">Loading form...</p>}>
        <ReportListingForm />
      </Suspense>
    </PageShell>
  );
}
