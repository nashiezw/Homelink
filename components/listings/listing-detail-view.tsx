"use client";

import {
  BadgeCheck,
  MapPin,
  Ruler,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { AgentRatingPrompt } from "@/components/agents/agent-rating-prompt";
import { HolidayBookingForm } from "@/components/holiday-homes/holiday-booking-form";
import { HolidayHomeDetailSections } from "@/components/holiday-homes/holiday-home-detail-sections";
import { ListingDetailActions } from "@/components/listings/listing-detail-actions";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";
import { MediaGallery } from "@/components/listings/media-gallery";
import { TenancyActions } from "@/components/tenancies/tenancy-actions";
import { PropertyMap } from "@/components/maps/property-map";
import { formatNightlyPrice, formatPrice } from "@/lib/utils";
import type { Listing } from "@/lib/types";

type ListingDetailViewProps = {
  listing: Listing;
  galleryImages: string[];
  landlordUserId?: string;
  holidayReviewSummary?: {
    count: number;
    overallExperience: number;
    cleanliness: number;
    location: number;
    communication: number;
    valueForMoney: number;
  } | null;
};

export function ListingDetailView({
  listing,
  galleryImages,
  landlordUserId,
  holidayReviewSummary = null,
}: ListingDetailViewProps) {
  const videos = listing.videos ?? [];
  const isHoliday = listing.type === "holiday_home" && listing.holidayHome;
  const detailRows = buildDetailRows(listing);

  return (
    <main className="bg-mist dark:bg-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <MapPin className="size-4" aria-hidden="true" />
              {listing.suburb}, {listing.city}
              {isHoliday && listing.holidayHome?.destination ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                  {listing.holidayHome.destination}
                </span>
              ) : null}
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal text-ink dark:text-white">
              {listing.title}
            </h1>
          </div>
        </div>

        <MediaGallery images={galleryImages} title={listing.title} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div>
          <div className="surface-panel flex flex-wrap items-center gap-3 rounded-lg p-5">
            <p className="text-3xl font-semibold text-emerald-700">
              {isHoliday ? formatNightlyPrice(listing.holidayHome!.nightlyRate) : formatPrice(listing.price)}
            </p>
            <ListingStatusBadge listing={listing} />
            {listing.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
                <BadgeCheck className="size-4" aria-hidden="true" />
                Property verified
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {listing.availableFrom}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-ocean">
              <Sparkles className="size-4" aria-hidden="true" />
              {listing.trustScore}% trust score
            </span>
          </div>

          <div className="grid gap-8 py-8">
            {isHoliday ? (
              <HolidayHomeDetailSections listing={listing} reviewSummary={holidayReviewSummary} />
            ) : null}

            <section>
              <h2 className="text-xl font-semibold">Description</h2>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">{listing.description}</p>
            </section>

            {detailRows.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold">Key listing details</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {detailRows.map((row) => (
                    <div key={`${row.label}-${row.value}`} className="surface-panel rounded-lg p-4">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <row.icon className="size-4 text-emerald-700" />
                        {row.label}
                      </p>
                      <p className="mt-1 font-semibold text-ink dark:text-white">{row.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-semibold">Amenities</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {listing.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-3">
                    <ShieldCheck className="size-5 text-emerald-700" aria-hidden="true" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </section>

            {videos.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold">Video walkthrough</h2>
                <div className="mt-4 space-y-4">
                  {videos.map((url) => (
                    <video
                      key={url}
                      src={url}
                      controls
                      className="w-full max-h-[28rem] rounded-xl bg-black"
                      preload="metadata"
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-semibold">Location intelligence</h2>
              <div className="surface-panel mt-4 rounded-lg p-5">
                <p className="font-medium">{listing.distanceToCbdKm} km estimated distance to CBD</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {listing.nearby.map((place) => (
                    <span key={place} className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {place}
                    </span>
                  ))}
                </div>
                <div className="mt-4 overflow-hidden rounded-lg">
                  <PropertyMap listings={[listing]} height={280} />
                </div>
              </div>
            </section>
          </div>
        </div>

        <aside className="surface-panel h-fit space-y-5 rounded-lg p-5 lg:sticky lg:top-24">
          {isHoliday ? (
            <HolidayBookingForm
              listingId={listing.id}
              listingTitle={listing.title}
              holidayHome={listing.holidayHome!}
            />
          ) : (
            <ListingDetailActions listing={listing} />
          )}
          <AgentRatingPrompt listingId={listing.id} />
          {!isHoliday ? <TenancyActions listing={listing} landlordUserId={landlordUserId} /> : null}
          <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Before you travel</p>
            <p className="mt-1 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">
              HomeLink shows live availability so you do not arrive only to hear "Yatorwa." Always check the status before paying or viewing.
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Why this listing stands out</p>
            <p className="mt-1 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">{listing.highlight}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function yesNo(value?: boolean) {
  return value ? "Yes" : "No";
}

function buildDetailRows(listing: Listing) {
  const details = listing.listingDetails;
  const rows: Array<{ label: string; value: string; icon: typeof Ruler }> = [];

  if (!["land", "commercial", "room"].includes(listing.type)) {
    rows.push({ label: "Bedrooms", value: String(listing.bedrooms), icon: Ruler });
  }

  if (!["land", "room"].includes(listing.type)) {
    rows.push({ label: "Bathrooms", value: String(listing.bathrooms), icon: Ruler });
  }

  if (details?.depositAmount) rows.push({ label: "Deposit", value: `$${details.depositAmount}`, icon: ShieldCheck });
  if (details?.leaseTerm) rows.push({ label: "Minimum lease", value: details.leaseTerm, icon: ShieldCheck });
  if (typeof details?.utilitiesIncluded === "boolean") rows.push({ label: "Utilities included", value: yesNo(details.utilitiesIncluded), icon: ShieldCheck });
  if (details?.parkingSpaces !== undefined) rows.push({ label: "Parking spaces", value: String(details.parkingSpaces), icon: ShieldCheck });
  if (details?.floorAreaSqm) rows.push({ label: "Floor area", value: `${details.floorAreaSqm} sqm`, icon: Ruler });
  if (details?.commercialUse) rows.push({ label: "Best use", value: details.commercialUse, icon: Ruler });
  if (details?.landSizeSqm) rows.push({ label: "Land size", value: `${details.landSizeSqm} sqm`, icon: Ruler });
  if (details?.zoning) rows.push({ label: "Zoning", value: details.zoning, icon: Ruler });
  if (details?.roadAccess) rows.push({ label: "Road access", value: details.roadAccess, icon: MapPin });
  if (details?.waterSource) rows.push({ label: "Water source", value: details.waterSource, icon: ShieldCheck });
  if (typeof details?.powerAvailable === "boolean" && listing.type === "land") rows.push({ label: "Power nearby", value: yesNo(details.powerAvailable), icon: ShieldCheck });

  if (listing.tenantPreferences) {
    rows.push({ label: "Max occupants", value: String(listing.tenantPreferences.maxOccupants), icon: Users });
    rows.push({ label: "Household accepted", value: listing.tenantPreferences.acceptedHouseholdTypes.join(", ").replace(/_/g, " "), icon: Users });
    if (typeof details?.sharedBathroom === "boolean") {
      rows.push({ label: "Bathroom access", value: details.sharedBathroom ? "Shared bathroom" : "Private bathroom", icon: ShieldCheck });
    }
    if (typeof details?.kitchenAccess === "boolean") {
      rows.push({ label: "Kitchen access", value: yesNo(details.kitchenAccess), icon: ShieldCheck });
    }
    if (listing.tenantPreferences.genderPreference && listing.tenantPreferences.genderPreference !== "any") {
      rows.push({ label: "Preferred tenant gender", value: listing.tenantPreferences.genderPreference, icon: Users });
    }
  }

  return rows;
}
