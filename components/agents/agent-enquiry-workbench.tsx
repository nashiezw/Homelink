"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import { EnquiryStatusBadge } from "@/components/enquiries/enquiry-status-badge";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { ENQUIRY_TYPE_LABELS } from "@/lib/enquiries/labels";
import type { EnquiryStatus, PropertyEnquiry } from "@/lib/enquiries/types";
import { apiFetch } from "@/lib/api/client";

const QUICK_STATUSES: EnquiryStatus[] = [
  "CONTACTED",
  "VIEWING_SCHEDULED",
  "VIEWING_COMPLETED",
  "NEGOTIATING",
  "OFFER_SUBMITTED",
  "CLOSED",
  "LOST_LEAD",
];

export function AgentEnquiryWorkbench() {
  const { showToast } = useApp();
  const [enquiries, setEnquiries] = useState<PropertyEnquiry[]>([]);
  const [selected, setSelected] = useState<PropertyEnquiry | null>(null);
  const [viewingDate, setViewingDate] = useState("");
  const [note, setNote] = useState("");
  const [viewingFeedback, setViewingFeedback] = useState("");
  const [clientInterested, setClientInterested] = useState(true);

  const load = useCallback(async () => {
    const result = await apiFetch<{ enquiries: PropertyEnquiry[] }>("/api/v1/enquiries");
    setEnquiries(result.data?.enquiries ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    const result = await apiFetch<{ enquiry: PropertyEnquiry }>(`/api/v1/enquiries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (result.error) showToast(result.error.message ?? "Update failed.", "error");
    else {
      showToast("Enquiry updated.");
      void load();
      if (result.data?.enquiry) setSelected(result.data.enquiry);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {enquiries.length === 0 ? (
          <p className="text-sm text-slate-500">No assigned enquiries yet.</p>
        ) : (
          enquiries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(e)}
              className={`w-full rounded-lg border p-4 text-left ${
                selected?.id === e.id ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{e.seekerName}</p>
                <EnquiryStatusBadge status={e.status} />
              </div>
              <p className="text-sm text-slate-600">{e.listingTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{ENQUIRY_TYPE_LABELS[e.enquiryType]}</p>
            </button>
          ))
        )}
      </div>

      {selected && (
        <aside className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold">{selected.seekerName}</h3>
          <p className="text-sm text-slate-500">{selected.listingTitle}</p>
          <p className="mt-3 text-sm">{selected.message}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_STATUSES.map((status) => (
              <Button
                key={status}
                variant="secondary"
                className="h-8 text-xs"
                onClick={() => void patch(selected.id, { action: "update_status", status })}
              >
                {status.replace(/_/g, " ")}
              </Button>
            ))}
          </div>

          <label className="mt-4 block text-sm font-medium">
            Schedule viewing
            <input
              type="datetime-local"
              value={viewingDate}
              onChange={(e) => setViewingDate(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
            />
          </label>
          <Button
            className="mt-2 w-full"
            disabled={!viewingDate}
            onClick={() =>
              void patch(selected.id, {
                action: "schedule_viewing",
                scheduledAt: viewingDate,
                location: selected.listingTitle,
              })
            }
          >
            <Calendar className="size-4" />
            Schedule
          </Button>

          {selected.viewings.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Scheduled viewings</p>
              {selected.viewings.map((viewing) => (
                <div key={viewing.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-emerald-700">{viewing.referenceNumber}</p>
                  <p className="text-slate-600">{new Date(viewing.scheduledAt).toLocaleString()}</p>
                  <p className="text-slate-500">{viewing.location}</p>
                  {viewing.completedAt ? (
                    <p className="mt-1 text-xs text-slate-500">Completed · {viewing.outcome}</p>
                  ) : (
                    <>
                      <label className="mt-2 block text-xs font-medium">
                        Completion notes
                        <textarea
                          rows={2}
                          value={viewingFeedback}
                          onChange={(e) => setViewingFeedback(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="mt-2 flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={clientInterested}
                          onChange={(e) => setClientInterested(e.target.checked)}
                        />
                        Client is interested
                      </label>
                      <Button
                        className="mt-2 w-full"
                        variant="secondary"
                        onClick={() =>
                          void patch(selected.id, {
                            action: "complete_viewing",
                            viewingId: viewing.id,
                            outcome: "COMPLETED",
                            feedback: viewingFeedback || "Viewing completed",
                            clientInterested,
                          })
                        }
                      >
                        <CheckCircle2 className="size-4" />
                        Complete {viewing.referenceNumber}
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <label className="mt-4 block text-sm font-medium">
            Internal note
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => {
              void patch(selected.id, { action: "add_note", body: note, internal: true });
              setNote("");
            }}
          >
            Save note
          </Button>
        </aside>
      )}
    </div>
  );
}
