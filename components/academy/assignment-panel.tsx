"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, Upload } from "lucide-react";
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <ClipboardCheck className="size-4" /> Practical assessment
        </p>
        <h2 className="mt-2 text-xl font-bold leading-tight text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">{points} points</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {submissionStandards(title).map((item) => (
          <div key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      {submitted ? (
        <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100">
          <p className="font-semibold">Submitted</p>
          <p className="text-sm mt-1">Status: {status?.replace(/_/g, " ") ?? "Awaiting review"}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Your response / notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={7} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 leading-7 dark:border-slate-700 dark:bg-slate-900" placeholder="Write your field evidence, decision logic, risks found, client wording, and next steps..." />
          </label>
          <label className="block text-sm font-medium">
            File URL (upload via dashboard first, then paste link)
            <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900" placeholder="https://..." />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => void submit()} disabled={busy || !notes.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4 mr-2" />} Submit assignment
            </Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={onBack}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function submissionStandards(title: string) {
  if (/listing|property|market|valuation|photo/i.test(title)) {
    return [
      "Include verified property facts, pricing assumptions, condition notes, and missing information.",
      "Show how your work would help a real buyer, tenant, landlord, or investor make a safer decision.",
      "Attach or reference supporting evidence such as photos, checklist notes, comparable listings, or client messages.",
      "End with a clear professional recommendation and next action.",
    ];
  }

  if (/client|viewing|negotiation|lead|communication/i.test(title)) {
    return [
      "Use realistic client language, not textbook phrases.",
      "Show how you qualified the client, managed expectations, and recorded next steps.",
      "Identify at least one risk or objection and explain how you handled it.",
      "Submit evidence that a trainer can review: notes, script, follow-up message, or decision log.",
    ];
  }

  return [
    "Apply the lesson to a realistic Zimbabwe property scenario.",
    "Explain your reasoning, not only your final answer.",
    "List the evidence you checked and the records you would keep.",
    "State the next action you would take as a HouseLink professional.",
  ];
}
