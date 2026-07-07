"use client";

import Link from "next/link";
import { Children, useCallback, useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { LessonViewer } from "@/components/academy/lesson-viewer";
import { QuizPanel } from "@/components/academy/quiz-panel";
import { ExamPanel } from "@/components/academy/exam-panel";
import { AssignmentPanel } from "@/components/academy/assignment-panel";
import { DiscussionPanel } from "@/components/academy/discussion-panel";
import { cn } from "@/lib/utils";

type CourseDetail = {
  settings: { academyName: string; primaryColour: string };
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

type Tab = "curriculum" | "materials" | "assessments" | "discussions" | "progress";

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
        primaryColour={primaryColour}
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

  return (
    <PageShell
      eyebrow={data.settings.academyName}
      title={data.course.title}
      description={data.course.description}
      actions={
        <Link href="/dashboard/academy"><Button variant="secondary">My Dashboard</Button></Link>
      }
    >
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-soft dark:border-slate-800 dark:from-slate-950 dark:to-slate-900 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{data.course.instructor ?? "HomeLink trainers"}</p>
            <p className="mt-3 text-3xl font-bold" style={{ color: primaryColour }}>{data.course.progress}%</p>
            <p className="text-sm text-slate-500">Course completion</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${data.course.progress}%`, backgroundColor: primaryColour }} />
            </div>
            {data.course.certificateEnabled && (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                <Award className="size-4" /> Certificate on completion
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["curriculum", "materials", "assessments", "discussions", "progress"] as Tab[]).map((item) => (
          <Button
            key={item}
            variant={tab === item ? "primary" : "secondary"}
            className={cn("shrink-0 capitalize", tab === item && "shadow-soft")}
            style={tab === item ? { backgroundColor: primaryColour } : undefined}
            onClick={() => setTab(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      {tab === "curriculum" && (
        <div className="mt-6 space-y-5">
          {data.course.modules.map((module) => (
            <section key={module.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-bold flex items-center gap-2"><BookOpen className="size-5" style={{ color: primaryColour }} /> {module.title}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">{module.completedCount}/{module.lessonCount} complete</span>
                </div>
                {module.description && <p className="mt-2 text-sm leading-relaxed text-slate-500">{module.description as string}</p>}
              </div>
              <div className="p-4 sm:p-5">
                {module.sections.map((section) => (
                  <div key={section.id} className="mb-4 last:mb-0">
                    {module.sections.length > 1 && <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{section.title}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {section.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setViewingLessonId(lesson.id)}
                          className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{lesson.title}</p>
                            <CheckCircle2 className={cn("size-5 shrink-0", lesson.completed ? "text-emerald-500" : "text-slate-200 dark:text-slate-700")} />
                          </div>
                          <p className="mt-2 text-xs text-slate-500">{lesson.estimatedMinutes} min · {lesson.completionRequirement.replace(/_/g, " ")}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "materials" && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {data.materials.map((material) => (
            <a key={material.id} href={material.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-400 dark:border-slate-700">
              <FileText className="size-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold">{material.title}</p>
                <p className="text-xs text-slate-500">{material.location} · {material.fileType}</p>
              </div>
              <Download className="size-4 ml-auto text-slate-400" />
            </a>
          ))}
          {!data.materials.length && <p className="text-slate-500">No materials attached yet.</p>}
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
