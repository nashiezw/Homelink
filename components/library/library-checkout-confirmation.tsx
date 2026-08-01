"use client";

import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, FileText, LibraryBig, ReceiptText, RefreshCw, Upload, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { LibraryUpsellRail } from "@/components/library/library-upsell-rail";
import { PaymentProofUpload } from "@/components/payments/payment-proof-upload";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import type { LibraryDigitalUpsellSuggestion } from "@/lib/library/catalog";
import { libraryOrderStageCopy, libraryOrderStatusLabel } from "@/lib/library/order-stage";
import { formatBankDetailLabel, type PublicPaymentConfig } from "@/lib/payments/public-payment-config";
import { cn } from "@/lib/utils";

type ConfirmationOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  shippingMethod?: string | null;
  pickupAddress?: string | null;
  pickupInstructions?: string | null;
  pickupPhone?: string | null;
  items?: Array<{ id: string; productId?: string; title: string; sku: string; quantity: number; unitPrice: number; total: number; productType?: string }>;
  payment?: {
    id?: string;
    status?: string;
    provider?: string | null;
    method?: string | null;
    proofStatus?: string | null;
    proofUrl?: string | null;
    referenceNumber?: string | null;
    manual?: boolean | null;
    adminNote?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
};

export function LibraryCheckoutConfirmation({
  order: initialOrder,
  paymentId,
  status,
  nextBooks = [],
}: {
  order: ConfirmationOrder;
  paymentId?: string;
  status?: string;
  nextBooks?: LibraryDigitalUpsellSuggestion[];
}) {
  const { showToast } = useApp();
  const [order, setOrder] = useState(initialOrder);
  const [config, setConfig] = useState<PublicPaymentConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const resolvedPaymentId = paymentId || order.payment?.id || undefined;
  const stage = useMemo(() => libraryOrderStageCopy(order), [order]);
  const paid = stage.stage === "paid" || stage.stage === "fulfilled" || status === "success";

  const refreshOrder = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const result = await apiFetch<ConfirmationOrder>(`/api/v1/library/orders/${order.id}`);
    if (!silent) setRefreshing(false);
    if (result.data) setOrder(result.data);
  }, [order.id]);

  useEffect(() => {
    if (paid || !resolvedPaymentId) return;
    void apiFetch<PublicPaymentConfig>("/api/v1/payments/config").then((result) => {
      if (result.data) setConfig(result.data);
    });
  }, [paid, resolvedPaymentId]);

  useEffect(() => {
    if (paid || stage.stage === "refunded") return;
    const timer = window.setInterval(() => {
      void refreshOrder(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [paid, stage.stage, refreshOrder]);

  const selectedMethodId = (order.payment?.method || order.payment?.provider || "").toLowerCase();
  const method =
    config?.manualMethods.find((item) => item.id.toLowerCase() === selectedMethodId) ??
    config?.manualMethods.find((item) => selectedMethodId.includes(item.id.toLowerCase())) ??
    config?.manualMethods[0];
  const bankEntries = Object.entries(config?.bankDetails ?? {}).filter(([, value]) => Boolean(value));
  const reference = order.payment?.referenceNumber || resolvedPaymentId || order.orderNumber;

  return (
    <PageShell
      eyebrow="Library checkout"
      title={stage.title}
      description={stage.description}
      compactHero
      actions={<Link href="/dashboard/my-library" className="bg-emerald-600 text-white hover:bg-emerald-500">Open My Library</Link>}
    >
      <div className={cn(
        "mb-4 rounded-xl border px-4 py-3 text-sm font-semibold",
        stage.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100",
        stage.tone === "pending" && "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100",
        stage.tone === "error" && "border-red-200 bg-red-50 text-red-950 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-100",
        stage.tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
      )}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>{stage.paymentDisplay.description}</p>
          <button type="button" onClick={() => void refreshOrder()} className="inline-flex items-center gap-1 text-xs font-bold underline-offset-2 hover:underline">
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} /> Refresh status
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
        <section className="surface-panel rounded-lg p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                {stage.tone === "success" ? <CheckCircle2 className="size-6 text-emerald-600" /> : stage.tone === "error" ? <XCircle className="size-6 text-red-600" /> : <Clock className="size-6 text-amber-500" />}
                <h2 className="text-xl font-semibold text-ink dark:text-white">{order.orderNumber}</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500">Created {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-right dark:bg-slate-900">
              <p className="text-xs font-bold uppercase text-slate-500">Total</p>
              <p className="text-2xl font-black text-ink dark:text-white">{order.currency} {order.total.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-3">Product</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-semibold text-ink dark:text-white">{item.title}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td className="text-right">{order.currency} {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(() => {
            const hasDigital = (order.items ?? []).some((item) => item.productType && item.productType !== "PRINTED_BOOK");
            const hasPrinted = (order.items ?? []).some((item) => item.productType === "PRINTED_BOOK");
            if (!hasDigital && !hasPrinted) return null;
            return (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {hasDigital ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Digital next steps</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      After payment is confirmed, open <strong>My Library</strong> to download your files. Keep your licence details with your records.
                    </p>
                    <Link href="/dashboard/my-library" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                      Go to My Library
                    </Link>
                  </div>
                ) : null}
                {hasPrinted ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {order.shippingMethod === "PICKUP" ? "Local pickup" : "Printed next steps"}
                    </p>
                    {order.shippingMethod === "PICKUP" ? (
                      <>
                        {order.pickupAddress?.trim() ? (
                          <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-ink dark:text-white">
                            {order.pickupAddress.trim()}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                            After payment is confirmed we will share the exact pickup location and ready time.
                          </p>
                        )}
                        {order.pickupPhone?.trim() ? (
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            Phone:{" "}
                            <a href={`tel:${order.pickupPhone.trim()}`} className="font-semibold text-emerald-700 underline dark:text-emerald-300">
                              {order.pickupPhone.trim()}
                            </a>
                          </p>
                        ) : null}
                        {order.pickupInstructions?.trim() ? (
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {order.pickupInstructions.trim()}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        After payment is confirmed we prepare packing and courier delivery. You will get a dispatch update with tracking when available.
                      </p>
                    )}
                    <Link href="/returns" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                      Returns & reprints policy
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })()}

          {(stage.showBankDetails || stage.showProofUpload || stage.showProofReceived) && resolvedPaymentId && (
            <div className={cn(
              "mt-6 rounded-xl border p-5",
              stage.showProofReceived
                ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                : stage.tone === "error"
                  ? "border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20"
                  : "border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20",
            )}>
              <h3 className="text-lg font-semibold text-ink dark:text-white">{stage.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{stage.description}</p>
              {stage.showBankDetails && (
                <>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    Include reference <strong>{reference}</strong> on your transfer.
                  </p>
                  {method && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm font-bold text-ink dark:text-white">{method.label}</p>
                      {method.instructions && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{method.instructions}</p>}
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {method.accountName && <Detail label="Account name" value={method.accountName} />}
                        {method.accountNumber && <Detail label="Account number" value={method.accountNumber} />}
                        {method.bankName && <Detail label="Bank" value={method.bankName} />}
                        {method.branch && <Detail label="Branch" value={method.branch} />}
                        {method.phoneNumber && <Detail label="Phone" value={method.phoneNumber} />}
                      </dl>
                    </div>
                  )}
                  {bankEntries.length > 0 && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm font-bold text-ink dark:text-white">Bank details</p>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {bankEntries.map(([key, value]) => (
                          <Detail key={key} label={formatBankDetailLabel(key)} value={String(value)} />
                        ))}
                      </dl>
                    </div>
                  )}
                </>
              )}

              {stage.showProofReceived && (
                <div className="mt-4 flex gap-3 rounded-lg border border-emerald-200 bg-white p-4 dark:border-emerald-900/40 dark:bg-slate-950">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-950 dark:text-emerald-100">Proof uploaded</p>
                    <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-200/90">
                      Finance is reviewing your receipt. This page updates automatically when your payment is approved.
                    </p>
                    {order.payment?.proofUrl && (
                      <a href={order.payment.proofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                        View uploaded proof
                      </a>
                    )}
                  </div>
                </div>
              )}

              {stage.showProofUpload && (
                <PaymentProofUpload
                  className="mt-4 w-full"
                  paymentId={resolvedPaymentId}
                  label={stage.stage === "proof_rejected" ? "Upload a clearer proof of payment" : "Upload proof of payment"}
                  onUploaded={() => {
                    showToast("Proof uploaded. Finance will verify your Library payment.", "success");
                    void refreshOrder(true);
                  }}
                  showToast={showToast}
                />
              )}
            </div>
          )}
        </section>

        <LibraryUpsellRail
          title="Buy the next book"
          description="Soft-copy companions for what you just ordered — open a title to add it."
          suggestions={nextBooks}
          mode="link"
        />
        </div>

        <aside className="space-y-3">
          <StatusCard icon={LibraryBig} label="Library order" value={libraryOrderStatusLabel(order.status)} />
          <StatusCard icon={CreditCard} label="Payment" value={stage.badge} />
          {reference && <StatusCard icon={ReceiptText} label="Payment reference" value={reference} />}
          {stage.showProofUpload && resolvedPaymentId && (
            <Button className="w-full" variant="secondary" onClick={() => { window.location.href = `/payments?status=pending&id=${encodeURIComponent(resolvedPaymentId)}`; }}>
              <Upload className="size-4" /> Open payments page
            </Button>
          )}
          <Button variant="secondary" className="w-full" onClick={() => { window.location.href = `/dashboard/my-library/orders/${order.id}`; }}>
            <FileText className="size-4" /> View order details
          </Button>
          <Link href="/library" className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200">
            Continue shopping
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-ink dark:text-white">{value}</dd>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value }: { icon: typeof LibraryBig; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Icon className="size-5 text-emerald-600" />
      <p className="mt-3 text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-ink dark:text-white">{value}</p>
    </div>
  );
}
