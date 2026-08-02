"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Mail, MapPin, MessageCircle, Package, Printer, Truck, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { WhatsAppHelpLink } from "@/components/layout/whatsapp-help-link";
import { PaymentProofUpload } from "@/components/payments/payment-proof-upload";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { libraryOrderStageCopy, libraryOrderStatusLabel } from "@/lib/library/order-stage";
import { cn } from "@/lib/utils";

type OrderDetail = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  shipping?: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    province?: string;
    country?: string;
    notes?: string;
  } | null;
  needsShipping?: boolean;
  items?: Array<{ id: string; title: string; sku: string; quantity: number; unitPrice: number; total: number; productType?: string }>;
  payment?: {
    id?: string;
    status?: string;
    proofStatus?: string | null;
    proofUrl?: string | null;
    referenceNumber?: string | null;
    method?: string | null;
    provider?: string | null;
    manual?: boolean | null;
    adminNote?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  fulfilment?: {
    id: string;
    status: string;
    courier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    packedAt?: string | null;
    dispatchedAt?: string | null;
    deliveredAt?: string | null;
    dispatchNotes?: string | null;
    deliveryNotes?: string | null;
  } | null;
};

export function LibraryOrderClient({ initialOrder }: { initialOrder: OrderDetail }) {
  const { showToast } = useApp();
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const stage = useMemo(() => libraryOrderStageCopy(order), [order]);

  const refresh = useCallback(async () => {
    const result = await apiFetch<OrderDetail>(`/api/v1/library/orders/${initialOrder.id}`);
    if (result.data) setOrder(result.data);
  }, [initialOrder.id]);

  useEffect(() => {
    void refresh();
    if (stage.stage === "paid" || stage.stage === "fulfilled" || stage.stage === "refunded") return;
    const timer = window.setInterval(() => void refresh(), 20000);
    return () => window.clearInterval(timer);
  }, [refresh, stage.stage]);

  async function resendEmail() {
    setBusy(true);
    const result = await apiFetch<{ message?: string }>(`/api/v1/library/orders/${order.id}/notify`, { method: "POST" });
    setBusy(false);
    showToast(result.error?.message || result.data?.message || "Invoice email queued.", result.error ? "error" : "success");
  }

  const paymentId = order.payment?.id;

  return (
    <PageShell
      eyebrow="Library invoice"
      title={order.orderNumber}
      description={stage.description}
      compactHero
      actions={<Link href="/dashboard/my-library" className="bg-emerald-600 text-white hover:bg-emerald-500">Back to My Library</Link>}
    >
      <div className={cn(
        "mb-4 break-words rounded-xl border px-4 py-3 text-sm font-semibold",
        stage.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-950",
        stage.tone === "pending" && "border-amber-200 bg-amber-50 text-amber-950",
        stage.tone === "error" && "border-red-200 bg-red-50 text-red-950",
        stage.tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-800",
      )}>
        {stage.badge}: {stage.paymentDisplay.description}
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section className="surface-panel min-w-0 max-w-full rounded-lg p-4 sm:p-5">
            <div className="grid gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Customer</p>
                <p className="break-words font-semibold text-ink dark:text-white">{order.customerName}</p>
                <p className="break-all text-sm text-slate-500">{order.customerEmail}</p>
              </div>
              <div className="min-w-0 text-left sm:text-right">
                <p className="text-sm text-slate-500">Issued</p>
                <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                <p className="break-words text-sm text-slate-500">Order: {libraryOrderStatusLabel(order.status)} - Payment: {stage.badge}</p>
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
                    <div>
                      <p className="font-bold uppercase text-slate-500">Unit</p>
                      <p className="mt-1 text-slate-700 dark:text-slate-200">{order.currency} {item.unitPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold uppercase text-slate-500">Total</p>
                      <p className="mt-1 font-semibold text-ink dark:text-white">{order.currency} {item.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="py-3">Item</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3">
                        <p className="max-w-xs break-words font-semibold">{item.title}</p>
                        {item.productType && <p className="text-xs text-slate-500">{item.productType.replace(/_/g, " ")}</p>}
                      </td>
                      <td className="break-all pr-3">{item.sku}</td>
                      <td>{item.quantity}</td>
                      <td>{order.currency} {item.unitPrice.toFixed(2)}</td>
                      <td className="text-right">{order.currency} {item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex sm:justify-end">
              <div className="w-full space-y-1 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900 sm:max-w-xs">
                {order.subtotal != null && <div className="flex justify-between gap-4"><span>Subtotal</span><span className="text-right">{order.currency} {order.subtotal.toFixed(2)}</span></div>}
                {(order.discountTotal ?? 0) > 0 && <div className="flex justify-between gap-4 text-emerald-700"><span>Discount</span><span className="text-right">-{(order.discountTotal ?? 0).toFixed(2)}</span></div>}
                {(order.taxTotal ?? 0) > 0 && <div className="flex justify-between gap-4"><span>Tax</span><span className="text-right">{(order.taxTotal ?? 0).toFixed(2)}</span></div>}
                <div className="flex justify-between gap-4 text-lg font-bold">
                  <span>Total</span>
                  <span className="text-right">{order.currency} {order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          {(stage.showProofUpload || stage.showProofReceived) && paymentId && (
            <section className={cn(
              "surface-panel rounded-lg p-5",
              stage.showProofReceived ? "border-emerald-200" : stage.tone === "error" ? "border-red-200" : "border-amber-200",
            )}>
              <h2 className="font-semibold">{stage.title}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{stage.description}</p>
              {stage.showProofReceived && (
                <div className="mt-4 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Proof uploaded</p>
                    <p className="mt-1 text-sm">Finance is reviewing your receipt. No need to upload again.</p>
                    {order.payment?.proofUrl && (
                      <a href={order.payment.proofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-emerald-700 hover:underline">
                        View uploaded proof
                      </a>
                    )}
                  </div>
                </div>
              )}
              {stage.showProofUpload && (
                <PaymentProofUpload
                  className="mt-4 w-full"
                  paymentId={paymentId}
                  label={stage.stage === "proof_rejected" ? "Upload a clearer proof of payment" : "Upload proof of payment"}
                  onUploaded={() => {
                    showToast("Proof uploaded. Finance will verify your Library payment.", "success");
                    void refresh();
                  }}
                  showToast={showToast}
                />
              )}
              {paymentId && (
                <Button className="mt-3 w-full" variant="secondary" onClick={() => { window.location.href = `/library/checkout/confirmation?orderId=${encodeURIComponent(order.id)}&paymentId=${encodeURIComponent(paymentId)}`; }}>
                  <Upload className="size-4" /> Open payment instructions
                </Button>
              )}
            </section>
          )}

          {(order.shipping || order.fulfilment) && (
            <section className="grid gap-4 md:grid-cols-2">
              {order.shipping && (
                <div className="surface-panel rounded-lg p-5">
                  <h2 className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-emerald-600" /> Delivery address</h2>
                  <p className="mt-3 text-sm leading-6">
                    {order.shipping.name}<br />
                    {order.shipping.phone}<br />
                    {order.shipping.line1}
                    {order.shipping.line2 ? <><br />{order.shipping.line2}</> : null}
                    <br />
                    {order.shipping.city}{order.shipping.province ? `, ${order.shipping.province}` : ""}
                    <br />
                    {order.shipping.country || "Zimbabwe"}
                  </p>
                </div>
              )}
              {order.fulfilment && (
                <div className="surface-panel rounded-lg p-5">
                  <h2 className="flex items-center gap-2 font-semibold"><Truck className="size-4 text-emerald-600" /> Fulfilment tracking</h2>
                  <p className="mt-3 text-sm font-semibold capitalize">{order.fulfilment.status.toLowerCase().replace(/_/g, " ")}</p>
                  {order.fulfilment.courier && <p className="mt-2 text-sm text-slate-500">Courier: {order.fulfilment.courier}</p>}
                  {order.fulfilment.trackingNumber && (
                    <p className="mt-1 text-sm text-slate-500">
                      Tracking:{" "}
                      {order.fulfilment.trackingUrl ? (
                        <a href={order.fulfilment.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline">
                          {order.fulfilment.trackingNumber}
                        </a>
                      ) : order.fulfilment.trackingNumber}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
          <Button className="w-full" onClick={() => window.print()}><Printer className="size-4" /> Print invoice</Button>
          <Button variant="secondary" className="w-full" onClick={() => { window.open(`/api/v1/library/orders/${order.id}/invoice`, "_blank"); }}>
            <FileText className="size-4" /> Open printable invoice
          </Button>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void resendEmail()}>
            <Mail className="size-4" /> {busy ? "Sending..." : "Resend email"}
          </Button>
          <WhatsAppHelpLink
            context={{
              source: "order_status",
              lane: "library",
              orderNumber: order.orderNumber,
              paymentReference: order.payment?.referenceNumber ?? paymentId ?? order.id,
              totalLabel: `${order.currency} ${order.total.toFixed(2)}`,
            }}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-bold text-white hover:bg-[#1ebe57]"
          >
            <MessageCircle className="size-4" />
            Ask about this order on WhatsApp
          </WhatsAppHelpLink>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <Package className="mb-2 size-5 text-emerald-600" />
            <p className="font-semibold">Reference</p>
            <p className="mt-1 break-all text-slate-500">{order.payment?.referenceNumber ?? paymentId ?? order.id}</p>
            {order.needsShipping && stage.stage === "paid" && (
              <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-300">Payment confirmed. Printed items are being prepared for dispatch.</p>
            )}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
