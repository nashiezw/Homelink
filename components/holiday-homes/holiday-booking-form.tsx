"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { HolidayHomeDetails } from "@/lib/holiday-homes/types";
import { formatNightlyPrice } from "@/lib/utils";

type HolidayBookingFormProps = {
  listingId: string;
  listingTitle: string;
  holidayHome: HolidayHomeDetails;
};

export function HolidayBookingForm({ listingId, listingTitle, holidayHome }: HolidayBookingFormProps) {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(Math.min(2, holidayHome.maximumGuests));
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast("Sign in to request availability.", "info");
      router.push(`/auth?next=/listings/${listingId}`);
      return;
    }

    setSubmitting(true);
    const result = await apiFetch<{ enquiry: { id: string } }>("/api/v1/holiday-homes/bookings", {
      method: "POST",
      body: JSON.stringify({ listingId, checkIn, checkOut, guests, message }),
    });
    setSubmitting(false);

    if (result.data?.enquiry) {
      showToast("Booking enquiry sent! A HomeLink consultant will confirm availability.");
      setMessage("");
    } else {
      showToast(result.error?.message ?? "Could not send enquiry.", "error");
    }
  }

  if (!user) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div>
          <p className="text-2xl font-semibold text-emerald-700">{formatNightlyPrice(holidayHome.nightlyRate)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Min {holidayHome.minimumStay} nights · Up to {holidayHome.maximumGuests} guests
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
          Sign in to request availability. A HomeLink consultant will confirm dates before you travel.
        </p>
        <Link href={`/auth?next=/listings/${listingId}`} className="block">
          <Button className="w-full">
            <Lock className="mr-2 size-4" />
            Sign in to request availability
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div>
        <p className="text-2xl font-semibold text-emerald-700">{formatNightlyPrice(holidayHome.nightlyRate)}</p>
        <p className="mt-1 text-xs text-slate-500">
          Min {holidayHome.minimumStay} nights · Up to {holidayHome.maximumGuests} guests
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Check-in
          <div className="relative mt-1">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              required
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          </div>
        </label>
        <label className="block text-sm font-medium">
          Check-out
          <div className="relative mt-1">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              required
              type="date"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          </div>
        </label>
      </div>

      <label className="block text-sm font-medium">
        Guests
        <div className="relative mt-1">
          <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            required
            type="number"
            min={1}
            max={holidayHome.maximumGuests}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </div>
      </label>

      <label className="block text-sm font-medium">
        Message (optional)
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Tell HomeLink about your stay at ${listingTitle}...`}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
      </label>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Sending..." : "Request availability via HomeLink"}
      </Button>
    </form>
  );
}
