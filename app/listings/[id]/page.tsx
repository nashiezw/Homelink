import { notFound } from "next/navigation";
import { ListingDetailView } from "@/components/listings/listing-detail-view";
import { getListing } from "@/lib/api/listing-service";
import { latestListings } from "@/lib/listings";
import { getStore } from "@/lib/store/app-store";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return latestListings.map((listing) => ({ id: listing.id }));
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const listing = getListing(id);

  if (!listing) {
    notFound();
  }

  const galleryImages = (
    listing.images?.length ? listing.images : [listing.image, ...latestListings.filter((item) => item.id !== id).map((item) => item.image)]
  ).filter(Boolean) as string[];

  const ownerId = getStore().getListing(id)?.ownerId;
  const holidayReviewSummary =
    listing.type === "holiday_home" ? getStore().getHolidayHomeReviewSummary(id) : null;

  return (
    <ListingDetailView
      listing={listing}
      galleryImages={galleryImages}
      landlordUserId={ownerId}
      holidayReviewSummary={holidayReviewSummary}
    />
  );
}
