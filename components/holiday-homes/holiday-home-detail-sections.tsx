"use client";

import { Star } from "lucide-react";
import { HOLIDAY_AMENITY_LABELS } from "@/lib/holiday-homes/defaults";
import { HolidayReviewForm } from "@/components/holiday-homes/holiday-review-form";
import type { HolidayHomeDetails } from "@/lib/holiday-homes/types";
import type { Listing } from "@/lib/types";
import { formatNightlyPrice, formatPrice } from "@/lib/utils";

type HolidayHomeDetailSectionsProps = {
  listing: Listing;
  reviewSummary?: {
    count: number;
    overallExperience: number;
    cleanliness: number;
    location: number;
    communication: number;
    valueForMoney: number;
  } | null;
};

export function HolidayHomeDetailSections({ listing, reviewSummary }: HolidayHomeDetailSectionsProps) {
  const hh = listing.holidayHome;
  if (!hh) return null;

  const amenityFlags = Object.entries(HOLIDAY_AMENITY_LABELS).filter(([key]) => hh[key as keyof HolidayHomeDetails]);

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Nightly rate" value={formatNightlyPrice(hh.nightlyRate)} />
        <Stat label="Minimum stay" value={`${hh.minimumStay} nights`} />
        <Stat label="Max guests" value={String(hh.maximumGuests)} />
        <Stat label="Check-in / out" value={`${hh.checkInTime} / ${hh.checkOutTime}`} />
      </section>

      {(hh.weeklyRate || hh.monthlyRate || hh.cleaningFee || hh.securityDeposit) && (
        <section>
          <h2 className="text-xl font-semibold">Pricing details</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {hh.weeklyRate ? <li>Weekly rate: {formatPrice(hh.weeklyRate)}</li> : null}
            {hh.monthlyRate ? <li>Monthly rate: {formatPrice(hh.monthlyRate)}</li> : null}
            {hh.cleaningFee ? <li>Cleaning fee: {formatPrice(hh.cleaningFee)}</li> : null}
            {hh.securityDeposit ? <li>Security deposit: {formatPrice(hh.securityDeposit)}</li> : null}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">Holiday amenities</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {amenityFlags.map(([, label]) => (
            <span
              key={label}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      {hh.houseRules ? (
        <section>
          <h2 className="text-xl font-semibold">House rules</h2>
          <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{hh.houseRules}</p>
        </section>
      ) : null}

      {hh.nearbyAttractions ? (
        <section>
          <h2 className="text-xl font-semibold">Nearby attractions</h2>
          <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{hh.nearbyAttractions}</p>
        </section>
      ) : null}

      {reviewSummary ? (
        <section>
          <h2 className="text-xl font-semibold">Guest reviews</h2>
          <div className="mt-4 flex items-center gap-2 text-amber-500">
            <Star className="size-5 fill-current" />
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              {reviewSummary.overallExperience.toFixed(1)}
            </span>
            <span className="text-sm text-slate-500">({reviewSummary.count} reviews)</span>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <ReviewStat label="Cleanliness" value={reviewSummary.cleanliness} />
            <ReviewStat label="Location" value={reviewSummary.location} />
            <ReviewStat label="Communication" value={reviewSummary.communication} />
            <ReviewStat label="Value for money" value={reviewSummary.valueForMoney} />
          </dl>
          <HolidayReviewForm listingId={listing.id} />
        </section>
      ) : (
        <section>
          <h2 className="text-xl font-semibold">Guest reviews</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Be the first to review this holiday home.</p>
          <HolidayReviewForm listingId={listing.id} />
        </section>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
      <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="font-semibold text-slate-900 dark:text-white">{value.toFixed(1)}</dd>
    </div>
  );
}
