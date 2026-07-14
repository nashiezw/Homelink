import { BadgeCheck, Bath, BedDouble, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ListingCardActions } from "@/components/listings/listing-card-actions";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";
import { isListingPlaceholderArt, isSvgImageUrl, resolvePublicImageUrl } from "@/lib/media/resolve-public-image";
import { listingAvailabilityDisplay } from "@/lib/listings/status";
import type { Listing } from "@/lib/types";
import { formatNightlyPrice, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  listing: Listing;
};

export function ListingCard({ listing }: ListingCardProps) {
  const isRoom = listing.type === "room";
  const isLand = listing.type === "land";
  const isCommercial = listing.type === "commercial";
  const href = `/listings/${listing.slug ?? listing.id}`;
  const imageSrc = resolvePublicImageUrl(listing.image) ?? listing.image;
  const isPlaceholder = isListingPlaceholderArt(imageSrc) || isSvgImageUrl(imageSrc);

  return (
    <article className="gpu-card group rounded-lg border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden rounded-t-lg",
          isPlaceholder ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-slate-100 dark:bg-slate-800",
        )}
      >
        <Image
          src={imageSrc}
          alt={listing.title}
          fill
          unoptimized={isSvgImageUrl(imageSrc)}
          className={cn(
            "transition duration-500",
            isPlaceholder ? "object-contain p-4" : "object-cover group-hover:scale-[1.03]",
          )}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        {listing.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            Verified
          </span>
        )}
        <ListingStatusBadge
          listing={listing}
          className={
            listing.verified
              ? "absolute left-3 top-12 max-w-[calc(100%-1.5rem)] bg-white/95 backdrop-blur sm:left-auto sm:right-3 sm:top-3 sm:max-w-[calc(100%-5.5rem)]"
              : "absolute left-3 top-3 max-w-[calc(100%-1.5rem)] bg-white/95 backdrop-blur sm:left-auto sm:right-3 sm:max-w-[calc(100%-5.5rem)]"
          }
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur">
          {listing.trustScore}% trust score
        </span>
        <ListingCardActions listingId={listing.id} />
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm text-slate-500">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {listing.suburb}, {listing.city}
              </span>
            </p>
            <Link href={href}>
              <h3 className="mt-1 line-clamp-2 font-semibold leading-6 text-slate-950 hover:text-emerald-800 dark:text-white">
                {listing.title}
              </h3>
            </Link>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{listing.highlight}</p>
          </div>
          <p className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
            {listing.type === "holiday_home"
              ? formatNightlyPrice(listing.holidayHome?.nightlyRate ?? listing.price)
              : formatPrice(listing.price)}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 sm:gap-4 dark:text-slate-300">
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
          <span>{listingAvailabilityDisplay(listing)}</span>
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
