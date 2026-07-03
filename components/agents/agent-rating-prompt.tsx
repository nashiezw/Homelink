"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { RateableAgentDeal } from "@/lib/agents/platform";

type AgentRatingPromptProps = {
  listingId: string;
};

function StarInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${label} ${star} stars`}
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition hover:scale-110"
          >
            <Star
              className={`size-5 ${star <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function AgentRatingPrompt({ listingId }: AgentRatingPromptProps) {
  const { user, showToast } = useApp();
  const [deal, setDeal] = useState<RateableAgentDeal | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState({
    professionalism: 5,
    communication: 5,
    knowledge: 5,
    responsiveness: 5,
  });
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!user) return;
    void apiFetch<RateableAgentDeal | null>(`/api/v1/agents/ratings?listingId=${listingId}`).then((res) => {
      setDeal(res.data ?? null);
    });
  }, [user, listingId]);

  async function submit() {
    if (!deal) return;
    setSubmitting(true);
    const result = await apiFetch("/api/v1/agents/ratings", {
      method: "POST",
      body: JSON.stringify({
        listingId,
        dealRef: deal.dealRef,
        comment,
        ...scores,
      }),
    });
    setSubmitting(false);
    if (result.data) {
      showToast("Thank you — your agent rating was submitted.");
      setDeal(null);
      setOpen(false);
    } else {
      showToast(result.error?.message ?? "Could not submit rating.", "error");
    }
  }

  if (!user || !deal) return null;

  return (
    <>
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="font-semibold text-emerald-900 dark:text-emerald-100">How was your experience with {deal.agentName}?</p>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
          Your rental on this property is complete. Rate your agent to help other seekers.
        </p>
        <Button className="mt-3" onClick={() => setOpen(true)}>
          Rate your agent
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-soft dark:bg-slate-900">
            <h3 className="text-lg font-semibold">Rate {deal.agentName}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {deal.listingTitle ?? "Completed deal"} ·{" "}
              <Link href={`/agents/${deal.agentSlug}`} className="text-emerald-700 hover:underline">
                View profile
              </Link>
            </p>
            <div className="mt-5 grid gap-3">
              <StarInput label="Professionalism" value={scores.professionalism} onChange={(v) => setScores({ ...scores, professionalism: v })} />
              <StarInput label="Communication" value={scores.communication} onChange={(v) => setScores({ ...scores, communication: v })} />
              <StarInput label="Knowledge" value={scores.knowledge} onChange={(v) => setScores({ ...scores, knowledge: v })} />
              <StarInput label="Responsiveness" value={scores.responsiveness} onChange={(v) => setScores({ ...scores, responsiveness: v })} />
            </div>
            <label className="mt-4 block text-sm font-medium">
              Comments (optional)
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Share your experience..."
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button className="flex-1" disabled={submitting} onClick={() => void submit()}>
                {submitting ? "Submitting..." : "Submit rating"}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Later
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
