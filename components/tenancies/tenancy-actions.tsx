"use client";

import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { AcademyPaymentDetails } from "@/components/academy/academy-payment-details";
import { PaymentProofUpload } from "@/components/payments/payment-proof-upload";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import {
  formatPaymentAmount,
  formatZwlEquivalent,
  resolvePaymentMethods,
  type PaymentConfigResponse,
} from "@/lib/payments/payments-page";
import type { Payment } from "@/lib/store/types";
import type { Listing } from "@/lib/types";

type TenancyActionsProps = {
  listing: Listing;
  landlordUserId?: string;
};

export function TenancyActions(props: TenancyActionsProps) {
  return (
    <Suspense fallback={<TenancyActionsShell loading />}>
      <TenancyActionsInner {...props} />
    </Suspense>
  );
}

function TenancyActionsInner({ listing, landlordUserId }: TenancyActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, showToast } = useApp();
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse | null>(null);
  const [tenantEmail, setTenantEmail] = useState("");
  const [fullAddress, setFullAddress] = useState(`${listing.suburb}, ${listing.city}`);
  const [amount, setAmount] = useState(String(listing.price));
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [busy, setBusy] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  const activePaymentId = searchParams.get("tenancyPayment") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const depositAmount = listing.listingDetails?.depositAmount;

  const paymentMethods = useMemo(() => resolvePaymentMethods(paymentConfig), [paymentConfig]);
  const manualMethods = paymentMethods.filter((method) => method.kind === "manual");
  const onlineMethods = paymentMethods.filter((method) => method.kind === "online");
  const currency = paymentConfig?.currency ?? "USD";
  const parsedAmount = Number(amount);
  const zwlHint = formatZwlEquivalent(parsedAmount, paymentConfig?.exchangeRateUsdToZwl);

  useEffect(() => {
    void apiFetch<PaymentConfigResponse>("/api/v1/payments/config").then((result) => {
      if (!result.data) return;
      setPaymentConfig(result.data);
      const methods = resolvePaymentMethods(result.data);
      if (methods[0]?.id) setPaymentMethod(methods[0].id);
    });
  }, []);

  useEffect(() => {
    if (!user || !activePaymentId) {
      setActivePayment(null);
      return;
    }
    void apiFetch<Payment[]>("/api/v1/payments/checkout").then((result) => {
      const payment = result.data?.find((row) => row.id === activePaymentId) ?? null;
      setActivePayment(payment);
    });
  }, [user, activePaymentId]);

  if (!user) {
    const returnPath = `/listings/${listing.id}`;
    return (
      <TenancyActionsShell>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Lock className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-white">Pay rent or deposit through HomeLink</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              After viewing and agreeing with a HomeLink consultant, sign in to pay rent or deposit here.
              Payment creates a verified tenancy record for both tenant and landlord.
            </p>
            <Link
              href={`/auth?next=${encodeURIComponent(returnPath)}`}
              className="mt-4 inline-flex"
            >
              <Button className="h-10">Sign in to pay</Button>
            </Link>
          </div>
        </div>
      </TenancyActionsShell>
    );
  }

  const isLandlord = user.id === landlordUserId;
  const showProofStep =
    activePayment &&
    activePayment.manual &&
    activePayment.proofStatus !== "VERIFIED" &&
    activePayment.status !== "PAID";
  const proofUploaded =
    activePayment?.proofStatus === "UPLOADED" || activePayment?.proofStatus === "VERIFIED";
  const paymentComplete = activePayment?.status === "PAID" || statusParam === "success";

  async function lookupTenant(): Promise<string | null> {
    const result = await apiFetch<{ id: string }>(`/api/v1/users/lookup?email=${encodeURIComponent(tenantEmail.trim())}`);
    return result.data?.id ?? null;
  }

  async function signLease() {
    setBusy(true);
    let tenantId = user!.id;
    if (isLandlord) {
      const id = await lookupTenant();
      if (!id) {
        showToast("Tenant email not found on HomeLink.", "error");
        setBusy(false);
        return;
      }
      tenantId = id;
    } else if (!landlordUserId) {
      showToast("Landlord details are not available for this listing.", "error");
      setBusy(false);
      return;
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
      showToast("Lease recorded — confirm in Tenancies dashboard.", "success");
      router.push("/dashboard/tenancies");
    } else {
      showToast(result.error?.message ?? "Could not record lease.", "error");
    }
  }

  async function createTenancyPayment() {
    if (!landlordUserId) {
      showToast("This listing is not linked to a landlord account yet. Contact HomeLink support.", "error");
      return;
    }
    if (!paymentMethod) {
      showToast("Choose a payment method.", "error");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast("Enter a valid payment amount in USD.", "error");
      return;
    }

    setBusy(true);
    let tenantId = user!.id;
    if (isLandlord) {
      const id = await lookupTenant();
      if (!id) {
        showToast("Tenant email not found on HomeLink.", "error");
        setBusy(false);
        return;
      }
      tenantId = id;
    }

    const result = await apiFetch<{ redirectUrl?: string; id?: string; message?: string }>("/api/v1/payments/checkout", {
      method: "POST",
      body: JSON.stringify({
        plan: "tenancy_payment",
        provider: paymentMethod,
        amount: parsedAmount,
        listingId: listing.id,
        tenantUserId: tenantId,
        landlordUserId,
      }),
    });
    setBusy(false);

    if (result.error) {
      showToast(result.error.message ?? "Could not create payment.", "error");
      return;
    }

    showToast(result.data?.message ?? "Payment created. Complete payment and upload proof below.", "success");
    if (result.data?.redirectUrl) {
      router.push(result.data.redirectUrl);
    } else if (result.data?.id) {
      router.push(`/listings/${listing.id}?tenancyPayment=${result.data.id}&status=pending`);
    }
  }

  function refreshActivePayment() {
    if (!activePaymentId) return;
    void apiFetch<Payment[]>("/api/v1/payments/checkout").then((result) => {
      const payment = result.data?.find((row) => row.id === activePaymentId) ?? null;
      setActivePayment(payment);
    });
  }

  return (
    <TenancyActionsShell>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink dark:text-white">Verified tenancy payment</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Pay rent or deposit through HomeLink using CBZ, ZIPIT, or cash. Both parties confirm in the Tenancies dashboard.
          </p>
        </div>
      </div>

      {paymentComplete ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100">
            <CheckCircle2 className="size-5" />
            Payment recorded
          </p>
          <p className="mt-1 text-emerald-800 dark:text-emerald-200">
            HomeLink finance will confirm and update your tenancy record. Check your Tenancies dashboard for next steps.
          </p>
          <Link href="/dashboard/tenancies" className="mt-3 inline-flex">
            <Button variant="secondary" className="h-9">Open Tenancies</Button>
          </Link>
        </div>
      ) : activePayment && showProofStep ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Step 2 — Pay and upload proof</p>
            <p className="mt-1 text-amber-800 dark:text-amber-200">
              Pay {formatPaymentAmount(activePayment.currency || currency, activePayment.amount)} using reference{" "}
              <strong className="font-mono">{activePayment.referenceNumber ?? activePayment.id}</strong>, then upload your receipt.
            </p>
          </div>

          <AcademyPaymentDetails
            config={paymentConfig}
            paymentMethod={activePayment.method}
            amount={activePayment.amount}
            currency={activePayment.currency || currency}
            extraInstructions={`Include reference ${activePayment.referenceNumber ?? activePayment.id} in your transfer narration.`}
            variant="proof"
          />

          <PaymentProofUpload
            paymentId={activePayment.id}
            onUploaded={refreshActivePayment}
            showToast={showToast}
            className="w-full"
          />
        </div>
      ) : activePayment && proofUploaded ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="font-semibold text-amber-900 dark:text-amber-100">Proof received — awaiting finance review</p>
          <p className="mt-1 text-amber-800 dark:text-amber-200">
            HomeLink finance will verify your payment and activate the verified tenancy record.
          </p>
        </div>
      ) : (
        <>
          {isLandlord && (
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tenant email on HomeLink
              <input
                type="email"
                placeholder="tenant@example.com"
                value={tenantEmail}
                onChange={(event) => setTenantEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          )}

          <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Property address
            <input
              value={fullAddress}
              onChange={(event) => setFullAddress(event.target.value)}
              placeholder="Full address (private until both agree)"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Amount ({currency})
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount USD"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              inputMode="decimal"
            />
          </label>

          {zwlHint && <p className="mt-1 text-xs text-slate-500">{zwlHint}</p>}

          <div className="mt-2 flex flex-wrap gap-2">
            <QuickAmountButton label="Monthly rent" value={listing.price} onSelect={setAmount} />
            {depositAmount ? (
              <QuickAmountButton label="Deposit" value={depositAmount} onSelect={setAmount} />
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {manualMethods.length > 0 && (
              <MethodSelect
                title="Zimbabwe — manual"
                methods={manualMethods}
                value={paymentMethod}
                onChange={setPaymentMethod}
              />
            )}
            {onlineMethods.length > 0 && (
              <MethodSelect
                title="Pay online"
                methods={onlineMethods}
                value={paymentMethod}
                onChange={setPaymentMethod}
              />
            )}
          </div>

          <AcademyPaymentDetails
            config={paymentConfig}
            paymentMethod={paymentMethod}
            amount={parsedAmount}
            currency={currency}
            extraInstructions="Use your HomeLink payment reference in the transfer narration. Proof upload follows on the next step."
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="h-10" disabled={busy || paymentMethods.length === 0} onClick={() => void createTenancyPayment()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
              Create payment
            </Button>
            <Button variant="secondary" className="h-10" disabled={busy} onClick={() => void signLease()}>
              <ShieldCheck className="mr-2 size-4" />
              Sign lease only
            </Button>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Step 1: create payment · Step 2: pay via CBZ/ZIPIT/cash · Step 3: upload proof · Step 4: finance approval
          </p>
        </>
      )}
    </TenancyActionsShell>
  );
}

function TenancyActionsShell({
  children,
  loading = false,
}: {
  children?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {loading ? (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Loading tenancy payment options...
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function QuickAmountButton({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: number;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(String(value))}
      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300"
    >
      {label}: ${value}
    </button>
  );
}

function MethodSelect({
  title,
  methods,
  value,
  onChange,
}: {
  title: string;
  methods: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {title}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
      >
        {methods.map((method) => (
          <option key={method.id} value={method.id}>
            {method.label}
          </option>
        ))}
      </select>
    </label>
  );
}
