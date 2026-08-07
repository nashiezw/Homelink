"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  ChevronDown,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { LessonViewer } from "@/components/academy/lesson-viewer";
import { QuizPanel } from "@/components/academy/quiz-panel";
import { ExamPanel } from "@/components/academy/exam-panel";
import { AssignmentPanel } from "@/components/academy/assignment-panel";
import { DiscussionPanel } from "@/components/academy/discussion-panel";
import { AcademyAccordion, ToolkitGrid } from "@/components/academy/academy-accordion";
import {
  AcademyResourcePurchaseModal,
  buildToolkitProduct,
} from "@/components/academy/academy-resource-purchase";
import type { ToolkitAccessState } from "@/components/academy/academy-accordion";
import {
  AGENT_PORTFOLIO_REQUIREMENTS,
  ROLEPLAY_ASSESSMENT_SCENARIOS,
} from "@/lib/academy/academy-excellence";
import { cn } from "@/lib/utils";

type CourseDetail = {
  settings: { academyName: string; primaryColour: string; paymentInstructions?: string };
  programme?: {
    theme: { label: string; accent: string; gradient: string; sidebar: string; chip: string };
    badgeName: string;
    certificateTitle: string;
    subtitle?: string;
    assessmentSummary?: string;
    includes?: string[];
  } | null;
  toolkit?: Array<{ category: string; description: string; items: Array<{ id: string; title: string; description: string; fileUrl?: string; locked?: boolean }> }>;
  toolkitAccess?: {
    unlocked: boolean;
    salesEnabled: boolean;
    price: number;
    currency: string;
    status: string | null;
    paymentId: string | null;
    proofUrl?: string | null;
    adminNote?: string | null;
  };
  course: {
    id: string;
    title: string;
    description: string;
    instructor?: string | null;
    certificateEnabled: boolean;
    passingPercentage: number;
    progress: number;
    status: string;
    modules: Array<{
      id: string;
      title: string;
      description?: string | null;
      lessonCount: number;
      completedCount: number;
      sections: Array<{
        id: string;
        title: string;
        lessons: Array<{
          id: string;
          title: string;
          summary?: string | null;
          richText: string;
          estimatedMinutes: number;
          completionRequirement: string;
          completed?: boolean;
          videoUrl?: string | null;
          embeddedVideoUrl?: string | null;
          pdfUrl?: string | null;
          audioUrl?: string | null;
          lessonVideos?: Array<{ id: string; title: string; url: string; provider: string }>;
          lessonDocuments?: Array<{ id: string; title: string; fileType: string; downloadUrl: string }>;
          lessonResources?: Array<{ id: string; title: string; body: string; type: string }>;
          lessonDownloads?: Array<{ id: string; title: string; url: string; type: string }>;
        }>;
      }>;
    }>;
  };
  assessments: {
    summary?: string | null;
    badgeName?: string | null;
    totals?: { quizzes: number; quizzesPassed: number; assignments: number; assignmentsSubmitted: number; exams: number };
    readiness?: {
      overall: number;
      status: "READY" | "DEVELOPING" | "NEEDS_PRACTICE";
      mentorSignoffRequired: boolean;
      mentorSignoffLabel: string;
      categories: Array<{ id: string; label: string; description: string; score: number; status: "READY" | "DEVELOPING" | "NEEDS_PRACTICE" }>;
    };
    certificateCheckpoint?: { title: string; description: string } | null;
    quizzes: Array<{ id: string; title: string; description?: string | null; moduleTitle?: string | null; sortOrder?: number; passingPercentage: number; timeLimitMinutes?: number | null; questionCount: number; bestScore: number | null; passed: boolean }>;
    assignments: Array<{ id: string; title: string; description: string; moduleTitle?: string | null; sortOrder?: number; points: number; dueDays?: number | null; submitted: boolean; status: string | null }>;
    exams: Array<{ id: string; title: string; description?: string | null; durationMinutes: number; passingScore: number; attemptLimit: number }>;
  };
  materials: Array<{ id: string; title: string; subtitle: string; summary: string; moduleTitle: string; lessonTitle: string; estimatedMinutes: number; location: string; fileType: string; downloadUrl: string; viewUrl: string }>;
};

type Tab = "curriculum" | "toolkit" | "materials" | "assessments" | "discussions" | "progress";

