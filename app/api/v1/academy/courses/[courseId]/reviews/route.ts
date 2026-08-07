import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const prisma = getMainPrisma();
    const { courseId } = await params;

    const reviews = await prisma.courseReview.findMany({
      where: { courseId, approved: true },
      include: {
        learner: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
      : 0;

    return ok({
      reviews: reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        learnerName: review.learner.name,
        createdAt: review.createdAt,
      })),
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error("Failed to get course reviews:", error);
    return problem(500, "SERVER_ERROR", "Failed to get course reviews.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit a review.");

  try {
    const prisma = getMainPrisma();
    const { courseId } = await params;
    const body = await request.json();
    const { rating, title, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return problem(400, "INVALID_RATING", "Rating must be between 1 and 5.");
    }

    if (!comment || comment.trim().length === 0) {
      return problem(400, "MISSING_COMMENT", "Comment is required.");
    }

    // Check if user has already reviewed this course
    const existing = await prisma.courseReview.findUnique({
      where: {
        courseId_learnerId: {
          courseId,
          learnerId: userId,
        },
      },
    });

    if (existing) {
      return problem(400, "ALREADY_REVIEWED", "You have already reviewed this course.");
    }

    const review = await prisma.courseReview.create({
      data: {
        courseId,
        learnerId: userId,
        rating,
        title: title || null,
        comment,
        approved: false, // Requires admin approval
      },
    });

    return ok({
      message: "Review submitted successfully. It will be visible after approval.",
      review: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        approved: review.approved,
      },
    });
  } catch (error) {
    console.error("Failed to create review:", error);
    return problem(500, "SERVER_ERROR", "Failed to create review.");
  }
}
