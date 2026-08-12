import { getMainPrisma } from "@/lib/db/main-prisma";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { describeWhatsAppSend, sendWhatsAppTextMessage } from "@/lib/integrations/whatsapp";
import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";

type Actor = { id: string; name?: string | null };

const LEGACY_DEFAULT_CAMPAIGN_SCHEDULE = "Weekly learner wins, practical field prompts, and office-hours reminders.";
const LEGACY_DEFAULT_WEEKLY_THEMES = "Market update Monday\nDocument clinic Wednesday\nField win Friday";
const NUDGE_COOLDOWN_HOURS = 20;
const ENGAGEMENT_STORAGE_TABLES = [
  "academy_engagement_settings",
  "academy_engagement_profiles",
  "academy_referrals",
  "academy_testimonials",
  "academy_challenges",
  "academy_challenge_submissions",
  "academy_office_hours",
  "academy_office_hour_rsvps",
  "academy_module_feedback",
  "academy_notification_receipts",
  "notifications",
];

const DEFAULT_SETTINGS = {
  enabled: true,
  communityEnabled: true,
  ambassadorEnabled: true,
  referralsEnabled: true,
  testimonialsEnabled: true,
  directoryEnabled: true,
  spotlightEnabled: true,
  challengesEnabled: true,
  officeHoursEnabled: true,
  moduleFeedbackEnabled: true,
  communityName: "HouseLink Academy Learner Community",
  whatsappUrl: "",
  whatsappChannelUrl: "",
  facebookPageUrl: "",
  linkedinPageUrl: "",
  invitation: "Join the optional learner community for peer support, announcements, and practical field discussions.",
  sharePrompt: "I am building my real estate knowledge through HouseLink Academy.",
  referralRewardLabel: "",
  referralUrlBase: "",
  campaignSchedule: "",
  weeklyThemes: "",
  lessonOnePlaybook: "If a learner has access but has not started, send a friendly first-lesson reminder within 24 hours.",
  progressPlaybook: "At 25%, 50%, and 80%, send a progress nudge that points learners to the next unlocked action.",
  completionPlaybook: "After completion, invite the learner to submit a review, opt in to the directory, and share a referral link.",
};

export async function getAdminAcademyEngagement() {
  const prisma = getMainPrisma() as any;
  await ensureEngagementSettings();
  const [platformSettings, normalizedLegacyCount] = await Promise.all([
    getHydratedRuntimePlatformSettings().catch(() => null),
    normalizeLegacyInAppNotifications(prisma),
  ]);
  const diagnostics: Array<{ section: string; status: "READY" | "WARNING" | "MISSING"; message: string }> = [];
  const optional = async <T>(section: string, query: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await query();
    } catch (error) {
      diagnostics.push({ section, status: "WARNING", message: error instanceof Error ? error.message : "Optional data could not be loaded." });
      return fallback;
    }
  };
  const [settingsRow, courses, profiles, testimonials, challenges, challengeSubmissions, officeHours, rsvps, referrals, moduleFeedback, courseProgressRows, activeEnrolments, approvedApplications] = await Promise.all([
    prisma.academyEngagementSetting.findUnique({ where: { id: "singleton" } }),
    prisma.trainingCourse.findMany({ select: { id: true, title: true, status: true }, orderBy: { title: "asc" } }),
    prisma.academyEngagementProfile.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.academyTestimonial.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.academyChallenge.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.academyChallengeSubmission.findMany({ orderBy: { submittedAt: "desc" }, take: 200 }),
    prisma.academyOfficeHour.findMany({ orderBy: { startsAt: "asc" }, take: 100 }),
    prisma.academyOfficeHourRsvp.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.academyReferral.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.academyModuleFeedback.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.courseProgress.findMany({ select: { agentId: true, courseId: true, percentComplete: true, status: true, updatedAt: true }, take: 2000 }),
    prisma.courseEnrolment.findMany({ where: { status: "ACTIVE" }, select: { agentId: true, courseId: true, enrolledAt: true }, take: 2000 }),
    prisma.academyLearnerApplication.findMany({ where: { status: "APPROVED" }, select: { learnerId: true, courseId: true, createdAt: true }, take: 2000 }),
  ]);
  const [certificates, notifications] = await Promise.all([
    optional("Certificate history", () => prisma.certificateIssue.findMany({ where: { status: "ACTIVE" }, select: { id: true, agentId: true, courseId: true, certificateNumber: true, issuedAt: true }, take: 1000 }), []),
    optional("Notification history", () => prisma.trainingNotification.findMany({ where: { eventType: { startsWith: "ACADEMY_" } }, orderBy: { createdAt: "desc" }, take: 300 }), []),
  ]);
  if (normalizedLegacyCount > 0) {
    diagnostics.push({
      section: "Notification history",
      status: "READY",
      message: `${normalizedLegacyCount} older in-app Academy notification(s) were normalised from QUEUED to DELIVERED.`,
    });
  }
  const [storageHealth, receipts] = await Promise.all([
    optional("Storage health", () => checkEngagementStorageHealth(prisma), []),
    optional("Notification receipts", () => getNotificationReceipts(prisma, notifications.map((row: any) => row.id)), []),
  ]);
  const receiptByNotification = new Map<string, any>(receipts.map((row: any) => [row.notificationId, row]));
  const learnerIds = unique([
    ...profiles.map((row: any) => row.learnerId),
    ...testimonials.map((row: any) => row.learnerId),
    ...challengeSubmissions.map((row: any) => row.learnerId),
    ...rsvps.map((row: any) => row.learnerId),
    ...referrals.map((row: any) => row.referrerId),
    ...referrals.map((row: any) => row.referredLearnerId),
    ...moduleFeedback.map((row: any) => row.learnerId),
    ...courseProgressRows.map((row: any) => row.agentId),
    ...activeEnrolments.map((row: any) => row.agentId),
    ...approvedApplications.map((row: any) => row.learnerId),
    ...certificates.map((row: any) => row.agentId),
    ...notifications.map((row: any) => row.userId),
  ]);
  const learners = learnerIds.length
    ? await prisma.user.findMany({ where: { id: { in: learnerIds } }, select: { id: true, name: true, email: true, phone: true } })
    : [];
  const learnerById = new Map<string, any>(learners.map((learner: any) => [learner.id, learner]));
  const courseById = new Map<string, any>(courses.map((course: any) => [course.id, course]));
  const submissionCountByChallenge = new Map<string, number>();
  for (const submission of challengeSubmissions) {
    submissionCountByChallenge.set(submission.challengeId, (submissionCountByChallenge.get(submission.challengeId) ?? 0) + 1);
  }
  const rsvpCountByOfficeHour = new Map<string, number>();
  for (const rsvp of rsvps) {
    if (rsvp.status !== "CANCELLED") rsvpCountByOfficeHour.set(rsvp.officeHourId, (rsvpCountByOfficeHour.get(rsvp.officeHourId) ?? 0) + 1);
  }

  return {
    settings: normalizeSettings(settingsRow?.payload),
    courses,
    metrics: {
      optedInLearners: profiles.filter((row: any) => row.communityOptIn || row.ambassadorOptIn || row.directoryOptIn || row.spotlightConsent).length,
      directoryProfiles: profiles.filter((row: any) => row.directoryOptIn && row.publicVisibility === "PUBLIC").length,
      pendingTestimonials: testimonials.filter((row: any) => row.status === "PENDING").length,
      activeChallenges: challenges.filter((row: any) => row.status === "PUBLISHED").length,
      upcomingOfficeHours: officeHours.filter((row: any) => row.active && new Date(row.startsAt).getTime() >= Date.now()).length,
      referrals: referrals.length,
      moduleFeedback: moduleFeedback.length,
      rewardedReferrals: referrals.filter((row: any) => row.status === "REWARDED").length,
      approvedTestimonials: testimonials.filter((row: any) => row.status === "APPROVED").length,
      spotlightApproved: profiles.filter((row: any) => row.spotlightStatus === "APPROVED").length,
      challengeSubmissions: challengeSubmissions.length,
      challengeApprovals: challengeSubmissions.filter((row: any) => row.status === "APPROVED").length,
      averageProgress: courseProgressRows.length ? Math.round(courseProgressRows.reduce((sum: number, row: any) => sum + Number(row.percentComplete ?? 0), 0) / courseProgressRows.length) : 0,
    },
    reporting: buildEngagementReporting({ profiles, testimonials, challenges, challengeSubmissions, officeHours, rsvps, referrals, moduleFeedback, courseProgressRows, activeEnrolments, approvedApplications }),
    automationRules: buildAutomationRules(normalizeSettings(settingsRow?.payload)),
    qaChecklist: buildEngagementQaChecklist({ settings: normalizeSettings(settingsRow?.payload), challenges, officeHours, testimonials, challengeSubmissions, moduleFeedback, profiles }),
    engagementScores: buildEngagementScores({ learnerById, profiles, testimonials, challengeSubmissions, rsvps, referrals, moduleFeedback, courseProgressRows, certificates }),
    learnerTimelines: buildAdminLearnerTimelines({ learnerById, courseById, profiles, testimonials, challenges, challengeSubmissions, officeHours, rsvps, referrals, moduleFeedback, courseProgressRows, activeEnrolments, approvedApplications, certificates, notifications }),
    notificationHistory: notifications.map((row: any) => ({
      ...serializeDates(row),
      learner: learnerById.get(row.userId) ?? null,
      displayStatus: getNotificationDisplayStatus(row, receiptByNotification.get(row.id)),
      deliveryLabel: describeNotificationDelivery(row),
      category: categorizeNotification(row),
      cooldownLabel: describeNudgeCooldown(row),
      nextEligibleAt: getNextNudgeEligibleAt(row),
      receipt: serializeDates(receiptByNotification.get(row.id) ?? null),
    })),
    deliverySummary: buildDeliverySummary(notifications, receiptByNotification),
    deliveryIntegrations: buildDeliveryIntegrations(normalizeSettings(settingsRow?.payload), platformSettings),
    storageHealth,
    diagnostics: [
      ...diagnostics,
      ...storageHealth.filter((item: any) => item.status !== "READY").map((item: any) => ({
        section: item.table,
        status: item.status,
        message: item.message,
      })),
    ],
    profiles: profiles.map((row: any) => ({
      ...serializeDates(row),
      learner: learnerById.get(row.learnerId) ?? null,
      course: row.courseId ? courseById.get(row.courseId) ?? null : null,
    })),
    testimonials: testimonials.map((row: any) => ({
      ...serializeDates(row),
      learner: learnerById.get(row.learnerId) ?? null,
      course: row.courseId ? courseById.get(row.courseId) ?? null : null,
    })),
    challenges: challenges.map((row: any) => ({
      ...serializeDates(row),
      course: row.courseId ? courseById.get(row.courseId) ?? null : null,
      submissions: submissionCountByChallenge.get(row.id) ?? 0,
    })),
    challengeSubmissions: challengeSubmissions.map((row: any) => ({
      ...serializeDates(row),
      learner: learnerById.get(row.learnerId) ?? null,
      challenge: challenges.find((challenge: any) => challenge.id === row.challengeId) ?? null,
    })),
    officeHours: officeHours.map((row: any) => ({
      ...serializeDates(row),
      course: row.courseId ? courseById.get(row.courseId) ?? null : null,
      rsvps: rsvpCountByOfficeHour.get(row.id) ?? 0,
    })),
    referrals: referrals.map((row: any) => ({
      ...serializeDates(row),
      referrer: learnerById.get(row.referrerId) ?? null,
      course: row.courseId ? courseById.get(row.courseId) ?? null : null,
    })),
    moduleFeedback: moduleFeedback.map((row: any) => ({
      ...serializeDates(row),
      learner: learnerById.get(row.learnerId) ?? null,
      course: row.courseId ? courseById.get(row.courseId) ?? null : null,
    })),
  };
}

