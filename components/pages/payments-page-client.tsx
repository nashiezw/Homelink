"use client";

import { CircleDollarSign, CreditCard, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { PLAN_DEFINITIONS } from "@/lib/payments/plans";
import type { Payment } from "@/lib/store/types";
import type { Listing } from "@/lib/types";

type PaymentConfig = {
  plans: Array<{ id: string; name: string; price: number; description: string }>;
  gateways: Array<{ id: string; label: string; enabled: boolean }>;
  manualMethods?: Array<{ id: string; label: string; enabled: boolean; requiresProof: boolean; instructions: string }>;
  bankDetails?: Record<string, string>;
};

export function PaymentsPageClient() {
  const { user, showToast } = useApp();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contextListing, setContextListing] = useState<Listing | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const selectedPaymentId = searchParams.get("id") ?? "";
  const selectedPlan = searchParams.get("plan") ?? "";
  const listingId = searchParams.get("listingId") ?? "";

  useEffect(() => {
    void apiFetch<PaymentConfig>("/api/v1/payments/config").then((r) => {
      if (r.data) setConfig(r.data);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    void apiFetch<Payment[]>("/api/v1/payments/checkout").then((r) => {
      if (r.data) setPayments(r.data);
    });
  }, [user]);

  useEffect(() => {
    if (!listingId) {
      setContextListing(null);
      return;
    }
    void apiFetch<Listing>(`/api/v1/listings/${listingId}`).then((r) => {
      if (r.data) setContextListing(r.data);
    });
  }, [listingId]);

  const plans = config?.plans ?? PLAN_DEFINITIONS.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.fixedPrice ?? 49,
    description: p.description,
  }));

  async function checkout(plan: string, provider: string) {
    if (!user) {
      showToast("Sign in to checkout.", "info");
      return;
    }
    const result = await apiFetch<{ redirectUrl: string; status: string; message?: string }>("/api/v1/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ plan, provider, listingId: listingId || undefined }),
    });
    if (result.data) {
      showToast(result.data.message ?? "Payment processed.");
      window.location.href = result.data.redirectUrl;
    } else {
      showToast(result.error?.message ?? "Checkout failed.", "error");
    }
  }

  const enabledGateways = config?.gateways.filter((g) => g.enabled) ?? [
    { id: "stripe", label: "Stripe", enabled: true },
    { id: "paynow", label: "Paynow", enabled: true },
  ];
  const paymentOptions = [
    ...enabledGateways,
    ...(config?.manualMethods ?? []).filter((method) => !enabledGateways.some((gateway) => gateway.id === method.id)),
  ];
  const selectedPayment = payments.find((payment) => payment.id === selectedPaymentId);
  const selectedManualMethod = selectedPayment ? config?.manualMethods?.find((method) => method.id === selectedPayment.method) : undefined;
  const visiblePlans = selectedPlan ? plans.filter((plan) => plan.id === selectedPlan) : plans.slice(0, 3);

  async function uploadProof(payment: Payment) {
    if (!proofUrl.trim()) {
      showToast("Add a proof URL or uploaded receipt path.", "error");
      return;
    }
    const result = await apiFetch(`/api/v1/payments/${payment.id}/proof`, {
      method: "POST",
      body: JSON.stringify({ proofUrl }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Could not upload proof.", "error");
      return;
    }
    showToast("Proof uploaded. HomeLink finance will review it.");
    setProofUrl("");
    void apiFetch<Payment[]>("/api/v1/payments/checkout").then((r) => {
      if (r.data) setPayments(r.data);
    });
  }

  return (
    <PageShell
      eyebrow="Payments"
      title="Subscriptions and listing upgrades"
      description="Prices and gateways are configured by admin in the control center."
    >
      {selectedPayment && (
        <div className="surface-panel mb-6 rounded-lg border border-emerald-200 p-5">
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">Selected payment</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <h2 className="text-2xl font-semibold text-ink dark:text-white">{selectedPayment.plan.replace(/_/g, " ")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {contextListing ? `${contextListing.title} - ${contextListing.suburb}, ${contextListing.city}` : "Payment created through HomeLink checkout"}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <PaymentMetric label="Amount" value={`$${selectedPayment.amount}`} />
                <PaymentMetric label="Status" value={selectedPayment.status.replace(/_/g, " ")} />
                <PaymentMetric label="Reference" value={selectedPayment.referenceNumber ?? selectedPayment.id} />
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="font-semibold">Manual payment instructions</p>
              {selectedManualMethod?.instructions && <p className="mt-2">{selectedManualMethod.instructions}</p>}
              {config?.bankDetails ? (
                <div className="mt-2 space-y-1">
                  {Object.entries(config.bankDetails).map(([key, value]) => (
                    <p key={key}><span className="font-medium">{key}:</span> {value}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-2">Use the payment reference above when sending proof.</p>
              )}
              {selectedPayment.manual && selectedPayment.proofStatus !== "VERIFIED" && (
                <div className="mt-3 space-y-2">
                  <input
                    value={proofUrl}
                    onChange={(event) => setProofUrl(event.target.value)}
                    className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm text-ink"
                    placeholder="Paste proof URL or receipt path"
                  />
                  <Button className="w-full" onClick={() => void uploadProof(selectedPayment)}>Upload proof</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {contextListing && !selectedPayment && (
        <div className="surface-panel mb-6 rounded-lg p-5">
          <p className="text-sm font-semibold text-emerald-700">Checkout for {contextListing.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Payment will be linked to this listing so the upgrade or tenancy record applies to the right property.
          </p>
        </div>
      )}

      <div className="surface-panel mb-6 grid overflow-hidden rounded-lg lg:grid-cols-[1fr_340px]">
        <div className="p-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            Upgrade visibility
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink dark:text-white">
            Put verified listings in front of serious seekers.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Payments support featured placements, subscriptions, and local
            Zimbabwe payment methods from one admin-managed setup.
          </p>
        </div>
        <div className="grid gap-3 border-t border-slate-200 bg-gradient-to-br from-emerald-50 to-slate-50 p-6 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 lg:border-l lg:border-t-0">
          {["Featured listing", "Agency subscription", "Property management"].map((item) => (
            <div key={item} className="rounded-md bg-white p-3 text-sm font-medium shadow-sm dark:bg-slate-900">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {visiblePlans.map((plan, index) => (
          <article key={plan.id} className={`premium-card relative overflow-hidden rounded-lg p-5 ${index === 1 ? "ring-2 ring-emerald-700/20" : ""}`}>
            {index === 1 && (
              <span className="absolute right-4 top-4 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
                Popular
              </span>
            )}
            <CircleDollarSign className="size-6 text-emerald-700" aria-hidden="true" />
            <h2 className="mt-4 font-semibold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-semibold text-ink dark:text-white">${plan.price}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.description}</p>
            <div className="mt-5 grid gap-2">
              {paymentOptions.map((gw) => (
                <Button key={gw.id} className="w-full" variant={gw.id === "stripe" ? "primary" : "secondary"} onClick={() => void checkout(plan.id, gw.id)}>
                  Pay with {gw.label}
                </Button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="surface-panel mt-6 grid gap-4 rounded-lg p-5 md:grid-cols-2">
        <div className="flex gap-3">
          <CreditCard className="size-5 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="font-semibold">Card & international</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Stripe checkout when enabled by admin.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Smartphone className="size-5 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="font-semibold">Zimbabwe payments</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Paynow, EcoCash, ZIPIT, bank transfer.</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function PaymentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-ink dark:text-white">{value}</p>
    </div>
  );
}
