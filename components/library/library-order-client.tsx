"use client";

import Link from "next/link";
import { FileText, Mail, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

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
  items?: Array<{ id: string; title: string; sku: string; quantity: number; unitPrice: number; total: number }>;
  payment?: { status: string; proofStatus?: string | null; referenceNumber?: string | null; method?: string | null; provider?: string | null } | null;
};

export function LibraryOrderClient({ initialOrder }: { initialOrder: OrderDetail }) {
  const [order, setOrder] = useState(initialOrder);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiFetch<OrderDetail>(`/api/v1/library/orders/${initialOrder.id}`).then((result) => {
      if (result.data) setOrder(result.data);
    });
  }, [initialOrder.id]);

  async function resendEmail() {
    setBusy(true);
    setNotice("");
    const result = await apiFetch<{ message?: string }>(`/api/v1/library/orders/${order.id}/notify`, { method: "POST" });
    setBusy(false);
    setNotice(result.error?.message || result.data?.message || "Invoice email queued.");
  }

  return (
    <PageShell
      eyebrow="Library invoice"
      title={order.orderNumber}
      description="Order confirmation, payment status, purchased products, and invoice record for your HouseLink Library purchase."
      compactHero
      actions={<Link href="/dashboard/my-library" className="bg-emerald-600 text-white hover:bg-emerald-500">Back to My Library</Link>}
    >
      {notice && (
        <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          {notice}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="surface-panel rounded-lg p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <p className="text-sm text-slate-500">Customer</p>
              <p className="font-semibold text-ink dark:text-white">{order.customerName}</p>
              <p className="text-sm text-slate-500">{order.customerEmail}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-slate-500">Issued</p>
              <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
              <p className="text-sm text-slate-500">Payment: {order.paymentStatus}</p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
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
                    <td className="py-3 font-semibold">{item.title}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>{order.currency} {item.unitPrice.toFixed(2)}</td>
                    <td className="text-right">{order.currency} {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{order.currency} {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>
        <aside className="space-y-3">
          <Button className="w-full" onClick={() => window.print()}><Printer className="size-4" /> Print invoice</Button>
          <Button variant="secondary" className="w-full" onClick={() => { window.location.href = `/api/v1/library/orders/${order.id}/invoice`; }}>
            <FileText className="size-4" /> Download invoice
          </Button>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void resendEmail()}>
            <Mail className="size-4" /> {busy ? "Sending..." : "Resend email"}
          </Button>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <FileText className="mb-2 size-5 text-emerald-600" />
            <p className="font-semibold">Reference</p>
            <p className="mt-1 text-slate-500">{order.payment?.referenceNumber ?? order.id}</p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
