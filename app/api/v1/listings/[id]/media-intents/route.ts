import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import { createCloudinaryUploadIntent } from "@/lib/integrations/cloudinary";
import { getListingFromPostgres, shouldUsePostgresListings } from "@/lib/listings/postgres-listing-repository";
import { requireStrictProductionConfig } from "@/lib/production/runtime";
import { getStore } from "@/lib/store/app-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const userId = getSessionUserIdFromRequest(request);

  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to upload listing media.");
  }

  const listing = shouldUsePostgresListings() ? await getListingFromPostgres(id) : getStore().getListing(id);

  if (!listing) {
    return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  }

  if (listing.ownerId !== userId) {
    return problem(403, "FORBIDDEN", "Only the listing owner can upload media.");
  }

  const body = await request.json();
  const mediaType = body.mediaType === "video" ? "video" : body.mediaType === "document" ? "document" : "image";
  const folder = `homelink/listings/${id}`;
  const cloudinary = createCloudinaryUploadIntent({
    folder,
    publicIdPrefix: `${id}/${userId.slice(0, 8)}`,
    resourceType: mediaType === "video" ? "video" : mediaType === "document" ? "raw" : "image",
  });

  if (cloudinary) {
    return created({
      listingId: id,
      mediaType,
      provider: "cloudinary",
      ...cloudinary,
      expiresInSeconds: 300,
    });
  }

  if (requireStrictProductionConfig()) {
    return problem(
      503,
      "MEDIA_STORAGE_NOT_CONFIGURED",
      "Cloudinary credentials are required before production media uploads can be enabled.",
    );
  }

  return created({
    listingId: id,
    mediaType,
    provider: "local",
    uploadUrl: "/api/v1/uploads",
    method: "POST",
    fields: {
      folder,
      listingId: id,
      mediaType,
    },
    expiresInSeconds: 300,
  });
}
