"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type MarkRentedModalProps = {
  listingId: string;
  listingTitle: string;
  defaultSuburb: string;
  defaultCity: string;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, tone?: "info" | "error") => void;
};

export function MarkRentedModal({
  listingId,
  listingTitle,
  defaultSuburb,
  defaultCity,
  onClose,
  onSuccess,
  showToast,
}: MarkRentedModalProps) {
  const [tenantEmail, setTenantEmail] = useState("");
  const [fullAddress, setFullAddress] = useState(`${defaultSuburb}, ${defaultCity}`);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantEmail.trim()) {
      showToast("Enter your tenant's HomeLink email.", "error");
      return;
    }

    setBusy(true);
    const lookup = await apiFetch<{ id: string }>(
      `/api/v1/users/lookup?email=${encodeURIComponent(tenantEmail.trim())}`,
    );
    if (!lookup.data?.id) {
      showToast("Tenant not found — they need a HomeLink account.", "error");
      setBusy(false);
      return;
    }

    const result = await apiFetch(`/api/v1/listings/${listingId}/mark-rented`, {
      method: "POST",
      body: JSON.stringify({ tenantUserId: lookup.data.id, fullAddress }),
    });
    setBusy(false);

    if (result.data) {
      showToast("Listing marked let — tenant must confirm in Tenancies.");
      onSuccess();
      onClose();
    } else {
      showToast(result.error?.message ?? "Could not update listing.", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
      >
        <h3 className="text-lg font-semibold text-ink dark:text-white">Mark as let</h3>
        <p className="mt-1 text-sm text-slate-500">
          Creates an <strong>unverified</strong> stay record for {listingTitle}. Both parties must confirm.
          For verified history, use Pay via HomeLink or Sign lease on the listing page.
        </p>

        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Tenant email
          <input
            type="email"
            required
            value={tenantEmail}
            onChange={(e) => setTenantEmail(e.target.value)}
            placeholder="tenant@email.com"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Full address (private until both agree)
          <input
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Mark let"}
          </Button>
        </div>
      </form>
    </div>
  );
}