const VALID_TABS: Tab[] = ["curriculum", "toolkit", "materials", "assessments", "discussions", "progress"];

export function CourseLearnerView({ courseId }: { courseId: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab");
  const { user, showToast } = useApp();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [tab, setTab] = useState<Tab>(() => (VALID_TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "curriculum"));
  const [viewingLessonId, setViewingLessonId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<CourseDetail>(`/api/v1/academy/courses/${courseId}`);
    if (result.data) setData(result.data);
    else showToast(result.error?.message ?? "Course could not be loaded.", "error");
  }, [courseId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) {
    return (
      <PageShell eyebrow="Academy" title="Sign in required" description="Sign in to access your course.">
        <Link href="/dashboard/academy" className="text-emerald-600 font-semibold">Back to My Dashboard</Link>
      </PageShell>
    );
  }

  if (!data) {
    return <PageShell eyebrow="Academy" title="Loading course..." description=""><div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></PageShell>;
  }

  if (viewingLessonId) {
    const primaryColour = data.settings.primaryColour ?? "#008b68";
    const theme = data.programme?.theme;
    const accent = theme?.accent ?? primaryColour;
    const courseForViewer = {
      id: data.course.id,
      title: data.course.title,
      modules: data.course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.sections.flatMap((s) =>
          s.lessons.map((lesson) => ({
            ...lesson,
            summary: lesson.summary ?? undefined,
          })),
        ),
      })),
    };
    return (
      <LessonViewer
        course={courseForViewer}
        initialLessonId={viewingLessonId}
        primaryColour={accent}
        courseTheme={theme}
        toolkitLocked={!data.toolkitAccess?.unlocked}
        onBack={() => setViewingLessonId(null)}
        onToggleBookmark={async (lessonId, bookmarked) => {
          await apiFetch("/api/v1/academy/bookmarks", { method: "POST", body: JSON.stringify({ lessonId, bookmarked }) });
          await load();
        }}
        onCompleteLesson={async (lessonId) => {
          const result = await apiFetch<{ courseCompleted?: boolean }>("/api/v1/academy/progress", { method: "POST", body: JSON.stringify({ lessonId }) });
          if (result.error) { showToast(result.error.message, "error"); return; }
          showToast(result.data?.courseCompleted ? "Course completed!" : "Lesson marked complete!");
          setViewingLessonId(null);
          await load();
        }}
      />
    );
  }

  if (activeAssignmentId) {
    const assignment = data.assessments.assignments.find((a) => a.id === activeAssignmentId);
    return (
      <PageShell eyebrow={data.settings.academyName} title={assignment?.title ?? "Assignment"} description="Submit your practical work for review.">
        <AssignmentPanel
          assignmentId={activeAssignmentId}
          title={assignment?.title ?? "Assignment"}
          description={assignment?.description ?? ""}
          points={assignment?.points ?? 100}
          submitted={assignment?.submitted ?? false}
          status={assignment?.status ?? null}
          onBack={() => { setActiveAssignmentId(null); void load(); }}
        />
      </PageShell>
    );
  }

  if (activeQuizId) {
    const quiz = data.assessments.quizzes.find((q) => q.id === activeQuizId);
    return (
      <PageShell
        eyebrow={data.settings.academyName}
        title={quiz?.title ?? "Checkpoint"}
        description="Apply the lesson in a short field-readiness check."
        compactHero
      >
        <QuizPanel
          quizId={activeQuizId}
          title={quiz?.title ?? "Checkpoint"}
          description={quiz?.description ?? undefined}
          questionCount={quiz?.questionCount ?? undefined}
          passingPercentage={quiz?.passingPercentage ?? 80}
          timeLimitMinutes={quiz?.timeLimitMinutes ?? undefined}
          onBack={() => { setActiveQuizId(null); void load(); }}
        />
      </PageShell>
    );
  }

  if (activeExamId) {
    const exam = data.assessments.exams.find((e) => e.id === activeExamId);
    return (
      <PageShell eyebrow={data.settings.academyName} title={exam?.title ?? "Final Exam"} description="Complete the final examination to earn certification.">
        <ExamPanel examId={activeExamId} passingScore={exam?.passingScore ?? 80} onBack={() => { setActiveExamId(null); void load(); }} />
      </PageShell>
    );
  }

  const primaryColour = data.settings.primaryColour ?? "#008b68";

  const theme = data.programme?.theme;
  const accent = theme?.accent ?? primaryColour;
  const heroGradient = theme?.gradient ?? "from-emerald-600 via-emerald-700 to-teal-800";
  const tabItems: Array<{ id: Tab; label: string; icon: typeof BookOpen }> = [
    { id: "curriculum", label: "Curriculum", icon: BookOpen },
    { id: "toolkit", label: "Toolkit", icon: ClipboardCheck },
    { id: "materials", label: "Notes", icon: Download },
    { id: "assessments", label: "Assessments", icon: ShieldCheck },
    { id: "discussions", label: "Discuss", icon: MessageSquareText },
    { id: "progress", label: "Progress", icon: GraduationCap },
  ];

  return (
    <PageShell
      eyebrow={data.settings.academyName}
      title={data.course.title}
      description={data.course.description}
      actions={
        <Link href="/dashboard/academy" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto">My Dashboard</Button>
        </Link>
      }
    >
      <div className={cn("relative overflow-hidden rounded-xl bg-gradient-to-br p-6 text-white shadow-hero sm:p-8", heroGradient)}>
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:34px_34px] lg:block" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-white/40">
              <HouseLinkBrand variant="icon" iconOnly />
            </div>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
                <Sparkles className="size-3.5 shrink-0" /> {theme?.label ?? data.settings.academyName}
              </p>
              <p className="mt-2 text-sm text-emerald-100/90">{data.course.instructor ?? "HouseLink trainers"}</p>
              <p className="mt-1 text-base font-medium leading-snug text-white/95 sm:text-lg">{data.programme?.certificateTitle ?? "HouseLink Agent Certification"}</p>
            </div>
          </div>
          <div className="w-full rounded-lg border border-white/20 bg-white/15 p-5 lg:max-w-xs lg:border-white/10 lg:bg-white/10 lg:backdrop-blur-sm">
            <p className="text-4xl font-bold">{data.course.progress}%</p>
            <p className="text-sm text-emerald-100">Course completion</p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${data.course.progress}%` }} />
            </div>
            {data.course.certificateEnabled && (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-200">
                <Award className="size-4" /> Certificate on completion
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white/90 p-2 shadow-soft dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold leading-none transition sm:px-4",
                  tab === item.id
                    ? "text-white shadow-md shadow-emerald-950/10"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
                style={tab === item.id ? { backgroundColor: accent } : undefined}
                onClick={() => setTab(item.id)}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "curriculum" && (
        <div className="mt-6">
          <AcademyAccordion
            accent={accent}
            items={data.course.modules.map((module, index) => ({
              id: module.id,
              title: module.title,
              subtitle: module.description ?? undefined,
              meta: `${module.completedCount}/${module.lessonCount} complete`,
              defaultOpen: index === 0,
              content: (
                <div className="grid gap-3 sm:grid-cols-2">
                  {module.sections.flatMap((section) => section.lessons).map((lesson) => (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setViewingLessonId(lesson.id)}
                      className="academy-card group rounded-lg p-4 text-left"
                      style={{ borderColor: `${accent}22` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{lesson.title}</p>
                        <CheckCircle2 className={cn("size-5 shrink-0", lesson.completed ? "text-emerald-500" : "text-slate-200 dark:text-slate-700")} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{lesson.estimatedMinutes} min / {lesson.completionRequirement.replace(/_/g, " ")}</p>
                    </button>
                  ))}
                </div>
              ),
            }))}
          />
        </div>
      )}

      {tab === "toolkit" && (
        <div className="mt-6 space-y-4">
          <div className="academy-panel rounded-xl p-5" style={{ borderColor: `${accent}33`, background: `linear-gradient(135deg, ${accent}10, transparent)` }}>
            <h3 className="text-lg font-bold">HouseLink Field Toolkit</h3>
            <p className="mt-1 text-sm text-slate-600">Print-ready branded forms, checklists, planners, scripts, and flowcharts for this programme - the same professional PDFs used in the field.</p>
          </div>
          <ToolkitGrid
            groups={data.toolkit ?? []}
            accent={accent}
            access={data.toolkitAccess}
            onPurchase={() => setCheckoutOpen(true)}
          />
          {data.toolkitAccess && (
            <AcademyResourcePurchaseModal
              open={checkoutOpen}
              onClose={() => setCheckoutOpen(false)}
              onComplete={load}
              product={buildToolkitProduct({
                courseId: data.course.id,
                courseTitle: data.course.title,
                itemCount: (data.toolkit ?? []).reduce((sum, group) => sum + group.items.length, 0),
                groups: data.toolkit,
              })}
              access={data.toolkitAccess as ToolkitAccessState}
              paymentInstructions={data.settings.paymentInstructions}
              accent={accent}
              showToast={showToast}
            />
          )}
        </div>
      )}

      {tab === "materials" && (
        <div className="mt-6 space-y-5">
          {data.toolkitAccess?.unlocked ? (
            <>
              <div className="academy-panel rounded-xl p-5 dark:border-sky-900/40 dark:from-sky-950/30 dark:to-slate-950">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">Training Session Notes - Downloadable PDFs</h3>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                      {data.materials.length} branded HouseLink study guides - each PDF includes the HouseLink logo, session overview, key takeaways, in-depth notes, field application steps, and reflection questions.
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                    {data.materials.length} PDFs ready
                  </span>
                </div>
              </div>
              {Object.entries(
                data.materials.reduce<Record<string, typeof data.materials>>((groups, material) => {
                  const list = groups[material.moduleTitle] ?? [];
                  list.push(material);
                  groups[material.moduleTitle] = list;
                  return groups;
                }, {}),
              ).map(([moduleTitle, items]) => (
                <div key={moduleTitle} className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">{moduleTitle}</h4>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((material) => (
                      <div
                        key={material.id}
                        className="academy-card group flex flex-col overflow-hidden rounded-xl border-sky-200/70 dark:border-sky-900/40"
                      >
                        <div className="border-b border-sky-100 bg-gradient-to-r from-sky-600 to-emerald-600 px-4 py-3 dark:border-sky-900">
                          <div className="flex items-center justify-between gap-2">
                            <HouseLinkBrand variant="icon" iconOnly className="scale-[0.55] brightness-0 invert" />
                            <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">PDF</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm font-bold text-white">{material.title}</p>
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="flex-1 text-xs leading-relaxed text-slate-600 line-clamp-3 dark:text-slate-400">{material.summary || "Branded lesson study guide with overview, takeaways, and field application."}</p>
                          <p className="mt-3 text-xs font-medium text-slate-500">{material.estimatedMinutes} min read</p>
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <a
                              href={material.viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300 sm:flex-1 sm:py-2.5"
                            >
                              View PDF
                            </a>
                            <a
                              href={material.downloadUrl}
                              download
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 sm:flex-1 sm:py-2.5"
                            >
                              <Download className="size-4" />
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!data.materials.length && <p className="text-slate-500">Lesson notes PDFs appear for every lesson in this programme.</p>}
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
                  <FileText className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Toolkit access required</p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    These training session notes and PDF materials are part of the premium toolkit. Purchase the toolkit from the Toolkit tab to access all {data.materials.length} downloadable resources.
                  </p>
                  <button
                    onClick={() => setTab("toolkit")}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    <GraduationCap className="size-4" />
                    Go to Toolkit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "assessments" && (
        <div className="mt-6 space-y-5">
          {(data.assessments.summary || data.programme?.badgeName) && (
            <div className="academy-panel overflow-hidden rounded-xl dark:border-emerald-900/40">
              <div className="grid gap-0 md:grid-cols-[1fr_15rem]">
                <div className="p-5 sm:p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Certification pathway</p>
                  <h2 className="mt-2 text-xl font-bold leading-tight text-slate-950 dark:text-white sm:text-2xl">Prove skill before certification</h2>
                  {data.assessments.summary && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{data.assessments.summary}</p>}
                </div>
                {data.programme?.badgeName && (
                  <div className="border-t border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20 md:border-l md:border-t-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Earn badge</p>
                    <p className="mt-2 text-sm font-semibold leading-5 text-slate-900 dark:text-white">{data.programme.badgeName}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Complete every checkpoint and submit review-ready evidence.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {data.assessments.totals && (
            <div className="grid gap-3 sm:grid-cols-3">
              <AssessmentStat label="Module Quizzes" value={`${data.assessments.totals.quizzesPassed}/${data.assessments.totals.quizzes} passed`} accent={accent} />
              <AssessmentStat label="Assignments" value={`${data.assessments.totals.assignmentsSubmitted}/${data.assessments.totals.assignments} submitted`} accent={accent} />
              <AssessmentStat label="Final Exam" value={data.assessments.totals.exams ? "1 capstone exam" : "Certificate checkpoint"} accent={accent} />
            </div>
          )}

          {data.assessments.readiness && (
            <ReadinessPanel readiness={data.assessments.readiness} accent={accent} />
          )}

          <CourseRecommendations recommendations={courseRecommendations(data)} accent={accent} />

          <section className="academy-panel rounded-xl p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Mentor/admin sign-off gate</p>
              <h3 className="text-lg font-bold leading-tight text-slate-950 dark:text-white sm:text-xl">Uploads are reviewed before certification</h3>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Practical work must be reviewed and graded before a certificate is issued. The professional portfolio and roleplay evidence show whether you can handle real clients safely.
              </p>
            </div>
            <div className="mt-4">
              <AcademyAccordion
                accent={accent}
                items={[
                  {
                    id: "portfolio-evidence",
                    title: "Portfolio evidence",
                    subtitle: "Proof that your daily work is organised, verifiable, and ready for review.",
                    meta: `${AGENT_PORTFOLIO_REQUIREMENTS.length} items`,
                    content: <EvidenceChecklist items={AGENT_PORTFOLIO_REQUIREMENTS} accent={accent} />,
                  },
                  {
                    id: "roleplay-scenarios",
                    title: "Roleplay scenarios",
                    subtitle: "Client conversations and judgement calls to rehearse before certification.",
                    meta: `${ROLEPLAY_ASSESSMENT_SCENARIOS.length} scenarios`,
                    content: <EvidenceChecklist items={ROLEPLAY_ASSESSMENT_SCENARIOS} accent={accent} />,
                  },
                ]}
              />
            </div>
          </section>

          <SimulationPractice accent={accent} />

          <div className="space-y-3">
            <AssessmentGroup
              title="Module quizzes"
              subtitle="Knowledge checks with shuffled answers and retakes."
              icon={ShieldCheck}
              meta={`${data.assessments.quizzes.length} checkpoints`}
              accent={accent}
              empty="Module quizzes load with your programme enrolment."
            >
              {data.assessments.quizzes.map((quiz) => (
                <AssessmentActionCard
                  key={quiz.id}
                  title={quiz.title}
                  eyebrow={quiz.moduleTitle}
                  description={quiz.description}
                  meta={`${quiz.questionCount} questions / ${quiz.passingPercentage}% pass${quiz.timeLimitMinutes ? ` / ${quiz.timeLimitMinutes} min` : ""}`}
                  status={quiz.bestScore !== null ? `Best score: ${quiz.bestScore}% ${quiz.passed ? "Passed" : "Retake available"}` : "Not attempted yet"}
                  statusTone={quiz.bestScore !== null && !quiz.passed ? "amber" : quiz.passed ? "emerald" : "slate"}
                  actionLabel={quiz.passed ? "Retake Quiz" : "Take Quiz"}
                  onAction={() => setActiveQuizId(quiz.id)}
                />
              ))}
            </AssessmentGroup>

            <AssessmentGroup
              title="Practical assignments"
              subtitle="Field tasks that prove documentation, judgement, and client readiness."
              icon={ClipboardCheck}
              meta={`${data.assessments.assignments.length} submissions`}
              accent={accent}
              empty="Practical assignments are tied to each module in this programme."
            >
              {data.assessments.assignments.map((assignment) => (
                <AssessmentActionCard
                  key={assignment.id}
                  title={assignment.title}
                  eyebrow={assignment.moduleTitle}
                  description={assignment.description}
                  meta={`${assignment.points} points${assignment.dueDays ? ` / due within ${assignment.dueDays} days` : ""}`}
                  status={assignment.submitted ? `Submitted / ${assignment.status}` : "Not submitted yet"}
                  statusTone={assignment.submitted ? "emerald" : "slate"}
                  actionLabel={assignment.submitted ? "View Submission" : "Submit Assignment"}
                  actionVariant="secondary"
                  onAction={() => setActiveAssignmentId(assignment.id)}
                />
              ))}
            </AssessmentGroup>

            <AssessmentGroup
              title={data.assessments.exams.length ? "Final examination" : "Certificate checkpoint"}
              subtitle="The final proof point before certificate release."
              icon={GraduationCap}
              meta={data.assessments.exams.length ? `${data.assessments.exams.length} capstone` : "review gate"}
              accent="#b45309"
              empty=""
            >
              {data.assessments.exams.map((exam) => (
                <AssessmentActionCard
                  key={exam.id}
                  title={exam.title}
                  eyebrow="Capstone"
                  description={exam.description}
                  meta={`${exam.durationMinutes} min / ${exam.passingScore}% pass / ${exam.attemptLimit} attempts`}
                  status="Final exam opens after the required coursework is complete."
                  statusTone="amber"
                  actionLabel="Take Final Exam"
                  onAction={() => setActiveExamId(exam.id)}
                />
              ))}
              {data.assessments.certificateCheckpoint && (
                <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{data.assessments.certificateCheckpoint.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{data.assessments.certificateCheckpoint.description}</p>
                  {data.programme?.includes && (
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {data.programme.includes.filter((item) => /quiz|assignment|checkpoint|certificate/i.test(item)).slice(0, 4).map((item) => (
                        <li key={item} className="flex gap-2"><CheckCircle2 className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </AssessmentGroup>
          </div>
        </div>
      )}

      {tab === "discussions" && (
        <div className="mt-6">
          <DiscussionPanel courseId={courseId} />
        </div>
      )}

      {tab === "progress" && (
        <div className="academy-panel mt-6 rounded-xl p-6">
          <p className="text-3xl font-bold text-emerald-600">{data.course.progress}%</p>
          <p className="text-slate-600 mt-1">Course completion / Status: {data.course.status.replace(/_/g, " ")}</p>
          <p className="text-sm text-slate-500 mt-4">Pass mark: {data.course.passingPercentage}% / Complete all training sessions{data.course.certificateEnabled ? " to earn your certificate" : ""}.</p>
        </div>
      )}
    </PageShell>
  );
}

function AssessmentStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="academy-card rounded-xl p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold leading-snug sm:text-lg" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function CourseRecommendations({ recommendations, accent }: { recommendations: string[]; accent: string }) {
  return (
    <section className="academy-panel rounded-xl p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Trainer recommendations</p>
      <h3 className="mt-1 text-lg font-bold leading-tight text-slate-950 dark:text-white sm:text-xl">Best next moves</h3>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {recommendations.map((item, index) => (
          <div key={item} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: accent }}>{index + 1}</span>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadinessPanel({
  readiness,
  accent,
}: {
  readiness: NonNullable<CourseDetail["assessments"]["readiness"]>;
  accent: string;
}) {
  const statusLabel = readiness.status === "READY" ? "Client-ready" : readiness.status === "DEVELOPING" ? "Developing" : "Needs practice";
  return (
    <section className="academy-panel rounded-xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Agent readiness score</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-slate-950 dark:text-white sm:text-xl">Industry readiness: {statusLabel}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">{readiness.mentorSignoffLabel}</p>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 rounded-xl px-4 py-3 text-white sm:block sm:px-5 sm:py-4 sm:text-center" style={{ backgroundColor: accent }}>
          <p className="text-2xl font-bold sm:text-3xl">{readiness.overall}%</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">Overall</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {readiness.categories.map((category) => (
          <div key={category.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{category.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{category.description}</p>
              </div>
              <span className="text-base font-bold" style={{ color: accent }}>{category.score}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full" style={{ width: `${category.score}%`, backgroundColor: accent }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SimulationPractice({ accent }: { accent: string }) {
  return (
    <section className="academy-panel rounded-xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/40">
          <MessageSquareText className="size-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Practical simulations</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-slate-950 dark:text-white sm:text-xl">Rehearse before client work</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Open each scenario, prepare your response, then compare it against the evidence a reviewer would expect.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {ROLEPLAY_ASSESSMENT_SCENARIOS.slice(0, 4).map((scenario, index) => (
          <details key={scenario} className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>Scenario {index + 1}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-900 dark:text-white">{scenario}</p>
              </div>
              <ChevronDown className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t border-slate-100 px-4 py-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300 md:grid-cols-3">
              <PracticePrompt icon={Target} title="Prepare" body="Opening script, client questions, risk checks, and closing summary." />
              <PracticePrompt icon={FileText} title="Record" body="Evidence you would save in the client file before moving forward." />
              <PracticePrompt icon={ListChecks} title="Review" body="Ask a mentor to score clarity, judgement, documentation, and escalation discipline." />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function PracticePrompt({ icon: Icon, title, body }: { icon: typeof BookOpen; title: string; body: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        <Icon className="size-4" />
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}

function AssessmentGroup({
  title,
  subtitle,
  icon: Icon,
  meta,
  accent,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
  meta: string;
  accent: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <details className="academy-card group overflow-hidden rounded-xl">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 marker:content-none sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}14`, color: accent }}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${accent}16`, color: accent }}>{meta}</span>
          <ChevronDown className="size-5 text-slate-400 transition group-open:rotate-180" />
        </div>
        <ChevronDown className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180 sm:hidden" />
      </summary>
      <div className="border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="mb-3 sm:hidden">
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${accent}16`, color: accent }}>{meta}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hasContent ? children : <p className="text-sm text-slate-500">{empty}</p>}
        </div>
      </div>
    </details>
  );
}

