"use client";

import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AcademyPaymentDetails } from "@/components/academy/academy-payment-details";
import { PaymentProofUpload } from "@/components/payments/payment-proof-upload";
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

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500";

type TenancyPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  listing: Listing;
  landlordUserId?: string;
  userId: string;
  isLandlord: boolean;
  paymentConfig: PaymentConfigResponse | null;
  activePayment: Payment | null;
  onPaymentCreated: (payment: Payment) => void;
  onProofUploaded: () => void;
  showToast: (message: string, tone?: "error" | "success" | "info") => void;
};

export function TenancyPaymentModal({
  open,
  onClose,
  listing,
  landlordUserId,
  userId,
  isLandlord,
  paymentConfig,
  activePayment,
  onPaymentCreated,
  onProofUploaded,
  showToast,
}: TenancyPaymentModalProps) {
  const [tenantEmail, setTenantEmail] = useState("");
  const [fullAddress, setFullAddress] = useState(`${listing.suburb}, ${listing.city}`);
  const [amount, setAmount] = useState(String(listing.price));
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [busy, setBusy] = useState(false);

  const currency = paymentConfig?.currency ?? "USD";
  const parsedAmount = Number(amount);
  const depositAmount = listing.listingDetails?.depositAmount;
  const paymentMethods = resolvePaymentMethods(paymentConfig);
  const manualMethods = paymentMethods.filter((method) => method.kind === "manual");
  const onlineMethods = paymentMethods.filter((method) => method.kind === "online");
  const zwlHint = formatZwlEquivalent(parsedAmount, paymentConfig?.exchangeRateUsdToZwl);

  useEffect(() => {
    if (!open) return;
    setFullAddress(`${listing.suburb}, ${listing.city}`);
    setAmount(String(listing.price));
    const methods = resolvePaymentMethods(paymentConfig);
    if (methods[0]?.id) setPaymentMethod(methods[0].id);
  }, [open, listing, paymentConfig]);

  if (!open) return null;

  const showProofStep =
    activePayment &&
    activePayment.manual &&
    activePayment.proofStatus !== "VERIFIED" &&
    activePayment.status !== "PAID";
  const proofUploaded =
    activePayment?.proofStatus === "UPLOADED" || activePayment?.proofStatus === "VERIFIED";
  const paymentComplete = activePayment?.status === "PAID";

  async function lookupTenant(): Promise<string | null> {
    const result = await apiFetch<{ id: string }>(`/api/v1/users/lookup?email=${encodeURIComponent(tenantEmail.trim())}`);
    return result.data?.id ?? null;
  }

  async function createTenancyPayment() {
    if (!landlordUserId) {
      showToast("This listing is not linked to a landlord account yet. Contact HouseLink support.", "error");
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
    let tenantId = userId;
    if (isLandlord) {
      const id = await lookupTenant();
      if (!id) {
        showToast("Tenant email not found on HouseLink.", "error");
        setBusy(false);
        return;
      }
      tenantId = id;
    }

    const result = await apiFetch<Payment & { redirectUrl?: string; message?: string }>("/api/v1/payments/checkout", {
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

    if (result.data) {
      const redirectUrl = result.data.redirectUrl ?? "";
      const isGatewayRedirect = redirectUrl && !redirectUrl.includes("tenancyPayment=");
      if (isGatewayRedirect) {
        window.location.href = redirectUrl;
        return;
      }
      onPaymentCreated(result.data);
      showToast(result.data.message ?? "Payment created. Pay using the details below, then upload proof.", "success");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-slate-950 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Tenancy payment
            </p>
            <h2 className="mt-1 text-xl font-bold leading-snug text-ink dark:text-white">{listing.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {listing.suburb}, {listing.city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {paymentComplete ? (
            <StatusCard tone="success" title="Payment recorded" body="HouseLink finance will confirm your tenancy record.">
              <Link href="/dashboard/tenancies">
                <Button variant="secondary" className="mt-3">Open Tenancies</Button>
              </Link>
            </StatusCard>
          ) : proofUploaded ? (
            <StatusCard
              tone="pending"
              title="Proof received"
              body="Finance is reviewing your payment. You will be notified when the verified tenancy record is active."
            />
          ) : showProofStep && activePayment ? (
            <>
              <StepHeader
                step={2}
                title="Pay and upload proof"
                body={`Transfer ${formatPaymentAmount(activePayment.currency || currency, activePayment.amount)} using reference ${activePayment.referenceNumber ?? activePayment.id}, then upload your receipt.`}
              />
              <AcademyPaymentDetails
                config={paymentConfig}
                paymentMethod={activePayment.method}
                amount={activePayment.amount}
                currency={activePayment.currency || currency}
                title="Tenancy payment instructions"
                extraInstructions={`Include reference ${activePayment.referenceNumber ?? activePayment.id} in your transfer narration.`}
                variant="proof"
              />
              <PaymentProofUpload
                paymentId={activePayment.id}
                onUploaded={onProofUploaded}
                showToast={showToast}
                className="w-full py-3"
              />
            </>
          ) : (
            <>
              <StepHeader
                step={1}
                title="Set up your payment"
                body="Choose the amount and how you will pay. Bank details and your reference appear on the next step."
              />

              {isLandlord && (
                <Field label="Tenant email on HouseLink">
                  <input
                    type="email"
                    placeholder="tenant@example.com"
                    value={tenantEmail}
                    onChange={(event) => setTenantEmail(event.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}

              <Field label="Property address">
                <input
                  value={fullAddress}
                  onChange={(event) => setFullAddress(event.target.value)}
                  placeholder="Full address (private until both agree)"
                  className={inputClass}
                />
              </Field>

              <Field label={`Amount (${currency})`}>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className={inputClass}
                />
                {zwlHint && <p className="mt-1 text-xs text-slate-500">{zwlHint}</p>}
              </Field>

              <div className="flex flex-wrap gap-2">
                <QuickAmountButton label="Monthly rent" value={listing.price} currency={currency} onSelect={setAmount} />
                {depositAmount ? <QuickAmountButton label="Deposit" value={depositAmount} currency={currency} onSelect={setAmount} /> : null}
              </div>

              {manualMethods.length > 0 && (
                <MethodSelect title="Zimbabwe — manual" methods={manualMethods} value={paymentMethod} onChange={setPaymentMethod} />
              )}
              {onlineMethods.length > 0 && (
                <MethodSelect title="Pay online" methods={onlineMethods} value={paymentMethod} onChange={setPaymentMethod} />
              )}

              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">
                <p className="font-semibold text-slate-700 dark:text-slate-300">What happens next</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>Confirm amount and payment method</li>
                  <li>Receive your HouseLink reference and bank details</li>
                  <li>Pay and upload proof of payment</li>
                  <li>Finance verifies and activates your tenancy record</li>
                </ol>
              </div>

              <Button className="w-full py-3" disabled={busy || paymentMethods.length === 0} onClick={() => void createTenancyPayment()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
                Continue — {formatPaymentAmount(currency, parsedAmount)}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({ step, title, body }: { step: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step {step}</p>
      <p className="mt-1 font-semibold text-ink dark:text-white">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}

function StatusCard({
  tone,
  title,
  body,
  children,
}: {
  tone: "success" | "pending";
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
      : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20";
  return (
    <div className={`rounded-xl border p-4 text-sm ${styles}`}>
      <p className="flex items-center gap-2 font-semibold text-ink dark:text-white">
        {tone === "success" ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Upload className="size-5 text-amber-600" />}
        {title}
      </p>
      <p className="mt-1 text-slate-600 dark:text-slate-400">{body}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {children}
    </label>
  );
}

function QuickAmountButton({
  label,
  value,
  currency,
  onSelect,
}: {
  label: string;
  value: number;
  currency: string;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(String(value))}
      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300"
    >
      {label}: {currency} {value}
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {methods.map((method) => (
          <option key={method.id} value={method.id}>
            {method.label}
          </option>
        ))}
      </select>
    </label>
  );
}
