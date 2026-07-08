"use client";

import { ShieldCheck } from "lucide-react";
import { formatBankDetailLabel, resolveManualMethod, type PublicPaymentConfig } from "@/lib/payments/public-payment-config";

export function AcademyPaymentDetails({
  config,
  paymentMethod,
  amount,
  currency,
  extraInstructions,
  variant = "default",
}: {
  config: PublicPaymentConfig | null;
  paymentMethod: string;
  amount: number;
  currency: string;
  extraInstructions?: string;
  variant?: "default" | "proof";
}) {
  const method = resolveManualMethod(config, paymentMethod);
  const bankDetails = config?.bankDetails;
  const priceLabel = amount > 0 ? `${currency} ${amount.toFixed(2)}` : "Free";

  const shellClass =
    variant === "proof"
      ? "rounded-xl border border-emerald-200 bg-white p-4 text-sm dark:border-emerald-900/40 dark:bg-slate-950/60"
      : "rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50";

  return (
    <section className={shellClass}>
      <p className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <ShieldCheck className="size-4 text-emerald-600" /> HomeLink payment details
      </p>
      <div className="rounded-lg bg-emerald-50/80 px-3 py-2 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Amount to pay</p>
        <p className="text-xl font-bold">{priceLabel}</p>
        {method && <p className="mt-1 text-xs">Method: {method.label}</p>}
      </div>

      {method?.instructions && (
        <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">{method.instructions}</p>
      )}

      {(method?.accountName || method?.accountNumber || method?.bankName || method?.branch || method?.phoneNumber) && (
        <div className="mt-3 space-y-1 rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          {method.accountName && <DetailRow label="Account name" value={method.accountName} />}
          {method.bankName && <DetailRow label="Bank" value={method.bankName} />}
          {method.accountNumber && <DetailRow label="Account number" value={method.accountNumber} />}
          {method.branch && <DetailRow label="Branch" value={method.branch} />}
          {method.phoneNumber && <DetailRow label="Mobile money number" value={method.phoneNumber} />}
        </div>
      )}

      {bankDetails && (
        <div className="mt-3 space-y-1 rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Official HomeLink bank account</p>
          {Object.entries(bankDetails).map(([key, value]) =>
            value ? <DetailRow key={key} label={formatBankDetailLabel(key)} value={String(value)} /> : null,
          )}
        </div>
      )}

      {extraInstructions && (
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-400">
          {extraInstructions}
        </p>
      )}

      {!config && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Payment details are loading. If this persists, contact HomeLink support.</p>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-slate-700 dark:text-slate-300">
      <span className="font-medium text-slate-900 dark:text-white">{label}:</span> {value}
    </p>
  );
}
