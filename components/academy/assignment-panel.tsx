"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

export function AssignmentPanel({
  assignmentId,
  title,
  description,
  points,
  submitted,
  status,
  onBack,
}: {
  assignmentId: string;
  title: string;
  description: string;
  points: number;
  submitted: boolean;
  status: string | null;
  onBack: () => void;
}) {
  const { showToast } = useApp();
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const result = await apiFetch(`/api/v1/academy/assignments/${assignmentId}/submit`, {
      method: "POST",
      body: JSON.stringify({ notes, fileUrls: fileUrl ? [fileUrl] : [] }),
    });
    setBusy(false);
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    showToast("Assignment submitted for review.");
    onBack();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{description}</p>
      <p className="mt-2 text-sm text-slate-500">{points} points</p>
      {submitted ? (
        <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100">
          <p className="font-semibold">Submitted</p>
          <p className="text-sm mt-1">Status: {status?.replace(/_/g, " ") ?? "Awaiting review"}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Your response / notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900" placeholder="Describe your work, observations, or upload notes..." />
          </label>
          <label className="block text-sm font-medium">
            File URL (upload via dashboard first, then paste link)
            <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900" placeholder="https://..." />
          </label>
          <div className="flex gap-3">
            <Button onClick={() => void submit()} disabled={busy || !notes.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4 mr-2" />} Submit Assignment
            </Button>
            <Button variant="secondary" onClick={onBack}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
