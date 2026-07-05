import { notFound } from "next/navigation";
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

  const galleryImages = shouldUsePostgresListings()
    ? (listing.images?.length ? listing.images : [listing.image]).filter(Boolean)
    : (
        listing.images?.length ? listing.images : [listing.image, ...latestListings.filter((item) => item.id !== id).map((item) => item.image)]
      ).filter(Boolean) as string[];

  const ownerId = shouldUsePostgresListings() ? listingRecord?.ownerId : getStore().getListing(id)?.ownerId;
  const holidayReviewSummary =
    listing.type === "holiday_home"
      ? shouldUsePostgresListings()
        ? await getHolidayHomeReviewSummaryFromPostgres(id)
        : getStore().getHolidayHomeReviewSummary(id)
      : null;

  return (
    <ListingDetailView
      listing={listing}
      galleryImages={galleryImages}
      landlordUserId={ownerId}
      holidayReviewSummary={holidayReviewSummary}
    />
  );
}
