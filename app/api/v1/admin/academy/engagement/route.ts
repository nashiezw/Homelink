import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getAdminAcademyEngagement, runAdminAcademyEngagementAction } from "@/lib/academy/engagement-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  try {
    const data = await getAdminAcademyEngagement();
    if (new URL(request.url).searchParams.get("format") === "csv") {
      return new Response(toEngagementCsv(data), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="academy-engagement-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }
    return ok(data);
  } catch (error) {
    console.error("Failed to load Academy engagement centre", error);
    return problem(500, "ACADEMY_ENGAGEMENT_READ_FAILED", "Academy engagement data could not be loaded.");
  }
}

function toEngagementCsv(data: Awaited<ReturnType<typeof getAdminAcademyEngagement>>) {
  const rows = [
    ["Type", "Learner", "Course", "Title", "Status", "Detail", "Date"],
    ...data.profiles.map((profile: any) => [
      "Consent",
      profile.learner?.name ?? profile.learner?.email ?? profile.learnerId,
      profile.course?.title ?? "Global",
      "Engagement profile",
      profile.publicVisibility,
      [
        profile.communityOptIn && "community",
        profile.ambassadorOptIn && "ambassador",
        profile.directoryOptIn && "directory",
        profile.spotlightConsent && "spotlight",
      ].filter(Boolean).join(" / "),
      profile.updatedAt,
    ]),
    ...data.testimonials.map((item: any) => ["Testimonial", item.learner?.name ?? item.learner?.email ?? item.learnerId, item.course?.title ?? "General", item.title, item.status, item.body, item.createdAt]),
    ...data.challenges.map((item: any) => ["Challenge", "", item.course?.title ?? "All learners", item.title, item.status, `${item.submissions} submission(s)`, item.createdAt]),
    ...data.officeHours.map((item: any) => ["Office hour", "", item.course?.title ?? "All learners", item.title, item.active ? "ACTIVE" : "INACTIVE", `${item.rsvps} RSVP(s)`, item.startsAt]),
    ...data.referrals.map((item: any) => ["Referral", item.referrer?.name ?? item.referrer?.email ?? item.referrerId, item.course?.title ?? "General", item.referralCode, item.status, item.referredName ?? item.referredEmail ?? "", item.createdAt]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  try {
    const body = await request.json();
    const result = await runAdminAcademyEngagementAction(body, { id: auth.user.id, name: auth.user.name });
    if (!result) return problem(400, "INVALID_ENGAGEMENT_ACTION", "Unknown engagement action.");
    return ok(result);
  } catch (error) {
    console.error("Failed to update Academy engagement centre", error);
    return problem(500, "ACADEMY_ENGAGEMENT_WRITE_FAILED", error instanceof Error ? error.message : "Academy engagement update could not be saved.");
  }
}
