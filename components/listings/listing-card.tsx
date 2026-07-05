import { BadgeCheck, Bath, BedDouble, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ListingCardActions } from "@/components/listings/listing-card-actions";
import type { Listing } from "@/lib/types";
import { formatNightlyPrice, formatPrice } from "@/lib/utils";

type ListingCardProps = {
  listing: Listing;
};

export function ListingCard({ listing }: ListingCardProps) {
  const isRoom = listing.type === "room";
  const isLand = listing.type === "land";
  const isCommercial = listing.type === "commercial";
  const href = `/listings/${listing.slug ?? listing.id}`;

  return (
    <article className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        {listing.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            Verified
          </span>
        )}
          <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur">
          {listing.trustScore}% trust score
        </span>
        <ListingCardActions listingId={listing.id} />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="size-3.5" aria-hidden="true" />
              {listing.suburb}, {listing.city}
            </p>
            <Link href={href}>
              <h3 className="mt-1 font-semibold leading-6 text-slate-950 hover:text-emerald-800">
                {listing.title}
              </h3>
            </Link>
            <p className="mt-1 text-sm text-slate-600">{listing.highlight}</p>
          </div>
          <p className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
            {listing.type === "holiday_home"
              ? formatNightlyPrice(listing.holidayHome?.nightlyRate ?? listing.price)
              : formatPrice(listing.price)}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          {isRoom ? (
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" aria-hidden="true" />
              Up to {listing.tenantPreferences?.maxOccupants ?? 1}
            </span>
          ) : null}
          {!isRoom && !isLand && !isCommercial ? (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="size-4" aria-hidden="true" />
              {listing.bedrooms} bed
            </span>
          ) : null}
          {!isRoom && !isLand ? (
            <span className="inline-flex items-center gap-1">
              <Bath className="size-4" aria-hidden="true" />
              {listing.bathrooms} bath
            </span>
          ) : null}
          <span>{listing.availableFrom}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {listing.amenities.slice(0, 3).map((amenity) => (
            <span
              key={amenity}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {amenity}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
