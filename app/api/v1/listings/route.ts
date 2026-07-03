import { listListings, parseListingQuery } from "@/lib/api/listing-service";
import { created, ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getStore } from "@/lib/store/app-store";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseListingQuery(searchParams);
  const listings = listListings(query);

  return ok(listings, {
    count: listings.length,
    nextCursor: null,
  });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to create listings.");
  }
  const body = await request.json();
  const user = getStore().getUserById(userId);
  const listing = getStore().createListing(
    {
      ...body,
      landlordName: user?.name ?? body.landlordName,
      phone: user?.phone ?? body.phone,
    },
    userId,
  );
  return created(listing);
}
