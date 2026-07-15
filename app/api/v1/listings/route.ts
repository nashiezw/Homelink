import type { Listing } from "@/lib/types";
import {
  listListings,
  matchesListing,
  paginateListings,
  parseListingPagination,
  parseListingQuery,
  parseListingSort,
  sortListings,
} from "@/lib/api/listing-service";
import { created, ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import {
  createListingInPostgres,
  listPublicListingsPageFromPostgres,
  shouldUsePostgresListings,
  toPublicPostgresListing,
} from "@/lib/listings/postgres-listing-repository";
import { isPublicListingStatus } from "@/lib/listings/status";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseListingQuery(searchParams);
    const pagination = parseListingPagination(searchParams);
    const sort = parseListingSort(searchParams);

    if (shouldUsePostgresListings()) {
      const listings: Listing[] = [];
      let cursor = pagination.cursor;
      let nextCursor: string | null = null;
      let hasMore = false;

      for (let pageCount = 0; pageCount < 10 && listings.length < pagination.limit; pageCount += 1) {
        const remaining = pagination.limit - listings.length;
        const page = await listPublicListingsPageFromPostgres(query, { limit: remaining, cursor }, sort);
        const matched = page.listings
          .filter((listing) => isPublicListingStatus(listing.status))
          .map(toPublicPostgresListing)
          .filter((listing) => matchesListing(listing, query));
        listings.push(...matched);
        nextCursor = page.nextCursor;
        hasMore = page.hasMore;
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }

      return ok(listings, {
        count: listings.length,
        limit: pagination.limit,
        sort,
        nextCursor,
        hasMore,
      });
    }

    const page = paginateListings(sortListings(listListings(query), sort), pagination);

    return ok(page.items, {
      count: page.items.length,
      limit: pagination.limit,
      sort,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    });
  } catch (error) {
    console.error("Failed to list listings", error);
    return problem(500, "LISTINGS_READ_FAILED", "Listings could not be loaded.");
  }
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to create listings.");
  }
  try {
    const body = await request.json();
    const user = shouldUsePostgresListings() ? null : getStore().getUserById(userId);
    const payload = shouldUsePostgresListings()
      ? body
      : {
          ...body,
          landlordName: user?.name ?? body.landlordName,
          phone: user?.phone ?? body.phone,
        };
    const listing = shouldUsePostgresListings()
      ? await createListingInPostgres(payload, userId)
      : getStore().createListing(payload, userId);

    if (!listing?.id) {
      return problem(500, "LISTING_CREATE_FAILED", "The listing could not be saved. Please try again.");
    }

    return created(listing, { persisted: shouldUsePostgresListings() ? "postgres" : "store" });
  } catch (error) {
    console.error("Failed to create listing", error);
    return problem(500, "LISTING_CREATE_FAILED", "The listing could not be saved. Please try again.");
  }
}
