import type { Metadata } from "next";
import Link from "next/link";
import { Award, SearchCheck, ShieldCheck, Star } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
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
      <div className="space-y-8">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-5 shrink-0" />
            <div>
              <h2 className="text-lg font-black">Directory disclaimer</h2>
              <p className="mt-2 text-sm leading-6">
                These profiles show optional HouseLink Academy training participation or completion only. They do not confirm statutory registration, professional licensing, accreditation, or regulatory approval by any public authority.
              </p>
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Star className="size-5 text-emerald-700" />
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">Featured learners</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featured.map((profile) => <DirectoryCard key={profile.id} profile={profile} featured />)}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <SearchCheck className="size-5 text-emerald-700" />
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">Public learner profiles</h2>
          </div>
          {profiles.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {profiles.map((profile) => <DirectoryCard key={profile.id} profile={profile} />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              No public graduate profiles yet.
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function DirectoryCard({ profile, featured = false }: { profile: DirectoryProfile; featured?: boolean }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-slate-950 dark:text-white">{profile.name}</p>
          <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{profile.headline}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
          <Award className="size-5" />
        </span>
      </div>
      {profile.bio && <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.bio}</p>}
      {profile.courses.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.courses.map((course) => (
            <span key={course} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{course}</span>
          ))}
        </div>
      )}
      {featured && <p className="mt-4 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">Featured by Academy admin</p>}
    </article>
  );
}

type DirectoryProfile = {
  id: string;
  name: string;
  headline: string;
  bio: string | null;
  courses: string[];
  spotlightStatus: string;
};

type DirectoryLearner = { id: string; name?: string | null; email?: string | null };

async function getDirectoryProfiles(): Promise<DirectoryProfile[]> {
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
      spotlightStatus: profile.spotlightStatus,
    };
  });
}