export async function runAdminAcademyEngagementAction(body: Record<string, any>, actor: Actor) {
  const prisma = getMainPrisma() as any;
  await ensureEngagementSettings();
  const action = String(body.action ?? "");
  if (action === "update_settings") {
    const payload = normalizeSettings(body.settings);
    const settings = await prisma.academyEngagementSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", payload },
      update: { payload },
    });
    await audit(actor, "academy.engagement.settings.update", "singleton", payload);
    return settings;
  }
  if (action === "save_challenge") {
    const input = body.challenge ?? {};
    const data = {
      courseId: nullable(input.courseId),
      title: required(input.title, "Challenge title"),
      instructions: required(input.instructions, "Challenge instructions"),
      rewardLabel: nullable(input.rewardLabel),
      status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(input.status)) ? String(input.status) : "DRAFT",
      startsAt: optionalDate(input.startsAt),
      endsAt: optionalDate(input.endsAt),
    };
    const row = body.challengeId
      ? await prisma.academyChallenge.update({ where: { id: String(body.challengeId) }, data })
      : await prisma.academyChallenge.create({ data });
    await audit(actor, "academy.engagement.challenge.save", row.id, { title: row.title, status: row.status });
    return row;
  }
  if (action === "delete_challenge") {
    const id = String(body.challengeId);
    const submissions = await prisma.academyChallengeSubmission.count({ where: { challengeId: id } });
    if (submissions > 0) throw new Error("Archive this challenge instead because learner submissions already exist.");
    await prisma.academyChallenge.delete({ where: { id } });
    await audit(actor, "academy.engagement.challenge.delete", id, {});
    return { id, deleted: true };
  }
  if (action === "save_office_hour") {
    const input = body.officeHour ?? {};
    const data = {
      courseId: nullable(input.courseId),
      title: required(input.title, "Office-hours title"),
      description: nullable(input.description),
      startsAt: requiredDate(input.startsAt, "Start date/time"),
      link: nullable(input.link),
      capacity: optionalNumber(input.capacity),
      active: input.active !== false,
    };
    const row = body.officeHourId
      ? await prisma.academyOfficeHour.update({ where: { id: String(body.officeHourId) }, data })
      : await prisma.academyOfficeHour.create({ data });
    await audit(actor, "academy.engagement.office_hour.save", row.id, { title: row.title, active: row.active });
    if (row.active && row.startsAt > new Date()) {
      await notifyOfficeHourAudience(row);
    }
    return row;
  }
  if (action === "delete_office_hour") {
    const id = String(body.officeHourId);
    await prisma.academyOfficeHourRsvp.deleteMany({ where: { officeHourId: id } });
    await prisma.academyOfficeHour.delete({ where: { id } });
    await audit(actor, "academy.engagement.office_hour.delete", id, {});
    return { id, deleted: true };
  }
  if (action === "moderate_testimonial") {
    const row = await prisma.academyTestimonial.update({
      where: { id: String(body.testimonialId) },
      data: {
        status: ["APPROVED", "REJECTED", "PENDING"].includes(String(body.status)) ? String(body.status) : "PENDING",
        adminNote: nullable(body.adminNote),
      },
    });
    await audit(actor, "academy.engagement.testimonial.moderate", row.id, { status: row.status });
    await notifyLearner(row.learnerId, "ACADEMY_TESTIMONIAL_MODERATED", row.status === "APPROVED" ? "Testimonial approved" : "Testimonial reviewed", row.status === "APPROVED" ? "Your Academy testimonial was approved for public use. Thank you for sharing your experience." : "Your Academy testimonial has been reviewed by the Academy team.");
    return row;
  }
  if (action === "moderate_challenge_submission") {
    const row = await prisma.academyChallengeSubmission.update({
      where: { id: String(body.submissionId) },
      data: {
        status: ["APPROVED", "NEEDS_WORK", "REJECTED", "SUBMITTED"].includes(String(body.status)) ? String(body.status) : "SUBMITTED",
        adminNote: nullable(body.adminNote),
        reviewedAt: new Date(),
      },
    });
    await audit(actor, "academy.engagement.challenge_submission.moderate", row.id, { status: row.status });
    await notifyLearner(row.learnerId, "ACADEMY_CHALLENGE_REVIEWED", row.status === "APPROVED" ? "Challenge approved" : "Challenge needs attention", row.status === "APPROVED" ? "Your practical challenge submission was approved." : "Your practical challenge submission was reviewed. Please check the Engagement Hub for the latest status.");
    return row;
  }
  if (action === "moderate_module_feedback") {
    const row = await prisma.academyModuleFeedback.update({
      where: { id: String(body.feedbackId) },
      data: { status: ["NEW", "REVIEWED", "ARCHIVED"].includes(String(body.status)) ? String(body.status) : "REVIEWED" },
    });
    await audit(actor, "academy.engagement.module_feedback.moderate", row.id, { status: row.status });
    if (row.status === "REVIEWED") {
      await notifyLearner(row.learnerId, "ACADEMY_MODULE_FEEDBACK_REVIEWED", "Module feedback reviewed", "Thank you for your module feedback. The Academy team has reviewed it and will use it to improve the course experience.");
    }
    return row;
  }
  if (action === "moderate_spotlight") {
    const row = await prisma.academyEngagementProfile.update({
      where: { id: String(body.profileId) },
      data: { spotlightStatus: ["APPROVED", "REJECTED", "PENDING", "NOT_SUBMITTED"].includes(String(body.status)) ? String(body.status) : "PENDING" },
    });
    await audit(actor, "academy.engagement.spotlight.moderate", row.id, { status: row.spotlightStatus });
    await notifyLearner(row.learnerId, "ACADEMY_SPOTLIGHT_REVIEWED", row.spotlightStatus === "APPROVED" ? "Learner spotlight approved" : "Learner spotlight reviewed", row.spotlightStatus === "APPROVED" ? "Your optional Academy learner spotlight permission was approved. You may be featured on HouseLink Academy surfaces." : "Your optional Academy learner spotlight permission was reviewed.");
    return row;
  }
  if (action === "send_progress_nudges") {
    const count = await sendProgressNudges();
    await audit(actor, "academy.engagement.progress_nudges.send", "academy", { count });
    return { count };
  }
  if (action === "send_journey_playbook_nudges") {
    const count = await sendJourneyPlaybookNudges();
    await audit(actor, "academy.engagement.journey_playbook_nudges.send", "academy", { count });
    return { count };
  }
  if (action === "run_engagement_scheduler") {
    const result = await runAcademyEngagementScheduler(actor);
    await audit(actor, "academy.engagement.scheduler.run", "academy", result);
    return result;
  }
  return null;
}

export async function runAcademyEngagementScheduler(_actor?: Actor) {
  await ensureEngagementSettings();
  const [journeyNudges, progressNudges] = await Promise.all([
    sendJourneyPlaybookNudges(),
    sendProgressNudges(),
  ]);
  return {
    journeyNudges,
    progressNudges,
    total: journeyNudges + progressNudges,
    ranAt: new Date().toISOString(),
    cooldownHours: NUDGE_COOLDOWN_HOURS,
  };
}

