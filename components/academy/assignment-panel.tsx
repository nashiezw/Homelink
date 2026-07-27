"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, FileText, Loader2, Upload, X } from "lucide-react";
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
  const [fileName, setFileName] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  async function uploadFile(file: File) {
    setUploadBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await apiFetch<{ url: string; filename: string; size: number }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({
          dataUrl: String(reader.result ?? ""),
          kind: file.type.startsWith("image/") ? "image" : "document",
          folder: "academy",
        }),
      });
      setUploadBusy(false);
      if (result.error || !result.data?.url) {
        showToast(result.error?.message ?? "Could not upload this file.", "error");
        return;
      }
      setFileUrl(result.data.url);
      setFileName(file.name);
      showToast("File uploaded.");
    };
    reader.onerror = () => {
      setUploadBusy(false);
      showToast("Could not read this file.", "error");
    };
    reader.readAsDataURL(file);
  }

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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">Upload evidence</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Attach photos, PDFs, documents, or screenshots that support your assignment.</p>
              </div>
              <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 dark:bg-slate-950 dark:text-white dark:ring-slate-700 sm:w-auto">
                {uploadBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploadBusy ? "Uploading..." : "Choose file"}
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  disabled={uploadBusy || busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadFile(file);
                  }}
                />
              </label>
            </div>
            {fileUrl && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-white p-3 text-sm dark:border-emerald-900/50 dark:bg-slate-950">
                <div className="min-w-0 flex items-center gap-2">
                  <FileText className="size-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{fileName || "Uploaded evidence"}</p>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">View uploaded file</a>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  onClick={() => { setFileUrl(""); setFileName(""); }}
                  aria-label="Remove uploaded file"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:flex-1" onClick={() => void submit()} disabled={busy || uploadBusy || !notes.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4 mr-2" />} Submit assignment
            </Button>
            <Button className="w-full sm:flex-1" variant="secondary" onClick={onBack}>Cancel</Button>
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
