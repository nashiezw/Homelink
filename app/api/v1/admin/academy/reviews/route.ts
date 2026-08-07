import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view reviews.");

  try {
    const prisma = getMainPrisma();
    const { searchParams } = new URL(request.url);
    const approvedOnly = searchParams.get("approvedOnly") === "true";
    const courseId = searchParams.get("courseId");

    const where: any = {};
    if (approvedOnly) where.approved = true;
    if (courseId) where.courseId = courseId;

    const reviews = await prisma.courseReview.findMany({
      where,
      include: {
        learner: {
          select: {
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      reviews: reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        approved: review.approved,
        learnerName: review.learner.name,
        learnerEmail: review.learner.email,
        courseTitle: review.course.title,
        createdAt: review.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to get reviews:", error);
    return problem(500, "SERVER_ERROR", "Failed to get reviews.");
  }
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to moderate reviews.");

  try {
    const prisma = getMainPrisma();
    const body = await request.json();
    const { reviewId, action } = body;

    if (!reviewId || !["approve", "reject", "delete"].includes(action)) {
      return problem(400, "INVALID_INPUT", "Valid reviewId and action are required.");
    }

    if (action === "delete") {
      await prisma.courseReview.delete({
        where: { id: reviewId },
      });

      return ok({ message: "Review deleted successfully." });
    }

    const approved = action === "approve";

    await prisma.courseReview.update({
      where: { id: reviewId },
      data: { approved },
    });

    return ok({
      message: `Review ${approved ? "approved" : "rejected"} successfully.`,
    });
  } catch (error) {
    console.error("Failed to moderate review:", error);
    return problem(500, "SERVER_ERROR", "Failed to moderate review.");
  }
}