export async function getLearnerAcademyEngagement(learnerId: string) {
  const prisma = getMainPrisma() as any;
  await ensureEngagementSettings();
  const [settingsRow, enrolments, applications, progressRows] = await Promise.all([
    prisma.academyEngagementSetting.findUnique({ where: { id: "singleton" } }),
    prisma.courseEnrolment.findMany({ where: { agentId: learnerId, status: "ACTIVE" }, include: { course: { select: { id: true, title: true } } } }),
    prisma.academyLearnerApplication.findMany({ where: { learnerId, status: "APPROVED" }, include: { course: { select: { id: true, title: true } } } }),
    prisma.courseProgress.findMany({ where: { agentId: learnerId }, select: { courseId: true, percentComplete: true, completedAt: true, status: true, updatedAt: true } }),
  ]);
  const certificates = await safeQuery(
    () => prisma.certificateIssue.findMany({ where: { agentId: learnerId, status: "ACTIVE" }, select: { id: true, courseId: true, certificateNumber: true, issuedAt: true } }),
    [],
  );
  const courses = uniqueBy(
    [...enrolments.map((row: any) => row.course), ...applications.map((row: any) => row.course)].filter(Boolean),
    (course: any) => course.id,
  );
  const courseIds = courses.map((course: any) => course.id);
  const [profiles, referrals, testimonials, challenges, challengeSubmissions, officeHours, rsvps] = await Promise.all([
    prisma.academyEngagementProfile.findMany({ where: { learnerId, OR: [{ courseId: null }, { courseId: { in: courseIds } }] }, orderBy: { updatedAt: "desc" } }),
    prisma.academyReferral.findMany({ where: { referrerId: learnerId }, orderBy: { createdAt: "desc" } }),
    prisma.academyTestimonial.findMany({ where: { learnerId }, orderBy: { updatedAt: "desc" } }),
    prisma.academyChallenge.findMany({
      where: { status: "PUBLISHED", OR: [{ courseId: null }, { courseId: { in: courseIds } }] },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.academyChallengeSubmission.findMany({ where: { learnerId }, orderBy: { submittedAt: "desc" } }),
    prisma.academyOfficeHour.findMany({
      where: { active: true, startsAt: { gte: new Date(Date.now() - 3600000) }, OR: [{ courseId: null }, { courseId: { in: courseIds } }] },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
    prisma.academyOfficeHourRsvp.findMany({ where: { learnerId } }),
  ]);
  const notifications = await safeQuery(
    () => prisma.trainingNotification.findMany({ where: { userId: learnerId, eventType: { startsWith: "ACADEMY_" } }, orderBy: { createdAt: "desc" }, take: 30 }),
    [],
  );
  const receipts = await getNotificationReceipts(prisma, notifications.map((row: any) => row.id), learnerId);
  const receiptByNotification = new Map<string, any>(receipts.map((row: any) => [row.notificationId, row]));
  const profile = profiles.find((row: any) => row.courseId === null) ?? null;
  const settings = normalizeSettings(settingsRow?.payload);
  const journey = buildLearnerEngagementJourney({ courses, progressRows, certificates });
  const nextAction = buildLearnerNextAction(journey, settings);
  return {
    settings,
    courses,
    journey,
    nextAction,
    timeline: buildLearnerTimeline({ progressRows, certificates, testimonials, challengeSubmissions, rsvps, referrals, notifications, courseById: new Map(courses.map((course: any) => [course.id, course.title])) }),
    messages: notifications.map((row: any) => ({
      ...serializeDates(row),
      category: categorizeNotification(row),
      deliveryLabel: describeNotificationDelivery(row),
      receipt: serializeDates(receiptByNotification.get(row.id) ?? null),
    })),
    profile: profile ? serializeDates(profile) : null,
    profiles: profiles.map(serializeDates),
    referrals: referrals.map(serializeDates),
    referralUrl: profile?.referralCode ? buildReferralUrl(profile.referralCode, settings) : null,
    testimonials: settings.testimonialsEnabled ? testimonials.map(serializeDates) : [],
    challenges: settings.challengesEnabled ? challenges.map((challenge: any) => ({
      ...serializeDates(challenge),
      submitted: challengeSubmissions.some((submission: any) => submission.challengeId === challenge.id),
      submission: serializeDates(challengeSubmissions.find((submission: any) => submission.challengeId === challenge.id) ?? null),
    })) : [],
    officeHours: settings.officeHoursEnabled ? officeHours.map((officeHour: any) => ({
      ...serializeDates(officeHour),
      rsvp: serializeDates(rsvps.find((rsvp: any) => rsvp.officeHourId === officeHour.id) ?? null),
    })) : [],
  };
}

export async function runLearnerAcademyEngagementAction(learnerId: string, body: Record<string, any>) {
  const prisma = getMainPrisma() as any;
  const action = String(body.action ?? "");
  if (action === "save_profile") {
    const settings = await getSettings();
    const journey = await getLearnerEngagementJourney(learnerId);
    const input = body.profile ?? {};
    const optedIn = Boolean(input.communityOptIn || input.ambassadorOptIn || input.directoryOptIn || input.spotlightConsent);
    const existing = await prisma.academyEngagementProfile.findFirst({ where: { learnerId, courseId: null } });
    const data = {
      communityOptIn: settings.communityEnabled && journey.canUseCommunity && Boolean(input.communityOptIn),
      ambassadorOptIn: settings.ambassadorEnabled && journey.canUseReferrals && Boolean(input.ambassadorOptIn),
      directoryOptIn: settings.directoryEnabled && journey.canJoinDirectory && Boolean(input.directoryOptIn),
      spotlightConsent: settings.spotlightEnabled && journey.canRequestSpotlight && Boolean(input.spotlightConsent),
      publicVisibility: settings.directoryEnabled && journey.canJoinDirectory && input.directoryOptIn ? "PUBLIC" : "PRIVATE",
      profileHeadline: nullable(input.profileHeadline),
      profileBio: nullable(input.profileBio),
      sharedPostConfirmed: settings.ambassadorEnabled && journey.canUseReferrals && Boolean(input.sharedPostConfirmed),
      sharedPostUrl: nullable(input.sharedPostUrl),
      spotlightStatus: settings.spotlightEnabled && journey.canRequestSpotlight && input.spotlightConsent ? (existing?.spotlightStatus === "APPROVED" ? "APPROVED" : "PENDING") : "NOT_SUBMITTED",
      consentedAt: optedIn ? new Date() : null,
      consentWithdrawnAt: optedIn ? null : new Date(),
    };
    const row = existing
      ? await prisma.academyEngagementProfile.update({ where: { id: existing.id }, data })
      : await prisma.academyEngagementProfile.create({ data: { learnerId, courseId: null, referralCode: await uniqueReferralCode(learnerId), ...data } });
    if (data.communityOptIn) await awardEngagementBadge(learnerId, "academy-engagement-community", "Academy Community Member", "Opted in to the optional Academy learner community.", 50);
    if (data.ambassadorOptIn) await awardEngagementBadge(learnerId, "academy-engagement-ambassador", "Academy Ambassador", "Opted in to the Academy ambassador programme.", 100);
    if (data.sharedPostConfirmed) await awardEngagementBadge(learnerId, "academy-engagement-sharer", "Academy Story Sharer", "Confirmed an optional Academy enrolment or progress share.", 75);
    return row;
  }
  if (["mark_notification_read", "mark_notification_clicked", "dismiss_notification"].includes(action)) {
    return recordNotificationReceipt(
      learnerId,
      required(body.notificationId, "Notification"),
      action === "mark_notification_read" ? "readAt" : action === "mark_notification_clicked" ? "clickedAt" : "dismissedAt",
    );
  }
  if (action === "submit_testimonial") {
    const settings = await getSettings();
    if (!settings.testimonialsEnabled) throw new Error("Testimonials are currently disabled.");
    const journey = await getLearnerEngagementJourney(learnerId);
    if (!journey.canSubmitReview) throw new Error("Reviews unlock after meaningful course progress or completion.");
    const input = body.testimonial ?? {};
    const row = await prisma.academyTestimonial.create({
      data: {
        learnerId,
        courseId: nullable(input.courseId),
        rating: optionalNumber(input.rating),
        title: required(input.title, "Testimonial title"),
        body: required(input.body, "Testimonial"),
        publicConsent: Boolean(input.publicConsent),
        status: "PENDING",
      },
    });
    await awardEngagementBadge(learnerId, "academy-engagement-testimonial", "Academy Reviewer", "Submitted an optional Academy testimonial for moderation.", 75);
    return row;
  }
  if (action === "submit_challenge") {
    const settings = await getSettings();
    if (!settings.challengesEnabled) throw new Error("Practical challenges are currently disabled.");
    const journey = await getLearnerEngagementJourney(learnerId);
    if (!journey.canUseChallenges) throw new Error("Practical challenges are available to active learners.");
    const challengeId = String(body.challengeId);
    await assertPublishedChallengeAccess(learnerId, challengeId);
    return prisma.academyChallengeSubmission.upsert({
      where: { challengeId_learnerId: { challengeId, learnerId } },
      create: { challengeId, learnerId, evidence: required(body.evidence, "Challenge evidence") },
      update: { evidence: required(body.evidence, "Challenge evidence"), status: "SUBMITTED", adminNote: null, reviewedAt: null },
    });
  }
  if (action === "rsvp_office_hour") {
    const settings = await getSettings();
    if (!settings.officeHoursEnabled) throw new Error("Office hours are currently disabled.");
    const journey = await getLearnerEngagementJourney(learnerId);
    if (!journey.canUseOfficeHours) throw new Error("Office hours are available to active learners.");
    const officeHourId = String(body.officeHourId);
    await assertOfficeHourAccess(learnerId, officeHourId);
    return prisma.academyOfficeHourRsvp.upsert({
      where: { officeHourId_learnerId: { officeHourId, learnerId } },
      create: { officeHourId, learnerId, status: String(body.status ?? "GOING") },
      update: { status: String(body.status ?? "GOING") },
    });
  }
  if (action === "create_referral") {
    const settings = await getSettings();
    if (!settings.referralsEnabled) throw new Error("Referrals are currently disabled.");
    const journey = await getLearnerEngagementJourney(learnerId);
    if (!journey.canUseReferrals) throw new Error("Referrals unlock after you join an Academy course.");
    const profile = await ensureLearnerReferralProfile(learnerId);
    return prisma.academyReferral.create({
      data: {
        referrerId: learnerId,
        courseId: nullable(body.courseId),
        referralCode: profile.referralCode,
        referredName: nullable(body.referredName),
        referredEmail: nullable(body.referredEmail),
        rewardLabel: nullable(body.rewardLabel),
      },
    });
  }
  if (action === "submit_module_feedback") {
    const settings = await getSettings();
    if (!settings.moduleFeedbackEnabled) throw new Error("Module feedback is currently disabled.");
    await assertCourseAccess(learnerId, String(body.courseId));
    return prisma.academyModuleFeedback.create({
      data: {
        learnerId,
        courseId: required(body.courseId, "Course"),
        moduleId: required(body.moduleId, "Module"),
        lessonId: nullable(body.lessonId),
        question: "What was unclear in this module?",
        response: required(body.response, "Feedback"),
      },
    });
  }
  return null;
}

async function getLearnerEngagementJourney(learnerId: string) {
  const prisma = getMainPrisma() as any;
  const [enrolments, applications, progressRows, certificates] = await Promise.all([
    prisma.courseEnrolment.findMany({ where: { agentId: learnerId, status: "ACTIVE" }, include: { course: { select: { id: true, title: true } } } }),
    prisma.academyLearnerApplication.findMany({ where: { learnerId, status: "APPROVED" }, include: { course: { select: { id: true, title: true } } } }),
    prisma.courseProgress.findMany({ where: { agentId: learnerId }, select: { courseId: true, percentComplete: true, completedAt: true, status: true } }),
    prisma.certificateIssue.findMany({ where: { agentId: learnerId, status: "ACTIVE" }, select: { courseId: true } }),
  ]);
  const courses = uniqueBy(
    [...enrolments.map((row: any) => row.course), ...applications.map((row: any) => row.course)].filter(Boolean),
    (course: any) => course.id,
  );
  return buildLearnerEngagementJourney({ courses, progressRows, certificates });
}

function buildLearnerEngagementJourney(input: {
  courses: Array<{ id: string; title: string }>;
  progressRows: Array<{ courseId: string; percentComplete?: number | null; completedAt?: Date | string | null; status?: string | null }>;
  certificates: Array<{ courseId?: string | null }>;
}) {
  const courseIds = new Set(input.courses.map((course) => course.id));
  const relevantProgress = input.progressRows.filter((row) => courseIds.has(row.courseId));
  const highestProgress = relevantProgress.reduce((max, row) => Math.max(max, Number(row.percentComplete ?? 0)), 0);
  const completedCourseIds = new Set<string>();
  for (const row of relevantProgress) {
    if (row.completedAt || row.status === "COMPLETED" || Number(row.percentComplete ?? 0) >= 100) completedCourseIds.add(row.courseId);
  }
  for (const certificate of input.certificates) {
    if (certificate.courseId) completedCourseIds.add(certificate.courseId);
  }
  const activeCourseCount = input.courses.length;
  const completedCourseCount = completedCourseIds.size;
  const hasActiveCourse = activeCourseCount > 0;
  const hasMeaningfulProgress = highestProgress >= 25 || completedCourseCount > 0;
  return {
    activeCourseCount,
    completedCourseCount,
    highestProgress,
    hasActiveCourse,
    hasMeaningfulProgress,
    stage: completedCourseCount > 0 ? "GRADUATE" : hasMeaningfulProgress ? "IN_PROGRESS" : hasActiveCourse ? "ACTIVE_LEARNER" : "NOT_ENROLLED",
    canUseCommunity: hasActiveCourse,
    canUseReferrals: hasActiveCourse,
    canUseChallenges: hasActiveCourse,
    canUseOfficeHours: hasActiveCourse,
    canSubmitReview: hasMeaningfulProgress,
    canJoinDirectory: completedCourseCount > 0,
    canRequestSpotlight: hasMeaningfulProgress,
  };
}

function buildLearnerNextAction(journey: ReturnType<typeof buildLearnerEngagementJourney>, settings: Record<string, any>) {
  if (!journey.hasActiveCourse) {
    return {
      title: "Choose your first Academy course",
      body: "Register for a course to unlock the learner community, practical challenges, office hours, and progress support.",
      href: "/academy?browse=1",
      cta: "Browse courses",
      tone: "info",
    };
  }
  if (!journey.hasMeaningfulProgress) {
    return {
      title: "Start with Lesson 1",
      body: "Open your course and complete the first lesson. Engagement tools stay light until you build your first progress record.",
      href: "/dashboard/academy",
      cta: "Open learner dashboard",
      tone: "warning",
    };
  }
  if (journey.completedCourseCount === 0) {
    return {
      title: "Keep momentum through the next checkpoint",
      body: "You have started well. Continue the next lesson, quiz, assignment, or practical challenge that is available for your course.",
      href: "/dashboard/academy",
      cta: "Continue learning",
      tone: "success",
    };
  }
  if (settings.testimonialsEnabled) {
    return {
      title: "Share your graduate experience",
      body: "You can submit a moderated review, opt in to the graduate directory, or invite another learner with your referral code.",
      href: "/dashboard/academy",
      cta: "Manage graduate options",
      tone: "success",
    };
  }
  return {
    title: "Manage your graduate profile",
    body: "Your course completion unlocks optional graduate visibility and community recognition controls.",
    href: "/dashboard/academy",
    cta: "Review options",
    tone: "success",
  };
}

function buildAutomationRules(settings: Record<string, any>) {
  return [
    {
      key: "lesson-one",
      label: "Lesson 1 activation",
      trigger: "Active learner has no course progress yet",
      message: settings.lessonOnePlaybook,
      enabled: Boolean(settings.enabled),
    },
    {
      key: "progress",
      label: "Progress milestones",
      trigger: "Learner reaches 25%, 50%, or 80% progress",
      message: settings.progressPlaybook,
      enabled: Boolean(settings.enabled),
    },
    {
      key: "completion",
      label: "Graduate follow-up",
      trigger: "Learner completes a course or receives a certificate",
      message: settings.completionPlaybook,
      enabled: Boolean(settings.enabled && settings.testimonialsEnabled),
    },
    {
      key: "office-hours",
      label: "Office-hours announcement",
      trigger: "Admin creates an active future office-hours event",
      message: "Learners with access receive one in-app invitation per event.",
      enabled: Boolean(settings.enabled && settings.officeHoursEnabled),
    },
  ];
}

function buildEngagementQaChecklist(input: {
  settings: Record<string, any>;
  challenges: any[];
  officeHours: any[];
  testimonials: any[];
  challengeSubmissions: any[];
  moduleFeedback: any[];
  profiles: any[];
}) {
  const activeChallenges = input.challenges.filter((row) => row.status === "PUBLISHED");
  const activeOfficeHours = input.officeHours.filter((row) => row.active && new Date(row.startsAt).getTime() >= Date.now());
  const pendingSpotlights = input.profiles.filter((row) => row.spotlightConsent && row.spotlightStatus === "PENDING").length;
  return [
    {
      key: "community-links",
      label: "Community links configured",
      status: input.settings.communityEnabled ? (input.settings.whatsappUrl || input.settings.whatsappChannelUrl || input.settings.facebookPageUrl || input.settings.linkedinPageUrl ? "READY" : "NEEDS_SETUP") : "OFF",
      detail: input.settings.communityEnabled ? "Add at least one WhatsApp, Facebook, or LinkedIn destination for learners." : "Community links are disabled.",
    },
    {
      key: "calendar",
      label: "No fake learner calendar",
      status: String(input.settings.weeklyThemes ?? "").trim() ? "READY" : "EMPTY_OK",
      detail: String(input.settings.weeklyThemes ?? "").trim() ? "Learner calendar themes are admin-saved." : "Calendar is hidden until admin adds real themes.",
    },
    {
      key: "challenges",
      label: "Practical challenges",
      status: input.settings.challengesEnabled ? (activeChallenges.length ? "READY" : "NEEDS_CONTENT") : "OFF",
      detail: activeChallenges.length ? `${activeChallenges.length} published challenge(s).` : "Publish a challenge only when instructions and evidence requirements are ready.",
    },
    {
      key: "office-hours",
      label: "Office hours",
      status: input.settings.officeHoursEnabled ? (activeOfficeHours.length ? "READY" : "NEEDS_CONTENT") : "OFF",
      detail: activeOfficeHours.length ? `${activeOfficeHours.length} upcoming event(s).` : "Schedule a real WhatsApp or Zoom session with a working link.",
    },
    {
      key: "moderation",
      label: "Moderation queue",
      status: input.testimonials.filter((row) => row.status === "PENDING").length + input.challengeSubmissions.filter((row) => row.status === "SUBMITTED").length + input.moduleFeedback.filter((row) => row.status === "NEW").length + pendingSpotlights ? "NEEDS_REVIEW" : "READY",
      detail: "Review pending testimonials, challenge submissions, module feedback, and spotlight permissions.",
    },
  ];
}

function buildEngagementScores(input: {
  learnerById: Map<string, any>;
  profiles: any[];
  testimonials: any[];
  challengeSubmissions: any[];
  rsvps: any[];
  referrals: any[];
  moduleFeedback: any[];
  courseProgressRows: any[];
  certificates: any[];
}) {
  const scores = new Map<string, { learnerId: string; score: number; detail: string[] }>();
  function add(learnerId: string | null | undefined, points: number, label: string) {
    if (!learnerId) return;
    const row = scores.get(learnerId) ?? { learnerId, score: 0, detail: [] };
    row.score += points;
    if (!row.detail.includes(label)) row.detail.push(label);
    scores.set(learnerId, row);
  }
  for (const row of input.courseProgressRows) add(row.agentId, Math.min(40, Math.round(Number(row.percentComplete ?? 0) / 3)), "Course progress");
  for (const row of input.profiles) if (row.communityOptIn || row.ambassadorOptIn || row.directoryOptIn || row.spotlightConsent) add(row.learnerId, 10, "Opted in");
  for (const row of input.testimonials) add(row.learnerId, row.status === "APPROVED" ? 15 : 8, "Review/testimonial");
  for (const row of input.challengeSubmissions) add(row.learnerId, row.status === "APPROVED" ? 18 : 10, "Challenge submission");
  for (const row of input.rsvps) if (row.status !== "CANCELLED") add(row.learnerId, 8, "Office-hours RSVP");
  for (const row of input.referrals) add(row.referrerId, row.status === "REWARDED" ? 20 : 8, "Referral");
  for (const row of input.moduleFeedback) add(row.learnerId, 6, "Module feedback");
  for (const row of input.certificates) add(row.agentId, 25, "Certificate");
  return [...scores.values()]
    .map((row) => ({
      ...row,
      score: Math.max(0, Math.min(100, row.score)),
      learner: input.learnerById.get(row.learnerId) ?? null,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

function buildAdminLearnerTimelines(input: {
  learnerById: Map<string, any>;
  courseById: Map<string, any>;
  profiles: any[];
  testimonials: any[];
  challenges: any[];
  challengeSubmissions: any[];
  officeHours: any[];
  rsvps: any[];
  referrals: any[];
  moduleFeedback: any[];
  courseProgressRows: any[];
  activeEnrolments: any[];
  approvedApplications: any[];
  certificates: any[];
  notifications: any[];
}) {
  const eventsByLearner = new Map<string, Array<{ id: string; type: string; title: string; detail: string; createdAt: Date | string }>>();
  function add(learnerId: string | null | undefined, event: { id: string; type: string; title: string; detail: string; createdAt: Date | string }) {
    if (!learnerId) return;
    const rows = eventsByLearner.get(learnerId) ?? [];
    rows.push(event);
    eventsByLearner.set(learnerId, rows);
  }
  for (const row of input.activeEnrolments) add(row.agentId, { id: `enrol-${row.agentId}-${row.courseId}`, type: "Enrolment", title: "Course access active", detail: input.courseById.get(row.courseId)?.title ?? row.courseId, createdAt: row.enrolledAt });
  for (const row of input.approvedApplications) add(row.learnerId, { id: `application-${row.learnerId}-${row.courseId}`, type: "Application", title: "Application approved", detail: input.courseById.get(row.courseId)?.title ?? row.courseId, createdAt: row.createdAt });
  for (const row of input.courseProgressRows) add(row.agentId, { id: `progress-${row.agentId}-${row.courseId}`, type: "Progress", title: `${Math.round(Number(row.percentComplete ?? 0))}% progress`, detail: input.courseById.get(row.courseId)?.title ?? row.courseId, createdAt: row.updatedAt });
  for (const row of input.certificates) add(row.agentId, { id: row.id, type: "Certificate", title: "Certificate issued", detail: row.certificateNumber, createdAt: row.issuedAt });
  for (const row of input.testimonials) add(row.learnerId, { id: row.id, type: "Testimonial", title: row.status, detail: row.title, createdAt: row.createdAt });
  const challengeById = new Map(input.challenges.map((row) => [row.id, row.title]));
  for (const row of input.challengeSubmissions) add(row.learnerId, { id: row.id, type: "Challenge", title: row.status, detail: challengeById.get(row.challengeId) ?? row.challengeId, createdAt: row.submittedAt });
  const officeById = new Map(input.officeHours.map((row) => [row.id, row.title]));
  for (const row of input.rsvps) add(row.learnerId, { id: row.id, type: "Office hours", title: row.status, detail: officeById.get(row.officeHourId) ?? row.officeHourId, createdAt: row.createdAt });
  for (const row of input.referrals) add(row.referrerId, { id: row.id, type: "Referral", title: row.status, detail: row.referredName ?? row.referredEmail ?? row.referralCode, createdAt: row.createdAt });
  for (const row of input.moduleFeedback) add(row.learnerId, { id: row.id, type: "Feedback", title: row.status, detail: row.response, createdAt: row.createdAt });
  for (const row of input.notifications) add(row.userId, { id: row.id, type: "Notification", title: row.subject, detail: row.status, createdAt: row.createdAt });
  return [...eventsByLearner.entries()]
    .map(([learnerId, events]) => ({
      learnerId,
      learner: input.learnerById.get(learnerId) ?? null,
      events: events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12).map(serializeDates),
    }))
    .sort((a, b) => new Date(b.events[0]?.createdAt ?? 0).getTime() - new Date(a.events[0]?.createdAt ?? 0).getTime())
    .slice(0, 30);
}

function buildLearnerTimeline(input: {
  progressRows: any[];
  certificates: any[];
  testimonials: any[];
  challengeSubmissions: any[];
  rsvps: any[];
  referrals: any[];
  notifications: any[];
  courseById: Map<string, string>;
}) {
  const events = [
    ...input.progressRows.map((row) => ({ id: `progress-${row.courseId}`, type: "Progress", title: `${Math.round(Number(row.percentComplete ?? 0))}% course progress`, detail: input.courseById.get(row.courseId) ?? row.courseId, createdAt: row.completedAt ?? row.updatedAt })),
    ...input.certificates.map((row) => ({ id: row.id, type: "Certificate", title: "Certificate active", detail: row.certificateNumber ?? input.courseById.get(row.courseId ?? "") ?? "Academy certificate", createdAt: row.issuedAt })),
    ...input.testimonials.map((row) => ({ id: row.id, type: "Review", title: row.status, detail: row.title, createdAt: row.createdAt })),
    ...input.challengeSubmissions.map((row) => ({ id: row.id, type: "Challenge", title: row.status, detail: row.evidence, createdAt: row.submittedAt })),
    ...input.rsvps.map((row) => ({ id: row.id, type: "Office hours", title: row.status, detail: "RSVP recorded", createdAt: row.createdAt })),
    ...input.referrals.map((row) => ({ id: row.id, type: "Referral", title: row.status, detail: row.referredName ?? row.referredEmail ?? row.referralCode, createdAt: row.createdAt })),
    ...input.notifications.map((row) => ({ id: row.id, type: "Notification", title: row.subject, detail: row.body, createdAt: row.createdAt })),
  ];
  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12).map(serializeDates);
}

function describeNotificationDelivery(row: { channel?: string | null; status?: string | null; sentAt?: Date | string | null }) {
  const channel = row.channel || "IN_APP";
  const status = row.status || "QUEUED";
  if (channel === "IN_APP" && (status === "DELIVERED" || row.sentAt)) {
    return "Visible in learner notification centre";
  }
  if (channel === "IN_APP" && status === "QUEUED") {
    return "Queued in app; learner visibility depends on notification polling";
  }
  if (status === "SKIPPED") return "Skipped because channel requirements were not met";
  if (status === "FAILED") return "Delivery failed";
  if (status === "SENT") return channel === "EMAIL" ? "Sent to learner email" : channel === "WHATSAPP" ? "Submitted to learner WhatsApp number" : "Sent";
  if (row.sentAt) return "Sent to external channel";
  return "Delivery receipt not available";
}

function getNotificationDisplayStatus(row: { channel?: string | null; status?: string | null; sentAt?: Date | string | null }, receipt?: any) {
  const channel = row.channel || "IN_APP";
  const status = row.status || "QUEUED";
  if (receipt?.clickedAt) return "ACTION RECORDED";
  if (receipt?.readAt) return "READ";
  if (channel === "IN_APP" && (status === "DELIVERED" || status === "SENT" || row.sentAt)) return "VISIBLE IN APP";
  if (status === "SKIPPED") return "SKIPPED";
  if (status === "FAILED") return "FAILED";
  if (status === "SENT") return channel === "EMAIL" ? "EMAIL SENT" : channel === "WHATSAPP" ? "WHATSAPP SENT" : "SENT";
  if (channel === "EMAIL" && status === "QUEUED") return "EMAIL WAITING";
  if (channel === "WHATSAPP" && status === "QUEUED") return "WHATSAPP WAITING";
  return "WAITING";
}

function categorizeNotification(row: { eventType?: string | null; subject?: string | null }) {
  const key = `${row.eventType ?? ""} ${row.subject ?? ""}`.toUpperCase();
  if (key.includes("CERTIFICATE") || key.includes("COMPLETE")) return "Graduate";
  if (key.includes("TESTIMONIAL") || key.includes("REVIEW")) return "Review";
  if (key.includes("OFFICE_HOUR") || key.includes("COMMUNITY")) return "Community";
  if (key.includes("CHALLENGE") || key.includes("ASSIGNMENT")) return "Practice";
  if (key.includes("PROGRESS") || key.includes("JOURNEY") || key.includes("LESSON")) return "Progress";
  if (key.includes("REFERRAL")) return "Referral";
  return "Academy";
}

function getNextNudgeEligibleAt(row: { eventType?: string | null; createdAt?: Date | string | null }) {
  const eventType = row.eventType ?? "";
  if (!eventType.startsWith("ACADEMY_PROGRESS_NUDGE_") && !eventType.startsWith("ACADEMY_JOURNEY_PLAYBOOK_")) return null;
  const createdAt = row.createdAt ? new Date(row.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
  return new Date(createdAt.getTime() + NUDGE_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
}

function describeNudgeCooldown(row: { eventType?: string | null; createdAt?: Date | string | null }) {
  const eligibleAt = getNextNudgeEligibleAt(row);
  if (!eligibleAt) return "No cooldown";
  const remainingMs = new Date(eligibleAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Eligible if a new journey stage exists";
  const hours = Math.ceil(remainingMs / 3600000);
  return `${hours}h cooldown remaining`;
}

function buildDeliverySummary(notifications: any[], receiptByNotification: Map<string, any>) {
  const summary = {
    total: notifications.length,
    visibleInApp: 0,
    waiting: 0,
    failed: 0,
    read: 0,
    actionRecorded: 0,
  };
  for (const row of notifications) {
    const displayStatus = getNotificationDisplayStatus(row, receiptByNotification.get(row.id));
    if (displayStatus === "ACTION RECORDED") summary.actionRecorded += 1;
    if (displayStatus === "READ" || displayStatus === "ACTION RECORDED") summary.read += 1;
    if (displayStatus === "VISIBLE IN APP" || displayStatus === "READ" || displayStatus === "ACTION RECORDED") summary.visibleInApp += 1;
    else if (displayStatus === "FAILED") summary.failed += 1;
    else summary.waiting += 1;
  }
  return summary;
}

function buildDeliveryIntegrations(settings: Record<string, any>, platformSettings: Awaited<ReturnType<typeof getHydratedRuntimePlatformSettings>> | null) {
  const integrations = platformSettings?.integrations;
  const emailConnected = Boolean(
    integrations?.smtpHost
    && integrations?.smtpPort
    && integrations?.smtpUser
    && integrations?.smtpPass,
  );
  const whatsappConnected = Boolean(
    integrations?.whatsappProvider
    && integrations?.whatsappAccessToken
    && integrations?.whatsappPhoneNumberId,
  );
  return [
    {
      channel: "IN_APP",
      label: "In-app learner messages",
      connected: true,
      receiptSupport: "Created, visible, read, clicked, and dismissed states are tracked in HouseLink.",
      adminAction: "No setup required.",
    },
    {
      channel: "EMAIL",
      label: "Email delivery",
      connected: emailConnected,
      receiptSupport: emailConnected ? "SMTP is configured in Platform Admin Settings. Academy can use the same HouseLink email sender when email sending is enabled for a workflow." : "SMTP is not fully configured in Platform Admin Settings. No fake email delivery is reported.",
      adminAction: emailConnected ? `Using Platform Admin SMTP: ${integrations?.smtpHost}:${integrations?.smtpPort}` : "Add SMTP host, port, username, password, and from address in Platform Admin Settings.",
    },
    {
      channel: "WHATSAPP",
      label: "WhatsApp delivery",
      connected: whatsappConnected,
      receiptSupport: whatsappConnected ? "WhatsApp provider settings are configured in Platform Admin Settings. Provider receipts can be recorded when the send workflow is enabled." : "WhatsApp provider is not fully configured. Learners can still see admin-managed WhatsApp links/buttons.",
      adminAction: whatsappConnected
        ? `Using ${integrations?.whatsappProvider || "WhatsApp Business"} with phone number ID ${integrations?.whatsappPhoneNumberId}.`
        : settings.whatsappUrl
          ? "Community invite link is visible. Add provider, access token, and phone number ID in Platform Admin Settings for automated sends."
          : "Add WhatsApp community links in Engagement Controls, then add provider credentials in Platform Admin Settings for automated sends.",
    },
  ];
}

async function normalizeLegacyInAppNotifications(prisma: any) {
  const result = await prisma.trainingNotification.updateMany({
    where: {
      eventType: { startsWith: "ACADEMY_" },
      channel: "IN_APP",
      status: "QUEUED",
    },
    data: {
      status: "DELIVERED",
      sentAt: new Date(),
    },
  }).catch(() => ({ count: 0 }));
  return Number(result?.count ?? 0);
}

async function checkEngagementStorageHealth(prisma: any) {
  const rows = await prisma.$queryRawUnsafe(`
SELECT table_name AS "table"
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (${ENGAGEMENT_STORAGE_TABLES.map(sqlLiteral).join(",")})
`);
  const existing = new Set((rows as any[]).map((row) => row.table));
  return ENGAGEMENT_STORAGE_TABLES.map((table) => ({
    table,
    status: existing.has(table) ? "READY" : "MISSING",
    message: existing.has(table) ? "Table exists in production database." : "Table is missing; opening Engagement Centre will try to create it if the database user has migration permission.",
  }));
}

async function getNotificationReceipts(prisma: any, notificationIds: string[], userId?: string) {
  await createEngagementStorage(prisma);
  const ids = unique(notificationIds).map(String);
  if (!ids.length) return [];
  const whereUser = userId ? ` AND "userId" = ${sqlLiteral(userId)}` : "";
  return prisma.$queryRawUnsafe(`
SELECT "notificationId", "userId", "readAt", "clickedAt", "dismissedAt", "createdAt", "updatedAt"
FROM "academy_notification_receipts"
WHERE "notificationId" IN (${ids.map(sqlLiteral).join(",")})${whereUser}
`);
}

async function recordNotificationReceipt(userId: string, notificationId: string, field: "readAt" | "clickedAt" | "dismissedAt") {
  const prisma = getMainPrisma() as any;
  await createEngagementStorage(prisma);
  const notification = await prisma.trainingNotification.findFirst({ where: { id: notificationId, userId, eventType: { startsWith: "ACADEMY_" } }, select: { id: true } });
  if (!notification) throw new Error("Notification is not available.");
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(`
INSERT INTO "academy_notification_receipts" ("id", "notificationId", "userId", "${field}", "createdAt", "updatedAt")
VALUES (${sqlLiteral(id)}, ${sqlLiteral(notificationId)}, ${sqlLiteral(userId)}, ${sqlLiteral(now)}, ${sqlLiteral(now)}, ${sqlLiteral(now)})
ON CONFLICT ("notificationId", "userId") DO UPDATE SET "${field}" = EXCLUDED."${field}", "updatedAt" = EXCLUDED."updatedAt"
`);
  const rows = await getNotificationReceipts(prisma, [notificationId], userId);
  return rows[0] ?? { notificationId, userId };
}

function sqlLiteral(value: string) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export async function recordAcademyReferralRegistration(input: { referralCode?: string | null; learnerId: string; courseId: string; learnerName?: string | null; learnerEmail?: string | null }) {
  const code = String(input.referralCode ?? "").trim().toUpperCase();
  if (!code) return null;
  const prisma = getMainPrisma() as any;
  const profile = await prisma.academyEngagementProfile.findUnique({ where: { referralCode: code } });
  if (!profile || profile.learnerId === input.learnerId) return null;
  const existing = await prisma.academyReferral.findFirst({ where: { referralCode: code, referredLearnerId: input.learnerId, courseId: input.courseId } });
  if (existing) return existing;
  return prisma.academyReferral.create({
    data: {
      referrerId: profile.learnerId,
      referredLearnerId: input.learnerId,
      courseId: input.courseId,
      referralCode: code,
      referredName: nullable(input.learnerName),
      referredEmail: nullable(input.learnerEmail),
      status: "REGISTERED",
      rewardLabel: (await getSettings()).referralRewardLabel,
    },
  });
}

export async function rewardSuccessfulAcademyReferral(input: { learnerId: string; courseId: string }) {
  const prisma = getMainPrisma() as any;
  const referrals = await prisma.academyReferral.findMany({
    where: { referredLearnerId: input.learnerId, courseId: input.courseId, status: { in: ["REGISTERED", "INVITED"] } },
  });
  for (const referral of referrals) {
    await prisma.academyReferral.update({ where: { id: referral.id }, data: { status: "REWARDED" } });
    await awardEngagementBadge(referral.referrerId, "academy-engagement-referrer", "Academy Referral Champion", "Referred a learner who successfully enrolled.", 150);
    await prisma.trainingNotification.create({
      data: {
        userId: referral.referrerId,
        eventType: "ACADEMY_REFERRAL_REWARDED",
        channel: "IN_APP",
        subject: "Referral reward recorded",
        body: `A learner used your Academy referral code and their enrolment was approved. Reward: ${referral.rewardLabel ?? "Academy recognition"}.`,
        status: "DELIVERED",
        sentAt: new Date(),
      },
    }).catch(() => null);
  }
  return referrals.length;
}

export async function createCertificateTestimonialPrompt(learnerId: string, courseId: string, certificateNumber: string) {
  const settings = await getSettings();
  if (!settings.testimonialsEnabled) return null;
  const prisma = getMainPrisma() as any;
  const course = await prisma.trainingCourse.findUnique({ where: { id: courseId }, select: { title: true } });
  return prisma.trainingNotification.create({
    data: {
      userId: learnerId,
      eventType: "ACADEMY_TESTIMONIAL_REQUEST",
      channel: "IN_APP",
      subject: "Share your Academy experience",
      body: `You completed ${course?.title ?? "your Academy course"} and certificate ${certificateNumber} is ready. If you are comfortable, submit a short review or testimonial from your Engagement Hub.`,
      status: "DELIVERED",
      sentAt: new Date(),
    },
  }).catch(() => null);
}

export async function ensureAcademyEngagementStorage() {
  await ensureEngagementSettings();
}

async function ensureEngagementSettings() {
  const prisma = getMainPrisma() as any;
  try {
    const settings = await prisma.academyEngagementSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", payload: DEFAULT_SETTINGS },
      update: {},
    });
    await clearLegacyPublicDefaults(prisma, settings);
  } catch (error) {
    if (!isMissingEngagementStorage(error)) throw error;
    await createEngagementStorage(prisma);
    const settings = await prisma.academyEngagementSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", payload: DEFAULT_SETTINGS },
      update: {},
    });
    await clearLegacyPublicDefaults(prisma, settings);
  }
}

async function getSettings() {
  await ensureEngagementSettings();
  const settings = await (getMainPrisma() as any).academyEngagementSetting.findUnique({ where: { id: "singleton" } });
  return normalizeSettings(settings?.payload);
}

async function ensureLearnerReferralProfile(learnerId: string) {
  const prisma = getMainPrisma() as any;
  const existing = await prisma.academyEngagementProfile.findFirst({ where: { learnerId, courseId: null } });
  if (existing?.referralCode) return existing;
  if (existing) {
    return prisma.academyEngagementProfile.update({ where: { id: existing.id }, data: { referralCode: await uniqueReferralCode(learnerId) } });
  }
  return prisma.academyEngagementProfile.create({ data: { learnerId, courseId: null, referralCode: await uniqueReferralCode(learnerId) } });
}

async function assertPublishedChallengeAccess(learnerId: string, challengeId: string) {
  const prisma = getMainPrisma() as any;
  const challenge = await prisma.academyChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.status !== "PUBLISHED") throw new Error("Challenge is not available.");
  if (!challenge.courseId) return;
  const enrolment = await prisma.courseEnrolment.findUnique({ where: { courseId_agentId: { courseId: challenge.courseId, agentId: learnerId } } });
  if (enrolment?.status === "ACTIVE") return;
  const application = await prisma.academyLearnerApplication.findUnique({ where: { learnerId_courseId: { learnerId, courseId: challenge.courseId } } });
  if (application?.status !== "APPROVED") throw new Error("Challenge is not available for this learner.");
}

async function assertOfficeHourAccess(learnerId: string, officeHourId: string) {
  const prisma = getMainPrisma() as any;
  const officeHour = await prisma.academyOfficeHour.findUnique({ where: { id: officeHourId } });
  if (!officeHour || !officeHour.active) throw new Error("Office hours event is not available.");
  if (!officeHour.courseId) return;
  const enrolment = await prisma.courseEnrolment.findUnique({ where: { courseId_agentId: { courseId: officeHour.courseId, agentId: learnerId } } });
  if (enrolment?.status === "ACTIVE") return;
  const application = await prisma.academyLearnerApplication.findUnique({ where: { learnerId_courseId: { learnerId, courseId: officeHour.courseId } } });
  if (application?.status !== "APPROVED") throw new Error("Office hours event is not available for this learner.");
}

async function assertCourseAccess(learnerId: string, courseId: string) {
  const prisma = getMainPrisma() as any;
  const enrolment = await prisma.courseEnrolment.findUnique({ where: { courseId_agentId: { courseId, agentId: learnerId } } });
  if (enrolment?.status === "ACTIVE") return;
  const application = await prisma.academyLearnerApplication.findUnique({ where: { learnerId_courseId: { learnerId, courseId } } });
  if (application?.status !== "APPROVED") throw new Error("This course is not available for this learner.");
}

async function awardEngagementBadge(agentId: string, badgeId: string, name: string, description: string, xp: number) {
  const prisma = getMainPrisma() as any;
  await prisma.badge.upsert({
    where: { id: badgeId },
    create: { id: badgeId, name, description, xp, active: true },
    update: { name, description, xp, active: true },
  });
  await prisma.agentBadge.upsert({
    where: { badgeId_agentId: { badgeId, agentId } },
    create: { badgeId, agentId },
    update: {},
  });
}

async function notifyLearner(userId: string, eventType: string, subject: string, body: string) {
  await (getMainPrisma() as any).trainingNotification.create({
    data: { userId, eventType, channel: "IN_APP", subject, body, status: "DELIVERED", sentAt: new Date() },
  }).catch(() => null);
}

async function notifyLearnerAcrossConfiguredChannels(userId: string, eventType: string, subject: string, body: string) {
  const prisma = getMainPrisma() as any;
  const platformSettings = await getHydratedRuntimePlatformSettings();
  const integrations = platformSettings.integrations;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true },
  }).catch(() => null);

  await prisma.trainingNotification.create({
    data: { userId, eventType, channel: "IN_APP", subject, body, status: "DELIVERED", sentAt: new Date() },
  }).catch(() => null);

  const emailConfigured = Boolean(integrations.smtpHost && integrations.smtpPort && integrations.smtpUser && integrations.smtpPass && integrations.smtpFrom);
  if (emailConfigured && user?.email) {
    const result = await sendSmtpPlainEmail(integrations, user.email, subject, body);
    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: `${eventType}_EMAIL`,
        channel: "EMAIL",
        subject,
        body: result.message,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
      },
    }).catch(() => null);
  } else {
    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: `${eventType}_EMAIL_SKIPPED`,
        channel: "EMAIL",
        subject,
        body: user?.email ? "Email not sent because SMTP is not fully configured." : "Email not sent because the learner has no email address.",
        status: "SKIPPED",
      },
    }).catch(() => null);
  }

  const whatsappConfigured = Boolean(integrations.whatsappProvider && integrations.whatsappAccessToken && integrations.whatsappPhoneNumberId);
  if (whatsappConfigured && user?.phone) {
    const result = await sendWhatsAppTextMessage(integrations, user.phone, `${subject}\n\n${body}`);
    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: `${eventType}_WHATSAPP`,
        channel: "WHATSAPP",
        subject,
        body: result.ok ? describeWhatsAppSend({ ok: true, to: user.phone, body }) : result.message,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
      },
    }).catch(() => null);
  } else {
    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: `${eventType}_WHATSAPP_SKIPPED`,
        channel: "WHATSAPP",
        subject,
        body: user?.phone ? "WhatsApp not sent because provider settings are not fully configured." : "WhatsApp not sent because the learner has no phone number.",
        status: "SKIPPED",
      },
    }).catch(() => null);
  }
}

