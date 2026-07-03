"use client";

import { useState } from "react";
import type { AgentLead } from "@/lib/agents/types";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type CloseLeadModalProps = {
  lead: AgentLead;
  onClose: () => void;
  onSuccess: () => void;
};

export function CloseLeadModal({ lead, onClose, onSuccess }: CloseLeadModalProps) {
  const [dealAmount, setDealAmount] = useState("450");
  const [type, setType] = useState<"RENTAL" | "SALE">(lead.clientType === "BUYER" ? "SALE" : "RENTAL");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    await apiFetch("/api/v1/agents/leads", {
      method: "POST",
      body: JSON.stringify({
        action: "close",
        leadId: lead.id,
        type,
        dealAmount: Number(dealAmount),
      }),
    });
    setSubmitting(false);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-soft dark:bg-slate-900">
        <h3 className="text-lg font-semibold">Close deal — {lead.clientName}</h3>
        <p className="mt-1 text-sm text-slate-500">Commission will be calculated from admin rules.</p>
        <label className="mt-4 block text-sm font-medium">
          Deal type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "RENTAL" | "SALE")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="RENTAL">Rental</option>
            <option value="SALE">Sale</option>
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium">
          Deal amount (USD)
          <input
            type="number"
            min={1}
            value={dealAmount}
            onChange={(e) => setDealAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <div className="mt-5 flex gap-2">
          <Button className="flex-1" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "Closing..." : "Close & record commission"}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
