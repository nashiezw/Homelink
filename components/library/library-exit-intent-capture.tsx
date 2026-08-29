"use client";

import { CheckCircle2, Clock3, Mail, MessageCircle, Phone, ReceiptText, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { trackEvent } from "@/lib/analytics/client";
import { detectDeviceType, getOrCreateSessionId, getOrCreateVisitorId, readUtmParams } from "@/lib/analytics/visitor-client";
import { libraryCartSnapshot, rememberLibraryCheckoutContact } from "@/lib/library/cart-client";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type ExitIntentCaptureProps = {
  productId?: string;
  productTitle?: string;
  productSlug?: string;
  surface: "product" | "checkout";
  highIntent?: boolean;
  disabled?: boolean;
};

const HELP_OPTIONS = [
  { value: "complete_purchase", label: "Help me complete the purchase" },
  { value: "payment_proof", label: "I need payment/proof upload help" },
  { value: "choose_format", label: "Help me choose the right format" },
  { value: "ask_question", label: "I have a question first" },
];

const FIELD_CLASS =
  "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function storageKey(productSlug: string | undefined, suffix: string) {
  return `houselink_library_exit_capture:${productSlug || "checkout"}:${suffix}`;
}

function recentlySeen(productSlug?: string) {
  if (typeof window === "undefined") return true;
  const submitted = window.localStorage.getItem(storageKey(productSlug, "submitted"));
  if (submitted) return true;
  const shownAt = Number(window.localStorage.getItem(storageKey(productSlug, "shown_at")) || 0);
  return shownAt > 0 && Date.now() - shownAt < 24 * 60 * 60 * 1000;
}

