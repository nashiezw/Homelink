"use client";

import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import { runAdminAction } from "@/components/admin/admin-action";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import type { ModerationItem } from "@/lib/admin/types";
import { useState } from "react";

export function ContentModerationHub({
  items,
  onRefresh,
}: {
  items: ModerationItem[];
  onRefresh: () => void;
}) {
  const { showToast } = useApp();
  const [selected, setSelected] = useState<ModerationItem | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  async function act(action: string, id: string, reason?: string) {
    await runAdminAction({ action, id, reason }, showToast, { onSuccess: onRefresh });
  }

  function decide(action: "resolve_moderation" | "dismiss_moderation", item: ModerationItem) {
    const resolving = action === "resolve_moderation";
    setDialog({
      title: resolving ? "Resolve moderation item" : "Dismiss moderation item",
      message: resolving
        ? "Confirm what was checked and why this item is now resolved."
        : "Dismiss only when this item is not actionable or has been raised in error.",
      tone: resolving ? "success" : "warning",
      confirmLabel: resolving ? "Resolve item" : "Dismiss item",
      fields: [{ name: "reason", label: resolving ? "Resolution note" : "Dismissal reason", type: "textarea", required: true }],
      onConfirm: (values) => act(action, item.id, values.reason),
    });
  }

  if (!items.length) {
    return <p className="text-sm text-slate-400">No open moderation items.</p>;
  }

  return (
    <div className="space-y-3">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      {selected && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-300">{selected.type}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{selected.title}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {selected.priority} priority - {selected.status}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setSelected(null)}>Close details</Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(selected.details ?? []).map((detail) => (
              <div key={detail.label} className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">{detail.label}</p>
                <p className="mt-1 text-sm text-slate-200">{detail.value}</p>
              </div>
            ))}
            {selected.targetId && (
              <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Linked target</p>
                <p className="mt-1 text-sm text-slate-200">{selected.targetType ?? "Target"}: {selected.targetId}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {items.map((item) => (
        <article
          key={item.id}
          className="flex flex-col justify-between gap-3 rounded-lg border border-white/5 bg-slate-950/50 p-4 sm:flex-row sm:items-center"
        >
          <div>
            <p className="text-xs font-semibold uppercase text-amber-400">{item.type}</p>
            <p className="font-medium text-white">{item.title}</p>
            <p className="text-xs text-slate-500">
              {item.reason} - {item.priority} - {item.status}
            </p>
            <p className="text-xs text-slate-600">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button variant="secondary" onClick={() => setSelected(item)}>View details</Button>
            <Button onClick={() => decide("resolve_moderation", item)}>Resolve</Button>
            <Button variant="secondary" onClick={() => decide("dismiss_moderation", item)}>
              Dismiss
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
