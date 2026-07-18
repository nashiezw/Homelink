import { ArrowRight, BadgeCheck, Bath, BedDouble, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";
import { isSvgImageUrl, resolvePublicImageUrl } from "@/lib/media/resolve-public-image";
import type { Listing } from "@/lib/types";
import { formatNightlyPrice, formatPrice } from "@/lib/utils";

type FeaturedPropertiesSectionProps = {
  listings: Listing[];
};

export function FeaturedPropertiesSection({ listings }: FeaturedPropertiesSectionProps) {
  if (!listings.length) return null;

  const [hero, ...rest] = listings;

  return (
    <FadeIn delay={80}>
      <section className="relative bg-slate-50 py-16 dark:bg-slate-900/40 sm:py-20">
        <div className="section-divider absolute inset-x-0 top-0" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="section-eyebrow">Featured</p>
              <h2 className="section-title">Verified and fresh listings</h2>
              <p className="section-copy max-w-2xl">
                Real properties with trust scores, local context, and instant contact — updated live from the marketplace.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800"
            >
              Browse all listings
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <FeaturedHeroCard listing={hero} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              {rest.slice(0, 2).map((listing) => (
                <ListingCard key={listing.id} listing={listing} compact />
              ))}
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

function FeaturedHeroCard({ listing }: { listing: Listing }) {
  const isRoom = listing.type === "room";
  const isLand = listing.type === "land";
  const isCommercial = listing.type === "commercial";
  const href = `/listings/${listing.slug ?? listing.id}`;
  const imageSrc = resolvePublicImageUrl(listing.image) ?? listing.image;

  return (
    <article className="group hover-lift relative min-h-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-ink shadow-hero dark:border-slate-700 sm:min-h-[32rem]">
      <Image
        src={imageSrc}
        alt={listing.title}
        fill
        unoptimized={isSvgImageUrl(imageSrc)}
        className="object-cover transition duration-700 group-hover:scale-[1.04]"
        sizes="(min-width: 1024px) 58vw, 100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      <div className="absolute left-5 top-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          Verified
        </span>
        <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-lg backdrop-blur">
          {listing.trustScore}% trust score
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
        <div className="max-w-2xl rounded-xl border border-white/15 bg-white/12 p-5 text-white shadow-2xl backdrop-blur-md">
          <p className="flex items-center gap-1.5 text-sm text-emerald-100">
            <MapPin className="size-4" aria-hidden="true" />
            {listing.suburb}, {listing.city}
          </p>
          <Link href={href}>
            <h3 className="mt-2 text-2xl font-semibold leading-tight transition hover:text-emerald-100 sm:text-3xl">
              {listing.title}
            </h3>
          </Link>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-100">{listing.highlight}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-emerald-800">
              {listing.type === "holiday_home"
                ? formatNightlyPrice(listing.holidayHome?.nightlyRate ?? listing.price)
                : formatPrice(listing.price)}
            </span>
            {isRoom ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm">
                <Users className="size-4" aria-hidden="true" />
                Up to {listing.tenantPreferences?.maxOccupants ?? 1}
              </span>
            ) : null}
            {!isRoom && !isLand && !isCommercial ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm">
                <BedDouble className="size-4" aria-hidden="true" />
                {listing.bedrooms} bed
              </span>
            ) : null}
            {!isRoom && !isLand ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm">
                <Bath className="size-4" aria-hidden="true" />
                {listing.bathrooms} bath
              </span>
            ) : null}
          </div>
          <Link
            href={href}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
          >
            View property
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ListingCard({ listing, compact }: { listing: Listing; compact?: boolean }) {
  const href = `/listings/${listing.slug ?? listing.id}`;
  const imageSrc = resolvePublicImageUrl(listing.image) ?? listing.image;
  return (
    <article className="gpu-card group hover-lift rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900">
      <div className={`relative overflow-hidden rounded-t-2xl ${compact ? "h-44" : "h-52"}`}>
        <Image
          src={imageSrc}
          alt={listing.title}
          fill
          unoptimized={isSvgImageUrl(imageSrc)}
          className="object-cover transition duration-500 group-hover:scale-[1.05]"
          sizes="(min-width: 1024px) 28vw, 50vw"
        />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
          {listing.trustScore}% trust
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {listing.suburb}, {listing.city}
            </p>
            <Link href={href}>
              <h3 className="mt-1 font-semibold leading-6 text-slate-950 group-hover:text-emerald-800 dark:text-white">
                {listing.title}
              </h3>
            </Link>
          </div>
          <p className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
            {listing.type === "holiday_home"
              ? formatNightlyPrice(listing.holidayHome?.nightlyRate ?? listing.price)
              : formatPrice(listing.price)}
          </p>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {listing.highlight}
        </p>
        <Link
          href={href}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-900 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-100"
        >
          View {listing.suburb}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
