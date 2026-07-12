"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { ViewingAppointment } from "@/lib/types";

type AgentViewingRequestsPanelProps = {
  showToast: (message: string, tone?: "error" | "success" | "info") => void;
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-ZW", {
    timeZone: "Africa/Harare",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function AgentViewingRequestsPanel({ showToast }: AgentViewingRequestsPanelProps) {
  const [appointments, setAppointments] = useState<ViewingAppointment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<{ appointments: ViewingAppointment[] }>("/api/v1/appointments");
    if (result.data) setAppointments(result.data.appointments);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: "CONFIRMED" | "CANCELLED") {
    setBusyId(id);
    const result = await apiFetch<{ appointment: ViewingAppointment }>(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (result.data?.appointment) {
      showToast(status === "CONFIRMED" ? "Viewing confirmed." : "Viewing request declined.");
      await load();
    } else {
      showToast(result.error?.message ?? "Could not update viewing.", "error");
    }
  }

  const pending = appointments.filter((item) => item.status === "REQUESTED" || item.status === "RESCHEDULED");
  const upcoming = appointments.filter((item) => item.status === "CONFIRMED");

  return (
    <div className="space-y-5">
      <section className="premium-card rounded-2xl p-5">
        <p className="font-semibold text-ink dark:text-white">Pending confirmation</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Review preferred times and confirm only when you can attend.
        </p>
        <div className="mt-4 space-y-3">
          {pending.map((item) => (
            <article key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-100">{item.seekerName}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-amber-900/90 dark:text-amber-100/90">
                    <Clock3 className="size-4" />
                    {formatWhen(item.startAt)}
                  </p>
                  <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                    {item.referenceNumber} · {item.location}
                  </p>
                  {item.notes && <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-100/90">{item.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <Button className="h-9" disabled={busyId === item.id} onClick={() => void updateStatus(item.id, "CONFIRMED")}>
                    <CheckCircle2 className="size-4" />
                    Confirm
                  </Button>
                  <Button className="h-9" variant="secondary" disabled={busyId === item.id} onClick={() => void updateStatus(item.id, "CANCELLED")}>
                    <XCircle className="size-4" />
                    Decline
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {!pending.length && <p className="text-sm text-slate-500">No viewing requests waiting for confirmation.</p>}
        </div>
      </section>

      <section className="premium-card rounded-2xl p-5">
        <p className="font-semibold text-ink dark:text-white">Confirmed viewings</p>
        <div className="mt-4 space-y-3">
          {upcoming.map((item) => (
            <article key={item.id} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="font-semibold text-emerald-950 dark:text-emerald-100">{item.seekerName}</p>
              <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-100/90">{formatWhen(item.startAt)}</p>
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">{item.referenceNumber} · {item.location}</p>
            </article>
          ))}
          {!upcoming.length && <p className="text-sm text-slate-500">No confirmed viewings yet.</p>}
        </div>
      </section>
    </div>
  );
}
