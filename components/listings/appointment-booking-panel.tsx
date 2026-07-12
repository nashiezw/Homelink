"use client";

import { CalendarClock, CheckCircle2, Clock3, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { groupSlotsByDay, type AppointmentSlot } from "@/lib/appointments/slot-utils";
import type { Listing, ViewingAppointment } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppointmentBookingPanel({ listing }: { listing: Listing }) {
  const { user, showToast } = useApp();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selected, setSelected] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<ViewingAppointment | null>(null);

  const dayGroups = useMemo(() => groupSlotsByDay(slots), [slots]);
  const selectedSlot = slots.find((slot) => slot.startAt === selected);

  useEffect(() => {
    void apiFetch<{ slots: AppointmentSlot[] }>(`/api/v1/appointments?slots=true&listingId=${encodeURIComponent(listing.id)}`).then((result) => {
      if (!result.data) return;
      setSlots(result.data.slots);
      const firstAvailable = result.data.slots.find((slot) => slot.available);
      if (firstAvailable) {
        setSelected(firstAvailable.startAt);
        setSelectedDay(firstAvailable.dayKey);
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
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-ink dark:text-white">Book a property viewing</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Pick a day and time in Harare (CAT). HomeLink confirms with the agent before your visit.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {appointment ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4" />
              {appointment.referenceNumber} · {appointment.status.toLowerCase()}
            </p>
            <p className="mt-1 flex items-center gap-2 text-emerald-900/90 dark:text-emerald-100/90">
              <Clock3 className="size-4" />
              {selectedSlot?.label ?? new Date(appointment.startAt).toLocaleString("en-ZW", { timeZone: "Africa/Harare" })}
            </p>
            {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status) && (
              <div className="mt-4 space-y-3">
                <SlotPicker
                  dayGroups={dayGroups}
                  selectedDay={selectedDay}
                  selected={selected}
                  onDayChange={setSelectedDay}
                  onSlotChange={setSelected}
                />
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
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {listing.suburb}, {listing.city} · 45-minute viewing · times shown in Zimbabwe local time
              </span>
            </div>

            <SlotPicker
              dayGroups={dayGroups}
              selectedDay={selectedDay}
              selected={selected}
              onDayChange={(dayKey) => {
                setSelectedDay(dayKey);
                const first = dayGroups.find((group) => group.dayKey === dayKey)?.slots.find((slot) => slot.available);
                if (first) setSelected(first.startAt);
              }}
              onSlotChange={setSelected}
            />

            {!user && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone / WhatsApp"
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm sm:col-span-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Access notes, who will attend, or preferred contact method"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />

            {selectedSlot && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Selected: <span className="font-semibold text-ink dark:text-white">{selectedSlot.label}</span>
              </p>
            )}

            <Button className="h-11 w-full" onClick={() => void book()} disabled={saving || !selected || !selectedSlot?.available}>
              <CalendarClock className="size-4" />
              {saving ? "Booking..." : "Request viewing"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function SlotPicker({
  dayGroups,
  selectedDay,
  selected,
  onDayChange,
  onSlotChange,
}: {
  dayGroups: ReturnType<typeof groupSlotsByDay>;
  selectedDay: string;
  selected: string;
  onDayChange: (dayKey: string) => void;
  onSlotChange: (startAt: string) => void;
}) {
  const activeDay = dayGroups.find((group) => group.dayKey === selectedDay) ?? dayGroups[0];
  if (!dayGroups.length) {
    return <p className="text-sm text-slate-500">Loading available slots...</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Choose a day</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dayGroups.map((group) => {
            const hasAvailable = group.slots.some((slot) => slot.available);
            return (
              <button
                key={group.dayKey}
                type="button"
                disabled={!hasAvailable}
                onClick={() => onDayChange(group.dayKey)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2 text-left text-sm transition",
                  group.dayKey === activeDay?.dayKey
                    ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
                )}
              >
                {group.dayLabel}
              </button>
            );
          })}
        </div>
      </div>

      {activeDay && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Choose a time</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {activeDay.slots.map((slot) => (
              <button
                key={slot.startAt}
                type="button"
                disabled={!slot.available}
                onClick={() => onSlotChange(slot.startAt)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                  selected === slot.startAt
                    ? "border-emerald-600 bg-emerald-700 text-white"
                    : slot.available
                      ? "border-slate-200 bg-white text-slate-800 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 line-through dark:border-slate-800 dark:bg-slate-900",
                )}
              >
                {slot.timeLabel}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
