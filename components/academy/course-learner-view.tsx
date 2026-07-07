"use client";

import Link from "next/link";
import { Children, useCallback, useEffect, useState } from "react";
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
  } | null;
  toolkit?: Array<{ category: string; description: string; items: Array<{ id: string; title: string; description: string; fileUrl: string }> }>;
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
    quizzes: Array<{ id: string; title: string; description?: string | null; passingPercentage: number; questionCount: number; bestScore: number | null; passed: boolean }>;
    assignments: Array<{ id: string; title: string; description: string; points: number; submitted: boolean; status: string | null }>;
    exams: Array<{ id: string; title: string; durationMinutes: number; passingScore: number; attemptLimit: number }>;
  };
  materials: Array<{ id: string; title: string; level: string; location: string; fileType: string; downloadUrl: string }>;
};

type Tab = "curriculum" | "toolkit" | "materials" | "assessments" | "discussions" | "progress";

export function CourseLearnerView({ courseId }: { courseId: string }) {
  const { user, showToast } = useApp();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [tab, setTab] = useState<Tab>("curriculum");
  const [viewingLessonId, setViewingLessonId] = useState<string | null>(null);
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
        <Link href="/dashboard/academy"><Button variant="secondary">My Dashboard</Button></Link>
      }
    >
      <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-hero sm:p-8", heroGradient)}>
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-white/40">
              <HomeLinkBrand variant="icon" iconOnly />
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
                <Sparkles className="size-3.5" /> {theme?.label ?? data.settings.academyName}
              </p>
              <p className="mt-2 text-sm text-emerald-100/90">{data.course.instructor ?? "HomeLink trainers"}</p>
              <p className="mt-1 text-lg font-medium text-white/95">{data.programme?.certificateTitle ?? "HomeLink Agent Certification"}</p>
            </div>
          </div>
          <div className="w-full rounded-2xl bg-white/10 p-5 backdrop-blur-sm lg:max-w-xs">
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

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["curriculum", "toolkit", "materials", "assessments", "discussions", "progress"] as Tab[]).map((item) => (
          <Button
            key={item}
            variant={tab === item ? "primary" : "secondary"}
            className={cn("shrink-0 capitalize", tab === item && "shadow-soft")}
            style={tab === item ? { backgroundColor: accent } : undefined}
            onClick={() => setTab(item)}
          >
            {item}
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
                      className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/30"
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
          <div className="rounded-2xl border p-5" style={{ borderColor: `${accent}33`, background: `linear-gradient(135deg, ${accent}10, transparent)` }}>
            <h3 className="text-lg font-bold">HomeLink Field Toolkit</h3>
            <p className="mt-1 text-sm text-slate-600">Print-ready branded PDFs for this programme level — forms, checklists, planners, scripts, and flowcharts from the official manual.</p>
          </div>
          <ToolkitGrid groups={data.toolkit ?? []} accent={accent} />
        </div>
      )}

      {tab === "materials" && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Branded HomeLink forms, checklists, and planners from your lessons. The complete training manual is available separately in the Academy resource library.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
          {data.materials.map((material) => (
            <a key={material.id} href={material.downloadUrl} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/30 p-4 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-card-hover dark:border-emerald-900/40 dark:from-slate-950 dark:to-emerald-950/20">
              <div className="rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-900">
                <HomeLinkBrand variant="icon" iconOnly className="scale-[0.65]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{material.title}</p>
                <p className="text-xs text-slate-500">{material.location} · {material.fileType}</p>
              </div>
              <Download className="size-4 shrink-0 text-emerald-600 opacity-70 group-hover:opacity-100" />
            </a>
          ))}
          {!data.materials.length && <p className="text-slate-500">No materials attached yet.</p>}
          </div>
        </div>
      )}

      {tab === "assessments" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <AssessmentSection title="Quizzes" icon={ShieldCheck} empty="No quizzes for this course.">
            {data.assessments.quizzes.map((quiz) => (
              <div key={quiz.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-semibold">{quiz.title}</p>
                <p className="text-xs text-slate-500 mt-1">{quiz.questionCount} questions · {quiz.passingPercentage}% to pass</p>
                {quiz.bestScore !== null && <p className="text-sm mt-2">Best score: {quiz.bestScore}% {quiz.passed ? "✓ Passed" : ""}</p>}
                <Button className="mt-3" onClick={() => setActiveQuizId(quiz.id)}>Take Quiz</Button>
              </div>
            ))}
          </AssessmentSection>
          <AssessmentSection title="Assignments" icon={ClipboardCheck} empty="No assignments.">
            {data.assessments.assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-semibold">{assignment.title}</p>
                <p className="text-sm text-slate-600 mt-1">{assignment.description}</p>
                <p className="text-xs text-slate-500 mt-2">{assignment.points} points · {assignment.submitted ? assignment.status : "Not submitted"}</p>
                <Button className="mt-3" variant="secondary" onClick={() => setActiveAssignmentId(assignment.id)}>
                  {assignment.submitted ? "View Submission" : "Submit Assignment"}
                </Button>
              </div>
            ))}
          </AssessmentSection>
          <AssessmentSection title="Final Exams" icon={GraduationCap} empty="No final exam.">
            {data.assessments.exams.map((exam) => (
              <div key={exam.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-semibold">{exam.title}</p>
                <p className="text-xs text-slate-500 mt-1">{exam.durationMinutes} min · {exam.passingScore}% pass · {exam.attemptLimit} attempts</p>
                <Button className="mt-3" onClick={() => setActiveExamId(exam.id)}>Take Final Exam</Button>
              </div>
            ))}
          </AssessmentSection>
        </div>
      )}

      {tab === "discussions" && (
        <div className="mt-6">
          <DiscussionPanel courseId={courseId} />
        </div>
      )}

      {tab === "progress" && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-3xl font-bold text-emerald-600">{data.course.progress}%</p>
          <p className="text-slate-600 mt-1">Course completion · Status: {data.course.status.replace(/_/g, " ")}</p>
          <p className="text-sm text-slate-500 mt-4">Pass mark: {data.course.passingPercentage}% · Complete all lessons{data.course.certificateEnabled ? " to earn your certificate" : ""}.</p>
        </div>
      )}
    </PageShell>
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