async function notifyOfficeHourAudience(officeHour: { id: string; courseId?: string | null; title: string; startsAt: Date }) {
  const prisma = getMainPrisma() as any;
  const existing = await prisma.trainingNotification.count({ where: { eventType: `ACADEMY_OFFICE_HOUR_${officeHour.id}` } });
  if (existing > 0) return;
  const learners = officeHour.courseId
    ? await prisma.courseEnrolment.findMany({ where: { courseId: officeHour.courseId, status: "ACTIVE" }, select: { agentId: true }, take: 500 })
    : await prisma.courseEnrolment.findMany({ where: { status: "ACTIVE" }, distinct: ["agentId"], select: { agentId: true }, take: 500 });
  await Promise.all(learners.map((learner: any) => notifyLearner(
    learner.agentId,
    `ACADEMY_OFFICE_HOUR_${officeHour.id}`,
    "New Academy office-hours session",
    `${officeHour.title} is scheduled for ${officeHour.startsAt.toLocaleString("en")}. RSVP from your Academy Engagement Hub.`,
  )));
}

async function sendProgressNudges() {
  const prisma = getMainPrisma() as any;
  const rows = await prisma.courseProgress.findMany({
    where: { status: { not: "COMPLETED" }, percentComplete: { gt: 0, lt: 100 } },
    include: { course: { select: { title: true } } },
    take: 1000,
  });
  let created = 0;
  for (const row of rows) {
    const threshold = row.percentComplete >= 80 ? 80 : row.percentComplete >= 50 ? 50 : row.percentComplete >= 25 ? 25 : null;
    if (!threshold) continue;
    const eventType = `ACADEMY_PROGRESS_NUDGE_${row.courseId}_${row.agentId}_${threshold}`;
    const existing = await prisma.trainingNotification.count({ where: { userId: row.agentId, eventType } });
    if (existing > 0) continue;
    await notifyLearnerAcrossConfiguredChannels(
      row.agentId,
      eventType,
      `You are ${threshold}% through ${row.course?.title ?? "your Academy course"}`,
      buildProgressNudgeMessage(Number(row.percentComplete), row.course?.title),
    );
    created += 1;
  }
  return created;
}

