"use client";

import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, FileText, LibraryBig, ReceiptText, Upload } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

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
};

export function LibraryCheckoutConfirmation({ order, paymentId, status }: { order: ConfirmationOrder; paymentId?: string; status?: string }) {
  const paid = order.paymentStatus === "PAID" || order.status === "PAID" || order.status === "FULFILLED" || status === "success";
  return (
    <PageShell
      eyebrow="Library checkout"
      title={paid ? "Your Library order is confirmed" : "Your Library order is awaiting payment"}
      description={paid ? "Your purchased resources are being added to My Library." : "Your order has been created. Complete payment so HouseLink can approve access and downloads."}
      compactHero
      actions={<Link href="/dashboard/my-library" className="bg-emerald-600 text-white hover:bg-emerald-500">Open My Library</Link>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
        </section>

        <aside className="space-y-3">
          <StatusCard icon={LibraryBig} label="Library order" value={order.status} />
          <StatusCard icon={CreditCard} label="Payment" value={order.paymentStatus} />
          {paymentId && <StatusCard icon={ReceiptText} label="Payment reference" value={paymentId} />}
          {!paid && (
            <Button className="w-full" onClick={() => { window.location.href = `/payments?status=pending&id=${encodeURIComponent(paymentId ?? "")}`; }}>
              <Upload className="size-4" /> Continue payment
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

function StatusCard({ icon: Icon, label, value }: { icon: typeof LibraryBig; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Icon className="size-5 text-emerald-600" />
      <p className="mt-3 text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-ink dark:text-white">{value}</p>
    </div>
  );
}
