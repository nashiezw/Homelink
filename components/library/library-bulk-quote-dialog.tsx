"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { LibraryProduct } from "@/lib/library/catalog";

export function LibraryBulkQuoteDialog({
  product,
  quantity,
  formatType,
  onClose,
  onSubmitted,
}: {
  product: LibraryProduct;
  quantity: number;
  formatType?: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    quantity: String(Math.max(quantity, 20)),
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function submit() {
    setBusy(true);
    setError("");
    const result = await apiFetch("/api/v1/library/quote-request", {
      method: "POST",
      body: JSON.stringify({
        productId: product.id,
        email: form.email,
        name: form.name,
        phone: form.phone,
        company: form.company,
        quantity: Number(form.quantity) || quantity,
        formatType,
        message: form.message,
      }),
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Could not submit quote request.");
      return;
    }
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-[#1a3560]/45 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-quote-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl border border-[#dfe8e5] bg-white shadow-xl sm:rounded-3xl dark:border-slate-700 dark:bg-slate-950"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e8f0ed] px-4 py-3.5 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#22a54b]">Bulk / firm quote</p>
            <h2 id="bulk-quote-title" className="mt-1 text-lg font-bold text-[#1a3560] dark:text-white">
              Request pricing for {product.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Best for 20+ printed copies, training firms, and team packs.</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-slate-200 dark:border-slate-700" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-3 p-4">
          <label className="text-sm font-medium">
            Work email
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="text-sm font-medium">
              Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>
          </div>
          <label className="text-sm font-medium">
            Company
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="text-sm font-medium">
            Quantity
            <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" min={1} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="text-sm font-medium">
            Notes
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" placeholder="Delivery city, training date, invoice needs…" />
          </label>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={busy} onClick={() => void submit()}>{busy ? "Sending…" : "Request quote"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