export function LibraryExitIntentCapture({
  productId,
  productTitle,
  productSlug,
  surface,
  highIntent = false,
  disabled = false,
}: ExitIntentCaptureProps) {
  const { showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [trigger, setTrigger] = useState<"exit" | "back" | "helpful_delay">("helpful_delay");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    helpType: surface === "checkout" ? "payment_proof" : "complete_purchase",
    note: "",
  });
  const allowLeaveRef = useRef(false);
  const armedRef = useRef(false);

  const heading = surface === "checkout" ? "Need a hand finishing your Library order?" : "Still thinking about this guide?";
  const productLabel = productTitle || "this HouseLink Library guide";
  const showModal = useCallback((reason: typeof trigger) => {
    if (disabled || recentlySeen(productSlug)) return false;
    window.localStorage.setItem(storageKey(productSlug, "shown_at"), String(Date.now()));
    setTrigger(reason);
    setOpen(true);
    trackEvent("library_exit_intent_shown", productId || productSlug || surface, {
      productId,
      productTitle,
      productSlug,
      surface,
      trigger: reason,
    });
    return true;
  }, [disabled, productId, productSlug, productTitle, surface]);

  useEffect(() => {
    if (disabled || armedRef.current || typeof window === "undefined") return;
    if (recentlySeen(productSlug)) return;
    armedRef.current = true;

    const delay = window.setTimeout(() => {
      if (highIntent) showModal("helpful_delay");
    }, surface === "checkout" ? 10_000 : 28_000);

    const onMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 0 && !event.relatedTarget) showModal("exit");
    };
    document.addEventListener("mouseout", onMouseOut);

    const state = { ...(window.history.state ?? {}), houselinkLibraryExitGuard: true };
    window.history.pushState(state, "", window.location.href);
    const onPopState = () => {
      if (allowLeaveRef.current) return;
      const shown = showModal("back");
      if (shown) {
        window.history.pushState(state, "", window.location.href);
      } else {
        allowLeaveRef.current = true;
        window.history.back();
      }
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.clearTimeout(delay);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("popstate", onPopState);
    };
  }, [disabled, highIntent, productSlug, showModal, surface]);

  const valueLine = useMemo(() => {
    if (surface === "checkout") {
      return "Leave your details and we will help with payment, proof upload, invoice details, or access before the opportunity goes cold.";
    }
    return `Leave your details and we will help you decide if ${productLabel} is the right fit, then guide you through the quickest way to purchase.`;
  }, [productLabel, surface]);

  function dismiss(mode: "stay" | "leave_anyway") {
    setOpen(false);
    trackEvent("library_exit_intent_dismissed", productId || productSlug || surface, {
      productId,
      productTitle,
      productSlug,
      surface,
      trigger,
      mode,
    });
    if (mode === "leave_anyway") {
      allowLeaveRef.current = true;
      if (trigger === "back") {
        window.setTimeout(() => window.history.go(-2), 40);
      }
    }
  }

  async function submit() {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !phone || !email || !email.includes("@")) {
      setError("Please enter your name, phone number, and a valid email.");
      return;
    }
    setBusy(true);
    setError("");
    rememberLibraryCheckoutContact({ email, phone });
    const snapshot = libraryCartSnapshot();
    const utm = readUtmParams();
    const result = await apiFetch<{ id?: string; status?: string }>("/api/v1/library/exit-lead", {
      method: "POST",
      body: JSON.stringify({
        name,
        phone,
        email,
        helpType: form.helpType,
        note: form.note,
        productId,
        productTitle,
        productSlug,
        surface,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer,
        visitorId: getOrCreateVisitorId(),
        sessionId: getOrCreateSessionId(),
        deviceType: detectDeviceType(),
        ...utm,
        ...snapshot,
      }),
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Could not save your details. Please try again.");
      return;
    }
    window.localStorage.setItem(storageKey(productSlug, "submitted"), String(Date.now()));
    setOpen(false);
    showToast("Thanks. HouseLink has your details and can follow up properly.", "success");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/75 px-3 pb-3 pt-12 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="library-exit-title">
      <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl sm:max-h-[min(92dvh,44rem)] dark:bg-slate-950">
          <button
            type="button"
            onClick={() => dismiss("stay")}
            className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-lg border border-white/15 bg-slate-950/70 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid min-h-full md:grid-cols-[0.9fr_1.1fr]">
            <section className="bg-slate-950 px-5 py-5 pr-14 text-white sm:px-7 sm:py-7 md:pr-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase text-emerald-200">
                <MessageCircle className="size-3.5" />
                Quick follow-up
              </div>
              <h2 id="library-exit-title" className="mt-4 max-w-sm text-2xl font-black leading-tight sm:text-3xl">{heading}</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">{valueLine}</p>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Interested in</p>
                <p className="mt-1 text-base font-semibold leading-snug">{productLabel}</p>
              </div>

              <div className="mt-5 hidden gap-3 text-sm text-slate-200 sm:grid">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300"><Clock3 className="size-4" /></span>
                  <p className="leading-6">Fast help while your product interest is still fresh.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300"><ReceiptText className="size-4" /></span>
                  <p className="leading-6">Your invoice and payment follow-up can include the right phone number.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300"><ShieldCheck className="size-4" /></span>
                  <p className="leading-6">No repeated questions; your journey and cart context are saved together.</p>
                </div>
              </div>
            </section>

            <section className="bg-white px-5 py-5 sm:px-7 sm:py-7 dark:bg-slate-950">
              <div className="mb-5 mr-0 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 md:mr-10 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                <p className="leading-6"><span className="font-black">We will follow up professionally.</span> Share your details and HouseLink can help you complete the purchase without losing your place.</p>
              </div>

              <div className="space-y-3.5 sm:space-y-4">
                <div>
                  <label htmlFor="library-exit-name" className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</label>
                  <input id="library-exit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={FIELD_CLASS} placeholder="Your name" autoComplete="name" required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <label htmlFor="library-exit-phone" className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"><Phone className="size-3.5" /> Phone</label>
                    <input id="library-exit-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={FIELD_CLASS} placeholder="+263..." autoComplete="tel" inputMode="tel" required />
                  </div>
                  <div>
                    <label htmlFor="library-exit-email" className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"><Mail className="size-3.5" /> Email</label>
                    <input id="library-exit-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={FIELD_CLASS} placeholder="you@example.com" autoComplete="email" inputMode="email" required />
                  </div>
                </div>
                <div>
                  <label htmlFor="library-exit-help" className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">What should we help with?</label>
                  <select id="library-exit-help" value={form.helpType} onChange={(e) => setForm({ ...form, helpType: e.target.value })} className={cn(FIELD_CLASS, "bg-white dark:bg-slate-950")}>
                    {HELP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="library-exit-note" className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Optional note</label>
                  <textarea
                    id="library-exit-note"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="Tell us what you were unsure about"
                  />
                </div>
                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
              </div>
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-between sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-950">
          <button type="button" onClick={() => dismiss("leave_anyway")} className="text-sm font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            Leave anyway
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => dismiss("stay")}>Stay</Button>
            <Button type="button" className="w-full sm:w-auto" onClick={submit} loading={busy} loadingText="Saving details...">
              <MessageCircle className="size-4" /> Send my details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
