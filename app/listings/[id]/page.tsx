import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListingDetailView } from "@/components/listings/listing-detail-view";
import { getListing } from "@/lib/api/listing-service";
import { latestListings } from "@/lib/listings";
import {
  getListingByIdOrSlugFromPostgres,
  shouldUsePostgresListings,
  toPublicPostgresListing,
} from "@/lib/listings/postgres-listing-repository";
import { getHolidayHomeReviewSummaryFromPostgres } from "@/lib/holiday-homes/postgres-review-repository";
import { getStore } from "@/lib/store/app-store";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  if (shouldUsePostgresListings()) return [];
  return latestListings.map((listing) => ({ id: listing.id }));
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const listingRecord = shouldUsePostgresListings() ? await getListingByIdOrSlugFromPostgres(id) : null;
  const listing = shouldUsePostgresListings()
    ? listingRecord
      ? toPublicPostgresListing(listingRecord)
      : null
    : getListing(id);

  if (!listing) {
    return {
      title: "Listing not found | HouseLink Zimbabwe",
    };
  }

  const canonical = `/listings/${listing.slug ?? listing.id}`;
  const title = `${listing.title} in ${listing.suburb}, ${listing.city} | HouseLink Zimbabwe`;
  const description = `${listing.bedrooms} bed, ${listing.bathrooms} bath ${listing.type.replace(/_/g, " ")} ${listing.intent === "buy" ? "for sale" : "to rent"} in ${listing.suburb}, ${listing.city} for ${listing.currency} ${listing.price}.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [{ url: listing.image, width: 1200, height: 630, alt: listing.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [listing.image],
    },
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const listingRecord = shouldUsePostgresListings() ? await getListingByIdOrSlugFromPostgres(id) : null;
  const listing = shouldUsePostgresListings()
    ? listingRecord
      ? toPublicPostgresListing(listingRecord)
      : null
    : getListing(id);

  if (!listing) {
    notFound();
  }

  // Always lead with this listing's cover — never pad with other listings' photos.
  const galleryImages = [
    ...new Set(
      [listing.image, ...(listing.images ?? [])].filter((src): src is string => Boolean(src?.trim())),
    ),
  ];

  const ownerId = shouldUsePostgresListings() ? listingRecord?.ownerId : getStore().getListing(id)?.ownerId;
  const holidayReviewSummary =
    listing.type === "holiday_home"
      ? shouldUsePostgresListings()
        ? await getHolidayHomeReviewSummaryFromPostgres(listingRecord?.id ?? id)
        : getStore().getHolidayHomeReviewSummary(id)
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://houselinkzim.co.zw"}/listings/${listing.slug ?? listing.id}`,
    image: galleryImages,
    datePosted: listing.availableFrom,
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.suburb,
      addressRegion: listing.city,
      addressCountry: "ZW",
    },
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: listing.currency,
      availability: listing.status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    numberOfRooms: listing.bedrooms,
    amenityFeature: listing.amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    <ListingDetailView
      listing={listing}
      galleryImages={galleryImages}
      landlordUserId={ownerId}
      holidayReviewSummary={holidayReviewSummary}
    />
    </>
  );
}
