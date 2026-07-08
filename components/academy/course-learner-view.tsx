"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Children, useCallback, useEffect, useRef, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Download,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HomeLinkBrand } from "@/components/brand/homelink-logo";
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
import { cn } from "@/lib/utils";

type CourseDetail = {
  settings: { academyName: string; primaryColour: string };
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
  const initialTab = searchParams.get("tab");
  const { user, showToast } = useApp();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [tab, setTab] = useState<Tab>(() => (VALID_TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "curriculum"));
  const [viewingLessonId, setViewingLessonId] = useState<string | null>(null);
  const [busyResource, setBusyResource] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resourcePaymentRef = useRef<string>("");
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

  async function purchaseToolkit() {
    setBusyResource(true);
    const result = await apiFetch("/api/v1/academy/resources/register", {
      method: "POST",
      body: JSON.stringify({ resourceKind: "COURSE_TOOLKIT", courseId }),
    });
    setBusyResource(false);
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    showToast("Toolkit purchase started. Upload proof of payment if required.");
    await load();
  }

  async function uploadResourceProof(files: FileList | null) {
    const file = files?.[0];
    const paymentId = resourcePaymentRef.current;
    if (!file || !paymentId) return;
    setBusyResource(true);
    const dataUrl = await readFile(file);
    const uploaded = await apiFetch<{ url: string }>("/api/v1/uploads", {
      method: "POST",
      body: JSON.stringify({ dataUrl, kind: "document", folder: "academy-payments" }),
    });
    if (uploaded.error || !uploaded.data) {
      setBusyResource(false);
      showToast(uploaded.error?.message ?? "Proof upload failed.", "error");
      return;
    }
    const proof = await apiFetch(`/api/v1/payments/${paymentId}/proof`, {
      method: "POST",
      body: JSON.stringify({ proofUrl: uploaded.data.url }),
    });
    setBusyResource(false);
    if (proof.error) {
      showToast(proof.error.message, "error");
      return;
    }
    showToast("Proof uploaded. Admin approval is pending.");
    await load();
  }

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
      <PageShell eyebrow={data.settings.academyName} title={quiz?.title ?? "Quiz"} description="Complete the quiz to track your progress.">
        <QuizPanel quizId={activeQuizId} passingPercentage={quiz?.passingPercentage ?? 80} onBack={() => { setActiveQuizId(null); void load(); }} />
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
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-white/40">
              <HomeLinkBrand variant="icon" iconOnly />
            </div>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
                <Sparkles className="size-3.5 shrink-0" /> {theme?.label ?? data.settings.academyName}
              </p>
              <p className="mt-2 text-sm text-emerald-100/90">{data.course.instructor ?? "HomeLink trainers"}</p>
              <p className="mt-1 text-base font-medium leading-snug text-white/95 sm:text-lg">{data.programme?.certificateTitle ?? "HomeLink Agent Certification"}</p>
            </div>
          </div>
          <div className="w-full rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur-sm lg:max-w-xs">
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

      <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1 scrollbar-none">
        {(["curriculum", "toolkit", "materials", "assessments", "discussions", "progress"] as Tab[]).map((item) => (
          <Button
            key={item}
            variant={tab === item ? "primary" : "secondary"}
            className={cn("w-full capitalize sm:w-auto sm:shrink-0", tab === item && "shadow-soft")}
            style={tab === item ? { backgroundColor: accent } : undefined}
            onClick={() => setTab(item)}
          >
            {item === "materials" ? "Lesson Notes" : item === "toolkit" ? "Toolkit" : item}
          </Button>
        ))}
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
                      <p className="mt-2 text-xs text-slate-500">{lesson.estimatedMinutes} min · {lesson.completionRequirement.replace(/_/g, " ")}</p>
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
            <h3 className="text-lg font-bold">HomeLink Field Toolkit</h3>
            <p className="mt-1 text-sm text-slate-600">Print-ready branded forms, checklists, planners, scripts, and flowcharts for this programme — the same professional PDFs used in the field.</p>
          </div>
          <ToolkitGrid
            groups={data.toolkit ?? []}
            accent={accent}
            access={data.toolkitAccess}
            onPurchase={() => void purchaseToolkit()}
            purchaseBusy={busyResource}
            onUploadProof={() => {
              if (data.toolkitAccess?.paymentId) {
                resourcePaymentRef.current = data.toolkitAccess.paymentId;
                fileRef.current?.click();
              }
            }}
          />
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => void uploadResourceProof(e.target.files)} />
        </div>
      )}

      {tab === "materials" && (
        <div className="mt-6 space-y-5">
          <div className="academy-panel rounded-xl p-5 dark:border-sky-900/40 dark:from-sky-950/30 dark:to-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Lesson Notes — Downloadable PDFs</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                  {data.materials.length} branded HomeLink study guides — each PDF includes the HomeLink logo, lesson overview, key takeaways, in-depth notes, field application steps, and reflection questions.
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
                        <HomeLinkBrand variant="icon" iconOnly className="scale-[0.55] brightness-0 invert" />
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
        </div>
      )}

      {tab === "assessments" && (
        <div className="mt-6 space-y-6">
          {(data.assessments.summary || data.programme?.badgeName) && (
            <div className="academy-panel rounded-xl p-5 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Certification requirements</p>
              {data.assessments.summary && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{data.assessments.summary}</p>}
              {data.programme?.badgeName && (
                <p className="mt-2 text-xs text-slate-500">Earn the <span className="font-semibold text-slate-700 dark:text-slate-200">{data.programme.badgeName}</span> badge by completing all checkpoints below.</p>
              )}
            </div>
          )}

          {data.assessments.totals && (
            <div className="grid gap-3 sm:grid-cols-3">
              <AssessmentStat label="Module Quizzes" value={`${data.assessments.totals.quizzesPassed}/${data.assessments.totals.quizzes} passed`} accent={accent} />
              <AssessmentStat label="Assignments" value={`${data.assessments.totals.assignmentsSubmitted}/${data.assessments.totals.assignments} submitted`} accent={accent} />
              <AssessmentStat label="Final Exam" value={data.assessments.totals.exams ? "1 capstone exam" : "Certificate checkpoint"} accent={accent} />
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-3">
            <AssessmentSection title={`Module Quizzes (${data.assessments.quizzes.length})`} icon={ShieldCheck} empty="Module quizzes load with your programme enrolment.">
              {data.assessments.quizzes.map((quiz) => (
                <div key={quiz.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                  {quiz.moduleTitle && (
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{quiz.moduleTitle}</p>
                  )}
                  <p className="font-semibold">{quiz.title}</p>
                  {quiz.description && <p className="text-sm text-slate-600 mt-1 line-clamp-3">{quiz.description}</p>}
                  <p className="text-xs text-slate-500 mt-2">{quiz.questionCount} questions · {quiz.passingPercentage}% to pass{quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ""}</p>
                  {quiz.bestScore !== null && (
                    <p className={cn("text-sm mt-2 font-medium", quiz.passed ? "text-emerald-600" : "text-amber-600")}>
                      Best score: {quiz.bestScore}% {quiz.passed ? "✓ Passed" : "— retake available"}
                    </p>
                  )}
                  <Button className="mt-3 w-full" onClick={() => setActiveQuizId(quiz.id)}>{quiz.passed ? "Retake Quiz" : "Take Quiz"}</Button>
                </div>
              ))}
            </AssessmentSection>

            <AssessmentSection title={`Practical Assignments (${data.assessments.assignments.length})`} icon={ClipboardCheck} empty="Practical assignments are tied to each module in this programme.">
              {data.assessments.assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                  {assignment.moduleTitle && (
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">{assignment.moduleTitle}</p>
                  )}
                  <p className="font-semibold">{assignment.title}</p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-4">{assignment.description}</p>
                  <p className="text-xs text-slate-500 mt-2">{assignment.points} points{assignment.dueDays ? ` · due within ${assignment.dueDays} days` : ""}</p>
                  <p className={cn("text-xs mt-1 font-semibold", assignment.submitted ? "text-emerald-600" : "text-slate-500")}>
                    {assignment.submitted ? `Submitted · ${assignment.status}` : "Not submitted yet"}
                  </p>
                  <Button className="mt-3 w-full" variant="secondary" onClick={() => setActiveAssignmentId(assignment.id)}>
                    {assignment.submitted ? "View Submission" : "Submit Assignment"}
                  </Button>
                </div>
              ))}
            </AssessmentSection>

            <AssessmentSection title={data.assessments.exams.length ? "Final Examination" : "Certificate Checkpoint"} icon={GraduationCap} empty="">
              {data.assessments.exams.map((exam) => (
                <div key={exam.id} className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Capstone</p>
                  <p className="font-semibold mt-1">{exam.title}</p>
                  {exam.description && <p className="text-sm text-slate-600 mt-1">{exam.description}</p>}
                  <p className="text-xs text-slate-500 mt-2">{exam.durationMinutes} min · {exam.passingScore}% pass · {exam.attemptLimit} attempts</p>
                  <Button className="mt-3 w-full" onClick={() => setActiveExamId(exam.id)}>Take Final Exam</Button>
                </div>
              ))}
              {data.assessments.certificateCheckpoint && (
                <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">{data.assessments.certificateCheckpoint.title}</p>
                  <p className="text-sm text-slate-600 mt-2 dark:text-slate-300">{data.assessments.certificateCheckpoint.description}</p>
                  {data.programme?.includes && (
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {data.programme.includes.filter((item) => /quiz|assignment|checkpoint|certificate/i.test(item)).slice(0, 4).map((item) => (
                        <li key={item} className="flex gap-2"><CheckCircle2 className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </AssessmentSection>
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
          <p className="text-slate-600 mt-1">Course completion · Status: {data.course.status.replace(/_/g, " ")}</p>
          <p className="text-sm text-slate-500 mt-4">Pass mark: {data.course.passingPercentage}% · Complete all lessons{data.course.certificateEnabled ? " to earn your certificate" : ""}.</p>
        </div>
      )}
    </PageShell>
  );
}

function AssessmentStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="academy-card rounded-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function AssessmentSection({ title, icon: Icon, empty, children }: { title: string; icon: typeof BookOpen; empty: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-bold flex items-center gap-2 mb-3"><Icon className="size-5 text-emerald-500" /> {title}</h3>
      <div className="space-y-3">{Children.count(children) === 0 ? <p className="text-sm text-slate-500">{empty}</p> : children}</div>
    </section>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
