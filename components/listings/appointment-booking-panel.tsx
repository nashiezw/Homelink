"use client";

import { CalendarClock, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { Listing, ViewingAppointment } from "@/lib/types";

type Slot = { startAt: string; available: boolean };

export function AppointmentBookingPanel({ listing }: { listing: Listing }) {
  const { user, showToast } = useApp();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<ViewingAppointment | null>(null);

  useEffect(() => {
    void apiFetch<{ slots: Slot[] }>(`/api/v1/appointments?slots=true&listingId=${encodeURIComponent(listing.id)}`).then((result) => {
      if (result.data) {
        setSlots(result.data.slots);
        setSelected(result.data.slots.find((slot) => slot.available)?.startAt ?? "");
      }
    });
  }, [listing.id]);

  async function book() {
    if (!selected) {
      showToast("Choose an available viewing slot.", "error");
      return;
    }
    if (!user && !name.trim()) {
      showToast("Add your name before booking.", "error");
      return;
    }
    setSaving(true);
    const result = await apiFetch<{ appointment: ViewingAppointment }>("/api/v1/appointments", {
      method: "POST",
      body: JSON.stringify({
        listingId: listing.id,
        startAt: selected,
        seekerName: name,
        seekerEmail: email,
        seekerPhone: phone,
        notes,
      }),
    });
    setSaving(false);
    if (result.data?.appointment) {
      setAppointment(result.data.appointment);
      showToast(`Viewing requested: ${result.data.appointment.referenceNumber}`);
    } else {
      showToast(result.error?.message ?? "Could not book viewing.", "error");
    }
  }

  async function updateAppointment(status: "CANCELLED" | "RESCHEDULED") {
    if (!appointment) return;
    setSaving(true);
    const result = await apiFetch<{ appointment: ViewingAppointment }>(`/api/v1/appointments/${appointment.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        startAt: status === "RESCHEDULED" ? selected : undefined,
        notes,
      }),
    });
    setSaving(false);
    if (result.data?.appointment) {
      setAppointment(result.data.appointment);
      showToast(status === "CANCELLED" ? "Viewing cancelled." : "Viewing rescheduled.");
    } else {
      showToast(result.error?.message ?? "Could not update viewing.", "error");
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50/70 p-5 dark:border-cyan-900/40 dark:bg-cyan-950/20">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-100">
          <CalendarClock className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-ink dark:text-white">Book a viewing slot</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Request a confirmed HomeLink viewing. Slots include reminders and admin/agent tracking.
          </p>
        </div>
      </div>

      {appointment ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-emerald-100">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4" />
            {appointment.referenceNumber} - {appointment.status.toLowerCase()}
          </p>
          <p className="mt-1">{new Date(appointment.startAt).toLocaleString()}</p>
          {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status) && (
            <div className="mt-3 grid gap-2">
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm dark:border-emerald-900/50 dark:bg-slate-950"
              >
                {slots.map((slot) => (
                  <option key={slot.startAt} value={slot.startAt} disabled={!slot.available}>
                    {new Date(slot.startAt).toLocaleString()} {slot.available ? "" : "(booked)"}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" disabled={saving || selected === appointment.startAt} onClick={() => void updateAppointment("RESCHEDULED")}>
                  Reschedule
                </Button>
                <Button variant="secondary" disabled={saving} onClick={() => void updateAppointment("CANCELLED")}>
                  Cancel viewing
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2">
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="h-11 rounded-lg border border-cyan-200 bg-white px-3 text-sm dark:border-cyan-900/50 dark:bg-slate-950"
            >
              {slots.map((slot) => (
                <option key={slot.startAt} value={slot.startAt} disabled={!slot.available}>
                  {new Date(slot.startAt).toLocaleString()} {slot.available ? "" : "(booked)"}
                </option>
              ))}
            </select>
            {!user && (
              <div className="grid gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-10 rounded-lg border border-cyan-200 px-3 text-sm dark:border-cyan-900/50 dark:bg-slate-950" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-10 rounded-lg border border-cyan-200 px-3 text-sm dark:border-cyan-900/50 dark:bg-slate-950" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-10 rounded-lg border border-cyan-200 px-3 text-sm dark:border-cyan-900/50 dark:bg-slate-950" />
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Access notes or preferred contact method"
              rows={2}
              className="rounded-lg border border-cyan-200 px-3 py-2 text-sm dark:border-cyan-900/50 dark:bg-slate-950"
            />
            <Button onClick={() => void book()} disabled={saving || !selected}>
              <CalendarClock className="size-4" />
              {saving ? "Booking..." : "Request viewing"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
