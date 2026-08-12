import type { Metadata } from "next";
import Link from "next/link";
import { GraduateDirectoryClient, type DirectoryProfile } from "@/components/academy/graduate-directory-client";
import { PageShell } from "@/components/layout/page-shell";
import { ensureAcademyEngagementStorage } from "@/lib/academy/engagement-repository";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HouseLink Academy Graduate Directory | HouseLink Zimbabwe",
  description: "Opt-in directory of learners who have completed or participated in HouseLink Academy training programmes.",
  alternates: { canonical: "/academy/directory" },
};

export default async function AcademyDirectoryPage() {
  const profiles = await getDirectoryProfiles();
  const featured = profiles.filter((profile) => profile.spotlightStatus === "APPROVED").slice(0, 3);
  const courseOptions = [...new Set(profiles.flatMap((profile) => profile.courses))].sort((a, b) => a.localeCompare(b));

  return (
    <PageShell
      eyebrow="Opt-In Directory"
      title="HouseLink Academy graduate directory"
      description="A consent-based directory for learners who choose to make their HouseLink Academy training profile public."
      highlights={[
        { value: String(profiles.length), label: "Public profiles" },
        { value: String(featured.length), label: "Featured" },
        { value: "Opt-in", label: "Visibility" },
      ]}
      actions={<Link href="/academy">Explore Academy courses</Link>}
    >
      <GraduateDirectoryClient profiles={profiles} courseOptions={courseOptions} />
    </PageShell>
  );
}

type DirectoryLearner = { id: string; name?: string | null; email?: string | null };

async function getDirectoryProfiles(): Promise<DirectoryProfile[]> {
  await ensureAcademyEngagementStorage();
  const prisma = getMainPrisma() as any;
  const profiles = await prisma.academyEngagementProfile.findMany({
    where: { directoryOptIn: true, publicVisibility: "PUBLIC" },
    orderBy: [{ spotlightStatus: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });
  const learnerIds = [...new Set(profiles.map((profile: any) => profile.learnerId).filter(Boolean))];
  const courseIds = [...new Set(profiles.map((profile: any) => profile.courseId).filter(Boolean))];
  const [learners, courses, certificates] = await Promise.all([
    learnerIds.length ? prisma.user.findMany({ where: { id: { in: learnerIds } }, select: { id: true, name: true, email: true } }) : [],
    courseIds.length ? prisma.trainingCourse.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
    learnerIds.length ? prisma.certificateIssue.findMany({ where: { agentId: { in: learnerIds }, status: "ACTIVE" }, include: { course: { select: { title: true } } } }) : [],
  ]);
  const learnerById = new Map<string, DirectoryLearner>(learners.map((learner: DirectoryLearner) => [learner.id, learner]));
  const courseById = new Map(courses.map((course: any) => [course.id, course.title]));
  const certificateCoursesByLearner = new Map<string, string[]>();
  for (const certificate of certificates) {
    const rows = certificateCoursesByLearner.get(certificate.agentId) ?? [];
    if (certificate.course?.title && !rows.includes(certificate.course.title)) rows.push(certificate.course.title);
    certificateCoursesByLearner.set(certificate.agentId, rows);
  }
  return profiles.map((profile: any) => {
    const learner = learnerById.get(profile.learnerId);
    const coursesForProfile = [
      profile.courseId ? courseById.get(profile.courseId) : null,
      ...(certificateCoursesByLearner.get(profile.learnerId) ?? []),
    ].filter((value, index, rows): value is string => Boolean(value) && rows.indexOf(value) === index);
    return {
      id: profile.id,
      name: learner?.name ?? learner?.email ?? "HouseLink Academy learner",
      headline: profile.profileHeadline ?? "HouseLink Academy learner",
      bio: profile.profileBio ?? null,
      courses: coursesForProfile,
      certificates: certificates
        .filter((certificate: any) => certificate.agentId === profile.learnerId && certificate.certificateNumber)
        .map((certificate: any) => ({
          number: certificate.certificateNumber,
          course: certificate.course?.title ?? "Academy certificate",
          href: `/academy/verify?certificate=${encodeURIComponent(certificate.certificateNumber)}`,
        })),
      spotlightStatus: profile.spotlightStatus,
    };
  });
}
