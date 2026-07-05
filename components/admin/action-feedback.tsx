"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminActionFeedbackProps = {
  open: boolean;
  title: string;
  message: string;
  tone?: "success" | "warning" | "danger" | "info";
  details?: Array<{ label: string; value: string | number | undefined }>;
  onClose: () => void;
};

export function AdminActionFeedback({
  open,
  title,
  message,
  tone = "success",
  details = [],
  onClose,
}: AdminActionFeedbackProps) {
  if (!open) return null;
  const Icon = tone === "danger" || tone === "warning" ? AlertTriangle : tone === "info" ? Info : CheckCircle2;
  const toneClass =
    tone === "danger"
      ? "bg-red-500/15 text-red-200 ring-red-400/30"
      : tone === "warning"
        ? "bg-amber-500/15 text-amber-100 ring-amber-400/30"
        : tone === "info"
          ? "bg-cyan-500/15 text-cyan-100 ring-cyan-400/30"
          : "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="flex gap-3">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
              <Icon className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{message}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {details.length > 0 && (
          <div className="grid gap-2 p-5">
            {details.map((detail) => (
              <div key={detail.label} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{detail.label}</p>
                <p className="mt-1 break-words text-sm text-white">{detail.value ?? "N/A"}</p>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:flex sm:justify-end border-t border-white/10 p-4">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

