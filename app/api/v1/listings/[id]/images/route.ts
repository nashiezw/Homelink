import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to add photos.");
  }

  const { id } = await params;
  const body = await request.json();
  const urls = Array.isArray(body.urls) ? (body.urls as string[]).filter(Boolean) : [];
  if (urls.length === 0) {
    return problem(400, "INVALID_INPUT", "Provide at least one image URL.");
  }

  const listing = getStore().addListingImages(id, userId, urls);
  if (!listing) {
    return problem(403, "FORBIDDEN", "You can only add photos to your own listings.");
  }

  return created({ listing });
}
