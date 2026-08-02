"use client";

import { FormEvent, useState } from "react";
import { HelpCircle, Send } from "lucide-react";

type Draft = { name: string; email: string; city: string; question: string; company: string };

const emptyDraft: Draft = { name: "", email: "", city: "", question: "", company: "" };

export function ReaderQuestionForm({ postId, compact = false }: { postId?: string; compact?: boolean }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/blog/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, postId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Question could not be sent.");
      setDraft(emptyDraft);
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Question could not be sent.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={compact ? "rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" : "rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30 sm:p-6"}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <HelpCircle className="size-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Ask HouseLink</p>
          <h2 className="mt-1 text-xl font-semibold text-ink dark:text-white">Send us your property question</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">We review reader questions and turn the useful ones into plain HouseLink guides.</p>
        </div>
      </div>
      {sent ? (
        <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-slate-900 dark:text-emerald-200">Thank you. Your question has been sent to the editorial team.</p>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <input className="hidden" tabIndex={-1} autoComplete="off" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} aria-hidden="true" />
          <div className="grid gap-3 sm:grid-cols-3">
            <input required minLength={2} placeholder="Your name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <input type="email" placeholder="Email optional" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <input placeholder="City or area" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <textarea required minLength={12} maxLength={1200} rows={compact ? 3 : 4} placeholder="Write your question in simple words..." value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          {error ? <p className="text-sm font-semibold text-red-600 dark:text-red-300">{error}</p> : null}
          <button type="submit" disabled={saving} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
            <Send className="size-4" />
            {saving ? "Sending..." : "Send question"}
          </button>
        </form>
      )}
    </section>
  );
}