async function sendJourneyPlaybookNudges() {
  const prisma = getMainPrisma() as any;
  const [settings, enrolments, progressRows] = await Promise.all([
    getSettings(),
    prisma.courseEnrolment.findMany({
      where: { status: "ACTIVE" },
      include: { course: { select: { title: true } } },
      take: 1000,
    }),
    prisma.courseProgress.findMany({ select: { agentId: true, courseId: true, percentComplete: true, status: true }, take: 2000 }),
  ]);
  const progressByLearnerCourse = new Map<string, any>(progressRows.map((row: any) => [`${row.agentId}:${row.courseId}`, row]));
  let created = 0;
  for (const enrolment of enrolments) {
    const progress = progressByLearnerCourse.get(`${enrolment.agentId}:${enrolment.courseId}`);
    const percent = Number(progress?.percentComplete ?? 0);
    const stage = !progress || percent <= 0 ? "START" : percent >= 100 || progress.status === "COMPLETED" ? "COMPLETE" : percent >= 80 ? "EIGHTY" : percent >= 50 ? "FIFTY" : percent >= 25 ? "TWENTY_FIVE" : "CONTINUE";
    const eventType = `ACADEMY_JOURNEY_PLAYBOOK_${enrolment.courseId}_${enrolment.agentId}_${stage}`;
    const existing = await prisma.trainingNotification.count({ where: { userId: enrolment.agentId, eventType } });
    if (existing > 0) continue;
    await notifyLearnerAcrossConfiguredChannels(
      enrolment.agentId,
      eventType,
      buildJourneyNudgeSubject(stage, enrolment.course?.title),
      buildJourneyNudgeBody(stage, enrolment.course?.title, settings),
    );
    created += 1;
  }
  return created;
}

