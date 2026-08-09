"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Eye,
  GripVertical,
  History,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  Upload,
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
  lessonResources?: Array<{ id: string; title: string; body: string; type: string; sortOrder: number }>;
};

type CourseTree = {
  id: string;
  title: string;
  subtitle?: string | null;
  description: string;
  shortDescription?: string | null;
  instructor?: string | null;
  learningOutcomes?: string[];
  targetAudience?: string | null;
  prerequisites?: string[];
  thumbnailUrl?: string | null;
  bannerUrl?: string | null;
  introVideoUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  status: string;
  slug: string;
  passingPercentage: number;
  certificateEnabled: boolean;
  expiresAfterDays?: number | null;
  accessDurationDays: number;
  retakeRules: {
    quizAttemptLimit: number;
    examAttemptLimit: number;
    assignmentSubmissionLimit: number;
    retakeCooldownHours: number;
    exhaustedAction: "LOCK_CERTIFICATE" | "REQUIRE_MODULE_RESTART" | "REQUIRE_COURSE_RESTART";
    allowAdminExtraAttempts: boolean;
  };
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
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [dragModuleId, setDragModuleId] = useState<string | null>(null);
  const [dragLessonId, setDragLessonId] = useState<string | null>(null);
  const [dragLessonSectionId, setDragLessonSectionId] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [lessonDraft, setLessonDraft] = useState<Partial<LessonNode>>({});
  const [lessonDepthDraft, setLessonDepthDraft] = useState(lessonDepthFromResources([]));
  const [moduleDraft, setModuleDraft] = useState<{ title: string; description: string; objectives: string; estimatedMinutes: string }>({ title: "", description: "", objectives: "", estimatedMinutes: "" });
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState({ prompt: "", answers: ["", "", "", ""], correctIndex: 0, explanation: "" });
  const [certificationDraft, setCertificationDraft] = useState({
    passingPercentage: 80,
    certificateEnabled: false,
    expiresAfterDays: "",
    accessDurationDays: 365,
    quizAttemptLimit: 3,
    examAttemptLimit: 2,
    assignmentSubmissionLimit: 3,
    retakeCooldownHours: 0,
    exhaustedAction: "LOCK_CERTIFICATE" as "LOCK_CERTIFICATE" | "REQUIRE_MODULE_RESTART" | "REQUIRE_COURSE_RESTART",
    allowAdminExtraAttempts: true,
  });
  const [undoStack, setUndoStack] = useState<Array<{ label: string; body: Record<string, unknown> }>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; createdAt: string }>>([]);

  const load = useCallback(async () => {
    const result = await apiFetch<CourseTree>(`/api/v1/admin/academy/courses/${courseId}`);
    if (result.data) setTree(result.data);
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!tree) return;
    setCertificationDraft({
      passingPercentage: clampPercentage(tree.passingPercentage),
      certificateEnabled: tree.certificateEnabled,
      expiresAfterDays: tree.expiresAfterDays == null ? "" : String(tree.expiresAfterDays),
      accessDurationDays: Math.max(0, Number(tree.accessDurationDays) || 365),
      quizAttemptLimit: Math.max(1, Number(tree.retakeRules?.quizAttemptLimit) || 3),
      examAttemptLimit: Math.max(1, Number(tree.retakeRules?.examAttemptLimit) || 2),
      assignmentSubmissionLimit: Math.max(1, Number(tree.retakeRules?.assignmentSubmissionLimit) || 3),
      retakeCooldownHours: Math.max(0, Number(tree.retakeRules?.retakeCooldownHours) || 0),
      exhaustedAction: tree.retakeRules?.exhaustedAction ?? "LOCK_CERTIFICATE",
      allowAdminExtraAttempts: tree.retakeRules?.allowAdminExtraAttempts !== false,
    });
  }, [tree]);

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
      setLessonDepthDraft(lessonDepthFromResources(selectedLesson.lessonResources ?? []));
      setStep("Lesson Editor");
    }
  }, [selectedLessonId, selectedLesson]);

  async function run(body: Record<string, unknown>, success: string, undo?: { label: string; body: Record<string, unknown> }) {
    setBusy(true);
    await action(body, success);
    if (undo) setUndoStack((stack) => [...stack.slice(-9), undo]);
    await load();
    await onRefresh();
    setBusy(false);
  }

  async function loadAuditLogs() {
    const result = await apiFetch<Array<{ id: string; action: string; createdAt: string }>>("/api/v1/admin/academy", {
      method: "PATCH",
      body: JSON.stringify({ action: "get_course_audit_log", courseId }),
    });
    if (Array.isArray(result.data)) setAuditLogs(result.data);
  }

  async function saveCertificationRules() {
    if (!tree) return;
    const expiresAfterDays = certificationDraft.expiresAfterDays.trim() ? Math.max(0, Number(certificationDraft.expiresAfterDays) || 0) : null;
    await run(
      {
        action: "update_course_certification_rules",
        courseId,
        rules: {
          passingPercentage: clampPercentage(certificationDraft.passingPercentage),
          certificateEnabled: certificationDraft.certificateEnabled,
          expiresAfterDays,
          accessDurationDays: Math.max(0, Number(certificationDraft.accessDurationDays) || 365),
          quizAttemptLimit: Math.max(1, Number(certificationDraft.quizAttemptLimit) || 3),
          examAttemptLimit: Math.max(1, Number(certificationDraft.examAttemptLimit) || 2),
          assignmentSubmissionLimit: Math.max(1, Number(certificationDraft.assignmentSubmissionLimit) || 3),
          retakeCooldownHours: Math.max(0, Number(certificationDraft.retakeCooldownHours) || 0),
          exhaustedAction: certificationDraft.exhaustedAction,
          allowAdminExtraAttempts: certificationDraft.allowAdminExtraAttempts,
        },
      },
      "Certification rules saved.",
    );
  }

  useEffect(() => {
    if (step === "Publish") void loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, courseId]);

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
    <div className="space-y-6 rounded-2xl border border-white/10 bg-slate-950/80 p-4 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-400">Course Builder</p>
          <h2 className="text-2xl font-bold text-white">{courseTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">{tree.stats.lessonCount} lessons · {tree.stats.moduleCount} modules · {tree.status.replace(/_/g, " ")}</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
          <Button className="w-full" variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" disabled={!undoStack.length || busy} onClick={() => {
            const last = undoStack[undoStack.length - 1];
            if (!last) return;
            setUndoStack((stack) => stack.slice(0, -1));
            void run(last.body, `Undid: ${last.label}`);
          }}><Undo2 className="size-4 mr-2" /> Undo</Button>
          <Button variant="secondary" onClick={() => window.open(`/dashboard/academy/${courseId}`, "_blank")}><Eye className="size-4 mr-2" /> Preview</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {STEPS.map((item) => (
          <Button key={item} className="w-full sm:w-auto" variant={step === item ? "primary" : "secondary"} onClick={() => setStep(item)}>{item}</Button>
        ))}
      </div>

      {step === "Overview" && (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-5">
            <AdminStatPill label="Modules" value={String(tree.stats.moduleCount)} />
            <AdminStatPill label="Lessons" value={String(tree.stats.lessonCount)} />
            <AdminStatPill label="Quizzes" value={String(tree.stats.quizCount)} />
            <AdminStatPill label="Assignments" value={String(tree.stats.assignmentCount)} />
            <AdminStatPill label="Exams" value={String(tree.stats.examCount)} />
          </div>
          <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
            <AdminStatusBadge status={tree.status} variant={tree.status === "PUBLISHED" ? "success" : "warning"} />
            <div className="mt-3 space-y-4">
              <Field label="Course Title" value={tree.title} onChange={(v) => void run({ action: "update_course", course: { courseId, title: v } }, "Title updated.")} />
              <Field label="Subtitle" value={tree.subtitle ?? ""} onChange={(v) => void run({ action: "update_course", course: { courseId, subtitle: v } }, "Subtitle updated.")} />
              <TextareaField label="Course Description" value={tree.description} rows={3} onChange={(v) => void run({ action: "update_course", course: { courseId, description: v } }, "Description updated.")} />
              <TextareaField label="Short Description" value={tree.shortDescription ?? ""} rows={2} onChange={(v) => void run({ action: "update_course", course: { courseId, shortDescription: v } }, "Short description updated.")} />
              <Field label="Instructor" value={tree.instructor ?? ""} onChange={(v) => void run({ action: "update_course", course: { courseId, instructor: v } }, "Instructor updated.")} />
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Marketing Content</p>
            <div className="mt-3 space-y-4">
              <TextareaField label="Learning Outcomes (one per line)" value={(tree.learningOutcomes ?? []).join("\n")} rows={4} onChange={(v) => void run({ action: "update_course", course: { courseId, learningOutcomes: v.split("\n").filter(Boolean) } }, "Learning outcomes updated.")} />
              <TextareaField label="Target Audience" value={tree.targetAudience ?? ""} rows={2} onChange={(v) => void run({ action: "update_course", course: { courseId, targetAudience: v } }, "Target audience updated.")} />
              <TextareaField label="Prerequisites (one per line)" value={(tree.prerequisites ?? []).join("\n")} rows={2} onChange={(v) => void run({ action: "update_course", course: { courseId, prerequisites: v.split("\n").filter(Boolean) } }, "Prerequisites updated.")} />
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Media Assets</p>
            <div className="mt-3 space-y-4">
              <Field label="Thumbnail URL" value={tree.thumbnailUrl ?? ""} onChange={(v) => void run({ action: "update_course", course: { courseId, thumbnailUrl: v } }, "Thumbnail URL updated.")} />
              <Field label="Banner URL" value={tree.bannerUrl ?? ""} onChange={(v) => void run({ action: "update_course", course: { courseId, bannerUrl: v } }, "Banner URL updated.")} />
              <Field label="Intro Video URL" value={tree.introVideoUrl ?? ""} onChange={(v) => void run({ action: "update_course", course: { courseId, introVideoUrl: v } }, "Intro video URL updated.")} />
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">SEO</p>
            <div className="mt-3 space-y-4">
              <Field label="SEO Title" value={tree.seoTitle ?? ""} onChange={(v) => void run({ action: "update_course", course: { courseId, seoTitle: v } }, "SEO title updated.")} />
              <TextareaField label="SEO Description" value={tree.seoDescription ?? ""} rows={2} onChange={(v) => void run({ action: "update_course", course: { courseId, seoDescription: v } }, "SEO description updated.")} />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Certification Rules</p>
                <h3 className="mt-2 text-lg font-bold text-white">Certificate eligibility for this course</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
                  Learners should complete all required lessons, pass required quizzes/exams/assignments, and meet this course pass threshold before a certificate is issued.
                </p>
              </div>
              <AdminStatusBadge status={certificationDraft.certificateEnabled ? "Auto certificate enabled" : "Certificate disabled"} variant={certificationDraft.certificateEnabled ? "success" : "muted"} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberField
                label="Overall Pass Required (%)"
                value={String(certificationDraft.passingPercentage)}
                min={0}
                max={100}
                onChange={(value) => setCertificationDraft((draft) => ({ ...draft, passingPercentage: clampPercentage(Number(value) || 0) }))}
              />
              <NumberField
                label="Learner Access Days"
                value={String(certificationDraft.accessDurationDays)}
                min={0}
                onChange={(value) => setCertificationDraft((draft) => ({ ...draft, accessDurationDays: Math.max(0, Number(value) || 0) }))}
              />
              <NumberField
                label="Certificate Valid Days"
                value={certificationDraft.expiresAfterDays}
                min={0}
                placeholder="No expiry"
                onChange={(value) => setCertificationDraft((draft) => ({ ...draft, expiresAfterDays: value }))}
              />
              <label className="flex min-h-20 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={certificationDraft.certificateEnabled}
                  onChange={(event) => setCertificationDraft((draft) => ({ ...draft, certificateEnabled: event.target.checked }))}
                  className="size-5 rounded border-white/10 bg-slate-950"
                />
                <span>
                  <span className="block font-semibold text-white">Auto-issue certificate</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">Issue only after all configured requirements are satisfied.</span>
                </span>
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberField
                label="Quiz Attempts"
                value={String(certificationDraft.quizAttemptLimit)}
                min={1}
                onChange={(value) => setCertificationDraft((draft) => ({ ...draft, quizAttemptLimit: Math.max(1, Number(value) || 1) }))}
              />
              <NumberField
                label="Exam Attempts"
                value={String(certificationDraft.examAttemptLimit)}
                min={1}
                onChange={(value) => setCertificationDraft((draft) => ({ ...draft, examAttemptLimit: Math.max(1, Number(value) || 1) }))}
              />
              <NumberField
                label="Assignment Submissions"
                value={String(certificationDraft.assignmentSubmissionLimit)}
                min={1}
                onChange={(value) => setCertificationDraft((draft) => ({ ...draft, assignmentSubmissionLimit: Math.max(1, Number(value) || 1) }))}
              />
              <NumberField
                label="Retake Cooldown Hours"
                value={String(certificationDraft.retakeCooldownHours)}
                min={0}
                onChange={(value) => setCertificationDraft((draft) => ({ ...draft, retakeCooldownHours: Math.max(0, Number(value) || 0) }))}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="block rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                <span className="mb-2 block font-semibold text-white">When Attempts Are Exhausted</span>
                <select
                  value={certificationDraft.exhaustedAction}
                  onChange={(event) => setCertificationDraft((draft) => ({ ...draft, exhaustedAction: event.target.value as typeof draft.exhaustedAction }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
                >
                  <option value="LOCK_CERTIFICATE">Lock certificate until admin review</option>
                  <option value="REQUIRE_MODULE_RESTART">Require module restart</option>
                  <option value="REQUIRE_COURSE_RESTART">Require full course restart</option>
                </select>
              </label>
              <label className="flex min-h-20 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={certificationDraft.allowAdminExtraAttempts}
                  onChange={(event) => setCertificationDraft((draft) => ({ ...draft, allowAdminExtraAttempts: event.target.checked }))}
                  className="size-5 rounded border-white/10 bg-slate-950"
                />
                <span>
                  <span className="block font-semibold text-white">Allow admin extra attempts</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">Admins can grant another attempt when a learner has exhausted their limit.</span>
                </span>
              </label>
            </div>
            <div className="mt-5 grid gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-xs leading-5 text-slate-400 sm:grid-cols-3">
              <p><span className="font-semibold text-slate-200">Lessons:</span> {tree.stats.lessonCount ? "100% completion required" : "No lessons configured"}</p>
              <p><span className="font-semibold text-slate-200">Assessments:</span> learners see attempts used, attempts remaining, and retake/resubmission status.</p>
              <p><span className="font-semibold text-slate-200">If learner fails:</span> progress stays; certification and locked gates wait for a passed attempt.</p>
            </div>
            <div className="mt-5 flex justify-end">
              <Button disabled={busy} onClick={() => void saveCertificationRules()}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                Save Certification Rules
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "Curriculum" && (
        <div className="space-y-4">
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="New module title" className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white" />
            <Button className="w-full sm:w-auto" disabled={!newModuleTitle.trim() || busy} onClick={() => void run({ action: "create_module", module: { courseId, title: newModuleTitle } }, "Module created.").then(() => setNewModuleTitle(""))}>
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
              <div className="grid gap-3 border-b border-white/5 px-4 py-3 sm:flex sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <GripVertical className="size-4 shrink-0 cursor-grab text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-white">{module.title}</p>
                    <p className="text-xs text-slate-500">{module.sections.reduce((n, s) => n + s.lessons.length, 0)} lessons</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
                  <Button className="w-full sm:w-auto" variant="secondary" onClick={() => {
                    const mod = tree.modules.find(m => m.id === module.id);
                    if (mod) {
                      setModuleDraft({
                        title: mod.title,
                        description: mod.description ?? "",
                        objectives: (mod.objectives ?? []).join("\n"),
                        estimatedMinutes: String(mod.estimatedMinutes ?? "")
                      });
                      setSelectedModuleId(module.id);
                    }
                  }}><Pencil className="size-4" /></Button>
                  <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void run({ action: "duplicate_module", moduleId: module.id }, "Module duplicated.")}><Copy className="size-4" /></Button>
                  <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void run({ action: "delete_module", moduleId: module.id }, "Module deleted.")}><Trash2 className="size-4" /></Button>
                </div>
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
                    className="flex flex-col items-stretch gap-3 px-4 py-3 hover:bg-white/5 sm:flex-row sm:items-center"
                  >
                    <GripVertical className="size-4 text-slate-600 cursor-grab shrink-0" />
                    <BookOpen className="size-4 text-emerald-400 shrink-0" />
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedLessonId(lesson.id)}>
                      <p className="text-sm font-medium text-white">{lesson.title}</p>
                      <p className="text-xs text-slate-500">{lesson.estimatedMinutes} min · {lesson.completionRequirement}</p>
                    </button>
                    <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setSelectedLessonId(lesson.id)}><Pencil className="size-4" /></Button>
                    <select
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white sm:max-w-[140px]"
                      defaultValue=""
                      onChange={(e) => {
                        const sectionId = e.target.value;
                        if (!sectionId || sectionId === section.id) return;
                        void run(
                          { action: "update_lesson", lessonId: lesson.id, lesson: { sectionId } },
                          "Lesson moved to another module.",
                          { label: "move lesson", body: { action: "update_lesson", lessonId: lesson.id, lesson: { sectionId: section.id } } },
                        );
                        e.target.value = "";
                      }}
                    >
                      <option value="">Move to…</option>
                      {tree.modules.flatMap((m) => m.sections.map((s) => (
                        <option key={s.id} value={s.id}>{m.title.slice(0, 24)}</option>
                      )))}
                    </select>
                    <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void run({ action: "duplicate_lesson", lessonId: lesson.id }, "Lesson duplicated.")}><Copy className="size-4" /></Button>
                    <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void run({ action: "delete_lesson", lessonId: lesson.id }, "Lesson deleted.")}><Trash2 className="size-4" /></Button>
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
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold text-white">Premium lesson depth</p>
                <p className="mt-1 text-xs text-slate-400">Make scenario, practice, outcome, standards, and mistakes unique for this lesson. Empty fields keep learner-facing fallbacks.</p>
                <div className="mt-4 grid gap-3">
                  <TextareaField label="Professional outcome" value={lessonDepthDraft.outcome} onChange={(outcome) => setLessonDepthDraft({ ...lessonDepthDraft, outcome })} rows={3} />
                  <TextareaField label="HouseLink field standard (one point per line)" value={lessonDepthDraft.standard} onChange={(standard) => setLessonDepthDraft({ ...lessonDepthDraft, standard })} rows={4} />
                  <TextareaField label="Common mistakes to avoid (one point per line)" value={lessonDepthDraft.mistakes} onChange={(mistakes) => setLessonDepthDraft({ ...lessonDepthDraft, mistakes })} rows={4} />
                  <TextareaField label="Zimbabwe field scenario" value={lessonDepthDraft.scenario} onChange={(scenario) => setLessonDepthDraft({ ...lessonDepthDraft, scenario })} rows={4} />
                  <TextareaField label="Practice before you move on" value={lessonDepthDraft.practice} onChange={(practice) => setLessonDepthDraft({ ...lessonDepthDraft, practice })} rows={4} />
                </div>
              </div>
              <label className="block text-sm text-slate-300">Transcript
                <textarea value={lessonDraft.transcript ?? ""} onChange={(e) => setLessonDraft({ ...lessonDraft, transcript: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-slate-300">Lesson notes
                <textarea value={lessonDraft.lessonNotes ?? ""} onChange={(e) => setLessonDraft({ ...lessonDraft, lessonNotes: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
              </label>
              <Field label="Discussion prompt" value={lessonDraft.discussionPrompt ?? ""} onChange={(v) => setLessonDraft({ ...lessonDraft, discussionPrompt: v })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <CourseMediaField label="Video" value={lessonDraft.videoUrl ?? ""} accept="video/*" kind="video" onChange={(v) => setLessonDraft({ ...lessonDraft, videoUrl: v })} />
                <CourseMediaField label="PDF" value={lessonDraft.pdfUrl ?? ""} accept=".pdf,application/pdf" kind="document" onChange={(v) => setLessonDraft({ ...lessonDraft, pdfUrl: v })} />
              </div>
              <Button disabled={busy} onClick={() => void run({ action: "update_lesson", lessonId: selectedLesson.id, lesson: { ...lessonDraft, lessonDepth: lessonDepthDraft } }, "Lesson saved.")}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />} Save Lesson
              </Button>
            </div>
          ) : (
            <p className="text-slate-400">Select a lesson from the curriculum to edit content, transcript, notes and materials.</p>
          )}
          
          {selectedModuleId && (
            <div className="mt-6 space-y-4 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Edit Module</h3>
                <Button variant="secondary" onClick={() => setSelectedModuleId(null)}>Close</Button>
              </div>
              <Field label="Module Title" value={moduleDraft.title} onChange={(v) => setModuleDraft({ ...moduleDraft, title: v })} />
              <TextareaField label="Module Description" value={moduleDraft.description} rows={3} onChange={(v) => setModuleDraft({ ...moduleDraft, description: v })} />
              <TextareaField label="Module Objectives (one per line)" value={moduleDraft.objectives} rows={4} onChange={(v) => setModuleDraft({ ...moduleDraft, objectives: v })} />
              <NumberField label="Estimated Minutes" value={moduleDraft.estimatedMinutes} min={0} onChange={(v) => setModuleDraft({ ...moduleDraft, estimatedMinutes: v })} />
              <Button disabled={busy} onClick={() => void run({ action: "update_module", moduleId: selectedModuleId, module: { 
                title: moduleDraft.title,
                description: moduleDraft.description,
                objectives: moduleDraft.objectives.split("\n").filter(Boolean),
                estimatedMinutes: Number(moduleDraft.estimatedMinutes) || 0
              } }, "Module updated.").then(() => setSelectedModuleId(null))}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />} Save Module
              </Button>
            </div>
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
        <div className="grid gap-6 lg:grid-cols-2">
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
          <div className="rounded-xl border border-white/10 p-4">
            <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><History className="size-4" /> Version history</h4>
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm text-slate-400">
              {auditLogs.map((log) => (
                <li key={log.id} className="rounded-lg bg-slate-900/60 px-3 py-2">
                  <p className="text-white">{log.action.replace("academy.", "").replace(/\./g, " ")}</p>
                  <p className="text-xs">{new Date(log.createdAt).toLocaleString()}</p>
                </li>
              ))}
              {!auditLogs.length && <li className="text-slate-500">No audit entries yet. Changes will appear here.</li>}
            </ul>
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

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
      <span className="mb-2 block font-semibold text-white">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-600"
      />
    </label>
  );
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function CourseMediaField({ label, value, accept, kind, onChange }: { label: string; value: string; accept: string; kind: "video" | "document"; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await readCourseWorkspaceFile(file);
      const result = await apiFetch<{ url: string }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl, kind, folder: "academy/course-workspace" }),
      });
      if (!result.data?.url) {
        setError(result.error?.message ?? `${label} upload failed.`);
        return;
      }
      onChange(result.data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : `${label} upload failed.`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="block min-w-0 text-sm text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{label}</span>
        <Button type="button" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => void upload(event.currentTarget.files)} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste a hosted URL or upload a file"
        className="mt-1 w-full min-w-0 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
      />
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

function TextareaField({ label, value, rows, onChange }: { label: string; value: string; rows: number; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm text-slate-300">{label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
    </label>
  );
}

function readCourseWorkspaceFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

const lessonDepthResourceTitles = {
  outcome: "Professional outcome",
  standard: "HouseLink field standard",
  mistakes: "Common mistakes to avoid",
  scenario: "Zimbabwe field scenario",
  practice: "Practice before you move on",
} as const;

function lessonDepthFromResources(resources: Array<{ title: string; body: string; type: string }>) {
  const map = new Map(resources.filter((resource) => resource.type === "LESSON_DEPTH").map((resource) => [resource.title, resource.body]));
  return {
    outcome: map.get(lessonDepthResourceTitles.outcome) ?? "",
    standard: map.get(lessonDepthResourceTitles.standard) ?? "",
    mistakes: map.get(lessonDepthResourceTitles.mistakes) ?? "",
    scenario: map.get(lessonDepthResourceTitles.scenario) ?? "",
    practice: map.get(lessonDepthResourceTitles.practice) ?? "",
  };
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
