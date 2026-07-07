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

type Tab = "curriculum" | "materials" | "assessments" | "progress";

export function CourseLearnerView({ courseId }: { courseId: string }) {
  const { user, showToast } = useApp();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [tab, setTab] = useState<Tab>("curriculum");
  const [viewingLessonId, setViewingLessonId] = useState<string | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

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
        <Link href="/academy" className="text-emerald-600 font-semibold">Browse Academy courses</Link>
      </PageShell>
    );
  }

  if (!data) {
    return <PageShell eyebrow="Academy" title="Loading course..." description=""><div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></PageShell>;
  }

  if (viewingLessonId) {
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
        onBack={() => setViewingLessonId(null)}
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

  if (activeQuizId) {
    const quiz = data.assessments.quizzes.find((q) => q.id === activeQuizId);
    return (
      <PageShell eyebrow={data.settings.academyName} title={quiz?.title ?? "Quiz"} description="Complete the quiz to track your progress.">
        <QuizPanel quizId={activeQuizId} passingPercentage={quiz?.passingPercentage ?? 80} onBack={() => { setActiveQuizId(null); void load(); }} />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={data.settings.academyName}
      title={data.course.title}
      description={data.course.description}
      actions={
        <Link href="/dashboard/academy"><Button variant="secondary">My Dashboard</Button></Link>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{data.course.instructor ?? "HomeLink trainers"}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 min-w-[200px] max-w-md rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${data.course.progress}%` }} />
              </div>
              <span className="text-sm font-semibold text-emerald-600">{data.course.progress}%</span>
            </div>
          </div>
          {data.course.certificateEnabled && (
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <Award className="size-4" /> Certificate on completion
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["curriculum", "materials", "assessments", "progress"] as Tab[]).map((item) => (
          <Button key={item} variant={tab === item ? "primary" : "secondary"} onClick={() => setTab(item)}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>

      {tab === "curriculum" && (
        <div className="mt-6 space-y-4">
          {data.course.modules.map((module) => (
            <section key={module.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><BookOpen className="size-5 text-emerald-500" /> {module.title}</h3>
                <span className="text-sm text-slate-500">{module.completedCount}/{module.lessonCount} complete</span>
              </div>
              {module.sections.map((section) => (
                <div key={section.id} className="mb-4">
                  {module.sections.length > 1 && <p className="text-xs font-semibold uppercase text-slate-500 mb-2">{section.title}</p>}
                  <div className="grid gap-2 md:grid-cols-2">
                    {section.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setViewingLessonId(lesson.id)}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{lesson.title}</p>
                          <CheckCircle2 className={`size-5 ${lesson.completed ? "text-emerald-500" : "text-slate-300"}`} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{lesson.estimatedMinutes} min</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
              </div>
            ))}
          </AssessmentSection>
          <AssessmentSection title="Final Exams" icon={GraduationCap} empty="No final exam.">
            {data.assessments.exams.map((exam) => (
              <div key={exam.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-semibold">{exam.title}</p>
                <p className="text-xs text-slate-500 mt-1">{exam.durationMinutes} min · {exam.passingScore}% pass · {exam.attemptLimit} attempts</p>
              </div>
            ))}
          </AssessmentSection>
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
