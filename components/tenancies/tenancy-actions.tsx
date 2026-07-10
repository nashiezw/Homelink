"use client";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { TenancyPaymentModal } from "@/components/tenancies/tenancy-payment-modal";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { formatPaymentAmount, type PaymentConfigResponse } from "@/lib/payments/payments-page";
import type { Payment } from "@/lib/store/types";
import type { Listing } from "@/lib/types";

type TenancyActionsProps = {
  listing: Listing;
  landlordUserId?: string;
};

export function TenancyActions(props: TenancyActionsProps) {
  return (
    <Suspense fallback={<CompactShell loading />}>
      <TenancyActionsInner {...props} />
    </Suspense>
  );
}

function TenancyActionsInner({ listing, landlordUserId }: TenancyActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, showToast } = useApp();
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  const activePaymentId = searchParams.get("tenancyPayment") ?? "";

  const loadActivePayment = useCallback(async (paymentId: string) => {
    if (!user || !paymentId) {
      setActivePayment(null);
      return;
    }
    const result = await apiFetch<Payment[]>("/api/v1/payments/checkout");
    const payment = result.data?.find((row) => row.id === paymentId) ?? null;
    setActivePayment(payment);
  }, [user]);

  useEffect(() => {
    void apiFetch<PaymentConfigResponse>("/api/v1/payments/config").then((result) => {
      if (result.data) setPaymentConfig(result.data);
    });
  }, []);

  useEffect(() => {
    void loadActivePayment(activePaymentId);
  }, [activePaymentId, loadActivePayment]);

  useEffect(() => {
    if (activePaymentId && user) {
      setModalOpen(true);
    }
  }, [activePaymentId, user]);

  function syncPaymentUrl(paymentId: string | null) {
    const url = new URL(window.location.href);
    if (paymentId) {
      url.searchParams.set("tenancyPayment", paymentId);
      url.searchParams.set("status", "pending");
    } else {
      url.searchParams.delete("tenancyPayment");
      url.searchParams.delete("status");
    }
    router.replace(url.pathname + url.search, { scroll: false });
  }

  function handlePaymentCreated(payment: Payment) {
    setActivePayment(payment);
    syncPaymentUrl(payment.id);
  }

  function handleProofUploaded() {
    void loadActivePayment(activePayment?.id ?? activePaymentId);
  }

  async function signLeaseOnly() {
    if (!user) return;
    setBusy(true);
    const result = await apiFetch("/api/v1/tenancies/lease", {
      method: "POST",
      body: JSON.stringify({
        listingId: listing.id,
        tenantUserId: user.id,
        landlordUserId: landlordUserId ?? user.id,
        fullAddress: `${listing.suburb}, ${listing.city}`,
      }),
    });
    setBusy(false);
    if (result.data) {
      showToast("Lease recorded — confirm in Tenancies dashboard.", "success");
      router.push("/dashboard/tenancies");
    } else {
      showToast(result.error?.message ?? "Could not record lease.", "error");
    }
  }

  if (!user) {
    const returnPath = `/listings/${listing.id}`;
    return (
      <CompactShell>
        <CompactHeader
          title="Pay rent or deposit"
          description="Sign in after your viewing to pay through HomeLink and create a verified tenancy record."
        />
        <Link href={`/auth?next=${encodeURIComponent(returnPath)}`} className="mt-4 block">
          <Button className="h-10 w-full">
            <Lock className="mr-2 size-4" />
            Sign in to pay
          </Button>
        </Link>
      </CompactShell>
    );
  }

  const isLandlord = user.id === landlordUserId;
  const currency = paymentConfig?.currency ?? "USD";
  const proofPending =
    activePayment &&
    activePayment.manual &&
    activePayment.proofStatus !== "VERIFIED" &&
    activePayment.status !== "PAID";
  const proofUploaded =
    activePayment?.proofStatus === "UPLOADED" || activePayment?.proofStatus === "VERIFIED";
  const paymentComplete = activePayment?.status === "PAID";

  let statusLabel = "Ready when you are";
  let statusTone: "neutral" | "pending" | "success" = "neutral";
  let ctaLabel = "Pay rent or deposit";
  let ctaVariant: "primary" | "secondary" = "primary";

  if (paymentComplete) {
    statusLabel = "Payment recorded";
    statusTone = "success";
    ctaLabel = "View tenancy";
  } else if (proofUploaded) {
    statusLabel = "Proof under review";
    statusTone = "pending";
    ctaLabel = "View payment status";
  } else if (proofPending) {
    statusLabel = "Payment started — upload proof";
    statusTone = "pending";
    ctaLabel = "Complete payment";
  }

  return (
    <>
      <CompactShell>
        <CompactHeader
          title="Verified tenancy payment"
          description="Pay through HomeLink (CBZ, ZIPIT, cash). Both parties confirm in Tenancies."
        />

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center justify-between gap-2">
            <StatusPill tone={statusTone} label={statusLabel} />
            {activePayment && !paymentComplete ? (
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {formatPaymentAmount(activePayment.currency || currency, activePayment.amount)}
              </span>
            ) : null}
          </div>
          {activePayment?.referenceNumber && !paymentComplete ? (
            <p className="mt-1 font-mono text-xs text-slate-500">
              Ref {activePayment.referenceNumber}
            </p>
          ) : null}
        </div>

        <Button
          className="mt-4 h-10 w-full"
          variant={ctaVariant === "primary" ? "primary" : "secondary"}
          onClick={() => {
            if (paymentComplete) {
              router.push("/dashboard/tenancies");
              return;
            }
            setModalOpen(true);
          }}
        >
          {paymentComplete ? (
            <>
              <CheckCircle2 className="mr-2 size-4" />
              {ctaLabel}
            </>
          ) : (
            <>
              <Building2 className="mr-2 size-4" />
              {ctaLabel}
              <ArrowRight className="ml-auto size-4" />
            </>
          )}
        </Button>

        {!paymentComplete && !proofPending && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void signLeaseOnly()}
            className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Sign lease only (no payment)
          </button>
        )}
      </CompactShell>

      <TenancyPaymentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          if (!activePayment || activePayment.status === "PAID") {
            syncPaymentUrl(null);
          }
        }}
        listing={listing}
        landlordUserId={landlordUserId}
        userId={user.id}
        isLandlord={isLandlord}
        paymentConfig={paymentConfig}
        activePayment={activePayment}
        onPaymentCreated={handlePaymentCreated}
        onProofUploaded={handleProofUploaded}
        showToast={showToast}
      />
    </>
  );
}

function CompactShell({ children, loading = false }: { children?: ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Loading payment options...
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function CompactHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
        <Building2 className="size-4" />
      </div>
      <div>
        <p className="font-semibold text-ink dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function StatusPill({
  tone,
  label,
}: {
  tone: "neutral" | "pending" | "success";
  label: string;
}) {
  const icon =
    tone === "success" ? <CheckCircle2 className="size-3.5" /> : tone === "pending" ? <Clock3 className="size-3.5" /> : null;
  return (
    <span
      className={
        tone === "success"
          ? "inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          : tone === "pending"
            ? "inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300"
            : "text-xs font-medium text-slate-500"
      }
    >
      {icon}
      {label}
    </span>
  );
}
