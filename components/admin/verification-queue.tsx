"use client";

/* eslint-disable @next/next/no-img-element -- verification previews render arbitrary uploaded document/image URLs */

import { ExternalLink, FileText, XCircle } from "lucide-react";
import { useState } from "react";
import { runAdminAction } from "@/components/admin/admin-action";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import type { VerificationItem } from "@/lib/admin/types";

export function VerificationQueue({
  items,
  onRefresh,
}: {
  items: VerificationItem[];
  onRefresh: () => void;
}) {
  const { showToast } = useApp();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState<VerificationItem | null>(null);

  async function approve(id: string) {
    const ok = await runAdminAction({ action: "approve_verification", id }, showToast, {
      successMessage: "Verification approved.",
      onSuccess: onRefresh,
    });
    if (!ok) onRefresh();
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) {
      showToast("Please provide a rejection reason.", "error");
      return;
    }
    const ok = await runAdminAction(
      { action: "reject_verification", id, reason: rejectReason },
      showToast,
      { successMessage: "Verification rejected.", onSuccess: onRefresh },
    );
    if (ok) {
      setRejecting(null);
      setRejectReason("");
    }
  }

  if (!items.length) {
    return <p className="text-sm text-slate-400">No pending verification requests.</p>;
  }

  return (
    <div className="space-y-3">
      {preview?.documentUrl && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{preview.type}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{preview.subject}</h3>
                <p className="text-sm text-slate-400">{preview.userName} - submitted {new Date(preview.submittedAt).toLocaleString()}</p>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <a
                  href={preview.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  <ExternalLink className="size-4" /> Open file
                </a>
                <Button variant="secondary" onClick={() => setPreview(null)}>Close</Button>
              </div>
            </div>
            <div className="bg-slate-900/70 p-4">
              {preview.documentUrl.toLowerCase().match(/\.(png|jpg|jpeg|webp|gif)$/) ? (
                <img src={preview.documentUrl} alt={preview.subject} className="max-h-[70vh] w-full rounded-xl object-contain" />
              ) : (
                <iframe title={preview.subject} src={preview.documentUrl} className="h-[70vh] w-full rounded-xl border border-white/10 bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-lg border border-white/5 bg-slate-950/50 p-4"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-cyan-400">{item.type}</p>
              <p className="mt-1 font-medium text-white">{item.userName}</p>
              <p className="text-sm text-slate-300">{item.subject}</p>
              <p className="mt-2 text-xs text-slate-500">
                Priority: {item.priority} - Submitted {new Date(item.submittedAt).toLocaleString()}
              </p>
              {item.documentUrl && (
                <button
                  type="button"
                  onClick={() => setPreview(item)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:underline"
                >
                  <FileText className="size-4" />
                  View submitted document
                </button>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button onClick={() => void approve(item.id)}>Approve</Button>
              <Button variant="secondary" onClick={() => setRejecting(item.id)}>
                <XCircle className="size-4" /> Reject
              </Button>
            </div>
          </div>

          {rejecting === item.id && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <label className="block text-sm text-slate-300">
                Rejection reason (sent to user)
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                  placeholder="e.g. ID document is blurry or expired"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => void reject(item.id)}>
                  Confirm rejection
                </Button>
                <Button variant="secondary" onClick={() => { setRejecting(null); setRejectReason(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