function buildProgressNudgeMessage(progress: number, courseTitle?: string | null) {
  if (progress >= 80) return `You are close to finishing ${courseTitle ?? "your Academy course"}. Open your learner dashboard and complete the final required checkpoints.`;
  if (progress >= 50) return `You are halfway through ${courseTitle ?? "your Academy course"}. Keep going with the next unlocked lesson or checkpoint.`;
  return `You have started building momentum in ${courseTitle ?? "your Academy course"}. Continue with the next lesson from your learner dashboard.`;
}

function buildJourneyNudgeSubject(stage: string, courseTitle?: string | null) {
  if (stage === "START") return `Start Lesson 1 in ${courseTitle ?? "your Academy course"}`;
  if (stage === "COMPLETE") return `Graduate options are open for ${courseTitle ?? "your Academy course"}`;
  if (stage === "EIGHTY") return `You are close to finishing ${courseTitle ?? "your Academy course"}`;
  if (stage === "FIFTY") return `You are halfway through ${courseTitle ?? "your Academy course"}`;
  if (stage === "TWENTY_FIVE") return `Good progress in ${courseTitle ?? "your Academy course"}`;
  return `Continue ${courseTitle ?? "your Academy course"}`;
}

function buildJourneyNudgeBody(stage: string, courseTitle?: string | null, settings?: Record<string, any>) {
  if (stage === "START") return settings?.lessonOnePlaybook || `Your access to ${courseTitle ?? "the Academy course"} is active. Open your learner dashboard and start Lesson 1.`;
  if (stage === "COMPLETE") return settings?.completionPlaybook || `You completed ${courseTitle ?? "your Academy course"}. You can now review graduate options in your Engagement Hub.`;
  return settings?.progressPlaybook || `Keep going with ${courseTitle ?? "your Academy course"}. Open your learner dashboard for the next available lesson, quiz, assignment, or challenge.`;
}

