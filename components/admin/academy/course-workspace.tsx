"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Eye,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { AdminStatPill, AdminStatusBadge } from "@/components/admin/ui/admin-ui";

type LessonNode = {
  id: string;
  title: string;
  summary?: string | null;
  richText: string;
  transcript?: string | null;
  lessonNotes?: string | null;
  objectives?: string[];
  discussionPrompt?: string | null;
  estimatedMinutes: number;
  completionRequirement: string;
  sortOrder: number;
  videoUrl?: string | null;
  pdfUrl?: string | null;
};

type CourseTree = {
  id: string;
  title: string;
  subtitle?: string | null;
  description: string;
  shortDescription?: string | null;
  status: string;
  modules: Array<{
    id: string;
    title: string;
    description?: string | null;
    objectives?: string[];
    estimatedMinutes?: number;
    sortOrder: number;
    sections: Array<{ id: string; title: string; sortOrder: number; lessons: LessonNode[] }>;
  }>;
  quizzes: Array<{ id: string; title: string; passingPercentage: number; lessonId?: string | null }>;
  assignments: Array<{ id: string; title: string; points: number; lessonId?: string | null }>;
  exams: Array<{ id: string; title: string; durationMinutes: number; passingScore: number }>;
  stats: { moduleCount: number; lessonCount: number; quizCount: number; assignmentCount: number; examCount: number };
};

