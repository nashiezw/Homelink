"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { AdminStatPill, AdminStatusBadge } from "@/components/admin/ui/admin-ui";

type CourseTree = {
  id: string;
  title: string;
  description: string;
  status: string;
  modules: Array<{
    id: string;
    title: string;
    description?: string | null;
    sortOrder: number;
    sections: Array<{
      id: string;
      title: string;
      sortOrder: number;
      lessons: Array<{ id: string; title: string; estimatedMinutes: number; completionRequirement: string }>;
    }>;
  }>;
  quizzes: Array<{ id: string; title: string; passingPercentage: number }>;
  assignments: Array<{ id: string; title: string; points: number }>;
  exams: Array<{ id: string; title: string; durationMinutes: number; passingScore: number }>;
  stats: { moduleCount: number; lessonCount: number; quizCount: number; assignmentCount: number; examCount: number };
};

const STEPS = ["Overview", "Modules & Lessons", "Materials", "Assessments", "Publish"] as const;
type Step = (typeof STEPS)[number];

export function CourseWorkspace({
  courseId,
  courseTitle,
  onClose,
  action,
  onRefresh,
}: {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  action: (body: Record<string, unknown>, success: string) => Promise<unknown>;
  onRefresh: () => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("Overview");
  const [tree, setTree] = useState<CourseTree | null>(null);
  const [busy, setBusy] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLesson, setNewLesson] = useState({ moduleId: "", title: "", estimatedMinutes: "30" });

  const load = useCallback(async () => {
    const result = await apiFetch<CourseTree>(`/api/v1/admin/academy/courses/${courseId}`);
    if (result.data) setTree(result.data);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(body: Record<string, unknown>, success: string) {
    setBusy(true);
    await action(body, success);
    await load();
    await onRefresh();
    setBusy(false);
  }

  if (!tree) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-8">
        <Loader2 className="size-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-emerald-500/20 bg-slate-900/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Course Builder</p>
          <h2 className="mt-1 text-2xl font-bold text-white">{courseTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{tree.description}</p>
        </div>
        <Button variant="secondary" onClick={onClose}>Back to courses</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((item, index) => (
          <button
            key={item}
            type="button"
            onClick={() => setStep(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${step === item ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
          >
            {index + 1}. {item}
          </button>
        ))}
      </div>

      {step === "Overview" && (
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatPill label="Modules" value={tree.stats.moduleCount} />
          <AdminStatPill label="Lessons" value={tree.stats.lessonCount} tone="info" />
          <AdminStatPill label="Status" value={tree.status} tone={tree.status === "PUBLISHED" ? "success" : "warning"} />
          <AdminStatPill label="Quizzes" value={tree.stats.quizCount} />
          <AdminStatPill label="Assignments" value={tree.stats.assignmentCount} />
          <AdminStatPill label="Exams" value={tree.stats.examCount} />
          <div className="md:col-span-3 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            Build this course step by step: add modules, add lessons inside each module, attach materials, then link quizzes and tests before publishing.
          </div>
        </div>
      )}

      {step === "Modules & Lessons" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <input
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="New module title"
              className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
            />
            <Button disabled={!newModuleTitle.trim() || busy} onClick={() => void run({ action: "create_module", module: { courseId, title: newModuleTitle } }, "Module created.")}>
              <Plus className="size-4" /> Add Module
            </Button>
          </div>

          {tree.modules.map((module) => (
            <section key={module.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="size-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">{module.title}</h3>
                  <AdminStatusBadge status={`${module.sections.reduce((s, sec) => s + sec.lessons.length, 0)} lessons`} variant="info" />
                </div>
                <Button variant="secondary" onClick={() => void run({ action: "delete_module", moduleId: module.id }, "Module deleted.")}>
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {module.sections.map((section) => (
                <div key={section.id} className="mt-4 space-y-2 border-l-2 border-emerald-500/30 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{section.title}</p>
                  {section.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/60 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-slate-200">
                        <BookOpen className="size-4 text-emerald-400" />
                        {lesson.title}
                        <span className="text-xs text-slate-500">{lesson.estimatedMinutes} min · {lesson.completionRequirement}</span>
                      </div>
                      <Button variant="secondary" onClick={() => void run({ action: "delete_lesson", lessonId: lesson.id }, "Lesson deleted.")}>Delete</Button>
                    </div>
                  ))}
                </div>
              ))}

              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={newLesson.moduleId === module.id ? newLesson.title : ""}
                  onChange={(e) => setNewLesson({ moduleId: module.id, title: e.target.value, estimatedMinutes: newLesson.estimatedMinutes })}
                  placeholder="New lesson title"
                  className="flex-1 min-w-[180px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <Button
                  disabled={newLesson.moduleId !== module.id || !newLesson.title.trim() || busy}
                  onClick={() => void run({ action: "create_lesson", lesson: { courseId, moduleId: module.id, title: newLesson.title, estimatedMinutes: Number(newLesson.estimatedMinutes) || 30 } }, "Lesson created.")}
                >
                  <Plus className="size-4" /> Add Lesson
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}

      {step === "Materials" && (
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-white"><Upload className="size-5 text-emerald-400" /> Course materials</div>
          <p className="mt-2">Attach videos, PDFs, documents, and downloads to each lesson from the <strong>Lesson Content</strong> tab while this course is selected, or edit lesson rich text and PDF URLs in the course tree above.</p>
          <p className="mt-3">All materials roll up under this course for learners on their course page.</p>
        </div>
      )}

      {step === "Assessments" && (
        <div className="grid gap-4 md:grid-cols-3">
          <AssessmentCard title="Quizzes" icon={ShieldCheck} items={tree.quizzes.map((q) => `${q.title} (${q.passingPercentage}% pass)`)} onAdd={() => void run({ action: "create_quiz", quiz: { courseId, title: "New Quiz", passingPercentage: 80 } }, "Quiz created.")} />
          <AssessmentCard title="Assignments" icon={ClipboardCheck} items={tree.assignments.map((a) => `${a.title} (${a.points} pts)`)} onAdd={() => void run({ action: "create_assignment", assignment: { courseId, title: "New Assignment", description: "Describe the practical task.", points: 100 } }, "Assignment created.")} />
          <AssessmentCard title="Final Exams" icon={GraduationCap} items={tree.exams.map((e) => `${e.title} (${e.passingScore}% pass)`)} onAdd={() => void run({ action: "create_exam", exam: { courseId, title: "Final Exam", durationMinutes: 60, passingScore: 80 } }, "Exam created.")} />
        </div>
      )}

      {step === "Publish" && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-slate-950/50 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <CheckItem ok={tree.stats.moduleCount > 0} label="At least one module" />
            <CheckItem ok={tree.stats.lessonCount > 0} label="At least one lesson" />
            <CheckItem ok={tree.stats.quizCount > 0 || tree.stats.examCount > 0} label="Assessment configured (recommended)" />
            <CheckItem ok={tree.status === "PUBLISHED"} label="Course published" />
          </div>
          <div className="flex flex-wrap gap-2">
            {tree.status === "PUBLISHED" ? (
              <Button variant="secondary" disabled={busy} onClick={() => void run({ action: "unpublish_course", courseId }, "Course unpublished.")}>Unpublish</Button>
            ) : (
              <Button disabled={busy || tree.stats.lessonCount === 0} onClick={() => void run({ action: "publish_course", courseId }, "Course published.")}>
                <CheckCircle2 className="size-4" /> Publish Course
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentCard({ title, icon: Icon, items, onAdd }: { title: string; icon: typeof BookOpen; items: string[]; onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-white"><Icon className="size-4 text-emerald-400" /> {title}</div>
        <Button onClick={onAdd}><Plus className="size-4" /></Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-slate-400">
        {items.length ? items.map((item) => <li key={item}>• {item}</li>) : <li>No items yet</li>}
      </ul>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${ok ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/10 text-amber-200"}`}>
      <CheckCircle2 className="size-4" /> {label}
    </div>
  );
}
