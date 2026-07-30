"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, CreditCard, FileText, LibraryBig, ReceiptText, Upload } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PaymentProofUpload } from "@/components/payments/payment-proof-upload";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { formatBankDetailLabel, type PublicPaymentConfig } from "@/lib/payments/public-payment-config";

type ConfirmationOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  items?: Array<{ id: string; title: string; sku: string; quantity: number; unitPrice: number; total: number }>;
  payment?: { id?: string; status?: string; provider?: string | null; method?: string | null; proofStatus?: string | null } | null;
};

export function LibraryCheckoutConfirmation({ order, paymentId, status }: { order: ConfirmationOrder; paymentId?: string; status?: string }) {
  const paid = order.paymentStatus === "PAID" || order.status === "PAID" || order.status === "FULFILLED" || status === "success";
  const [config, setConfig] = useState<PublicPaymentConfig | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "error" | "success" | "info" } | null>(null);
  const [proofUploaded, setProofUploaded] = useState(Boolean(order.payment?.proofStatus && order.payment.proofStatus !== "NONE"));

  useEffect(() => {
    if (paid || !paymentId) return;
    void apiFetch<PublicPaymentConfig>("/api/v1/payments/config").then((result) => {
      if (result.data) setConfig(result.data);
    });
  }, [paid, paymentId]);

  const selectedMethodId = (order.payment?.method || order.payment?.provider || "").toLowerCase();
  const method =
    config?.manualMethods.find((item) => item.id.toLowerCase() === selectedMethodId) ??
    config?.manualMethods.find((item) => selectedMethodId.includes(item.id.toLowerCase())) ??
    config?.manualMethods[0];
  const bankEntries = Object.entries(config?.bankDetails ?? {}).filter(([, value]) => Boolean(value));

  return (
    <PageShell
      eyebrow="Library checkout"
      title={paid ? "Your Library order is confirmed" : "Your Library order is awaiting payment"}
      description={paid ? "Your purchased resources are being added to My Library." : "Pay with the same HouseLink bank details used for courses, then upload your proof of payment for finance verification."}
      compactHero
      actions={<Link href="/dashboard/my-library" className="bg-emerald-600 text-white hover:bg-emerald-500">Open My Library</Link>}
    >
      {toast && (
        <div role="status" className={`mb-4 rounded-lg border px-4 py-3 text-sm font-semibold ${toast.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          {toast.message}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="surface-panel rounded-lg p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                {paid ? <CheckCircle2 className="size-6 text-emerald-600" /> : <Clock className="size-6 text-amber-500" />}
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

          {!paid && paymentId && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <h3 className="text-lg font-semibold text-ink dark:text-white">Complete payment</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Use the same HouseLink payment details as Academy courses. Include reference <strong>{paymentId}</strong> on your transfer, then upload proof below.
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
              <PaymentProofUpload
                className="mt-4 w-full"
                paymentId={paymentId}
                label={proofUploaded ? "Proof uploaded — replace if needed" : "Upload proof of payment"}
                onUploaded={() => {
                  setProofUploaded(true);
                }}
                showToast={(message, tone = "info") => setToast({ message, tone })}
              />
              {proofUploaded && (
                <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Proof received. Finance will verify and unlock your Library access.
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-3">
          <StatusCard icon={LibraryBig} label="Library order" value={order.status} />
          <StatusCard icon={CreditCard} label="Payment" value={proofUploaded && !paid ? "PROOF UPLOADED" : order.paymentStatus} />
          {paymentId && <StatusCard icon={ReceiptText} label="Payment reference" value={paymentId} />}
          {!paid && paymentId && (
            <Button className="w-full" variant="secondary" onClick={() => { window.location.href = `/payments?status=pending&id=${encodeURIComponent(paymentId)}`; }}>
              <Upload className="size-4" /> Open full payments page
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