const STEPS = ["Overview", "Curriculum", "Lesson Editor", "Assessments", "Publish"] as const;
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
  const [step, setStep] = useState<Step>("Curriculum");
  const [tree, setTree] = useState<CourseTree | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [dragModuleId, setDragModuleId] = useState<string | null>(null);
  const [dragLessonId, setDragLessonId] = useState<string | null>(null);
  const [dragLessonSectionId, setDragLessonSectionId] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [lessonDraft, setLessonDraft] = useState<Partial<LessonNode>>({});
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState({ prompt: "", answers: ["", "", "", ""], correctIndex: 0, explanation: "" });

  const load = useCallback(async () => {
    const result = await apiFetch<CourseTree>(`/api/v1/admin/academy/courses/${courseId}`);
    if (result.data) setTree(result.data);
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  const allLessons = useMemo(
    () => tree?.modules.flatMap((m) => m.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, moduleId: m.id, sectionId: s.id, moduleTitle: m.title })))) ?? [],
    [tree],
  );
  const selectedLesson = allLessons.find((l) => l.id === selectedLessonId);

  useEffect(() => {
    if (selectedLesson) {
      setLessonDraft({
        title: selectedLesson.title,
        summary: selectedLesson.summary,
        richText: selectedLesson.richText,
        transcript: selectedLesson.transcript,
        lessonNotes: selectedLesson.lessonNotes,
        objectives: selectedLesson.objectives ?? [],
        discussionPrompt: selectedLesson.discussionPrompt,
        estimatedMinutes: selectedLesson.estimatedMinutes,
        completionRequirement: selectedLesson.completionRequirement,
        videoUrl: selectedLesson.videoUrl,
        pdfUrl: selectedLesson.pdfUrl,
      });
      setStep("Lesson Editor");
    }
  }, [selectedLessonId, selectedLesson]);

  async function run(body: Record<string, unknown>, success: string) {
    setBusy(true);
    await action(body, success);
    await load();
    await onRefresh();
    setBusy(false);
  }

  async function reorderModules(fromId: string, toId: string) {
    if (!tree || fromId === toId) return;
    const ids = tree.modules.map((m) => m.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, fromId);
    await run({ action: "reorder_modules", courseId, moduleIds: ids }, "Modules reordered.");
  }

  async function reorderLessons(sectionId: string, fromId: string, toId: string) {
    if (!tree || fromId === toId) return;
    const section = tree.modules.flatMap((m) => m.sections).find((s) => s.id === sectionId);
    if (!section) return;
    const ids = section.lessons.map((l) => l.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, fromId);
    await run({ action: "reorder_lessons", sectionId, lessonIds: ids }, "Lessons reordered.");
  }

  if (!tree) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="size-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-slate-950/80 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-400">Course Builder</p>
          <h2 className="text-2xl font-bold text-white">{courseTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">{tree.stats.lessonCount} lessons · {tree.stats.moduleCount} modules · {tree.status.replace(/_/g, " ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={() => window.open(`/dashboard/academy/${courseId}`, "_blank")}><Eye className="size-4 mr-2" /> Preview</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((item) => (
          <Button key={item} variant={step === item ? "primary" : "secondary"} onClick={() => setStep(item)}>{item}</Button>
        ))}
      </div>

      {step === "Overview" && (
        <div className="grid gap-4 md:grid-cols-5">
          <AdminStatPill label="Modules" value={String(tree.stats.moduleCount)} />
          <AdminStatPill label="Lessons" value={String(tree.stats.lessonCount)} />
          <AdminStatPill label="Quizzes" value={String(tree.stats.quizCount)} />
          <AdminStatPill label="Assignments" value={String(tree.stats.assignmentCount)} />
          <AdminStatPill label="Exams" value={String(tree.stats.examCount)} />
          <div className="md:col-span-5 rounded-xl border border-white/10 p-4 text-sm text-slate-300">
            <AdminStatusBadge status={tree.status} variant={tree.status === "PUBLISHED" ? "success" : "warning"} />
            <p className="mt-3">{tree.description}</p>
          </div>
        </div>
      )}

      {step === "Curriculum" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="New module title" className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white" />
            <Button disabled={!newModuleTitle.trim() || busy} onClick={() => void run({ action: "create_module", module: { courseId, title: newModuleTitle } }, "Module created.").then(() => setNewModuleTitle(""))}>
              <Plus className="size-4 mr-2" /> Add Module
            </Button>
          </div>
          {tree.modules.map((module) => (
            <div
              key={module.id}
              draggable
              onDragStart={() => setDragModuleId(module.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragModuleId) void reorderModules(dragModuleId, module.id); setDragModuleId(null); }}
              className="rounded-xl border border-white/10 bg-slate-900/60"
            >
              <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
                <GripVertical className="size-4 text-slate-500 cursor-grab" />
                <div className="flex-1">
                  <p className="font-semibold text-white">{module.title}</p>
                  <p className="text-xs text-slate-500">{module.sections.reduce((n, s) => n + s.lessons.length, 0)} lessons</p>
                </div>
                <Button variant="secondary" onClick={() => void run({ action: "duplicate_module", moduleId: module.id }, "Module duplicated.")}><Copy className="size-4" /></Button>
                <Button variant="secondary" onClick={() => void run({ action: "delete_module", moduleId: module.id }, "Module deleted.")}><Trash2 className="size-4" /></Button>
              </div>
              <div className="divide-y divide-white/5">
                {module.sections.flatMap((section) => section.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={() => { setDragLessonId(lesson.id); setDragLessonSectionId(section.id); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragLessonId && dragLessonSectionId === section.id) void reorderLessons(section.id, dragLessonId, lesson.id);
                      setDragLessonId(null);
                      setDragLessonSectionId(null);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"
                  >
                    <GripVertical className="size-4 text-slate-600 cursor-grab shrink-0" />
                    <BookOpen className="size-4 text-emerald-400 shrink-0" />
                    <button type="button" className="flex-1 text-left" onClick={() => setSelectedLessonId(lesson.id)}>
                      <p className="text-sm font-medium text-white">{lesson.title}</p>
                      <p className="text-xs text-slate-500">{lesson.estimatedMinutes} min · {lesson.completionRequirement}</p>
                    </button>
                    <Button variant="secondary" onClick={() => setSelectedLessonId(lesson.id)}><Pencil className="size-4" /></Button>
                    <Button variant="secondary" onClick={() => void run({ action: "duplicate_lesson", lessonId: lesson.id }, "Lesson duplicated.")}><Copy className="size-4" /></Button>
                    <Button variant="secondary" onClick={() => void run({ action: "delete_lesson", lessonId: lesson.id }, "Lesson deleted.")}><Trash2 className="size-4" /></Button>
                  </div>
                )))}
              </div>
              <div className="border-t border-white/5 p-3">
                <Button variant="secondary" className="w-full" onClick={() => void run({
                  action: "create_lesson",
                  lesson: { moduleId: module.id, title: `New lesson in ${module.title}`, estimatedMinutes: 30 },
                }, "Lesson added.")}><Plus className="size-4 mr-2" /> Add Lesson</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === "Lesson Editor" && (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="max-h-[520px] overflow-y-auto rounded-xl border border-white/10 p-2">
            {allLessons.map((lesson) => (
              <button key={lesson.id} type="button" onClick={() => setSelectedLessonId(lesson.id)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${selectedLessonId === lesson.id ? "bg-emerald-500/20 text-emerald-100" : "text-slate-300 hover:bg-white/5"}`}>
                {lesson.title}
              </button>
            ))}
          </div>
          {selectedLesson ? (
            <div className="space-y-4 rounded-xl border border-white/10 p-4">
              <Field label="Title" value={lessonDraft.title ?? ""} onChange={(v) => setLessonDraft({ ...lessonDraft, title: v })} />
              <Field label="Summary" value={lessonDraft.summary ?? ""} onChange={(v) => setLessonDraft({ ...lessonDraft, summary: v })} />
              <label className="block text-sm text-slate-300">Reading material (HTML)
                <textarea value={lessonDraft.richText ?? ""} onChange={(e) => setLessonDraft({ ...lessonDraft, richText: e.target.value })} rows={8} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white" />
              </label>
              <label className="block text-sm text-slate-300">Transcript
                <textarea value={lessonDraft.transcript ?? ""} onChange={(e) => setLessonDraft({ ...lessonDraft, transcript: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-slate-300">Lesson notes
                <textarea value={lessonDraft.lessonNotes ?? ""} onChange={(e) => setLessonDraft({ ...lessonDraft, lessonNotes: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
              </label>
              <Field label="Discussion prompt" value={lessonDraft.discussionPrompt ?? ""} onChange={(v) => setLessonDraft({ ...lessonDraft, discussionPrompt: v })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Video URL" value={lessonDraft.videoUrl ?? ""} onChange={(v) => setLessonDraft({ ...lessonDraft, videoUrl: v })} />
                <Field label="PDF URL" value={lessonDraft.pdfUrl ?? ""} onChange={(v) => setLessonDraft({ ...lessonDraft, pdfUrl: v })} />
              </div>
              <Button disabled={busy} onClick={() => void run({ action: "update_lesson", lessonId: selectedLesson.id, lesson: lessonDraft }, "Lesson saved.")}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />} Save Lesson
              </Button>
            </div>
          ) : (
            <p className="text-slate-400">Select a lesson from the curriculum to edit content, transcript, notes and materials.</p>
          )}
        </div>
      )}

      {step === "Assessments" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <AssessmentCard title="Quizzes" items={tree.quizzes.map((q) => q.title)} onAdd={() => void run({ action: "create_quiz", quiz: { courseId, title: "New Quiz" } }, "Quiz created.")} />
            <AssessmentCard title="Assignments" items={tree.assignments.map((a) => a.title)} onAdd={() => void run({ action: "create_assignment", assignment: { courseId, title: "New Assignment", description: "Practical assignment", points: 100 } }, "Assignment created.")} />
            <AssessmentCard title="Final Exams" items={tree.exams.map((e) => e.title)} onAdd={() => void run({ action: "create_exam", exam: { courseId, title: "Final Exam", durationMinutes: 90, passingScore: 80 } }, "Exam created.")} />
          </div>
          <div className="rounded-xl border border-white/10 p-4 space-y-4">
            <h4 className="font-semibold text-white">Quiz Question Editor</h4>
            <label className="block text-sm text-slate-300">Select quiz
              <select value={selectedQuizId ?? ""} onChange={(e) => setSelectedQuizId(e.target.value || null)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white">
                <option value="">Choose a quiz...</option>
                {tree.quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
              </select>
            </label>
            <Field label="Question prompt" value={questionDraft.prompt} onChange={(v) => setQuestionDraft({ ...questionDraft, prompt: v })} />
            {questionDraft.answers.map((answer, index) => (
              <label key={index} className="flex items-center gap-2 text-sm text-slate-300">
                <input type="radio" name="correct" checked={questionDraft.correctIndex === index} onChange={() => setQuestionDraft({ ...questionDraft, correctIndex: index })} />
                <input value={answer} onChange={(e) => {
                  const answers = [...questionDraft.answers];
                  answers[index] = e.target.value;
                  setQuestionDraft({ ...questionDraft, answers });
                }} className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white" placeholder={`Answer ${index + 1}`} />
              </label>
            ))}
            <Field label="Explanation" value={questionDraft.explanation} onChange={(v) => setQuestionDraft({ ...questionDraft, explanation: v })} />
            <Button
              disabled={!selectedQuizId || !questionDraft.prompt.trim() || busy}
              onClick={() => void run({
                action: "create_question",
                question: {
                  quizId: selectedQuizId,
                  prompt: questionDraft.prompt,
                  answers: questionDraft.answers.filter(Boolean),
                  correctIndex: questionDraft.correctIndex,
                  explanation: questionDraft.explanation,
                },
              }, "Question added.").then(() => setQuestionDraft({ prompt: "", answers: ["", "", "", ""], correctIndex: 0, explanation: "" }))}
            >
              Add Question
            </Button>
          </div>
        </div>
      )}

      {step === "Publish" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <h3 className="text-lg font-bold text-white">Ready to publish?</h3>
          <ul className="mt-4 space-y-2 text-sm text-emerald-100">
            <li>✓ {tree.stats.moduleCount} modules configured</li>
            <li>✓ {tree.stats.lessonCount} lessons with content</li>
            <li>✓ {tree.stats.quizCount} quizzes · {tree.stats.assignmentCount} assignments · {tree.stats.examCount} exams</li>
          </ul>
          <div className="mt-6 flex gap-3">
            {tree.status === "PUBLISHED" ? (
              <Button variant="secondary" onClick={() => void run({ action: "unpublish_course", courseId }, "Course unpublished.")}>Unpublish</Button>
            ) : (
              <Button onClick={() => void run({ action: "publish_course", courseId }, "Course published.")}><CheckCircle2 className="size-4 mr-2" /> Publish Course</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm text-slate-300">{label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white" />
    </label>
  );
}

function AssessmentCard({ title, items, onAdd }: { title: string; items: string[]; onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-white">{title}</h4>
        <Button variant="secondary" onClick={onAdd}><Plus className="size-4" /></Button>
      </div>
      <ul className="space-y-2 text-sm text-slate-400">{items.map((item) => <li key={item}>• {item}</li>)}</ul>
    </div>
  );
}
