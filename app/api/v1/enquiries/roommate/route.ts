import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import { getPostgresUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { createEnquiryInPostgres, shouldUsePostgresEnquiries } from "@/lib/enquiries/postgres-enquiry-repository";
import { getPublicRoommateProfileFromPostgres, shouldUsePostgresRoommates } from "@/lib/roommates/postgres-roommate-repository";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const body = await request.json();

  if (!body.roommateUserId) {
    return problem(400, "INVALID_ENQUIRY", "roommateUserId is required.");
  }
  if (!body.message?.trim()) {
    return problem(400, "INVALID_ENQUIRY", "Please include a message.");
  }

  if (shouldUsePostgresRoommates() && shouldUsePostgresEnquiries()) {
    const roommateProfile = await getPublicRoommateProfileFromPostgres(body.roommateUserId);
    if (!roommateProfile) {
      return problem(404, "NOT_FOUND", "Roommate profile not found.");
    }
    const user = userId && shouldUsePostgresAuth() ? await getPostgresUserById(userId) : null;
    const enquiry = await createEnquiryInPostgres({
      listingId: "",
      subjectType: "ROOMMATE",
      roommateUserId: body.roommateUserId,
      seekerId: user?.id ?? "guest",
      seekerName: user?.name ?? body.name ?? "Guest",
      seekerEmail: body.email ?? user?.email,
      seekerPhone: body.phone ?? user?.phone ?? undefined,
      enquiryType: body.enquiryType ?? "ROOMMATE_MATCH",
      message: body.message,
      preferredDate: body.preferredDate,
      channel: body.channel ?? "WEB",
    });
    return created(enquiry);
  }

  const store = getStore();
  const roommate = store.getUserById(body.roommateUserId);
  if (!roommate) {
    return problem(404, "NOT_FOUND", "Roommate profile not found.");
  }

  const user = userId ? store.getUserById(userId) : null;

  return created(
    store.createRoommateEnquiry({
      roommateUserId: body.roommateUserId,
      roommateName: body.roommateName ?? roommate.name,
      seekerId: user?.id ?? "guest",
      seekerName: user?.name ?? body.name ?? "Guest",
      seekerEmail: body.email ?? user?.email,
      seekerPhone: body.phone ?? user?.phone,
      enquiryType: body.enquiryType ?? "ROOMMATE_MATCH",
      message: body.message,
      preferredDate: body.preferredDate,
      channel: body.channel ?? "WEB",
    }),
  );
}
