import { getMainPrisma } from "@/lib/db/main-prisma";

type Actor = { id: string; name?: string | null };

const DEFAULT_SETTINGS = {
  enabled: true,
  communityEnabled: true,
  ambassadorEnabled: true,
  referralsEnabled: true,
  testimonialsEnabled: true,
  directoryEnabled: true,
  challengesEnabled: true,
  officeHoursEnabled: true,
  communityName: "HouseLink Academy Learner Community",
  whatsappUrl: "",
  invitation: "Join the optional learner community for peer support, announcements, and practical field discussions.",
  sharePrompt: "I am building my real estate knowledge through HouseLink Academy.",
  referralRewardLabel: "Admin-reviewed recognition reward",
  campaignSchedule: "Weekly learner wins, practical field prompts, and office-hours reminders.",
};

export async function getAdminAcademyEngagement() {
  const prisma = getMainPrisma() as any;
  await ensureEngagementSettings();
  const [settingsRow, courses, profiles, testimonials, challenges, challengeSubmissions, officeHours, rsvps, referrals] = await Promise.all([
    prisma.academyEngagementSetting.findUnique({ where: { id: "singleton" } }),
    prisma.trainingCourse.findMany({ select: { id: true, title: true, status: true }, orderBy: { title: "asc" } }),
    prisma.academyEngagementProfile.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.academyTestimonial.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.academyChallenge.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.academyChallengeSubmission.findMany({ orderBy: { submittedAt: "desc" }, take: 200 }),
    prisma.academyOfficeHour.findMany({ orderBy: { startsAt: "asc" }, take: 100 }),
    prisma.academyOfficeHourRsvp.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.academyReferral.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  const learnerIds = unique([
    ...profiles.map((row: any) => row.learnerId),
    ...testimonials.map((row: any) => row.learnerId),
    ...challengeSubmissions.map((row: any) => row.learnerId),
    ...rsvps.map((row: any) => row.learnerId),
    ...referrals.map((row: any) => row.referrerId),
  ]);
  const learners = learnerIds.length
    ? await prisma.user.findMany({ where: { id: { in: learnerIds } }, select: { id: true, name: true, email: true, phone: true } })
    : [];
  const learnerById = new Map(learners.map((learner: any) => [learner.id, learner]));
  const courseById = new Map(courses.map((course: any) => [course.id, course]));
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
    },
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
    return row;
  }
  return null;
}

export async function getLearnerAcademyEngagement(learnerId: string) {
  const prisma = getMainPrisma() as any;
  await ensureEngagementSettings();
  const [settingsRow, enrolments, applications] = await Promise.all([
    prisma.academyEngagementSetting.findUnique({ where: { id: "singleton" } }),
    prisma.courseEnrolment.findMany({ where: { agentId: learnerId, status: "ACTIVE" }, include: { course: { select: { id: true, title: true } } } }),
    prisma.academyLearnerApplication.findMany({ where: { learnerId, status: "APPROVED" }, include: { course: { select: { id: true, title: true } } } }),
  ]);
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
  const profile = profiles.find((row: any) => row.courseId === null) ?? null;
  return {
    settings: normalizeSettings(settingsRow?.payload),
    courses,
    profile: profile ? serializeDates(profile) : null,
    profiles: profiles.map(serializeDates),
    referrals: referrals.map(serializeDates),
    testimonials: testimonials.map(serializeDates),
    challenges: challenges.map((challenge: any) => ({
      ...serializeDates(challenge),
      submitted: challengeSubmissions.some((submission: any) => submission.challengeId === challenge.id),
      submission: serializeDates(challengeSubmissions.find((submission: any) => submission.challengeId === challenge.id) ?? null),
    })),
    officeHours: officeHours.map((officeHour: any) => ({
      ...serializeDates(officeHour),
      rsvp: serializeDates(rsvps.find((rsvp: any) => rsvp.officeHourId === officeHour.id) ?? null),
    })),
  };
}

export async function runLearnerAcademyEngagementAction(learnerId: string, body: Record<string, any>) {
  const prisma = getMainPrisma() as any;
  const action = String(body.action ?? "");
  if (action === "save_profile") {
    const input = body.profile ?? {};
    const optedIn = Boolean(input.communityOptIn || input.ambassadorOptIn || input.directoryOptIn || input.spotlightConsent);
    const existing = await prisma.academyEngagementProfile.findFirst({ where: { learnerId, courseId: null } });
    const data = {
      communityOptIn: Boolean(input.communityOptIn),
      ambassadorOptIn: Boolean(input.ambassadorOptIn),
      directoryOptIn: Boolean(input.directoryOptIn),
      spotlightConsent: Boolean(input.spotlightConsent),
      publicVisibility: input.directoryOptIn ? "PUBLIC" : "PRIVATE",
      profileHeadline: nullable(input.profileHeadline),
      profileBio: nullable(input.profileBio),
      consentedAt: optedIn ? new Date() : null,
      consentWithdrawnAt: optedIn ? null : new Date(),
    };
    const row = existing
      ? await prisma.academyEngagementProfile.update({ where: { id: existing.id }, data })
      : await prisma.academyEngagementProfile.create({ data: { learnerId, courseId: null, referralCode: await uniqueReferralCode(learnerId), ...data } });
    return row;
  }
  if (action === "submit_testimonial") {
    const input = body.testimonial ?? {};
    return prisma.academyTestimonial.create({
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
  }
  if (action === "submit_challenge") {
    const challengeId = String(body.challengeId);
    await assertPublishedChallengeAccess(learnerId, challengeId);
    return prisma.academyChallengeSubmission.upsert({
      where: { challengeId_learnerId: { challengeId, learnerId } },
      create: { challengeId, learnerId, evidence: required(body.evidence, "Challenge evidence") },
      update: { evidence: required(body.evidence, "Challenge evidence"), status: "SUBMITTED", adminNote: null, reviewedAt: null },
    });
  }
  if (action === "rsvp_office_hour") {
    const officeHourId = String(body.officeHourId);
    await assertOfficeHourAccess(learnerId, officeHourId);
    return prisma.academyOfficeHourRsvp.upsert({
      where: { officeHourId_learnerId: { officeHourId, learnerId } },
      create: { officeHourId, learnerId, status: String(body.status ?? "GOING") },
      update: { status: String(body.status ?? "GOING") },
    });
  }
  if (action === "create_referral") {
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
  return null;
}

async function ensureEngagementSettings() {
  const prisma = getMainPrisma() as any;
  await prisma.academyEngagementSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", payload: DEFAULT_SETTINGS },
    update: {},
  });
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
  return { ...DEFAULT_SETTINGS, ...(input && typeof input === "object" ? input : {}) };
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