function buildEngagementReporting(input: {
  profiles: any[];
  testimonials: any[];
  challenges: any[];
  challengeSubmissions: any[];
  officeHours: any[];
  rsvps: any[];
  referrals: any[];
  moduleFeedback: any[];
  courseProgressRows: any[];
  activeEnrolments: any[];
  approvedApplications: any[];
}) {
  const uniqueEngagedLearners = unique([
    ...input.profiles.map((row) => row.learnerId),
    ...input.testimonials.map((row) => row.learnerId),
    ...input.challengeSubmissions.map((row) => row.learnerId),
    ...input.rsvps.map((row) => row.learnerId),
    ...input.referrals.map((row) => row.referrerId),
    ...input.moduleFeedback.map((row) => row.learnerId),
  ]);
  const activeLearners = unique([
    ...input.courseProgressRows.map((row) => row.agentId),
    ...input.activeEnrolments.map((row) => row.agentId),
    ...input.approvedApplications.map((row) => row.learnerId),
  ]);
  const activeLearnerCoursePairs = unique([
    ...input.activeEnrolments.map((row) => `${row.agentId}:${row.courseId}`),
    ...input.approvedApplications.map((row) => `${row.learnerId}:${row.courseId}`),
  ]);
  const progressByLearnerCourse = new Map(input.courseProgressRows.map((row) => [`${row.agentId}:${row.courseId}`, row]));
  const stageCounts = { notStarted: 0, started: 0, halfway: 0, nearlyComplete: 0, completed: 0 };
  for (const pair of activeLearnerCoursePairs) {
    const row = progressByLearnerCourse.get(pair);
    const percent = Number(row?.percentComplete ?? 0);
    if (!row || percent <= 0) stageCounts.notStarted += 1;
    else if (row.status === "COMPLETED" || percent >= 100) stageCounts.completed += 1;
    else if (percent >= 80) stageCounts.nearlyComplete += 1;
    else if (percent >= 50) stageCounts.halfway += 1;
    else stageCounts.started += 1;
  }
  const rewardedReferrals = input.referrals.filter((row) => row.status === "REWARDED").length;
  const registeredReferrals = input.referrals.filter((row) => ["REGISTERED", "REWARDED"].includes(row.status)).length;
  const approvedTestimonials = input.testimonials.filter((row) => row.status === "APPROVED").length;
  const submittedTestimonials = input.testimonials.length;
  const approvedChallenges = input.challengeSubmissions.filter((row) => row.status === "APPROVED").length;
  const submittedChallenges = input.challengeSubmissions.length;

  return {
    engagementRate: rate(uniqueEngagedLearners.length, activeLearners.length),
    referralConversionRate: rate(rewardedReferrals, registeredReferrals || input.referrals.length),
    testimonialApprovalRate: rate(approvedTestimonials, submittedTestimonials),
    challengeApprovalRate: rate(approvedChallenges, submittedChallenges),
    rsvpRate: rate(input.rsvps.filter((row) => row.status !== "CANCELLED").length, input.officeHours.length ? activeLearners.length : 0),
    stageCounts,
    pendingWork: input.testimonials.filter((row) => row.status === "PENDING").length
      + input.challengeSubmissions.filter((row) => row.status === "SUBMITTED").length
      + input.moduleFeedback.filter((row) => row.status === "NEW").length
      + input.profiles.filter((row) => row.spotlightConsent && row.spotlightStatus === "PENDING").length,
    recentActivity: [
      ...input.testimonials.map((row) => ({ id: row.id, type: "Testimonial", title: row.title, status: row.status, createdAt: row.createdAt })),
      ...input.challengeSubmissions.map((row) => ({ id: row.id, type: "Challenge", title: row.challengeId, status: row.status, createdAt: row.submittedAt })),
      ...input.referrals.map((row) => ({ id: row.id, type: "Referral", title: row.referralCode, status: row.status, createdAt: row.createdAt })),
      ...input.moduleFeedback.map((row) => ({ id: row.id, type: "Feedback", title: row.courseId, status: row.status, createdAt: row.createdAt })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12),
  };
}

function rate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

async function uniqueReferralCode(learnerId: string) {
  const prisma = getMainPrisma() as any;
  for (let i = 0; i < 5; i += 1) {
    const code = `HLA-${learnerId.slice(-4).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const existing = await prisma.academyEngagementProfile.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  return `HLA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function audit(actor: Actor, action: string, target: string, metadata: Record<string, unknown>) {
  const prisma = getMainPrisma() as any;
  await prisma.trainingAuditLog.create({ data: { actorId: actor.id, action, target, metadata } }).catch(() => null);
}

function normalizeSettings(input: any) {
  const settings = { ...DEFAULT_SETTINGS, ...(input && typeof input === "object" ? input : {}) };
  if (settings.weeklyThemes === LEGACY_DEFAULT_WEEKLY_THEMES) settings.weeklyThemes = "";
  if (settings.campaignSchedule === LEGACY_DEFAULT_CAMPAIGN_SCHEDULE) settings.campaignSchedule = "";
  if (settings.referralRewardLabel === "Admin-reviewed recognition reward") settings.referralRewardLabel = "";
  return settings;
}

async function clearLegacyPublicDefaults(prisma: any, settings: { id: string; payload: any } | null) {
  if (!settings?.payload || typeof settings.payload !== "object") return;
  const cleaned = normalizeSettings(settings.payload);
  if (
    cleaned.weeklyThemes === settings.payload.weeklyThemes
    && cleaned.campaignSchedule === settings.payload.campaignSchedule
    && cleaned.referralRewardLabel === settings.payload.referralRewardLabel
  ) return;
  await prisma.academyEngagementSetting.update({
    where: { id: settings.id },
    data: { payload: cleaned },
  });
}

function isMissingEngagementStorage(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && (error as { code?: string }).code === "P2021",
  );
}

async function createEngagementStorage(prisma: any) {
  const sql = `
CREATE TABLE IF NOT EXISTS "academy_engagement_settings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "payload" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_engagement_settings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_engagement_profiles" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "courseId" TEXT,
  "communityOptIn" BOOLEAN NOT NULL DEFAULT false,
  "ambassadorOptIn" BOOLEAN NOT NULL DEFAULT false,
  "directoryOptIn" BOOLEAN NOT NULL DEFAULT false,
  "spotlightConsent" BOOLEAN NOT NULL DEFAULT false,
  "publicVisibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  "profileHeadline" TEXT,
  "profileBio" TEXT,
  "referralCode" TEXT,
  "spotlightStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
  "sharedPostConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "sharedPostUrl" TEXT,
  "consentedAt" TIMESTAMP(3),
  "consentWithdrawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_engagement_profiles_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredLearnerId" TEXT,
  "courseId" TEXT,
  "referralCode" TEXT NOT NULL,
  "referredName" TEXT,
  "referredEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'INVITED',
  "rewardLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_referrals_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_testimonials" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "courseId" TEXT,
  "rating" INTEGER,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "publicConsent" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_testimonials_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_challenges" (
  "id" TEXT NOT NULL,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "rewardLabel" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_challenges_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_challenge_submissions" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "evidence" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "adminNote" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "academy_challenge_submissions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_office_hours" (
  "id" TEXT NOT NULL,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "link" TEXT,
  "capacity" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_office_hours_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_office_hour_rsvps" (
  "id" TEXT NOT NULL,
  "officeHourId" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'GOING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_office_hour_rsvps_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_module_feedback" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "lessonId" TEXT,
  "question" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_module_feedback_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "academy_notification_receipts" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_notification_receipts_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "academy_engagement_profiles" ADD COLUMN IF NOT EXISTS "spotlightStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "academy_engagement_profiles" ADD COLUMN IF NOT EXISTS "sharedPostConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "academy_engagement_profiles" ADD COLUMN IF NOT EXISTS "sharedPostUrl" TEXT;
ALTER TABLE "academy_referrals" ADD COLUMN IF NOT EXISTS "referredLearnerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "academy_engagement_profiles_learnerId_courseId_key" ON "academy_engagement_profiles"("learnerId", "courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_engagement_profiles_referralCode_key" ON "academy_engagement_profiles"("referralCode");
CREATE INDEX IF NOT EXISTS "academy_engagement_profiles_learnerId_idx" ON "academy_engagement_profiles"("learnerId");
CREATE INDEX IF NOT EXISTS "academy_engagement_profiles_courseId_idx" ON "academy_engagement_profiles"("courseId");
CREATE INDEX IF NOT EXISTS "academy_referrals_referrerId_idx" ON "academy_referrals"("referrerId");
CREATE INDEX IF NOT EXISTS "academy_referrals_referredLearnerId_idx" ON "academy_referrals"("referredLearnerId");
CREATE INDEX IF NOT EXISTS "academy_referrals_courseId_idx" ON "academy_referrals"("courseId");
CREATE INDEX IF NOT EXISTS "academy_referrals_referralCode_idx" ON "academy_referrals"("referralCode");
CREATE INDEX IF NOT EXISTS "academy_testimonials_status_idx" ON "academy_testimonials"("status");
CREATE INDEX IF NOT EXISTS "academy_challenges_status_idx" ON "academy_challenges"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_challenge_submissions_challengeId_learnerId_key" ON "academy_challenge_submissions"("challengeId", "learnerId");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_office_hour_rsvps_officeHourId_learnerId_key" ON "academy_office_hour_rsvps"("officeHourId", "learnerId");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_notification_receipts_notificationId_userId_key" ON "academy_notification_receipts"("notificationId", "userId");
CREATE INDEX IF NOT EXISTS "academy_notification_receipts_userId_idx" ON "academy_notification_receipts"("userId");
`;
  for (const statement of sql.split(";").map((entry) => entry.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(statement);
  }
}

function buildReferralUrl(code: string, settings: Record<string, any>) {
  const base = String(settings.referralUrlBase || process.env.NEXT_PUBLIC_APP_URL || "https://www.houselink.co.zw").replace(/\/$/, "");
  return `${base}/academy?ref=${encodeURIComponent(code)}`;
}

function required(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function nullable(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredDate(value: unknown, label: string) {
  const date = optionalDate(value);
  if (!date) throw new Error(`${label} is required.`);
  return date;
}

function serializeDates<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  return Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])) as T;
}

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.warn("Optional Academy engagement data unavailable", error);
    return fallback;
  }
}

function unique<T>(values: T[]) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueBy<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
