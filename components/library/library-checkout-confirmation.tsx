"use client";

import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, FileText, LibraryBig, MessageCircle, ReceiptText, RefreshCw, Upload, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { WhatsAppHelpLink } from "@/components/layout/whatsapp-help-link";
import { LibraryUpsellRail } from "@/components/library/library-upsell-rail";
import { SetPasswordCard } from "@/components/library/set-password-card";
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
  const whatsappContext = {
    source: stage.showProofReceived || stage.tone === "success" ? "order_status" : "confirmation",
    lane: "library" as const,
    orderNumber: order.orderNumber,
    paymentReference: reference,
    totalLabel: `${order.currency} ${order.total.toFixed(2)}`,
  };

  return (
    <PageShell
      eyebrow="Library checkout"
      title={stage.title}
      description={stage.description}
      compactHero
      actions={<Link href="/dashboard/my-library" className="bg-emerald-600 text-white hover:bg-emerald-500">Open My Library</Link>}
    >
      <div className={cn(
        "mb-4 break-words rounded-xl border px-4 py-3 text-sm font-semibold",
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

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="min-w-0 space-y-6">
        <SetPasswordCard />
        <section className="surface-panel min-w-0 max-w-full rounded-lg p-4 sm:p-5">
          <div className="grid gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                {stage.tone === "success" ? <CheckCircle2 className="size-6 shrink-0 text-emerald-600" /> : stage.tone === "error" ? <XCircle className="size-6 shrink-0 text-red-600" /> : <Clock className="size-6 shrink-0 text-amber-500" />}
                <h2 className="min-w-0 break-all text-xl font-semibold text-ink dark:text-white">{order.orderNumber}</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500">Created {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-left dark:bg-slate-900 sm:text-right">
              <p className="text-xs font-bold uppercase text-slate-500">Total</p>
              <p className="break-words text-2xl font-black text-ink dark:text-white">{order.currency} {order.total.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 sm:hidden">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <p className="break-words font-semibold text-ink dark:text-white">{item.title}</p>
                {item.productType && <p className="mt-1 text-xs uppercase text-slate-500">{item.productType.replace(/_/g, " ")}</p>}
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-bold uppercase text-slate-500">SKU</p>
                    <p className="mt-1 break-all text-slate-700 dark:text-slate-200">{item.sku}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-500">Qty</p>
                    <p className="mt-1 text-slate-700 dark:text-slate-200">{item.quantity}</p>
                  </div>
                  <div className="col-span-2 flex justify-between gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <span className="font-bold uppercase text-slate-500">Total</span>
                    <span className="font-semibold text-ink dark:text-white">{order.currency} {item.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 hidden overflow-x-auto sm:block">
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
                    <td className="py-3 font-semibold text-ink dark:text-white"><span className="block max-w-xs break-words">{item.title}</span></td>
                    <td className="break-all pr-3">{item.sku}</td>
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
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <li>Pay with the HouseLink details below.</li>
                    <li>
                      Put this reference on the transfer:{" "}
                      <strong className="break-all text-ink dark:text-white">{reference}</strong>
                    </li>
                    <li>Upload a clear PDF or photo of the receipt (bank slip, EcoCash, or ZIPIT screenshot).</li>
                  </ol>
                  <WhatsAppHelpLink
                    context={whatsappContext}
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white hover:bg-[#1ebe57]"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp help with this payment
                  </WhatsAppHelpLink>
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
                    <WhatsAppHelpLink
                      context={{ ...whatsappContext, source: "order_status" }}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      <MessageCircle className="size-4" />
                      Ask about this order on WhatsApp
                    </WhatsAppHelpLink>
                  </div>
                </div>
              )}

              {stage.showProofUpload && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Accepted: PDF, PNG, JPG · make sure the reference and amount are readable
                  </p>
                  <PaymentProofUpload
                    className="w-full"
                    paymentId={resolvedPaymentId}
                    label={stage.stage === "proof_rejected" ? "Upload a clearer proof of payment" : "Upload proof of payment"}
                    onUploaded={() => {
                      showToast("Proof uploaded. Finance will verify your Library payment.", "success");
                      void refreshOrder(true);
                    }}
                    showToast={showToast}
                  />
                </div>
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

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
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
          <WhatsAppHelpLink
            context={whatsappContext}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-bold text-white hover:bg-[#1ebe57]"
          >
            <MessageCircle className="size-4" />
            WhatsApp order help
          </WhatsAppHelpLink>
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
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-semibold text-ink dark:text-white">{value}</dd>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value }: { icon: typeof LibraryBig; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Icon className="size-5 text-emerald-600" />
      <p className="mt-3 text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink dark:text-white">{value}</p>
    </div>
  );
}