function AssessmentActionCard({
  title,
  eyebrow,
  description,
  meta,
  status,
  statusTone,
  actionLabel,
  actionVariant = "primary",
  onAction,
}: {
  title: string;
  eyebrow?: string | null;
  description?: string | null;
  meta: string;
  status: string;
  statusTone: "emerald" | "amber" | "slate";
  actionLabel: string;
  actionVariant?: "primary" | "secondary";
  onAction: () => void;
}) {
  return (
    <article className="flex min-h-[13rem] flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">{eyebrow}</p>}
      <h4 className="mt-1 text-sm font-bold leading-5 text-slate-950 dark:text-white">{title}</h4>
      {description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>}
      <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <p>{meta}</p>
        <p
          className={cn(
            "font-bold",
            statusTone === "emerald" && "text-emerald-600 dark:text-emerald-300",
            statusTone === "amber" && "text-amber-600 dark:text-amber-300",
            statusTone === "slate" && "text-slate-500 dark:text-slate-400",
          )}
        >
          {status}
        </p>
      </div>
      <Button className="mt-auto w-full" variant={actionVariant} onClick={onAction}>
        {actionLabel}
      </Button>
    </article>
  );
}

function courseRecommendations(data: CourseDetail) {
  const failedQuizzes = data.assessments.quizzes.filter((quiz) => quiz.bestScore !== null && !quiz.passed);
  const pendingAssignments = data.assessments.assignments.filter((assignment) => !assignment.submitted);
  const resubmissions = data.assessments.assignments.filter((assignment) => assignment.status === "RESUBMISSION_REQUESTED");
  if (resubmissions.length) {
    return [
      "Fix resubmission feedback first so your practical evidence becomes certificate-ready.",
      "Re-read the matching lesson notes, then upload corrected proof with a short explanation.",
      "Ask for mentor review only after the file is complete, clear, and easy to audit.",
    ];
  }
  if (failedQuizzes.length) {
    return [
      `Review ${failedQuizzes[0].title} before retaking; focus on the weak topics shown after submission.`,
      "Use the toolkit forms while answering practice scenarios so the quiz feels like real field work.",
      "Retake only when you can explain why each wrong option is unsafe or incomplete.",
    ];
  }
  if (pendingAssignments.length) {
    return [
      `Submit ${pendingAssignments[0].title} next; practical evidence is what turns the course into proof of skill.`,
      "Attach complete notes, screenshots, or files so the reviewer can grade against the rubric.",
      "Practise one roleplay scenario before uploading to sharpen client communication.",
    ];
  }
  return [
    "Complete the final checkpoint, then keep your portfolio evidence ready for public certificate verification.",
    "Use the simulations to rehearse live client judgement, not only course memory.",
    "Keep reviewing toolkit documents so your field work stays consistent after certification.",
  ];
}

function EvidenceChecklist({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
          <CheckCircle2 className="mt-1 size-4 shrink-0" style={{ color: accent }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
