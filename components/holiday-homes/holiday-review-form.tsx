"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type HolidayReviewFormProps = {
  listingId: string;
};

export function HolidayReviewForm({ listingId }: HolidayReviewFormProps) {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState({
    cleanliness: 5,
    location: 5,
    communication: 5,
    valueForMoney: 5,
  });
  const [comment, setComment] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast("Sign in to leave a review.", "info");
      router.push(`/auth?next=/listings/${listingId}`);
      return;
    }

    setSubmitting(true);
    const result = await apiFetch("/api/v1/holiday-homes/reviews", {
      method: "POST",
      body: JSON.stringify({ listingId, ...ratings, comment }),
    });
    setSubmitting(false);

    if (result.data) {
      showToast("Review submitted. Thank you!");
      router.refresh();
    } else {
      showToast(result.error?.message ?? "Could not submit review.", "error");
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="font-semibold text-slate-950 dark:text-white">Leave a review</h3>
      {(
        [
          ["cleanliness", "Cleanliness"],
          ["location", "Location"],
          ["communication", "Communication"],
          ["valueForMoney", "Value for money"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between gap-4 text-sm">
          <span>{label}</span>
          <input
            type="range"
            min={1}
            max={5}
            value={ratings[key]}
            onChange={(e) => setRatings({ ...ratings, [key]: Number(e.target.value) })}
            className="w-40"
          />
        </label>
      ))}
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience..."
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit review"}
      </Button>
    </form>
  );
}
