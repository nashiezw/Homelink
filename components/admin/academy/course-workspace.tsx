"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  ClipboardCheck,
  Eye,
  FileText,
  GripVertical,
  History,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Target,
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
  quizzes: Array<{ id: string; title: string; description?: string | null; passingPercentage: number; moduleId?: string | null; lessonId?: string | null; questionCount?: number }>;
  assignments: Array<{ id: string; title: string; description: string; points: number; moduleId?: string | null; lessonId?: string | null }>;
  exams: Array<{ id: string; title: string; durationMinutes: number; passingScore: number }>;
  learners: Array<{ id: string; name: string; email: string; progress: number; status: string }>;
  stats: { moduleCount: number; lessonCount: number; quizCount: number; assignmentCount: number; examCount: number };
};

const STEPS = ["Overview", "Curriculum", "Lesson Editor", "Assessments", "Publish"] as const;
type Step = (typeof STEPS)[number];

const STEP_DETAILS: Record<Step, { icon: typeof Target; title: string; description: string }> = {
  Overview: { icon: Target, title: "Course setup", description: "Name, promise, media, SEO, pass mark, and retake rules." },
  Curriculum: { icon: Layers3, title: "Structure", description: "Arrange modules and lessons in the learner journey." },
  "Lesson Editor": { icon: FileText, title: "Lesson content", description: "Write content, upload media, and add practice depth." },
  Assessments: { icon: ClipboardCheck, title: "Assessment gates", description: "Build quizzes, assignments, and final exams." },
  Publish: { icon: Rocket, title: "Launch check", description: "Review readiness, preview, publish, and inspect history." },
};

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
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>("");
  const [overrideQuizId, setOverrideQuizId] = useState<string>("");
  const [overrideAssignmentId, setOverrideAssignmentId] = useState<string>("");
  const [overrideLessonId, setOverrideLessonId] = useState<string>("");
  const [overrideModuleId, setOverrideModuleId] = useState<string>("");
  const [quizDraft, setQuizDraft] = useState({ title: "", description: "", passingPercentage: "80", moduleId: "", lessonId: "" });
  const [assignmentDraft, setAssignmentDraft] = useState({ title: "", description: "", points: "100", moduleId: "", lessonId: "" });
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

  useEffect(() => {
    if (!tree?.learners.length) {
      setSelectedLearnerId("");
      return;
    }
    setSelectedLearnerId((current) => current && tree.learners.some((learner) => learner.id === current) ? current : tree.learners[0].id);
  }, [tree]);

  const allLessons = useMemo(
    () => tree?.modules.flatMap((m) => m.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, moduleId: m.id, sectionId: s.id, moduleTitle: m.title })))) ?? [],
    [tree],
  );
  const moduleOptions = useMemo(() => tree?.modules.map((module) => ({ id: module.id, title: module.title })) ?? [], [tree]);
  const lessonOptions = useMemo(
    () => allLessons.filter((lesson) => !quizDraft.moduleId || lesson.moduleId === quizDraft.moduleId),
    [allLessons, quizDraft.moduleId],
  );
  const assignmentLessonOptions = useMemo(
    () => allLessons.filter((lesson) => !assignmentDraft.moduleId || lesson.moduleId === assignmentDraft.moduleId),
    [allLessons, assignmentDraft.moduleId],
  );
  const selectedLesson = allLessons.find((l) => l.id === selectedLessonId);
  const readinessItems = useMemo(() => {
    if (!tree) return [];
    const lessons = tree.modules.flatMap((module) => module.sections.flatMap((section) => section.lessons));
    const gatedLessons = lessons.filter((lesson) => lesson.completionRequirement === "COMPLETE_QUIZ" || lesson.completionRequirement === "SUBMIT_ASSIGNMENT");
    const linkedLessonGateIds = new Set([
      ...tree.quizzes.filter((quiz) => quiz.lessonId).map((quiz) => `COMPLETE_QUIZ:${quiz.lessonId}`),
      ...tree.assignments.filter((assignment) => assignment.lessonId).map((assignment) => `SUBMIT_ASSIGNMENT:${assignment.lessonId}`),
    ]);
    return [
      { label: "Course identity", detail: "Title and description are present.", complete: Boolean(tree.title.trim() && tree.description.trim()) },
      { label: "Learner promise", detail: "Learning outcomes or short description explain the value.", complete: Boolean((tree.learningOutcomes ?? []).length || tree.shortDescription?.trim()) },
      { label: "Curriculum", detail: "At least one module and lesson are configured.", complete: tree.stats.moduleCount > 0 && tree.stats.lessonCount > 0 },
      { label: "All lessons have content", detail: "Every lesson has readable body content.", complete: lessons.length > 0 && lessons.every((lesson) => stripHtml(lesson.richText).length >= 40) },
      { label: "Required lesson gates are linked", detail: "Lessons requiring a quiz/assignment have a matching linked checkpoint.", complete: gatedLessons.every((lesson) => linkedLessonGateIds.has(`${lesson.completionRequirement}:${lesson.id}`)) },
      { label: "All quizzes have questions", detail: "Every quiz has at least one question.", complete: tree.quizzes.every((quiz) => (quiz.questionCount ?? 0) > 0) },
      { label: "Assignments have instructions", detail: "Every assignment has clear evidence instructions.", complete: tree.assignments.every((assignment) => stripHtml(assignment.description).length >= 30) },
      { label: "Certificate rules configured", detail: "Certificate and pass rules are clear.", complete: !tree.certificateEnabled || tree.passingPercentage > 0 },
    ];
  }, [tree]);
  const readinessComplete = readinessItems.filter((item) => item.complete).length;

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

  useEffect(() => {
    if (!tree) return;
    const quiz = tree.quizzes.find((entry) => entry.id === selectedQuizId);
    if (!quiz) {
      setQuizDraft({ title: "", description: "", passingPercentage: "80", moduleId: "", lessonId: "" });
      return;
    }
    setQuizDraft({
      title: quiz.title,
      description: quiz.description ?? "",
      passingPercentage: String(quiz.passingPercentage ?? 80),
      moduleId: quiz.moduleId ?? "",
      lessonId: quiz.lessonId ?? "",
    });
  }, [selectedQuizId, tree]);

  useEffect(() => {
    if (!tree) return;
    const assignment = tree.assignments.find((entry) => entry.id === selectedAssignmentId);
    if (!assignment) {
      setAssignmentDraft({ title: "", description: "", points: "100", moduleId: "", lessonId: "" });
      return;
    }
    setAssignmentDraft({
      title: assignment.title,
      description: assignment.description ?? "",
      points: String(assignment.points ?? 100),
      moduleId: assignment.moduleId ?? "",
      lessonId: assignment.lessonId ?? "",
    });
  }, [selectedAssignmentId, tree]);

  const run = useCallback(async (body: Record<string, unknown>, success: string, undo?: { label: string; body: Record<string, unknown> }) => {
    setBusy(true);
    try {
      await action(body, success);
      if (undo) setUndoStack((stack) => [...stack.slice(-9), undo]);
      await load();
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }, [action, load, onRefresh]);

  // Simple debounced save for field updates to prevent typing issues
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedRun = useCallback((body: Record<string, unknown>, success: string) => {
    // Overview inputs are controlled by `tree`.  Keep that local copy in sync
    // immediately, otherwise React restores the old server value after every
    // keystroke while the debounced request is waiting to run.
    const courseUpdate = body.action === "update_course" && body.course && typeof body.course === "object"
      ? body.course as Partial<CourseTree> & { courseId?: string }
      : null;
    if (courseUpdate) {
      const { courseId: _courseId, ...safeCourseUpdate } = courseUpdate;
      setTree((current) => current ? { ...current, ...safeCourseUpdate } : current);
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      void run(body, success);
    }, 1000);
  }, [run]);

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
    <div className="admin-mobile-safe space-y-5 rounded-2xl border border-white/10 bg-slate-950/80 p-3 sm:p-6">
      <div className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-4 sm:p-5">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-400">Course Builder</p>
          <h2 className="text-2xl font-bold text-white">{courseTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">{tree.stats.lessonCount} lessons - {tree.stats.moduleCount} modules - {tree.status.replace(/_/g, " ")}</p>
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
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {readinessItems.map((item) => (
          <div key={item.label} className={`rounded-xl border p-3 ${item.complete ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-amber-400/20 bg-amber-400/10 text-amber-100"}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`size-4 shrink-0 ${item.complete ? "text-emerald-300" : "text-amber-300"}`} />
              <p className="min-w-0 break-words text-xs font-bold uppercase tracking-wide">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">{readinessComplete}/{readinessItems.length} launch checks complete. Use the steps below from left to right for a clean build flow.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {STEPS.map((item, index) => {
          const meta = STEP_DETAILS[item];
          const Icon = meta.icon;
          const active = step === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setStep(item)}
              className={`min-w-0 rounded-2xl border p-4 text-left transition ${active ? "border-emerald-400/40 bg-emerald-400/15" : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900"}`}
            >
              <div className="flex items-start gap-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-emerald-400 text-slate-950" : "bg-white/5 text-slate-300"}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Step {index + 1}</span>
                  <span className="mt-1 block break-words font-bold text-white">{meta.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{meta.description}</span>
                </span>
              </div>
            </button>
          );
        })}
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
              <Field label="Course Title" value={tree.title} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { title: v } }, "Title updated.")} />
              <Field label="Subtitle" value={tree.subtitle ?? ""} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { subtitle: v } }, "Subtitle updated.")} />
              <TextareaField label="Course Description" value={tree.description} rows={3} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { description: v } }, "Description updated.")} />
              <TextareaField label="Short Description" value={tree.shortDescription ?? ""} rows={2} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { shortDescription: v } }, "Short description updated.")} />
              <Field label="Instructor" value={tree.instructor ?? ""} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { instructor: v } }, "Instructor updated.")} />
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Marketing Content</p>
            <div className="mt-3 space-y-4">
              <TextareaField label="Learning Outcomes (one per line)" value={(tree.learningOutcomes ?? []).join("\n")} rows={4} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { learningOutcomes: v.split("\n").filter(Boolean) } }, "Learning outcomes updated.")} />
              <TextareaField label="Target Audience" value={tree.targetAudience ?? ""} rows={2} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { targetAudience: v } }, "Target audience updated.")} />
              <TextareaField label="Prerequisites (one per line)" value={(tree.prerequisites ?? []).join("\n")} rows={2} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { prerequisites: v.split("\n").filter(Boolean) } }, "Prerequisites updated.")} />
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Media Assets</p>
            <div className="mt-3 space-y-4">
              <CourseMediaField label="Thumbnail" value={tree.thumbnailUrl ?? ""} accept="image/*" kind="image" onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { thumbnailUrl: v } }, "Thumbnail updated.")} courseId={courseId} />
              <CourseMediaField label="Banner" value={tree.bannerUrl ?? ""} accept="image/*" kind="image" onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { bannerUrl: v } }, "Banner updated.")} courseId={courseId} />
              <CourseMediaField label="Intro Video" value={tree.introVideoUrl ?? ""} accept="video/*" kind="video" onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { introVideoUrl: v } }, "Intro video updated.")} courseId={courseId} />
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">SEO</p>
            <div className="mt-3 space-y-4">
              <Field label="SEO Title" value={tree.seoTitle ?? ""} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { seoTitle: v } }, "SEO title updated.")} />
              <TextareaField label="SEO Description" value={tree.seoDescription ?? ""} rows={2} onChange={(v) => void debouncedRun({ action: "update_course", courseId, course: { seoDescription: v } }, "SEO description updated.")} />
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
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">Curriculum flow</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Build the learner sequence and see every quiz, assignment, and module checkpoint exactly where it blocks progress.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CurriculumMetric label="Modules" value={tree.stats.moduleCount} />
                  <CurriculumMetric label="Lessons" value={tree.stats.lessonCount} />
                  <CurriculumMetric label="Quizzes" value={tree.stats.quizCount} />
                  <CurriculumMetric label="Assignments" value={tree.stats.assignmentCount} />
                </div>
              </div>
              <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap">
                <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="New module title" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-600 sm:min-w-[220px]" />
                <Button className="w-full sm:w-auto" disabled={!newModuleTitle.trim() || busy} onClick={() => void run({ action: "create_module", module: { courseId, title: newModuleTitle } }, "Module created.").then(() => setNewModuleTitle(""))}>
                  <Plus className="size-4 mr-2" /> Add Module
                </Button>
              </div>
            </div>
          </div>
          {selectedModuleId ? (
            <div className="space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Edit Module</p>
                  <h3 className="mt-1 break-words text-lg font-bold text-white">{moduleDraft.title || "Untitled module"}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">Update the module name, learner-facing overview, objectives, and expected duration.</p>
                </div>
                <Button variant="secondary" onClick={() => setSelectedModuleId(null)}>Close</Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Module Title" value={moduleDraft.title} onChange={(v) => setModuleDraft({ ...moduleDraft, title: v })} />
                <NumberField label="Estimated Minutes" value={moduleDraft.estimatedMinutes} min={0} onChange={(v) => setModuleDraft({ ...moduleDraft, estimatedMinutes: v })} />
              </div>
              <TextareaField label="Module Description" value={moduleDraft.description} rows={3} onChange={(v) => setModuleDraft({ ...moduleDraft, description: v })} />
              <TextareaField label="Module Objectives (one per line)" value={moduleDraft.objectives} rows={4} onChange={(v) => setModuleDraft({ ...moduleDraft, objectives: v })} />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setSelectedModuleId(null)}>Cancel</Button>
                <Button disabled={busy || !moduleDraft.title.trim()} onClick={() => void run({ action: "update_module", moduleId: selectedModuleId, module: {
                  title: moduleDraft.title.trim(),
                  description: moduleDraft.description.trim(),
                  objectives: moduleDraft.objectives.split("\n").map((item) => item.trim()).filter(Boolean),
                  estimatedMinutes: Number(moduleDraft.estimatedMinutes) || 0,
                } }, "Module updated.").then(() => setSelectedModuleId(null))}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />} Save Module
                </Button>
              </div>
            </div>
          ) : null}
          {tree.modules.map((module) => {
            const moduleLessons = module.sections.flatMap((section) => section.lessons);
            const moduleQuizzes = tree.quizzes.filter((quiz) => quiz.moduleId === module.id && !quiz.lessonId);
            const moduleAssignments = tree.assignments.filter((assignment) => assignment.moduleId === module.id && !assignment.lessonId);
            const lessonGateCount = moduleLessons.reduce((total, lesson) => (
              total
              + tree.quizzes.filter((quiz) => quiz.lessonId === lesson.id).length
              + tree.assignments.filter((assignment) => assignment.lessonId === lesson.id).length
            ), 0);
            const missingContentCount = moduleLessons.filter((lesson) => stripHtml(lesson.richText).length < 40).length;
            return (
            <div
              key={module.id}
              draggable
              onDragStart={() => setDragModuleId(module.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragModuleId) void reorderModules(dragModuleId, module.id); setDragModuleId(null); }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60"
            >
              <div className="grid gap-3 border-b border-white/5 px-4 py-3 sm:flex sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <GripVertical className="size-4 shrink-0 cursor-grab text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-white">{module.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <CurriculumMetric label="Lessons" value={moduleLessons.length} compact />
                      <CurriculumMetric label="Lesson gates" value={lessonGateCount} compact />
                      <CurriculumMetric label="Module gates" value={moduleQuizzes.length + moduleAssignments.length} compact />
                      {missingContentCount ? <CurriculumMetric label="Need content" value={missingContentCount} compact tone="warning" /> : null}
                    </div>
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
                {module.sections.flatMap((section) => section.lessons.map((lesson) => {
                  const lessonQuizzes = tree.quizzes.filter((quiz) => quiz.lessonId === lesson.id);
                  const lessonAssignments = tree.assignments.filter((assignment) => assignment.lessonId === lesson.id);
                  const needsLinkedQuiz = lesson.completionRequirement === "COMPLETE_QUIZ" && !lessonQuizzes.length;
                  const needsLinkedAssignment = lesson.completionRequirement === "SUBMIT_ASSIGNMENT" && !lessonAssignments.length;
                  return (
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
                    className="grid gap-3 px-4 py-3 hover:bg-white/5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="size-4 shrink-0 cursor-grab text-slate-600" />
                      <BookOpen className="size-4 shrink-0 text-emerald-400" />
                    </div>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedLessonId(lesson.id)}>
                      <p className="text-sm font-medium text-white">{lesson.title}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {lessonQuizzes.map((quiz) => <GateChip key={quiz.id} kind="quiz" title={quiz.title} detail={`${quiz.passingPercentage}% pass - ${quiz.questionCount ?? 0} questions`} />)}
                        {lessonAssignments.map((assignment) => <GateChip key={assignment.id} kind="assignment" title={assignment.title} detail={`${assignment.points} pts`} />)}
                        {needsLinkedQuiz ? <GateChip kind="warning" title="Missing quiz gate" detail="Lesson requires a quiz but none is linked" /> : null}
                        {needsLinkedAssignment ? <GateChip kind="warning" title="Missing assignment gate" detail="Lesson requires an assignment but none is linked" /> : null}
                        {!lessonQuizzes.length && !lessonAssignments.length && lesson.completionRequirement === "VIEW" ? <GateChip kind="open" title="Open lesson" detail="No checkpoint required" /> : null}
                      </div>
                      <p className="text-xs text-slate-500">{lesson.estimatedMinutes} min - {lesson.completionRequirement}</p>
                    </button>
                    <div className="grid gap-2 sm:flex lg:justify-end">
                      <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setSelectedLessonId(lesson.id)}><Pencil className="size-4" /></Button>
                      <select
                        className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white sm:max-w-[150px]"
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
                        <option value="">Move to...</option>
                        {tree.modules.flatMap((m) => m.sections.map((s) => (
                          <option key={s.id} value={s.id}>{m.title.slice(0, 24)}</option>
                        )))}
                      </select>
                      <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void run({ action: "duplicate_lesson", lessonId: lesson.id }, "Lesson duplicated.")}><Copy className="size-4" /></Button>
                      <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void run({ action: "delete_lesson", lessonId: lesson.id }, "Lesson deleted.")}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                );}))}
              </div>
              {(moduleQuizzes.length || moduleAssignments.length) ? (
                <div className="border-t border-amber-400/15 bg-amber-400/[0.06] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">Before learner enters the next module</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {moduleQuizzes.map((quiz) => <GateChip key={quiz.id} kind="quiz" title={quiz.title} detail={`Module quiz - ${quiz.passingPercentage}% pass`} />)}
                    {moduleAssignments.map((assignment) => <GateChip key={assignment.id} kind="assignment" title={assignment.title} detail={`Module assignment - ${assignment.points} pts`} />)}
                  </div>
                </div>
              ) : null}
              <div className="border-t border-white/5 p-3">
                <Button variant="secondary" className="w-full" onClick={() => void run({
                  action: "create_lesson",
                  lesson: { moduleId: module.id, title: `New lesson in ${module.title}`, estimatedMinutes: 30 },
                }, "Lesson added.")}><Plus className="size-4 mr-2" /> Add Lesson</Button>
              </div>
            </div>
          );})}
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
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                <p className="text-sm font-semibold text-white">Lesson Learning Objectives</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">These are the checklist items shown to learners under “Learning objectives” inside this specific lesson. Enter one objective per line.</p>
                <TextareaField
                  label="Objectives shown on learner lesson page"
                  value={(lessonDraft.objectives ?? []).join("\n")}
                  rows={4}
                  onChange={(value) => setLessonDraft({ ...lessonDraft, objectives: value.split("\n").map((item) => item.trim()).filter(Boolean) })}
                />
              </div>
              <label className="block text-sm text-slate-300">Reading material (HTML)
                <textarea value={lessonDraft.richText ?? ""} onChange={(e) => setLessonDraft({ ...lessonDraft, richText: e.target.value })} rows={8} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white" />
              </label>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold text-white">Premium lesson depth</p>
                <p className="mt-1 text-xs text-slate-400">Make scenario, practice, outcome, standards, and mistakes unique for this lesson. Empty fields keep learner-facing fallbacks.</p>
                <div className="mt-4 grid gap-3">
                  <TextareaField label="Professional outcome" value={lessonDepthDraft.outcome} onChange={(outcome) => setLessonDepthDraft({ ...lessonDepthDraft, outcome })} rows={3} />
                  <TextareaField label="Field Practice Standard (one point per line)" value={lessonDepthDraft.standard} onChange={(standard) => setLessonDepthDraft({ ...lessonDepthDraft, standard })} rows={4} />
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
              <label className="block rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">Completion gate
                <select
                  value={lessonDraft.completionRequirement ?? "VIEW"}
                  onChange={(event) => setLessonDraft({ ...lessonDraft, completionRequirement: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
                >
                  <option value="VIEW">View lesson content only</option>
                  <option value="COMPLETE_QUIZ">Pass lesson-linked quiz before marking complete</option>
                  <option value="SUBMIT_ASSIGNMENT">Submit approved lesson-linked assignment before marking complete</option>
                </select>
                <span className="mt-2 block text-xs leading-5 text-slate-500">Use this only when a quiz or assignment is linked directly to this lesson in the Assessment Gates step.</span>
              </label>
              <Button disabled={busy} onClick={() => void run({ action: "update_lesson", lessonId: selectedLesson.id, lesson: { ...lessonDraft, lessonDepth: lessonDepthDraft } }, "Lesson saved.")}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />} Save Lesson
              </Button>
            </div>
          ) : (
            <p className="text-slate-400">Select a lesson from the curriculum to edit content, transcript, notes and materials.</p>
          )}
        </div>
      )}

      {step === "Assessments" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm font-bold text-emerald-100">Recommended flow</p>
            <p className="mt-1 text-sm leading-6 text-emerald-50/80">
              Use lesson checkpoints for short knowledge checks and module checkpoints for practical evidence. A module-level quiz or assignment unlocks the next module after it is passed or approved. A lesson-level checkpoint unlocks the next lesson after it is passed or approved.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold text-white">Quiz checkpoints</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Attach each quiz to a module or exact lesson so progression gates know when to stop the learner.</p>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => void run({ action: "create_quiz", quiz: { courseId, title: "New checkpoint quiz", moduleId: moduleOptions[0]?.id ?? null, passingPercentage: 80 } }, "Quiz checkpoint created.")}
                >
                  <Plus className="mr-2 size-4" /> Add Quiz
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {tree.quizzes.map((quiz) => (
                    <button
                      key={quiz.id}
                      type="button"
                      onClick={() => setSelectedQuizId(quiz.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${selectedQuizId === quiz.id ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-50" : "border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/5"}`}
                    >
                      <span className="block font-semibold">{quiz.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">{checkpointLabel(quiz, tree)}</span>
                    </button>
                  ))}
                  {!tree.quizzes.length && <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">No quizzes yet.</p>}
                </div>
                <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  {selectedQuizId ? (
                    <>
                      <Field label="Quiz title" value={quizDraft.title} onChange={(title) => setQuizDraft({ ...quizDraft, title })} />
                      <TextareaField label="Description" value={quizDraft.description} rows={3} onChange={(description) => setQuizDraft({ ...quizDraft, description })} />
                      <NumberField label="Passing Percentage" value={quizDraft.passingPercentage} min={0} max={100} onChange={(passingPercentage) => setQuizDraft({ ...quizDraft, passingPercentage })} />
                      <CheckpointPlacementFields
                        moduleId={quizDraft.moduleId}
                        lessonId={quizDraft.lessonId}
                        modules={moduleOptions}
                        lessons={lessonOptions}
                        onModuleChange={(moduleId) => setQuizDraft({ ...quizDraft, moduleId, lessonId: "" })}
                        onLessonChange={(lessonId) => setQuizDraft({ ...quizDraft, lessonId })}
                      />
                      <div className="flex justify-end">
                        <Button
                          disabled={busy || !quizDraft.title.trim()}
                          onClick={() => void run({
                            action: "update_quiz",
                            quizId: selectedQuizId,
                            quiz: {
                              courseId,
                              title: quizDraft.title,
                              description: quizDraft.description,
                              passingPercentage: clampPercentage(Number(quizDraft.passingPercentage) || 80),
                              moduleId: quizDraft.lessonId ? allLessons.find((lesson) => lesson.id === quizDraft.lessonId)?.moduleId ?? quizDraft.moduleId : quizDraft.moduleId || null,
                              lessonId: quizDraft.lessonId || null,
                              active: true,
                            },
                          }, "Quiz checkpoint saved.")}
                        >
                          Save Quiz Gate
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Select a quiz to edit its wording and gate placement.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold text-white">Assignment checkpoints</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Assignments require admin approval before the learner can pass that practical gate.</p>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => void run({ action: "create_assignment", assignment: { courseId, title: "New practical assignment", description: "Describe the evidence learners must submit.", moduleId: moduleOptions[0]?.id ?? null, points: 100 } }, "Assignment checkpoint created.")}
                >
                  <Plus className="mr-2 size-4" /> Add Assignment
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {tree.assignments.map((assignment) => (
                    <button
                      key={assignment.id}
                      type="button"
                      onClick={() => setSelectedAssignmentId(assignment.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${selectedAssignmentId === assignment.id ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-50" : "border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/5"}`}
                    >
                      <span className="block font-semibold">{assignment.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">{checkpointLabel(assignment, tree)}</span>
                    </button>
                  ))}
                  {!tree.assignments.length && <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">No assignments yet.</p>}
                </div>
                <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  {selectedAssignmentId ? (
                    <>
                      <Field label="Assignment title" value={assignmentDraft.title} onChange={(title) => setAssignmentDraft({ ...assignmentDraft, title })} />
                      <TextareaField label="Evidence instructions" value={assignmentDraft.description} rows={4} onChange={(description) => setAssignmentDraft({ ...assignmentDraft, description })} />
                      <NumberField label="Points" value={assignmentDraft.points} min={1} onChange={(points) => setAssignmentDraft({ ...assignmentDraft, points })} />
                      <CheckpointPlacementFields
                        moduleId={assignmentDraft.moduleId}
                        lessonId={assignmentDraft.lessonId}
                        modules={moduleOptions}
                        lessons={assignmentLessonOptions}
                        onModuleChange={(moduleId) => setAssignmentDraft({ ...assignmentDraft, moduleId, lessonId: "" })}
                        onLessonChange={(lessonId) => setAssignmentDraft({ ...assignmentDraft, lessonId })}
                      />
                      <div className="flex justify-end">
                        <Button
                          disabled={busy || !assignmentDraft.title.trim() || !assignmentDraft.description.trim()}
                          onClick={() => void run({
                            action: "update_assignment",
                            assignmentId: selectedAssignmentId,
                            assignment: {
                              courseId,
                              title: assignmentDraft.title,
                              description: assignmentDraft.description,
                              points: Math.max(1, Number(assignmentDraft.points) || 100),
                              moduleId: assignmentDraft.lessonId ? allLessons.find((lesson) => lesson.id === assignmentDraft.lessonId)?.moduleId ?? assignmentDraft.moduleId : assignmentDraft.moduleId || null,
                              lessonId: assignmentDraft.lessonId || null,
                              active: true,
                            },
                          }, "Assignment checkpoint saved.")}
                        >
                          Save Assignment Gate
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Select an assignment to edit its instructions and gate placement.</p>
                  )}
                </div>
              </div>
            </div>
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
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 size-5 shrink-0 text-emerald-300" />
                <div>
                  <h3 className="text-lg font-bold text-white">Course readiness checklist</h3>
                  <p className="mt-1 text-sm leading-6 text-emerald-50/80">{readinessComplete}/{readinessItems.length} launch checks complete. Fix incomplete items before publishing paid training.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                {readinessItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-lg border border-white/10 bg-slate-950/40 p-3">
                    <CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${item.complete ? "text-emerald-300" : "text-amber-300"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {tree.status === "PUBLISHED" ? (
                  <Button variant="secondary" onClick={() => void run({ action: "unpublish_course", courseId }, "Course unpublished.")}>Unpublish</Button>
                ) : (
                  <Button disabled={readinessComplete < readinessItems.length} onClick={() => void run({ action: "publish_course", courseId }, "Course published.")}><CheckCircle2 className="size-4 mr-2" /> Publish Course</Button>
                )}
                {readinessComplete < readinessItems.length && <p className="text-xs leading-5 text-amber-200">Publishing is disabled until every readiness check passes.</p>}
              </div>
            </div>
            <LearnerPreviewPanel tree={tree} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="font-semibold text-white">Learner override and repair tools</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-400">Use these when a gate changed after enrolment, a learner exhausted attempts, or admin has manually reviewed evidence. Every action writes an audit log.</p>
                </div>
                <Button variant="secondary" onClick={() => void run({ action: "repair_course_progress", courseId }, "All learner progress recalculated.")}>
                  <RefreshCw className="mr-2 size-4" /> Repair all
                </Button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block text-sm text-slate-300">Learner
                  <select value={selectedLearnerId} onChange={(event) => setSelectedLearnerId(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white">
                    <option value="">Select learner...</option>
                    {tree.learners.map((learner) => <option key={learner.id} value={learner.id}>{learner.name} - {learner.progress}%</option>)}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">Quiz attempt to reopen
                  <select value={overrideQuizId} onChange={(event) => setOverrideQuizId(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white">
                    <option value="">Select quiz...</option>
                    {tree.quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">Lesson to mark complete
                  <select value={overrideLessonId} onChange={(event) => setOverrideLessonId(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white">
                    <option value="">Select lesson...</option>
                    {allLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.moduleTitle} / {lesson.title}</option>)}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">Assignment to approve
                  <select value={overrideAssignmentId} onChange={(event) => setOverrideAssignmentId(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white">
                    <option value="">Select assignment...</option>
                    {tree.assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.title}</option>)}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">Module to unlock
                  <select value={overrideModuleId} onChange={(event) => setOverrideModuleId(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white">
                    <option value="">Select module...</option>
                    {tree.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Button variant="secondary" disabled={!selectedLearnerId || !overrideQuizId || busy} onClick={() => void run({ action: "grant_extra_quiz_attempt", courseId, learnerId: selectedLearnerId, quizId: overrideQuizId }, "Extra quiz attempt granted.")}>Grant extra attempt</Button>
                <Button variant="secondary" disabled={!selectedLearnerId || !overrideLessonId || busy} onClick={() => void run({ action: "mark_lesson_gate_satisfied", courseId, learnerId: selectedLearnerId, lessonId: overrideLessonId }, "Lesson gate marked complete.")}>Mark lesson complete</Button>
                <Button variant="secondary" disabled={!selectedLearnerId || !overrideAssignmentId || busy} onClick={() => void run({ action: "approve_assignment_gate", courseId, learnerId: selectedLearnerId, assignmentId: overrideAssignmentId }, "Assignment gate approved.")}>Approve assignment gate</Button>
                <Button disabled={!selectedLearnerId || !overrideModuleId || busy} onClick={() => void run({ action: "unlock_module_for_learner", courseId, learnerId: selectedLearnerId, moduleId: overrideModuleId }, "Module unlocked for learner.")}>Unlock module</Button>
              </div>
              {!tree.learners.length && <p className="mt-4 rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">No enrolled learners found for this course yet.</p>}
            </div>

            <div className="rounded-xl border border-white/10 p-4">
              <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><History className="size-4" /> Version history</h4>
              <ul className="max-h-80 space-y-2 overflow-y-auto text-sm text-slate-400">
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

function LearnerPreviewPanel({ tree }: { tree: CourseTree }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-start gap-3">
        <Eye className="mt-1 size-5 shrink-0 text-emerald-300" />
        <div>
          <h4 className="font-semibold text-white">Preview as learner</h4>
          <p className="mt-1 text-sm leading-6 text-slate-400">This shows the sequence learners will experience before any personal progress is applied.</p>
        </div>
      </div>
      <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
        {tree.modules.map((module, moduleIndex) => {
          const moduleQuizzes = tree.quizzes.filter((quiz) => quiz.moduleId === module.id && !quiz.lessonId);
          const moduleAssignments = tree.assignments.filter((assignment) => assignment.moduleId === module.id && !assignment.lessonId);
          return (
            <div key={module.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{moduleIndex + 1}. {module.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{module.sections.reduce((sum, section) => sum + section.lessons.length, 0)} lessons</p>
                </div>
                {(moduleQuizzes.length || moduleAssignments.length) ? <AdminStatusBadge status="Module gate" variant="warning" /> : <AdminStatusBadge status="Open" variant="success" />}
              </div>
              <div className="mt-3 space-y-2">
                {module.sections.flatMap((section) => section.lessons).map((lesson) => {
                  const lessonQuizzes = tree.quizzes.filter((quiz) => quiz.lessonId === lesson.id);
                  const lessonAssignments = tree.assignments.filter((assignment) => assignment.lessonId === lesson.id);
                  return (
                    <div key={lesson.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-2">
                      <p className="text-xs font-semibold text-slate-200">{lesson.title}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{lesson.completionRequirement.replace(/_/g, " ")}</p>
                      {(lessonQuizzes.length || lessonAssignments.length) ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {lessonQuizzes.map((quiz) => <span key={quiz.id} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">Quiz: {quiz.title}</span>)}
                          {lessonAssignments.map((assignment) => <span key={assignment.id} className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-200">Assignment: {assignment.title}</span>)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {(moduleQuizzes.length || moduleAssignments.length) ? (
                <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-200">Before next module</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {moduleQuizzes.map((quiz) => <span key={quiz.id} className="rounded-full bg-slate-950 px-2 py-1 text-[10px] text-slate-300">Pass {quiz.title}</span>)}
                    {moduleAssignments.map((assignment) => <span key={assignment.id} className="rounded-full bg-slate-950 px-2 py-1 text-[10px] text-slate-300">Approved {assignment.title}</span>)}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
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

function CheckpointPlacementFields({
  moduleId,
  lessonId,
  modules,
  lessons,
  onModuleChange,
  onLessonChange,
}: {
  moduleId: string;
  lessonId: string;
  modules: Array<{ id: string; title: string }>;
  lessons: Array<{ id: string; title: string; moduleTitle: string }>;
  onModuleChange: (moduleId: string) => void;
  onLessonChange: (lessonId: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-sm font-semibold text-white">Progression gate placement</p>
      <p className="text-xs leading-5 text-slate-500">Choose a module for an end-of-module checkpoint. Choose a lesson as well when the learner must pass or submit immediately after that exact lesson.</p>
      <label className="block text-sm text-slate-300">Module gate
        <select value={moduleId} onChange={(event) => onModuleChange(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white">
          <option value="">Course-level only (certificate requirement)</option>
          {modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
        </select>
      </label>
      <label className="block text-sm text-slate-300">Optional lesson gate
        <select value={lessonId} onChange={(event) => onLessonChange(event.target.value)} disabled={!moduleId} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white disabled:opacity-50">
          <option value="">End of selected module</option>
          {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
        </select>
      </label>
    </div>
  );
}

function checkpointLabel(
  item: { moduleId?: string | null; lessonId?: string | null },
  tree: CourseTree,
) {
  if (item.lessonId) {
    const lesson = tree.modules.flatMap((module) => module.sections.flatMap((section) => section.lessons.map((entry) => ({ ...entry, moduleTitle: module.title })))).find((entry) => entry.id === item.lessonId);
    return lesson ? `After lesson: ${lesson.title}` : "Lesson checkpoint";
  }
  if (item.moduleId) {
    const courseModule = tree.modules.find((module) => module.id === item.moduleId);
    return courseModule ? `End of module: ${courseModule.title}` : "Module checkpoint";
  }
  return "Course-level certificate requirement";
}

function CurriculumMetric({ label, value, compact, tone = "default" }: { label: string; value: number; compact?: boolean; tone?: "default" | "warning" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${compact ? "" : "sm:text-xs"} ${tone === "warning" ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
      <span className={tone === "warning" ? "text-amber-100" : "text-white"}>{value}</span>
      {label}
    </span>
  );
}

function GateChip({ kind, title, detail }: { kind: "quiz" | "assignment" | "warning" | "open"; title: string; detail: string }) {
  const tone =
    kind === "quiz"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
      : kind === "assignment"
        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
        : kind === "warning"
          ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
          : "border-white/10 bg-slate-950/70 text-slate-300";
  return (
    <span className={`inline-flex max-w-full flex-col rounded-xl border px-2.5 py-1.5 text-left ${tone}`}>
      <span className="max-w-[20rem] truncate text-[11px] font-bold">{title}</span>
      <span className="text-[10px] opacity-75">{detail}</span>
    </span>
  );
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function stripHtml(value: string | null | undefined) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function CourseMediaField({ label, value, accept, kind, onChange, courseId }: { label: string; value: string; accept: string; kind: "video" | "document" | "image"; onChange: (v: string) => void; courseId?: string }) {
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
        body: JSON.stringify({ dataUrl, kind, folder: courseId ? `academy/course-workspace/${courseId}` : "academy/course-workspace" }),
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
  standard: "Field Practice Standard",
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

function _AssessmentCard({ title, items, onAdd }: { title: string; items: string[]; onAdd: () => void }) {
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

