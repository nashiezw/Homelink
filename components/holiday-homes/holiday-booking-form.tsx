"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock3, Lock, Minus, Plus } from "lucide-react";
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

function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function HolidayBookingForm({ listingId, listingTitle, holidayHome }: HolidayBookingFormProps) {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(Math.min(2, holidayHome.maximumGuests));
  const [message, setMessage] = useState("");

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const stayValid = nights >= holidayHome.minimumStay;
  const accommodationTotal = nights * holidayHome.nightlyRate;
  const cleaningFee = holidayHome.cleaningFee ?? 0;
  const estimatedTotal = accommodationTotal + (nights > 0 ? cleaningFee : 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast("Sign in to request availability.", "info");
      router.push(`/auth?next=/listings/${listingId}`);
      return;
    }
    if (!stayValid) {
      showToast(`Minimum stay is ${holidayHome.minimumStay} night${holidayHome.minimumStay === 1 ? "" : "s"}.`, "error");
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

  const priceHeader = (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <p className="text-2xl font-bold text-ink dark:text-white">{formatNightlyPrice(holidayHome.nightlyRate)}</p>
        <p className="text-sm text-slate-500">per night</p>
      </div>
      <div className="text-right text-xs text-slate-500">
        <p>Min {holidayHome.minimumStay} nights</p>
        <p>Up to {holidayHome.maximumGuests} guests</p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-4 p-5">{priceHeader}</div>
        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Sign in to check dates and request availability. A HomeLink consultant confirms before you travel.
          </p>
          <Link href={`/auth?next=/listings/${listingId}`} className="mt-4 block">
            <Button className="h-11 w-full">
              <Lock className="mr-2 size-4" />
              Sign in to request availability
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="space-y-4 p-5">{priceHeader}</div>

      <div className="space-y-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="border-r border-slate-200 p-3 dark:border-slate-700">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <Calendar className="size-3.5" />
              Check-in
            </span>
            <input
              required
              type="date"
              min={todayInputValue()}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && e.target.value >= checkOut) setCheckOut("");
              }}
              className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-semibold text-ink focus:outline-none focus:ring-0 dark:text-white"
            />
          </label>
          <label className="p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <Calendar className="size-3.5" />
              Check-out
            </span>
            <input
              required
              type="date"
              min={checkIn || todayInputValue()}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-semibold text-ink focus:outline-none focus:ring-0 dark:text-white"
            />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">Guests</p>
            <p className="text-xs text-slate-500">Maximum {holidayHome.maximumGuests}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGuests((value) => Math.max(1, value - 1))}
              className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 dark:border-slate-600"
              aria-label="Fewer guests"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-6 text-center text-sm font-semibold">{guests}</span>
            <button
              type="button"
              onClick={() => setGuests((value) => Math.min(holidayHome.maximumGuests, value + 1))}
              className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 dark:border-slate-600"
              aria-label="More guests"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
          <Clock3 className="size-3.5 shrink-0" />
          Check-in from {holidayHome.checkInTime} · Check-out by {holidayHome.checkOutTime}
        </div>

        {nights > 0 && (
          <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950/40">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">
                {formatNightlyPrice(holidayHome.nightlyRate)} × {nights} night{nights === 1 ? "" : "s"}
              </span>
              <span className="font-medium">{formatNightlyPrice(accommodationTotal)}</span>
            </div>
            {cleaningFee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Cleaning fee</span>
                <span className="font-medium">{formatNightlyPrice(cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-slate-700">
              <span>Estimated total</span>
              <span>{formatNightlyPrice(estimatedTotal)}</span>
            </div>
            {!stayValid && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Minimum stay is {holidayHome.minimumStay} night{holidayHome.minimumStay === 1 ? "" : "s"}.
              </p>
            )}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Message (optional)</span>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Tell HomeLink about your stay at ${listingTitle}...`}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      </div>

      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <Button type="submit" className="h-11 w-full" disabled={submitting || (nights > 0 && !stayValid)}>
          {submitting ? "Sending..." : "Request availability"}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-500">
          You won&apos;t be charged yet. HomeLink confirms dates and payment separately.
        </p>
      </div>
    </form>
  );
}
