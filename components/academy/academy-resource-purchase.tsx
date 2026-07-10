"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AcademyPaymentDetails } from "@/components/academy/academy-payment-details";
import { PaymentProofUpload } from "@/components/payments/payment-proof-upload";
import { apiFetch } from "@/lib/api/client";
import type { PublicPaymentConfig } from "@/lib/payments/public-payment-config";
import { cn } from "@/lib/utils";
import type { ToolkitAccessState } from "@/components/academy/academy-accordion";

const FALLBACK_PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "zipit", label: "ZIPIT" },
  { value: "cash", label: "Cash Deposit" },
] as const;

export type ResourcePurchaseProduct = {
  kind: "COURSE_TOOLKIT" | "TRAINING_MANUAL";
  title: string;
  subtitle?: string;
  description: string;
  courseId?: string;
  itemCount?: number;
  includes: string[];
  categories?: string[];
};

type AcademyResourcePurchaseModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
  product: ResourcePurchaseProduct;
  access: ToolkitAccessState;
  paymentInstructions?: string;
  accent?: string;
  showToast: (message: string, tone?: "error" | "success" | "info") => void;
};

export function AcademyResourcePurchaseModal({
  open,
  onClose,
  onComplete,
  product,
  access,
  paymentInstructions,
  accent = "#008b68",
  showToast,
}: AcademyResourcePurchaseModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [busy, setBusy] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [localAccess, setLocalAccess] = useState(access);

  useEffect(() => {
    if (open) {
      setLocalAccess(access);
      void apiFetch<PublicPaymentConfig>("/api/v1/payments/config").then((result) => {
        if (result.data) {
          setPaymentConfig({
            currency: result.data.currency,
            bankDetails: result.data.bankDetails,
            manualMethods: result.data.manualMethods,
          });
          if (result.data.manualMethods[0]?.id) {
            setPaymentMethod(result.data.manualMethods[0].id);
          }
        }
      });
    }
  }, [open, access]);

  if (!open) return null;

  const paymentMethods =
    paymentConfig?.manualMethods.length
      ? paymentConfig.manualMethods.map((method) => ({ value: method.id, label: method.label }))
      : FALLBACK_PAYMENT_METHODS.map((method) => ({ value: method.value, label: method.label }));

  const current = localAccess;
  const showCheckout = !current.unlocked && !current.paymentId;
  const showProofStep =
    !current.unlocked &&
    Boolean(current.paymentId) &&
    current.status !== "APPROVED" &&
    current.status !== "PAYMENT_UPLOADED";
  const proofUploaded = current.status === "PAYMENT_UPLOADED";
  const unlocked = current.unlocked;
  const priceLabel = current.price > 0 ? `${current.currency} ${current.price.toFixed(2)}` : "Free";

  async function completePurchase() {
    setBusy(true);
    const result = await apiFetch<{ id: string; paymentId?: string | null; status: string }>("/api/v1/academy/resources/register", {
      method: "POST",
      body: JSON.stringify({
        resourceKind: product.kind,
        courseId: product.courseId,
        paymentMethod,
      }),
    });
    setBusy(false);
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    const row = result.data;
    if (row) {
      setLocalAccess({
        ...current,
        status: row.status,
        paymentId: row.paymentId ?? current.paymentId,
        paymentMethod,
      });
    }
    showToast(Number(current.price) > 0 ? "Order created. Complete payment and upload your proof below." : "Access activated.");
    await onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-slate-950 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Academy checkout</p>
            <h2 className="mt-1 text-xl font-bold leading-snug">{product.title}</h2>
            {product.subtitle && <p className="mt-1 text-sm text-slate-500">{product.subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {unlocked ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100">
                <CheckCircle2 className="size-5" /> Access active
              </p>
              <p className="mt-1 text-emerald-800 dark:text-emerald-200">Your downloads are unlocked. Close this window and open the resource from your dashboard.</p>
            </div>
          ) : proofUploaded ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="font-semibold text-amber-900 dark:text-amber-100">Payment proof received</p>
              <p className="mt-1 text-amber-800 dark:text-amber-200">An admin will verify your payment and activate downloads. You will be notified in your dashboard.</p>
            </div>
          ) : (
            <>
              {(showCheckout || showProofStep) && (
                <>
                  <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{product.description}</p>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total due</p>
                    <p className="text-2xl font-bold" style={{ color: accent }}>{priceLabel}</p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm dark:bg-slate-950">
                    {product.itemCount ? `${product.itemCount} PDFs` : "Reference manual"}
                  </div>
                </div>
              </section>

              <section>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">What you get</p>
                <ul className="space-y-2">
                  {product.includes.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {!!product.categories?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.categories.map((category) => (
                      <span key={category} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400">
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {showCheckout && current.salesEnabled && (
                <>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Payment method
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">How checkout works</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4">
                      <li>Choose a payment method and create your order</li>
                      <li>Receive bank details and your payment reference</li>
                      <li>Pay and upload proof of payment</li>
                      <li>Admin verifies payment and unlocks downloads</li>
                    </ol>
                  </div>

                  <Button className="w-full py-3" disabled={busy} onClick={() => void completePurchase()} style={{ backgroundColor: accent }}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4 mr-2" />}
                    {current.price > 0 ? `Complete purchase — ${priceLabel}` : "Activate free access"}
                  </Button>
                </>
              )}

              {showProofStep && current.paymentId && (
                <section className="space-y-4">
                  <AcademyPaymentDetails
                    config={paymentConfig}
                    paymentMethod={current.paymentMethod ?? paymentMethod}
                    amount={current.price}
                    currency={current.currency}
                    extraInstructions={paymentInstructions}
                    variant="proof"
                  />
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">Step 2 — Upload payment proof</p>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                      After paying {priceLabel}, upload a screenshot or receipt so HomeLink can verify your payment.
                    </p>
                    {current.adminNote && (
                      <p className="mt-2 rounded-lg bg-white/70 p-2 text-xs text-amber-900 dark:bg-slate-950/40 dark:text-amber-100">{current.adminNote}</p>
                    )}
                    <PaymentProofUpload
                      className="mt-4 w-full"
                      paymentId={current.paymentId}
                      onUploaded={async () => {
                        setLocalAccess({ ...current, status: "PAYMENT_UPLOADED", paymentId: current.paymentId });
                        showToast("Proof uploaded. Admin approval is pending.");
                        await onComplete();
                      }}
                      showToast={showToast}
                    />
                  </div>
                </section>
              )}
                </>
              )}
            </>
          )}

          {!unlocked && !current.salesEnabled && (
            <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
              <Lock className="mb-2 size-5" />
              This resource is not currently available for purchase. Contact HomeLink Academy support.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function buildToolkitProduct(input: {
  courseTitle: string;
  courseId: string;
  itemCount: number;
  groups?: Array<{ category: string; items: Array<{ title: string }> }>;
}): ResourcePurchaseProduct {
  const categories = input.groups?.map((group) => group.category) ?? [];
  return {
    kind: "COURSE_TOOLKIT",
    courseId: input.courseId,
    title: `${input.courseTitle} Field Toolkit`,
    subtitle: "Print-ready branded PDFs for daily field work",
    description: "Unlock the complete HomeLink field toolkit for this programme — forms, checklists, planners, scripts, and flowcharts used by professional agents in Zimbabwe.",
    itemCount: input.itemCount,
    categories,
    includes: [
      `${input.itemCount} branded PDF downloads for this programme level`,
      "Client forms, listing documents, and viewing registers",
      "Marketing checklists, scripts, and daily planning tools",
      "Permanent download access after admin payment approval",
    ],
  };
}

export function buildManualProduct(): ResourcePurchaseProduct {
  return {
    kind: "TRAINING_MANUAL",
    title: "Complete Training Manual",
    subtitle: "Full HomeLink reference library",
    description: "The complete HomeLink Zimbabwe real estate agent training manual — your authoritative reference for procedures, compliance, client management, and professional standards.",
    includes: [
      "Full training manual PDF (comprehensive reference)",
      "Deep-dive guidance beyond daily lesson notes",
      "Compliance, documentation, and client journey reference",
      "Permanent download access after admin payment approval",
    ],
  };
}

export function ResourcePurchaseTrigger({
  label,
  onClick,
  accent = "#008b68",
  className,
}: {
  label: string;
  onClick: () => void;
  accent?: string;
  className?: string;
}) {
  return (
    <Button className={cn("w-full", className)} onClick={onClick} style={{ backgroundColor: accent }}>
      <FileText className="size-4 mr-2" /> {label}
    </Button>
  );
}
