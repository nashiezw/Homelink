"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { Listing } from "@/lib/types";

type TenancyActionsProps = {
  listing: Listing;
  landlordUserId?: string;
};

export function TenancyActions({ listing, landlordUserId }: TenancyActionsProps) {
  const router = useRouter();
  const { user, showToast } = useApp();
  const [tenantEmail, setTenantEmail] = useState("");
  const [fullAddress, setFullAddress] = useState(`${listing.suburb}, ${listing.city}`);
  const [amount, setAmount] = useState(String(listing.price));
  const [gateways, setGateways] = useState<Array<{ id: string; label: string; enabled: boolean }>>([]);
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiFetch<{ gateways: Array<{ id: string; label: string; enabled: boolean }> }>("/api/v1/payments/config").then((result) => {
      const enabled = result.data?.gateways.filter((gateway) => gateway.enabled) ?? [];
      setGateways(enabled);
      setProvider((current) => current || enabled[0]?.id || "");
    });
  }, []);

  if (!user) return null;

  const isLandlord = user.id === landlordUserId;

  async function lookupTenant(): Promise<string | null> {
    const result = await apiFetch<{ id: string }>(`/api/v1/users/lookup?email=${encodeURIComponent(tenantEmail)}`);
    return result.data?.id ?? null;
  }

  async function signLease() {
    setBusy(true);
    let tenantId = user!.id;
    if (isLandlord) {
      const id = await lookupTenant();
      if (!id) {
        showToast("Tenant email not found.", "error");
        setBusy(false);
        return;
      }
      tenantId = id;
    } else {
      if (!landlordUserId) return;
    }

    const result = await apiFetch("/api/v1/tenancies/lease", {
      method: "POST",
      body: JSON.stringify({
        listingId: listing.id,
        tenantUserId: isLandlord ? tenantId : user!.id,
        landlordUserId: landlordUserId ?? user!.id,
        fullAddress,
      }),
    });
    setBusy(false);
    if (result.data) {
      showToast("Lease recorded — confirm in Tenancies dashboard.");
      router.push("/dashboard/tenancies");
    }
  }

  async function payRent() {
    if (!landlordUserId) return;
    if (!provider) {
      showToast("No payment gateway is enabled. Contact support or use lease confirmation.", "error");
      return;
    }
    setBusy(true);
    let tenantId = user!.id;
    if (isLandlord) {
      const id = await lookupTenant();
      if (!id) {
        showToast("Tenant email not found.", "error");
        setBusy(false);
        return;
      }
      tenantId = id;
    }

    const result = await apiFetch<{ redirectUrl?: string }>("/api/v1/payments/checkout", {
      method: "POST",
      body: JSON.stringify({
        plan: "tenancy_payment",
        provider,
        amount: Number(amount),
        listingId: listing.id,
        tenantUserId: tenantId,
        landlordUserId,
      }),
    });
    setBusy(false);
    if (result.data?.redirectUrl) {
      router.push(result.data.redirectUrl);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-ink">Verified tenancy</p>
      <p className="mt-1 text-xs text-slate-500">
        Pay rent or sign a lease through HomeLink to create a verified stay record (both parties must confirm).
      </p>

      {isLandlord && (
        <input
          type="email"
          placeholder="Tenant email on HomeLink"
          value={tenantEmail}
          onChange={(e) => setTenantEmail(e.target.value)}
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
        />
      )}

      <input
        value={fullAddress}
        onChange={(e) => setFullAddress(e.target.value)}
        placeholder="Full address (private until both agree)"
        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
      />

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount USD"
        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
        inputMode="decimal"
      />

      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
      >
        {gateways.length === 0 ? (
          <option value="">No payment gateways enabled</option>
        ) : (
          gateways.map((gateway) => (
            <option key={gateway.id} value={gateway.id}>
              {gateway.label}
            </option>
          ))
        )}
      </select>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="h-9" disabled={busy || !provider} onClick={() => void payRent()}>
          Pay via HomeLink
        </Button>
        <Button variant="secondary" className="h-9" disabled={busy} onClick={() => void signLease()}>
          Sign lease
        </Button>
      </div>
    </div>
  );
}
