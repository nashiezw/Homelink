"use client";

/* eslint-disable @next/next/no-img-element -- Academy previews render uploaded enterprise resources */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileText,
  Film,
  GraduationCap,
  Library,
  Layers,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { useSearchParams } from "next/navigation";
import {
  AdminDataTable,
  AdminDrawer,
  AdminEmptyState,
  AdminFilterBar,
  AdminMetricGrid,
  AdminSearchInput,
  AdminSelect,
  AdminStatPill,
  AdminStatusBadge,
} from "@/components/admin/ui/admin-ui";
import { BarChart, MetricRow } from "@/components/admin/charts";
import { CourseWorkspace } from "@/components/admin/academy/course-workspace";
import { AcademyHubNav, resolveAcademyNav, type AcademyPrimaryTab } from "@/components/admin/academy/academy-hub-nav";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AcademyData = {
  metrics: Record<string, number>;
  courses: AcademyCourse[];
  lessons: AcademyLesson[];
  documents: AcademyDocument[];
  videos: AcademyVideo[];
  quizzes: Array<{ id: string; title: string; passingPercentage: number; active: boolean }>;
  assignments: Array<{ id: string; title: string; points: number; active: boolean }>;
  exams: Array<{ id: string; title: string; durationMinutes: number; passingScore: number; active: boolean }>;
  certificates: Array<{ id: string; certificateNumber: string; agentId: string; status: string; issuedAt: string; expiresAt?: string }>;
  learningPaths: Array<{ id: string; title: string; description?: string; status: string; badgeTitle?: string; courses: Array<{ id: string; sortOrder: number; required: boolean; course: AcademyCourse }> }>;
  announcements: Array<{ id: string; title: string; body: string; audience: string; publishedAt?: string; expiresAt?: string; createdAt: string }>;
  badges: Array<{ id: string; name: string; description?: string; xp: number; active: boolean }>;
  publicLearnerApplications: Array<{
    id: string;
    status: string;
    learnerType: string;
    fullName: string;
    email: string;
    phone?: string;
    organisation?: string;
    amount: number;
    currency: string;
    proofUrl?: string;
    adminNote?: string;
    createdAt: string;
    updatedAt: string;
    productType?: "COURSE_ENROLMENT";
    course: { id: string; title: string };
    learner: { id: string; name: string; email: string; phone?: string; roles: string[] };
    payment: { id: string; status: string; proofStatus?: string; proofUrl?: string } | null;
  }>;
  resourceAccessApplications?: Array<{
    id: string;
    status: string;
    learnerType: string;
    resourceKind: string;
    fullName: string;
    email: string;
    phone?: string;
    amount: number;
    currency: string;
    proofUrl?: string;
    adminNote?: string;
    createdAt: string;
    updatedAt: string;
    productType: "RESOURCE_ACCESS";
    course: { id: string; title: string } | null;
    learner: { id: string; name: string; email: string; phone?: string; roles: string[] };
    payment: { id: string; status: string; proofStatus?: string; proofUrl?: string } | null;
  }>;
  settings?: { id: string; payload: Record<string, unknown>; updatedAt: string } | null;
  auditLogs: Array<{ id: string; actorId?: string; action: string; target: string; createdAt: string }>;
  topCourses: Array<{ id: string; title: string; completions: number; enrolments: number }>;
  mostDifficultCourse?: { title: string; average: number };
  mostFailedQuiz?: { title: string; failed: number; attempts: number };
  mostActiveAgents: Array<{ agentId: string; actions: number }>;
  agentsNeedingAttention: Array<{ id: string; agentId: string; courseId: string; percentComplete: number }>;
  recentlyCompletedCourses: Array<{ id: string; agentId: string; courseId: string; completedAt?: string }>;
  recentCertificates: Array<{ id: string; certificateNumber: string; agentId: string; issuedAt: string }>;
  upcomingExpiringCertificates: Array<{ id: string; certificateNumber: string; agentId: string; expiresAt?: string }>;
  overdueAssignments: number;
  recentActivity: Array<{ id: string; actorId?: string; action: string; target: string; createdAt: string }>;
  discussionThreads?: Array<{ id: string; title: string; courseTitle: string; posts: number; status: string; updatedAt: string }>;
  leaderboard?: Array<{ id: string; agentId: string; badgeName: string; xp: number; awardedAt: string }>;
};

type AcademyLesson = {
  id: string;
  title: string;
  summary?: string;
  estimatedMinutes: number;
  completionRequirement: string;
  sortOrder: number;
  updatedAt: string;
  section?: {
    title: string;
    module?: {
      title: string;
      course?: { id: string; title: string };
    };
  };
  lessonVideos?: Array<{ id: string; title: string; provider: string; durationSeconds: number; downloadable: boolean }>;
  lessonDocuments?: Array<{ id: string; documentId: string; sortOrder: number }>;
  lessonResources?: Array<{ id: string; title: string; body: string; type: string; sortOrder: number }>;
  lessonDownloads?: Array<{ id: string; title: string; url: string; type: string }>;
  richText?: string;
  videoUrl?: string | null;
  embeddedVideoUrl?: string | null;
  pdfUrl?: string | null;
  audioUrl?: string | null;
};

type AcademyCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId?: string;
  category?: { id: string; name: string } | null;
  tags: string[];
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  durationMinutes: number;
  instructor?: string;
  passingPercentage: number;
  estimatedHours: string | number;
  certificateEnabled: boolean;
  expiresAfterDays?: number;
  price: string | number;
  publicPrice: string | number;
  agentPrice: string | number;
  toolkitPublicPrice?: string | number;
  toolkitAgentPrice?: string | number;
  toolkitSalesEnabled?: boolean;
  currency: string;
  registrationOpen: boolean;
  accessDurationDays: number;
  version: number;
  language: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  visibility: "INTERNAL_ONLY" | "PUBLIC" | "BRANCH_SPECIFIC" | "ROLE_BASED";
  updatedAt: string;
};

type AcademyDocument = {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  version: number;
  tags: string[];
  permissions: string[];
  downloadable: boolean;
  previewable: boolean;
  visible: boolean;
  sortOrder: number;
  downloadCount: number;
  active: boolean;
  category?: { id: string; name: string } | null;
  updatedAt: string;
};

type AcademyVideo = {
  id: string;
  title: string;
  description?: string;
  category: string;
  videoUrl: string;
  durationSeconds: number;
  captionsUrl?: string;
  downloadable: boolean;
  active: boolean;
  updatedAt: string;
};

const academyTabs = [
  "Dashboard",
  "Courses",
  "Public Learners",
  "Certificates",
  "Training Resources",
  "Video Library",
  "Learning Paths",
  "Badges",
  "Leaderboard",
  "Announcements",
  "Discussion Board",
  "Analytics",
  "Settings",
] as const;

type AcademyTab = (typeof academyTabs)[number];

const documentTypes = ["PDF", "DOCX", "XLSX", "PPTX", "IMAGE", "VIDEO", "AUDIO", "ZIP"] as const;
const featureTiles: Array<[AcademyTab, LucideIcon, string]> = [
  ["Learning Paths", Library, "Programme sequencing for multi-course certification journeys."],
  ["Announcements", Megaphone, "Publish targeted Academy updates to agents and branches."],
  ["Discussion Board", Users, "Course discussion threads, replies, reactions, mentions, bookmarks, and moderation."],
  ["Leaderboard", Trophy, "Automatic points, XP, ranks, branch competition, and monthly leaders."],
  ["Badges", BadgeCheck, "Achievement rules and awarded agent badges."],
  ["Settings", Settings, "Certificate prefixes, supported formats, permissions, notifications, and retention policies."],
];

export function AgentAcademyHub() {
  const { showToast } = useApp();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AcademyData | null>(null);
  const [primaryTab, setPrimaryTab] = useState<AcademyPrimaryTab>("Overview");
  const [tab, setTab] = useState<AcademyTab>("Dashboard");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [drawer, setDrawer] = useState<"course" | "document" | "video" | "quiz" | "exam" | "assignment" | "path" | "announcement" | "badge" | "lesson" | "module" | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<AcademyDocument | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [buildingCourseId, setBuildingCourseId] = useState<string | null>(null);
  const [viewCourse, setViewCourse] = useState<AcademyCourse | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<AcademyLesson | null>(null);
  const [selectedModule, setSelectedModule] = useState<{ id: string; courseId: string; title: string; description?: string; sortOrder: number } | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const load = useCallback(async () => {
    const result = await apiFetch<AcademyData>("/api/v1/admin/academy");
    if (result.data) setData(result.data);
    else showToast(result.error?.message ?? "Academy could not load.", "error");
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== "Analytics") return;
    void apiFetch<Record<string, unknown>>("/api/v1/admin/academy/analytics").then((result) => {
      if (result.data) setAnalytics(result.data);
    });
  }, [tab]);

  useEffect(() => {
    const requested = searchParams.get("academyView");
    if (requested) {
      const resolved = resolveAcademyNav(requested);
      setPrimaryTab(resolved.primary);
      if (academyTabs.includes(resolved.sub as AcademyTab)) {
        setTab(resolved.sub as AcademyTab);
      }
    }
  }, [searchParams]);

  async function action(body: Record<string, unknown>, success: string) {
    setBusy(true);
    const result = await apiFetch("/api/v1/admin/academy", { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    if (result.error) {
      showToast(result.error.message, "error");
      return false;
    }
    showToast(success);
    setDrawer(null);
    await load();
    return true;
  }

  const courses = useMemo(() => {
    const needle = query.toLowerCase();
    return (data?.courses ?? []).filter((course) => {
      const matchesStatus = statusFilter === "ALL" || course.status === statusFilter;
      const matchesText = !needle || `${course.title} ${course.description} ${course.tags.join(" ")}`.toLowerCase().includes(needle);
      return matchesStatus && matchesText;
    });
  }, [data?.courses, query, statusFilter]);

  if (!data) {
    return <div className="space-y-3">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <AcademyHubNav
        primary={primaryTab}
        sub={tab}
        onPrimaryChange={setPrimaryTab}
        onSubChange={(id) => setTab(id as AcademyTab)}
      />

      {tab === "Dashboard" && (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <ExecutiveTile label="Total Courses" value={data.metrics.totalCourses} icon={GraduationCap} />
            <ExecutiveTile label="Published" value={data.metrics.publishedCourses} icon={CheckCircle2} tone="success" />
            <ExecutiveTile label="Draft" value={data.metrics.draftCourses} icon={FileText} tone="warning" />
            <ExecutiveTile label="Lessons" value={data.metrics.totalLessons} icon={BookOpen} />
            <ExecutiveTile label="Active Learners" value={data.metrics.activeLearners} icon={Users} tone="success" />
            <ExecutiveTile label="Completion" value={`${data.metrics.completionRate}%`} icon={BadgeCheck} tone="info" />
          </div>
          <AdminMetricGrid cols={6}>
            <AdminStatPill label="Videos Uploaded" value={data.metrics.videosUploaded} />
            <AdminStatPill label="PDF Resources" value={data.metrics.pdfResources} />
            <AdminStatPill label="Quizzes" value={data.metrics.quizzes} />
            <AdminStatPill label="Assignments" value={data.metrics.assignments} />
            <AdminStatPill label="Exams" value={data.metrics.exams} />
            <AdminStatPill label="Certificates Issued" value={data.metrics.certificatesIssued} tone="success" />
            <AdminStatPill label="Inactive Learners" value={data.metrics.inactiveLearners} tone="warning" />
            <AdminStatPill label="Average Score" value={`${data.metrics.averageScore}%`} tone="info" />
            <AdminStatPill label="Learning Hours" value={data.metrics.learningHours} />
            <AdminStatPill label="Downloads" value={data.metrics.downloads} />
            <AdminStatPill label="Video Watch %" value={`${data.metrics.videoWatchPercent}%`} />
            <AdminStatPill label="Overdue Assignments" value={data.overdueAssignments} tone={data.overdueAssignments ? "warning" : "default"} />
            <AdminStatPill label="Public Learners" value={data.metrics.publicLearners} tone="info" />
            <AdminStatPill label="Pending Public Approvals" value={data.metrics.pendingPublicApprovals} tone={data.metrics.pendingPublicApprovals ? "warning" : "success"} />
            <AdminStatPill label="Academy Revenue" value={`$${data.metrics.academyRevenue}`} tone="success" />
          </AdminMetricGrid>

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Top Courses</h3>
                <BarChart3 className="size-4 text-emerald-400" />
              </div>
              <BarChart data={data.topCourses.map((course) => ({ label: course.title.slice(0, 24), value: course.completions }))} color="bg-emerald-500" />
            </section>
            <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Risk Radar</h3>
              <div className="mt-4 space-y-4">
                <RiskLine label="Most difficult course" value={data.mostDifficultCourse?.title ?? "No scored courses yet"} helper={`${Math.round(data.mostDifficultCourse?.average ?? 0)}% average`} />
                <RiskLine label="Most failed quiz" value={data.mostFailedQuiz?.title ?? "No failed quizzes yet"} helper={`${data.mostFailedQuiz?.failed ?? 0} failed attempts`} />
                <RiskLine label="Agents needing attention" value={String(data.agentsNeedingAttention.length)} helper="Low progress or stalled learning" />
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <ActivityPanel title="Recent Activity" icon={Megaphone}>
              {data.recentActivity.map((item) => <MetricRow key={item.id} label={item.action.replace("academy.", "").replace(/\./g, " ")} value={new Date(item.createdAt).toLocaleDateString()} />)}
            </ActivityPanel>
            <ActivityPanel title="Recent Certificates" icon={Award}>
              {data.recentCertificates.map((item) => <MetricRow key={item.id} label={item.certificateNumber} value={item.agentId.slice(0, 8)} />)}
            </ActivityPanel>
            <ActivityPanel title="Expiring Soon" icon={ShieldCheck}>
              {data.upcomingExpiringCertificates.map((item) => <MetricRow key={item.id} label={item.certificateNumber} value={item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "No expiry"} />)}
            </ActivityPanel>
          </div>
        </div>
      )}

      {tab === "Courses" && (
        <div className="space-y-4">
          {buildingCourseId ? (
            <CourseWorkspace
              courseId={buildingCourseId}
              courseTitle={data.courses.find((c) => c.id === buildingCourseId)?.title ?? "Course"}
              onClose={() => setBuildingCourseId(null)}
              action={action}
              onRefresh={load}
            />
          ) : (
            <>
          <AdminFilterBar>
            <AdminSearchInput value={query} onChange={setQuery} placeholder="Search courses, tags, instructors..." className="lg:flex-1" />
            <AdminSelect value={statusFilter} onChange={setStatusFilter} options={["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"].map((value) => ({ value, label: value.replace("_", " ") }))} />
            <Button onClick={() => { setSelectedCourse(null); setDrawer("course"); }}><Plus className="size-4" /> New Course</Button>
          </AdminFilterBar>
          <AdminDataTable
            rows={courses}
            columns={[
              { key: "course", header: "Course", render: (course) => <CourseCell course={course} /> },
              { key: "status", header: "Status", render: (course) => <AdminStatusBadge status={course.status} variant={course.status === "PUBLISHED" ? "success" : course.status === "ARCHIVED" ? "muted" : "warning"} /> },
              { key: "difficulty", header: "Difficulty", render: (course) => course.difficulty },
              { key: "visibility", header: "Visibility", render: (course) => course.visibility.replace(/_/g, " ") },
              { key: "version", header: "Version", render: (course) => `v${course.version}` },
              {
                key: "actions",
                header: "Actions",
                render: (course) => (
                  <div className="flex flex-wrap gap-2">
                    <IconAction label="Build" icon={Layers} onClick={() => setBuildingCourseId(course.id)} />
                    <IconAction label="View" icon={Eye} onClick={() => setViewCourse(course)} />
                    <IconAction label="Edit" icon={Pencil} onClick={() => { setSelectedCourse(course); setDrawer("course"); }} />
                    <IconAction label="Duplicate" icon={Copy} onClick={() => void action({ action: "duplicate_course", courseId: course.id }, "Course duplicated.")} />
                    {course.status === "PUBLISHED" ? (
                      <IconAction label="Unpublish" icon={FileText} onClick={() => void action({ action: "unpublish_course", courseId: course.id }, "Course unpublished.")} />
                    ) : (
                      <IconAction label="Publish" icon={CheckCircle2} onClick={() => void action({ action: "publish_course", courseId: course.id }, "Course published.")} />
                    )}
                    {course.status === "ARCHIVED" ? (
                      <IconAction label="Restore" icon={RotateCcw} onClick={() => void action({ action: "restore_course", courseId: course.id }, "Course restored.")} />
                    ) : (
                      <IconAction label="Archive" icon={Archive} onClick={() => void action({ action: "archive_course", courseId: course.id }, "Course archived.")} />
                    )}
                    <IconAction label="Delete" icon={Trash2} onClick={() => {
                      if (window.confirm(`Delete ${course.title}? This permanently removes the course and its modules, lessons, enrolments, assessments, and public learner applications.`)) {
                        void action({ action: "delete_course", courseId: course.id }, "Course permanently deleted.");
                      }
                    }} />
                  </div>
                ),
              },
            ]}
            emptyMessage="No Academy courses match your filters."
          />
            </>
          )}
        </div>
      )}

      {tab === "Training Resources" && (
        <LibraryView
          documents={data.documents}
          onCreate={() => setDrawer("document")}
          onPreview={setPreviewDocument}
          onReplace={(document) => {
            setPreviewDocument(null);
            setDrawer("document");
            showToast(`Upload a replacement for ${document.title}. The old version will remain in history.`, "info");
          }}
        />
      )}

      {tab === "Video Library" && (
        <div className="space-y-4">
          <AdminFilterBar>
            <div className="flex-1 text-sm text-slate-400">Streaming videos, captions, watch history, resume progress, and analytics are stored in PostgreSQL.</div>
            <Button onClick={() => setDrawer("video")}><Upload className="size-4" /> Add Video</Button>
          </AdminFilterBar>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.videos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
                <video src={video.videoUrl} controls className="aspect-video w-full bg-black object-contain" preload="metadata" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{video.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{video.category} - {Math.round(video.durationSeconds / 60)} min</p>
                    </div>
                    <AdminStatusBadge status={video.active ? "Active" : "Hidden"} variant={video.active ? "success" : "muted"} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{video.description}</p>
                </div>
              </article>
            ))}
            {!data.videos.length && <AdminEmptyState icon={Film} title="No videos yet" description="Upload MP4/WebM training videos or add externally hosted training links." />}
          </div>
        </div>
      )}

      {["Certificates", "Public Learners", "Learning Paths", "Announcements", "Discussion Board", "Leaderboard", "Badges", "Analytics", "Settings"].includes(tab) && (
        <FeatureWorkbench
          tab={tab}
          data={data}
          analytics={analytics}
          openDrawer={(next) => setDrawer(next)}
          action={action}
          query={query}
          setQuery={setQuery}
          setSelectedLesson={setSelectedLesson}
          setDrawer={setDrawer}
        />
      )}

      <CourseDrawer
        open={drawer === "course"}
        busy={busy}
        course={selectedCourse}
        onClose={() => { setDrawer(null); setSelectedCourse(null); }}
        onSave={(course) => selectedCourse
          ? action({ action: "update_course", courseId: selectedCourse.id, course }, "Course updated in PostgreSQL.")
          : action({ action: "create_course", course }, "Course created in PostgreSQL.")}
      />
      <DocumentDrawer open={drawer === "document"} busy={busy} onClose={() => setDrawer(null)} onSave={(document) => action({ action: "create_document", document }, "Document saved with version control.")} />
      <VideoDrawer open={drawer === "video"} busy={busy} onClose={() => setDrawer(null)} onSave={(video) => action({ action: "create_video", video }, "Video added to the Academy library.")} />
      <QuickBuilderDrawer type={drawer} busy={busy} courses={data.courses} onClose={() => setDrawer(null)} onSave={action} />
      <LearningPathDrawer open={drawer === "path"} busy={busy} courses={data.courses} onClose={() => setDrawer(null)} onSave={(path) => action({ action: "create_learning_path", path }, "Learning path created.")} />
      <AnnouncementDrawer open={drawer === "announcement"} busy={busy} onClose={() => setDrawer(null)} onSave={(announcement) => action({ action: "create_announcement", announcement }, "Announcement published.")} />
      <BadgeDrawer open={drawer === "badge"} busy={busy} onClose={() => setDrawer(null)} onSave={(badge) => action({ action: "create_badge", badge }, "Badge created.")} />
      <LessonDrawer open={drawer === "lesson"} busy={busy} lesson={selectedLesson} courses={data.courses} onClose={() => { setDrawer(null); setSelectedLesson(null); }} onSave={(lesson) => selectedLesson
        ? action({ action: "update_lesson", lessonId: selectedLesson.id, lesson }, "Lesson updated.")
        : action({ action: "create_lesson", lesson }, "Lesson created.")} />
      <ModuleDrawer open={drawer === "module"} busy={busy} module={selectedModule} courses={data.courses} onClose={() => { setDrawer(null); setSelectedModule(null); }} onSave={(module) => selectedModule
        ? action({ action: "update_module", moduleId: selectedModule.id, module }, "Module updated.")
        : action({ action: "create_module", module }, "Module created.")} />
      {previewDocument && <DocumentPreview document={previewDocument} onClose={() => setPreviewDocument(null)} />}
      {viewCourse && <CoursePreview course={viewCourse} onClose={() => setViewCourse(null)} />}
    </div>
  );
}

function ExecutiveTile({ label, value, icon: Icon, tone = "default" }: { label: string; value: string | number; icon: typeof GraduationCap; tone?: "default" | "success" | "warning" | "info" }) {
  const styles = {
    default: "border-white/10 bg-slate-900/70 text-slate-100",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    info: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
  };
  return (
    <div className={cn("rounded-xl border p-4", styles[tone])}>
      <Icon className="size-5 opacity-80" />
      <p className="mt-4 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

function RiskLine({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function ActivityPanel({ title, icon: Icon, children }: { title: string; icon: typeof Award; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        <Icon className="size-4 text-emerald-400" />
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function CourseCell({ course }: { course: AcademyCourse }) {
  return (
    <div>
      <p className="font-semibold text-white">{course.title}</p>
      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{course.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {course.featured && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">Featured</span>}
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">{course.category?.name ?? "Uncategorised"}</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">{course.estimatedHours}h</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">Public {course.currency} {Number(course.publicPrice ?? course.price).toFixed(2)}</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">Agent {course.currency} {Number(course.agentPrice ?? 0).toFixed(2)}</span>
        {course.registrationOpen && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Public registration</span>}
      </div>
    </div>
  );
}

function IconAction({ label, icon: Icon, onClick }: { label: string; icon: typeof Copy; onClick: () => void }) {
  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} title={label} className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white">
      <Icon className="size-4" />
    </button>
  );
}

function LibraryView({ documents, onCreate, onPreview, onReplace }: { documents: AcademyDocument[]; onCreate: () => void; onPreview: (document: AcademyDocument) => void; onReplace: (document: AcademyDocument) => void }) {
  const [query, setQuery] = useState("");
  const filtered = documents.filter((document) => `${document.title} ${document.description ?? ""} ${document.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-4">
      <AdminFilterBar>
        <AdminSearchInput value={query} onChange={setQuery} placeholder="Search document titles, tags, categories..." className="lg:flex-1" />
        <Button onClick={onCreate}><Upload className="size-4" /> Upload Document</Button>
      </AdminFilterBar>
      <AdminDataTable
        rows={filtered}
        columns={[
          { key: "title", header: "Document", render: (document) => <DocumentCell document={document} /> },
          { key: "type", header: "Type", render: (document) => <AdminStatusBadge status={document.fileType} variant="info" /> },
          { key: "category", header: "Category", render: (document) => document.category?.name ?? "Uncategorised" },
          { key: "version", header: "Version", render: (document) => `v${document.version}` },
          { key: "permissions", header: "Permissions", render: (document) => document.permissions.join(", ") },
          { key: "downloads", header: "Downloads", render: (document) => document.downloadCount ?? 0 },
          {
            key: "actions",
            header: "Actions",
            render: (document) => (
              <div className="flex flex-wrap gap-2">
                <IconAction label="Preview" icon={Search} onClick={() => onPreview(document)} />
                <a href={`/api/v1/academy/documents/${document.id}/download`} className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white" title="Download">
                  <Download className="size-4" />
                </a>
                <IconAction label="Replace" icon={Upload} onClick={() => onReplace(document)} />
              </div>
            ),
          },
        ]}
        emptyMessage="No Academy documents match your search."
      />
    </div>
  );
}

function DocumentCell({ document }: { document: AcademyDocument }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-emerald-300">
        {document.fileType === "ZIP" ? <FileArchive className="size-5" /> : <FileText className="size-5" />}
      </span>
      <div>
        <p className="font-semibold text-white">{document.title}</p>
        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{document.description ?? document.fileName}</p>
      </div>
    </div>
  );
}

function FeatureWorkbench({
  tab,
  data,
  analytics,
  openDrawer,
  action,
  query: _query,
  setQuery: _setQuery,
  setSelectedLesson: _setSelectedLesson,
  setDrawer: _setDrawer,
}: {
  tab: AcademyTab;
  data: AcademyData;
  analytics: Record<string, unknown> | null;
  openDrawer: (drawer: "quiz" | "exam" | "assignment" | "path" | "announcement" | "badge" | null) => void;
  action: (body: Record<string, unknown>, success: string) => Promise<unknown>;
  query: string;
  setQuery: (query: string) => void;
  setSelectedLesson: (lesson: AcademyLesson | null) => void;
  setDrawer: (drawer: "course" | "document" | "video" | "quiz" | "exam" | "assignment" | "path" | "announcement" | "badge" | "lesson" | "module" | null) => void;
}) {
  if (tab === "Certificates") {
    return <BuilderList title="Certificate Management" icon={Award} rows={data.certificates.map((c) => ({ id: c.id, title: c.certificateNumber, active: c.status === "ACTIVE", detail: `${c.agentId} - ${new Date(c.issuedAt).toLocaleDateString()}` }))} actionLabel="Issued automatically after completion" />;
  }
  if (tab === "Public Learners") {
    return <PublicLearnersPanel applications={data.publicLearnerApplications} resourceApplications={data.resourceAccessApplications ?? []} action={action} />;
  }
  if (tab === "Learning Paths") {
    return <BuilderList title="Learning Paths" icon={Library} rows={data.learningPaths.map((path) => ({ id: path.id, title: path.title, active: path.status === "PUBLISHED", detail: `${path.courses.length} course(s) - ${path.badgeTitle ?? "No badge"}` }))} actionLabel="Create Path" onCreate={() => openDrawer("path")} onArchive={(row) => action({ action: row.active === false ? "restore_learning_path" : "archive_learning_path", pathId: row.id }, row.active === false ? "Learning path restored." : "Learning path archived.")} />;
  }
  if (tab === "Announcements") {
    return <BuilderList title="Announcements" icon={Megaphone} rows={data.announcements.map((announcement) => ({ id: announcement.id, title: announcement.title, active: Boolean(announcement.publishedAt) && !announcement.expiresAt, detail: `${announcement.audience} - ${announcement.body}` }))} actionLabel="New Announcement" onCreate={() => openDrawer("announcement")} onArchive={(row) => action({ action: row.active === false ? "restore_announcement" : "archive_announcement", announcementId: row.id }, row.active === false ? "Announcement restored." : "Announcement archived.")} />;
  }
  if (tab === "Badges") {
    return <BuilderList title="Badges and Achievements" icon={BadgeCheck} rows={data.badges.map((badge) => ({ id: badge.id, title: badge.name, active: badge.active, detail: `${badge.xp} XP - ${badge.description ?? ""}` }))} actionLabel="Create Badge" onCreate={() => openDrawer("badge")} onArchive={(row) => action({ action: row.active === false ? "restore_badge" : "archive_badge", badgeId: row.id }, row.active === false ? "Badge restored." : "Badge archived.")} />;
  }
  if (tab === "Discussion Board") {
    return (
      <div className="space-y-4">
        <BuilderList
          title="Discussion Board"
          icon={Users}
          rows={(data.discussionThreads ?? []).map((thread) => ({
            id: thread.id,
            title: thread.title,
            active: thread.status !== "LOCKED",
            detail: `${thread.courseTitle} - ${thread.posts} posts - ${thread.status}`,
          }))}
          actionLabel="Moderate threads"
        />
        <div className="rounded-xl border border-white/10 p-4">
          <p className="text-sm text-slate-400 mb-3">Quick moderation — select a thread ID from the list above.</p>
          <div className="flex flex-wrap gap-2">
            {(data.discussionThreads ?? []).slice(0, 6).map((thread) => (
              <div key={thread.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-900/60 px-3 py-2 text-xs">
                <span className="text-white font-medium truncate max-w-[160px]">{thread.title}</span>
                <button type="button" className="text-emerald-400 hover:underline" onClick={() => void action({ action: "pin_thread", threadId: thread.id }, "Thread pinned.")}>Pin</button>
                <button type="button" className="text-amber-400 hover:underline" onClick={() => void action({ action: "lock_thread", threadId: thread.id }, "Thread locked.")}>Lock</button>
                <button type="button" className="text-red-400 hover:underline" onClick={() => void action({ action: "delete_thread", threadId: thread.id }, "Thread deleted.")}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (tab === "Leaderboard") {
    return (
      <BuilderList
        title="Leaderboard"
        icon={Trophy}
        rows={(data.leaderboard ?? []).map((entry) => ({
          id: entry.id,
          title: entry.badgeName,
          active: true,
          detail: `${entry.agentId} - ${entry.xp} XP - ${new Date(entry.awardedAt).toLocaleDateString()}`,
        }))}
        actionLabel="Badges and XP drive leaderboard rankings"
      />
    );
  }
  if (tab === "Analytics") {
    const revenue = analytics?.revenue as { total?: number; count?: number } | undefined;
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <ActivityPanel title="Revenue & Registrations" icon={BarChart3}>
          <MetricRow label="Academy revenue" value={`USD ${Number(revenue?.total ?? data.metrics.academyRevenue ?? 0).toFixed(2)}`} />
          <MetricRow label="Paid registrations" value={String(revenue?.count ?? 0)} />
          <MetricRow label="Total registrations" value={String(analytics?.registrations ?? data.metrics.publicLearners ?? 0)} />
          <MetricRow label="Active learners (7d)" value={String(analytics?.activeLearners ?? data.metrics.activeLearners ?? 0)} />
        </ActivityPanel>
        <ActivityPanel title="Completion & Certificates" icon={Trophy}>
          <MetricRow label="Course completions" value={String(analytics?.completions ?? 0)} />
          <MetricRow label="Certificates issued" value={String(analytics?.certificates ?? data.metrics.certificatesIssued ?? 0)} />
          <MetricRow label="Completion rate" value={`${data.metrics.completionRate ?? 0}%`} />
          <MetricRow label="Average score" value={`${data.metrics.averageScore ?? 0}%`} />
        </ActivityPanel>
        <ActivityPanel title="Most Active Agents" icon={Trophy}>{data.mostActiveAgents.map((item) => <MetricRow key={item.agentId} label={item.agentId} value={item.actions} />)}</ActivityPanel>
        <ActivityPanel title="Agents Needing Attention" icon={Users}>{data.agentsNeedingAttention.map((item) => <MetricRow key={item.id} label={item.agentId} value={`${item.percentComplete}%`} />)}</ActivityPanel>
      </div>
    );
  }
  if (tab === "Settings") {
    return <AcademySettingsPanel settings={data.settings?.payload ?? {}} auditLogs={data.auditLogs} onSave={(settings) => action({ action: "update_settings", settings }, "Academy settings saved.")} />;
  }
  return (
    <OperationalPanel tab={tab} />
  );
}

function BuilderList({
  title,
  icon: Icon,
  rows,
  actionLabel,
  onCreate,
  onArchive,
}: {
  title: string;
  icon: typeof ClipboardCheck;
  rows: Array<{ id: string; title: string; active?: boolean; [key: string]: unknown }>;
  actionLabel: string;
  onCreate?: () => void;
  onArchive?: (row: { id: string; title: string; active?: boolean; [key: string]: unknown }) => unknown;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Icon className="size-5 text-emerald-400" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        {onCreate && <Button onClick={onCreate}><Plus className="size-4" /> {actionLabel}</Button>}
      </div>
      <AdminDataTable
        rows={rows}
        columns={[
          { key: "title", header: "Title", render: (row) => <span className="font-semibold text-white">{row.title}</span> },
          { key: "detail", header: "Detail", render: (row) => <span className="text-sm text-slate-400">{String(row.detail ?? "")}</span> },
          { key: "state", header: "State", render: (row) => <AdminStatusBadge status={row.active === false ? "Hidden" : "Active"} variant={row.active === false ? "muted" : "success"} /> },
          {
            key: "actions",
            header: "Actions",
            render: (row) => onArchive ? <IconAction label={row.active === false ? "Restore" : "Archive"} icon={row.active === false ? RotateCcw : Archive} onClick={() => void onArchive(row)} /> : <span className="text-xs text-slate-500">{actionLabel}</span>,
          },
        ]}
        emptyMessage="No records yet."
      />
    </section>
  );
}

function OperationalPanel({ tab }: { tab: AcademyTab }) {
  const tile = featureTiles.find(([label]) => label === tab);
  const Icon = tile?.[1] ?? Library;
  const description = tile?.[2] ?? "Operational records are managed through the Academy workflow and audit log.";
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
      <Icon className="size-7 text-emerald-400" />
      <h3 className="mt-4 text-lg font-semibold text-white">{tab}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <AdminStatPill label="Data source" value="PostgreSQL" tone="success" />
        <AdminStatPill label="Audit logging" value="Enabled" />
        <AdminStatPill label="Permissions" value="Admin protected" tone="info" />
      </div>
    </section>
  );
}

function PublicLearnersPanel({
  applications,
  resourceApplications,
  action,
}: {
  applications: AcademyData["publicLearnerApplications"];
  resourceApplications: NonNullable<AcademyData["resourceAccessApplications"]>;
  action: (body: Record<string, unknown>, success: string) => Promise<unknown>;
}) {
  const pendingCount =
    applications.filter((item) => item.status === "PAYMENT_UPLOADED").length +
    resourceApplications.filter((item) => item.status === "PAYMENT_UPLOADED").length;

  const resourceRows = resourceApplications.map((row) => ({
    id: row.id,
    status: row.status,
    learnerType: row.learnerType,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    amount: row.amount,
    currency: row.currency,
    proofUrl: row.proofUrl,
    adminNote: row.adminNote,
    productLabel:
      row.resourceKind === "TRAINING_MANUAL"
        ? "Training manual"
        : `${row.course?.title ?? "Course"} toolkit`,
    reviewAction: "review_resource_access" as const,
    reviewIdKey: "accessId" as const,
  }));

  const enrolmentRows = applications.map((row) => ({
    id: row.id,
    status: row.status,
    learnerType: row.learnerType,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    amount: row.amount,
    currency: row.currency,
    proofUrl: row.proofUrl,
    adminNote: row.adminNote,
    productLabel: row.course.title,
    reviewAction: "review_public_learner" as const,
    reviewIdKey: "applicationId" as const,
  }));

  const rows = [...enrolmentRows, ...resourceRows];

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <h3 className="font-semibold text-white">Learner Registrations & Resource Access</h3>
          <p className="mt-1 text-sm text-slate-400">Review course enrolments, field toolkit purchases, and training manual access.</p>
        </div>
        <AdminStatusBadge status={`${pendingCount} pending`} variant="warning" />
      </div>
      <AdminDataTable
        rows={rows}
        columns={[
          {
            key: "learner",
            header: "Learner",
            render: (row) => (
              <div>
                <p className="font-semibold text-white">{row.fullName}</p>
                <p className="text-xs text-slate-500">{row.email}{row.phone ? ` - ${row.phone}` : ""}</p>
              </div>
            ),
          },
          { key: "product", header: "Product", render: (row) => <span className="text-sm text-slate-300">{row.productLabel}</span> },
          { key: "type", header: "Type", render: (row) => <AdminStatusBadge status={row.learnerType === "PUBLIC_LEARNER" ? "Training only" : "Agent training"} variant={row.learnerType === "PUBLIC_LEARNER" ? "info" : "success"} /> },
          { key: "amount", header: "Amount", render: (row) => `${row.currency} ${row.amount.toFixed(2)}` },
          { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status.replace(/_/g, " ")} variant={row.status === "APPROVED" ? "success" : row.status === "REJECTED" ? "danger" : "warning"} /> },
          {
            key: "proof",
            header: "Proof",
            render: (row) => row.proofUrl ? <a href={row.proofUrl} target="_blank" className="text-sm font-semibold text-emerald-300">Open proof</a> : <span className="text-xs text-slate-500">Not uploaded</span>,
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button disabled={row.status === "APPROVED"} onClick={() => void action({ action: row.reviewAction, [row.reviewIdKey]: row.id, status: "APPROVED" }, "Access approved.")}>
                  Approve
                </Button>
                <Button variant="secondary" disabled={row.status === "REJECTED"} onClick={() => void action({ action: row.reviewAction, [row.reviewIdKey]: row.id, status: "REJECTED", adminNote: "Payment proof could not be verified. Please upload a clearer proof of payment." }, "Registration rejected.")}>
                  Reject
                </Button>
              </div>
            ),
          },
        ]}
        emptyMessage="No learner registrations or resource access requests yet."
      />
    </section>
  );
}

function CoursePreview({ course, onClose }: { course: AcademyCourse; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <section className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Course preview</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{course.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{course.description}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminStatPill label="Status" value={course.status} tone={course.status === "PUBLISHED" ? "success" : "default"} />
          <AdminStatPill label="Visibility" value={course.visibility.replace(/_/g, " ")} />
          <AdminStatPill label="Difficulty" value={course.difficulty} />
          <AdminStatPill label="Public price" value={`${course.currency} ${Number(course.publicPrice ?? course.price).toFixed(2)}`} tone="info" />
          <AdminStatPill label="Agent price" value={`${course.currency} ${Number(course.agentPrice ?? 0).toFixed(2)}`} tone="info" />
          <AdminStatPill label="Access days" value={course.accessDurationDays} />
          <AdminStatPill label="Passing" value={`${course.passingPercentage}%`} />
          <AdminStatPill label="Certificate" value={course.certificateEnabled ? "Enabled" : "Disabled"} />
          <AdminStatPill label="Public registration" value={course.registrationOpen ? "Open" : "Closed"} tone={course.registrationOpen ? "success" : "default"} />
        </div>
        <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-sm font-semibold text-white">Admin editable fields</p>
          <p className="mt-2 text-sm text-slate-400">Title, description, instructor, status, visibility, pricing for public learners, pricing for agents, currency, public registration, access duration, certificate availability, difficulty, pass percentage, tags, and featured state.</p>
        </div>
      </section>
    </div>
  );
}

function courseFormDefaults(course?: AcademyCourse | null) {
  return {
    title: course?.title ?? "",
    description: course?.description ?? "",
    categoryId: course?.categoryId ?? "",
    difficulty: course?.difficulty ?? "BEGINNER" as AcademyCourse["difficulty"],
    status: course?.status ?? "DRAFT" as AcademyCourse["status"],
    visibility: course?.visibility ?? "INTERNAL_ONLY" as AcademyCourse["visibility"],
    instructor: course?.instructor ?? "",
    estimatedHours: Number(course?.estimatedHours ?? 1),
    passingPercentage: Number(course?.passingPercentage ?? 80),
    language: course?.language ?? "English",
    tags: course?.tags?.join(", ") ?? "",
    featured: Boolean(course?.featured),
    certificateEnabled: course?.certificateEnabled ?? true,
    price: Number(course?.price ?? course?.publicPrice ?? 0),
    publicPrice: Number(course?.publicPrice ?? course?.price ?? 0),
    agentPrice: Number(course?.agentPrice ?? 0),
    toolkitPublicPrice: Number(course?.toolkitPublicPrice ?? 15),
    toolkitAgentPrice: Number(course?.toolkitAgentPrice ?? 0),
    toolkitSalesEnabled: course?.toolkitSalesEnabled !== false,
    currency: course?.currency ?? "USD",
    registrationOpen: Boolean(course?.registrationOpen),
    accessDurationDays: Number(course?.accessDurationDays ?? 365),
  };
}

function CourseDrawer({ open, busy, course: editingCourse, onClose, onSave }: { open: boolean; busy: boolean; course?: AcademyCourse | null; onClose: () => void; onSave: (course: Record<string, unknown>) => Promise<unknown> }) {
  const [course, setCourse] = useState(courseFormDefaults(editingCourse));
  useEffect(() => {
    if (open) setCourse(courseFormDefaults(editingCourse));
  }, [editingCourse, open]);
  const editing = Boolean(editingCourse);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Course" : "Create Course"} description="Admin-controlled courses with status, visibility, public learner pricing, agent pricing, certificates, access duration, and analytics." onClose={onClose} width="xl">
      <FormGrid>
        <TextInput label="Course title" value={course.title} onChange={(title) => setCourse({ ...course, title })} />
        <TextInput label="Instructor" value={course.instructor} onChange={(instructor) => setCourse({ ...course, instructor })} />
        <TextArea label="Description" value={course.description} onChange={(description) => setCourse({ ...course, description })} className="sm:col-span-2" />
        <SelectInput label="Difficulty" value={course.difficulty} options={["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]} onChange={(difficulty) => setCourse({ ...course, difficulty: difficulty as AcademyCourse["difficulty"] })} />
        <SelectInput label="Status" value={course.status} options={["DRAFT", "PUBLISHED", "ARCHIVED"]} onChange={(status) => setCourse({ ...course, status: status as AcademyCourse["status"] })} />
        <SelectInput label="Visibility" value={course.visibility} options={["INTERNAL_ONLY", "PUBLIC", "BRANCH_SPECIFIC", "ROLE_BASED"]} onChange={(visibility) => setCourse({ ...course, visibility: visibility as AcademyCourse["visibility"] })} />
        <TextInput label="Estimated hours" type="number" value={String(course.estimatedHours)} onChange={(estimatedHours) => setCourse({ ...course, estimatedHours: Number(estimatedHours) })} />
        <TextInput label="Passing %" type="number" value={String(course.passingPercentage)} onChange={(passingPercentage) => setCourse({ ...course, passingPercentage: Number(passingPercentage) })} />
        <TextInput label="Legacy/default price" type="number" value={String(course.price)} onChange={(price) => setCourse({ ...course, price: Number(price), publicPrice: course.publicPrice || Number(price) })} />
        <TextInput label="Public learner price" type="number" value={String(course.publicPrice)} onChange={(publicPrice) => setCourse({ ...course, publicPrice: Number(publicPrice), price: Number(publicPrice) })} />
        <TextInput label="Agent price" type="number" value={String(course.agentPrice)} onChange={(agentPrice) => setCourse({ ...course, agentPrice: Number(agentPrice) })} />
        <TextInput label="Toolkit public price" type="number" value={String(course.toolkitPublicPrice)} onChange={(toolkitPublicPrice) => setCourse({ ...course, toolkitPublicPrice: Number(toolkitPublicPrice) })} />
        <TextInput label="Toolkit agent price" type="number" value={String(course.toolkitAgentPrice)} onChange={(toolkitAgentPrice) => setCourse({ ...course, toolkitAgentPrice: Number(toolkitAgentPrice) })} />
        <TextInput label="Currency" value={course.currency} onChange={(currency) => setCourse({ ...course, currency })} />
        <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2"><input type="checkbox" checked={course.toolkitSalesEnabled} onChange={(e) => setCourse({ ...course, toolkitSalesEnabled: e.target.checked })} /> Field toolkit sales enabled (locked until purchased)</label>
        <TextInput label="Access duration days" type="number" value={String(course.accessDurationDays)} onChange={(accessDurationDays) => setCourse({ ...course, accessDurationDays: Number(accessDurationDays) })} />
        <TextInput label="Tags" value={course.tags} onChange={(tags) => setCourse({ ...course, tags })} />
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={course.featured} onChange={(e) => setCourse({ ...course, featured: e.target.checked })} /> Featured course</label>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={course.registrationOpen} onChange={(e) => setCourse({ ...course, registrationOpen: e.target.checked, visibility: e.target.checked ? "PUBLIC" : course.visibility })} /> Open to public learners</label>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={course.certificateEnabled} onChange={(e) => setCourse({ ...course, certificateEnabled: e.target.checked })} /> Certificate enabled</label>
      </FormGrid>
      <DrawerActions busy={busy} disabled={!course.title.trim() || !course.description.trim()} onClose={onClose} onSave={() => onSave({ ...course, tags: course.tags })} label={editing ? "Save course" : "Create course"} />
    </AdminDrawer>
  );
}

function DocumentDrawer({ open, busy, onClose, onSave }: { open: boolean; busy: boolean; onClose: () => void; onSave: (document: Record<string, unknown>) => Promise<unknown> }) {
  const { showToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [document, setDocument] = useState({ title: "", description: "", fileUrl: "", fileName: "", fileType: "PDF", tags: "", permissions: "ADMIN,AGENT", fileSizeBytes: 0 });
  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const dataUrl = await readFile(file);
    const result = await apiFetch<{ url: string; filename: string; size: number }>("/api/v1/uploads", { method: "POST", body: JSON.stringify({ dataUrl, kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "document", folder: "academy" }) });
    if (!result.data) {
      showToast(result.error?.message ?? "Upload failed.", "error");
      return;
    }
    setDocument({ ...document, fileUrl: result.data.url, fileName: file.name, fileSizeBytes: result.data.size, title: document.title || file.name.replace(/\.[^.]+$/, ""), fileType: detectDocumentType(file.name, file.type) });
  }
  return (
    <AdminDrawer open={open} title="Upload Document" description="PDF, DOCX, XLSX, PPTX, images, video, audio, and ZIP files with preview, download, versioning, search, permissions, and audit log." onClose={onClose} width="xl">
      <div className="mb-4 rounded-xl border border-dashed border-white/15 bg-slate-900/60 p-5 text-center">
        <Upload className="mx-auto size-7 text-emerald-400" />
        <p className="mt-2 font-semibold text-white">{document.fileName || "Choose an Academy resource"}</p>
        <p className="mt-1 text-xs text-slate-500">Supported: {documentTypes.join(", ")}</p>
        <Button className="mt-4" variant="secondary" onClick={() => inputRef.current?.click()}>Select file</Button>
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.mp3,.wav,.m4a,.zip" onChange={(event) => void upload(event.target.files)} />
      </div>
      <FormGrid>
        <TextInput label="Title" value={document.title} onChange={(title) => setDocument({ ...document, title })} />
        <SelectInput label="File type" value={document.fileType} options={[...documentTypes]} onChange={(fileType) => setDocument({ ...document, fileType })} />
        <TextArea label="Description" value={document.description} onChange={(description) => setDocument({ ...document, description })} className="sm:col-span-2" />
        <TextInput label="Tags" value={document.tags} onChange={(tags) => setDocument({ ...document, tags })} />
        <TextInput label="Permissions" value={document.permissions} onChange={(permissions) => setDocument({ ...document, permissions })} />
      </FormGrid>
      <DrawerActions busy={busy} disabled={!document.fileUrl} onClose={onClose} onSave={() => onSave(document)} label="Save document" />
    </AdminDrawer>
  );
}

function VideoDrawer({ open, busy, onClose, onSave }: { open: boolean; busy: boolean; onClose: () => void; onSave: (video: Record<string, unknown>) => Promise<unknown> }) {
  const [video, setVideo] = useState({ title: "", description: "", category: "Training", videoUrl: "", durationSeconds: 0, captionsUrl: "", downloadable: false, tags: "" });
  return (
    <AdminDrawer open={open} title="Add Video" description="Add streamed Academy videos with watch tracking, captions, bookmarks, notes, and analytics." onClose={onClose} width="xl">
      <FormGrid>
        <TextInput label="Title" value={video.title} onChange={(title) => setVideo({ ...video, title })} />
        <TextInput label="Category" value={video.category} onChange={(category) => setVideo({ ...video, category })} />
        <TextInput label="Video URL" value={video.videoUrl} onChange={(videoUrl) => setVideo({ ...video, videoUrl })} className="sm:col-span-2" />
        <TextArea label="Description" value={video.description} onChange={(description) => setVideo({ ...video, description })} className="sm:col-span-2" />
        <TextInput label="Duration seconds" type="number" value={String(video.durationSeconds)} onChange={(durationSeconds) => setVideo({ ...video, durationSeconds: Number(durationSeconds) })} />
        <TextInput label="Captions URL" value={video.captionsUrl} onChange={(captionsUrl) => setVideo({ ...video, captionsUrl })} />
      </FormGrid>
      <DrawerActions busy={busy} onClose={onClose} onSave={() => onSave(video)} label="Add video" />
    </AdminDrawer>
  );
}

function QuickBuilderDrawer({ type, busy, courses, onClose, onSave }: { type: string | null; busy: boolean; courses: AcademyCourse[]; onClose: () => void; onSave: (body: Record<string, unknown>, success: string) => Promise<unknown> }) {
  const [form, setForm] = useState({ title: "", description: "", courseId: "", durationMinutes: 60, passingScore: 80, passingPercentage: 80, points: 100 });
  const config = type === "quiz" ? ["Create Quiz", "create_quiz", "quiz", "Quiz saved."] : type === "exam" ? ["Create Final Exam", "create_exam", "exam", "Exam saved."] : type === "assignment" ? ["Create Assignment", "create_assignment", "assignment", "Assignment saved."] : null;
  if (!config) return null;
  return (
    <AdminDrawer open title={config[0]} onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} className="sm:col-span-2" />
        <SelectInput label="Course" value={form.courseId} options={["", ...courses.map((course) => course.id)]} labels={Object.fromEntries(courses.map((course) => [course.id, course.title]))} onChange={(courseId) => setForm({ ...form, courseId })} className="sm:col-span-2" />
        {type === "assignment" ? <TextArea label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} className="sm:col-span-2" /> : null}
        {type === "exam" ? <TextInput label="Duration minutes" type="number" value={String(form.durationMinutes)} onChange={(durationMinutes) => setForm({ ...form, durationMinutes: Number(durationMinutes) })} /> : null}
        {type === "exam" ? <TextInput label="Passing score" type="number" value={String(form.passingScore)} onChange={(passingScore) => setForm({ ...form, passingScore: Number(passingScore) })} /> : null}
        {type === "quiz" ? <TextInput label="Passing percentage" type="number" value={String(form.passingPercentage)} onChange={(passingPercentage) => setForm({ ...form, passingPercentage: Number(passingPercentage) })} /> : null}
        {type === "assignment" ? <TextInput label="Points" type="number" value={String(form.points)} onChange={(points) => setForm({ ...form, points: Number(points) })} /> : null}
      </FormGrid>
      <DrawerActions busy={busy} onClose={onClose} onSave={() => onSave({ action: config[1], [config[2]]: form }, config[3])} label={config[0]} />
    </AdminDrawer>
  );
}

function LearningPathDrawer({ open, busy, courses, onClose, onSave }: { open: boolean; busy: boolean; courses: AcademyCourse[]; onClose: () => void; onSave: (path: Record<string, unknown>) => Promise<unknown> }) {
  const [path, setPath] = useState({ title: "", description: "", status: "PUBLISHED", badgeTitle: "", courseIds: [] as string[] });
  return (
    <AdminDrawer open={open} title="Create Learning Path" description="Combine courses into a sequenced Academy programme with automatic progress tracking." onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Path title" value={path.title} onChange={(title) => setPath({ ...path, title })} />
        <SelectInput label="Status" value={path.status} options={["DRAFT", "PUBLISHED", "ARCHIVED"]} onChange={(status) => setPath({ ...path, status })} />
        <TextInput label="Badge title" value={path.badgeTitle} onChange={(badgeTitle) => setPath({ ...path, badgeTitle })} />
        <TextArea label="Description" value={path.description} onChange={(description) => setPath({ ...path, description })} className="sm:col-span-2" />
      </FormGrid>
      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-sm font-semibold text-white">Courses</p>
        <div className="mt-3 space-y-2">
          {courses.map((course) => (
            <label key={course.id} className="flex items-start gap-2 rounded-lg border border-white/10 p-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={path.courseIds.includes(course.id)}
                onChange={(event) =>
                  setPath({
                    ...path,
                    courseIds: event.target.checked ? [...path.courseIds, course.id] : path.courseIds.filter((id) => id !== course.id),
                  })
                }
              />
              <span><span className="font-semibold text-white">{course.title}</span><span className="block text-xs text-slate-500">{course.status} - {course.estimatedHours}h</span></span>
            </label>
          ))}
        </div>
      </div>
      <DrawerActions busy={busy} disabled={!path.title || !path.courseIds.length} onClose={onClose} onSave={() => onSave(path)} label="Create path" />
    </AdminDrawer>
  );
}

function AnnouncementDrawer({ open, busy, onClose, onSave }: { open: boolean; busy: boolean; onClose: () => void; onSave: (announcement: Record<string, unknown>) => Promise<unknown> }) {
  const [announcement, setAnnouncement] = useState({ title: "", body: "", audience: "ALL", publishedAt: true });
  return (
    <AdminDrawer open={open} title="Publish Announcement" description="Send Academy announcements to agents, learners, trainers, or all users." onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Title" value={announcement.title} onChange={(title) => setAnnouncement({ ...announcement, title })} />
        <SelectInput label="Audience" value={announcement.audience} options={["ALL", "AGENTS", "LEARNERS", "TRAINERS", "ADMINS"]} onChange={(audience) => setAnnouncement({ ...announcement, audience })} />
        <TextArea label="Message" value={announcement.body} onChange={(body) => setAnnouncement({ ...announcement, body })} className="sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={announcement.publishedAt} onChange={(event) => setAnnouncement({ ...announcement, publishedAt: event.target.checked })} />
          Publish immediately
        </label>
      </FormGrid>
      <DrawerActions busy={busy} disabled={!announcement.title || !announcement.body} onClose={onClose} onSave={() => onSave(announcement)} label="Publish" />
    </AdminDrawer>
  );
}

function BadgeDrawer({ open, busy, onClose, onSave }: { open: boolean; busy: boolean; onClose: () => void; onSave: (badge: Record<string, unknown>) => Promise<unknown> }) {
  const [badge, setBadge] = useState({ name: "", description: "", xp: 100, iconUrl: "", active: true });
  return (
    <AdminDrawer open={open} title="Create Badge" description="Create automatic Academy achievements, XP rewards, and learner recognition badges." onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Badge name" value={badge.name} onChange={(name) => setBadge({ ...badge, name })} />
        <TextInput label="XP" type="number" value={String(badge.xp)} onChange={(xp) => setBadge({ ...badge, xp: Number(xp) })} />
        <TextInput label="Icon URL" value={badge.iconUrl} onChange={(iconUrl) => setBadge({ ...badge, iconUrl })} />
        <TextArea label="Description" value={badge.description} onChange={(description) => setBadge({ ...badge, description })} className="sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={badge.active} onChange={(event) => setBadge({ ...badge, active: event.target.checked })} />
          Active
        </label>
      </FormGrid>
      <DrawerActions busy={busy} disabled={!badge.name} onClose={onClose} onSave={() => onSave(badge)} label="Create badge" />
    </AdminDrawer>
  );
}

function LessonDrawer({ open, busy, lesson: editingLesson, courses: _courses, onClose, onSave }: { open: boolean; busy: boolean; lesson?: AcademyLesson | null; courses: AcademyCourse[]; onClose: () => void; onSave: (lesson: Record<string, unknown>) => Promise<unknown> }) {
  const [lesson, setLesson] = useState({
    title: editingLesson?.title ?? "",
    summary: editingLesson?.summary ?? "",
    richText: editingLesson?.richText ?? "",
    videoUrl: editingLesson?.videoUrl ?? "",
    embeddedVideoUrl: editingLesson?.embeddedVideoUrl ?? "",
    pdfUrl: editingLesson?.pdfUrl ?? "",
    audioUrl: editingLesson?.audioUrl ?? "",
    estimatedMinutes: editingLesson?.estimatedMinutes ?? 30,
    completionRequirement: editingLesson?.completionRequirement ?? "VIEW",
    sortOrder: editingLesson?.sortOrder ?? 0,
  });
  const editing = Boolean(editingLesson);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Lesson" : "Create Lesson"} description="Create and edit Academy lessons with rich text, video, PDF, audio, and completion requirements." onClose={onClose} width="xl">
      <FormGrid>
        <TextInput label="Lesson title" value={lesson.title} onChange={(title) => setLesson({ ...lesson, title })} className="sm:col-span-2" />
        <TextArea label="Summary" value={lesson.summary} onChange={(summary) => setLesson({ ...lesson, summary })} className="sm:col-span-2" />
        <TextArea label="Rich content (HTML)" value={lesson.richText} onChange={(richText) => setLesson({ ...lesson, richText })} className="sm:col-span-2" rows={6} />
        <TextInput label="Video URL" value={lesson.videoUrl} onChange={(videoUrl) => setLesson({ ...lesson, videoUrl })} className="sm:col-span-2" />
        <TextInput label="Embedded video URL (YouTube/Vimeo)" value={lesson.embeddedVideoUrl} onChange={(embeddedVideoUrl) => setLesson({ ...lesson, embeddedVideoUrl })} className="sm:col-span-2" />
        <TextInput label="PDF URL" value={lesson.pdfUrl} onChange={(pdfUrl) => setLesson({ ...lesson, pdfUrl })} />
        <TextInput label="Audio URL" value={lesson.audioUrl} onChange={(audioUrl) => setLesson({ ...lesson, audioUrl })} />
        <TextInput label="Estimated minutes" type="number" value={String(lesson.estimatedMinutes)} onChange={(estimatedMinutes) => setLesson({ ...lesson, estimatedMinutes: Number(estimatedMinutes) })} />
        <SelectInput label="Completion requirement" value={lesson.completionRequirement} options={["VIEW", "COMPLETE_QUIZ", "SUBMIT_ASSIGNMENT"]} onChange={(completionRequirement) => setLesson({ ...lesson, completionRequirement })} />
        <TextInput label="Sort order" type="number" value={String(lesson.sortOrder)} onChange={(sortOrder) => setLesson({ ...lesson, sortOrder: Number(sortOrder) })} />
      </FormGrid>
      <DrawerActions busy={busy} disabled={!lesson.title.trim()} onClose={onClose} onSave={() => onSave(lesson)} label={editing ? "Save lesson" : "Create lesson"} />
    </AdminDrawer>
  );
}

function ModuleDrawer({ open, busy, module: editingModule, courses, onClose, onSave }: { open: boolean; busy: boolean; module?: { id: string; courseId: string; title: string; description?: string; sortOrder: number } | null; courses: AcademyCourse[]; onClose: () => void; onSave: (module: Record<string, unknown>) => Promise<unknown> }) {
  const [moduleData, setModuleData] = useState({
    courseId: editingModule?.courseId ?? "",
    title: editingModule?.title ?? "",
    description: editingModule?.description ?? "",
    sortOrder: editingModule?.sortOrder ?? 0,
  });
  const editing = Boolean(editingModule);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Module" : "Create Module"} description="Create and edit course modules to organize your lessons." onClose={onClose} width="lg">
      <FormGrid>
        <SelectInput label="Course" value={moduleData.courseId} options={["", ...courses.map((c) => c.id)]} labels={Object.fromEntries(courses.map((c) => [c.id, c.title]))} onChange={(courseId) => setModuleData({ ...moduleData, courseId })} className="sm:col-span-2" />
        <TextInput label="Module title" value={moduleData.title} onChange={(title) => setModuleData({ ...moduleData, title })} className="sm:col-span-2" />
        <TextArea label="Description" value={moduleData.description} onChange={(description) => setModuleData({ ...moduleData, description })} className="sm:col-span-2" />
        <TextInput label="Sort order" type="number" value={String(moduleData.sortOrder)} onChange={(sortOrder) => setModuleData({ ...moduleData, sortOrder: Number(sortOrder) })} />
      </FormGrid>
      <DrawerActions busy={busy} disabled={!moduleData.title.trim() || !moduleData.courseId} onClose={onClose} onSave={() => onSave(moduleData)} label={editing ? "Save module" : "Create module"} />
    </AdminDrawer>
  );
}

function AcademySettingsPanel({ settings, auditLogs, onSave }: { settings: Record<string, unknown>; auditLogs: AcademyData["auditLogs"]; onSave: (settings: Record<string, unknown>) => Promise<unknown> }) {
  const quizSettings = (settings.quizSettings ?? {}) as Record<string, unknown>;
  const enrolmentSettings = (settings.enrolmentSettings ?? {}) as Record<string, unknown>;
  const completionRules = (settings.completionRules ?? {}) as Record<string, unknown>;
  const resourceAccess = (settings.resourceAccess ?? {}) as Record<string, unknown>;
  const [draft, setDraft] = useState({
    academyName: String(settings.academyName ?? "HomeLink Agent Academy"),
    certificatePrefix: String(settings.certificatePrefix ?? "HLA"),
    primaryColour: String(settings.primaryColour ?? "#008b68"),
    accentColour: String(settings.accentColour ?? "#c6a15b"),
    paymentInstructions: String(settings.paymentInstructions ?? "Upload proof of payment for admin approval before course activation."),
    accessDurationDays: String(settings.accessDurationDays ?? "365"),
    supportedFormats: Array.isArray(settings.supportedFormats) ? (settings.supportedFormats as string[]).join(", ") : "PDF, DOCX, XLSX, PPTX, IMAGE, VIDEO, AUDIO, ZIP",
    defaultPassMark: String(quizSettings.defaultPassMark ?? "80"),
    maxQuizAttempts: String(quizSettings.maxAttempts ?? "3"),
    allowTrainingOnly: enrolmentSettings.allowTrainingOnly !== false,
    requirePaymentProof: enrolmentSettings.requirePaymentProof !== false,
    autoIssueCertificate: completionRules.autoIssueCertificate !== false,
    requireAllLessons: completionRules.requireAllLessons !== false,
    emailFromName: String((settings.emailSettings as Record<string, unknown>)?.fromName ?? "HomeLink Academy"),
    emailWelcomeSubject: String((settings.emailSettings as Record<string, unknown>)?.welcomeSubject ?? "Welcome to HomeLink Academy"),
    emailCertificateSubject: String((settings.emailSettings as Record<string, unknown>)?.certificateSubject ?? "Your certificate is ready"),
    notifyQuizResults: (settings.notificationSettings as Record<string, unknown>)?.quizResults !== false,
    notifyAssignmentReview: (settings.notificationSettings as Record<string, unknown>)?.assignmentReview !== false,
    notifyCourseUpdates: (settings.notificationSettings as Record<string, unknown>)?.courseUpdates !== false,
    gradingScale: String((settings.gradingSettings as Record<string, unknown>)?.scale ?? "percentage"),
    allowManualGrading: (settings.gradingSettings as Record<string, unknown>)?.allowManualGrading !== false,
    dashboardWelcome: String((settings.branding as Record<string, unknown>)?.dashboardWelcome ?? "Continue your professional training journey."),
    manualPublicPrice: String(resourceAccess.manualPublicPrice ?? "35"),
    manualAgentPrice: String(resourceAccess.manualAgentPrice ?? "15"),
    manualSalesEnabled: resourceAccess.manualSalesEnabled !== false,
  });
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5 xl:col-span-2 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Academy LMS Settings</h3>
            <p className="mt-1 text-sm text-slate-400">General, branding, payments, certificates, quizzes, enrolment, and completion rules.</p>
          </div>
          <Button
            onClick={() =>
              void onSave({
                ...settings,
                academyName: draft.academyName,
                certificatePrefix: draft.certificatePrefix,
                primaryColour: draft.primaryColour,
                accentColour: draft.accentColour,
                paymentInstructions: draft.paymentInstructions,
                accessDurationDays: Number(draft.accessDurationDays) || 365,
                supportedFormats: draft.supportedFormats.split(",").map((item) => item.trim()).filter(Boolean),
                quizSettings: { defaultPassMark: Number(draft.defaultPassMark) || 80, maxAttempts: Number(draft.maxQuizAttempts) || 3, showResults: true },
                enrolmentSettings: { allowTrainingOnly: draft.allowTrainingOnly, allowAgentTraining: true, requirePaymentProof: draft.requirePaymentProof },
                completionRules: { requireAllLessons: draft.requireAllLessons, requireFinalExam: false, autoIssueCertificate: draft.autoIssueCertificate },
                emailSettings: { fromName: draft.emailFromName, welcomeSubject: draft.emailWelcomeSubject, certificateSubject: draft.emailCertificateSubject },
                notificationSettings: { quizResults: draft.notifyQuizResults, assignmentReview: draft.notifyAssignmentReview, courseUpdates: draft.notifyCourseUpdates },
                gradingSettings: { scale: draft.gradingScale, allowManualGrading: draft.allowManualGrading },
                branding: { ...(settings.branding as object), dashboardWelcome: draft.dashboardWelcome, logoUrl: "/brand/homelink-full-lockup.png" },
                resourceAccess: {
                  manualPublicPrice: Number(draft.manualPublicPrice) || 35,
                  manualAgentPrice: Number(draft.manualAgentPrice) || 15,
                  manualSalesEnabled: draft.manualSalesEnabled,
                },
              })
            }
          >
            <CheckCircle2 className="size-4" /> Save All Settings
          </Button>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">General & Branding</p>
          <FormGrid>
            <TextInput label="Academy name" value={draft.academyName} onChange={(academyName) => setDraft({ ...draft, academyName })} />
            <TextInput label="Dashboard welcome message" value={draft.dashboardWelcome} onChange={(dashboardWelcome) => setDraft({ ...draft, dashboardWelcome })} />
            <TextInput label="Primary colour" value={draft.primaryColour} onChange={(primaryColour) => setDraft({ ...draft, primaryColour })} />
            <TextInput label="Accent colour" value={draft.accentColour} onChange={(accentColour) => setDraft({ ...draft, accentColour })} />
          </FormGrid>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">Certificates & Access</p>
          <FormGrid>
            <TextInput label="Certificate prefix" value={draft.certificatePrefix} onChange={(certificatePrefix) => setDraft({ ...draft, certificatePrefix })} />
            <TextInput label="Default access duration (days)" type="number" value={draft.accessDurationDays} onChange={(accessDurationDays) => setDraft({ ...draft, accessDurationDays })} />
            <TextInput label="Supported upload formats" value={draft.supportedFormats} onChange={(supportedFormats) => setDraft({ ...draft, supportedFormats })} className="sm:col-span-2" />
          </FormGrid>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">Training Manual Access</p>
          <FormGrid>
            <TextInput label="Manual public price" type="number" value={draft.manualPublicPrice} onChange={(manualPublicPrice) => setDraft({ ...draft, manualPublicPrice })} />
            <TextInput label="Manual agent price" type="number" value={draft.manualAgentPrice} onChange={(manualAgentPrice) => setDraft({ ...draft, manualAgentPrice })} />
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2"><input type="checkbox" checked={draft.manualSalesEnabled} onChange={(e) => setDraft({ ...draft, manualSalesEnabled: e.target.checked })} /> Training manual sales enabled (locked until purchased)</label>
          </FormGrid>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">Payments & Enrolment</p>
          <TextArea label="Payment instructions (shown to learners)" value={draft.paymentInstructions} onChange={(paymentInstructions) => setDraft({ ...draft, paymentInstructions })} className="sm:col-span-2" />
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.allowTrainingOnly} onChange={(e) => setDraft({ ...draft, allowTrainingOnly: e.target.checked })} /> Allow training-only registration (non-agents)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.requirePaymentProof} onChange={(e) => setDraft({ ...draft, requirePaymentProof: e.target.checked })} /> Require payment proof upload</label>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">Quizzes & Completion</p>
          <FormGrid>
            <TextInput label="Default pass mark (%)" type="number" value={draft.defaultPassMark} onChange={(defaultPassMark) => setDraft({ ...draft, defaultPassMark })} />
            <TextInput label="Max quiz attempts" type="number" value={draft.maxQuizAttempts} onChange={(maxQuizAttempts) => setDraft({ ...draft, maxQuizAttempts })} />
          </FormGrid>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.autoIssueCertificate} onChange={(e) => setDraft({ ...draft, autoIssueCertificate: e.target.checked })} /> Auto-issue certificate on course completion</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.requireAllLessons} onChange={(e) => setDraft({ ...draft, requireAllLessons: e.target.checked })} /> Require all lessons before completion</label>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">Emails & Notifications</p>
          <FormGrid>
            <TextInput label="Email sender name" value={draft.emailFromName} onChange={(emailFromName) => setDraft({ ...draft, emailFromName })} />
            <TextInput label="Welcome email subject" value={draft.emailWelcomeSubject} onChange={(emailWelcomeSubject) => setDraft({ ...draft, emailWelcomeSubject })} />
            <TextInput label="Certificate email subject" value={draft.emailCertificateSubject} onChange={(emailCertificateSubject) => setDraft({ ...draft, emailCertificateSubject })} />
            <TextInput label="Grading scale" value={draft.gradingScale} onChange={(gradingScale) => setDraft({ ...draft, gradingScale })} />
          </FormGrid>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.notifyQuizResults} onChange={(e) => setDraft({ ...draft, notifyQuizResults: e.target.checked })} /> Notify learners of quiz results</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.notifyAssignmentReview} onChange={(e) => setDraft({ ...draft, notifyAssignmentReview: e.target.checked })} /> Notify on assignment review</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.notifyCourseUpdates} onChange={(e) => setDraft({ ...draft, notifyCourseUpdates: e.target.checked })} /> Notify on course updates</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.allowManualGrading} onChange={(e) => setDraft({ ...draft, allowManualGrading: e.target.checked })} /> Allow manual assignment grading</label>
          </div>
        </div>
      </section>
      <ActivityPanel title="Audit Log" icon={Settings}>
        {auditLogs.slice(0, 12).map((entry) => (
          <MetricRow key={entry.id} label={entry.action.replace("academy.", "").replace(/\./g, " ")} value={new Date(entry.createdAt).toLocaleDateString()} />
        ))}
      </ActivityPanel>
    </div>
  );
}

function DocumentPreview({ document, onClose }: { document: AcademyDocument; onClose: () => void }) {
  const isImage = document.fileType === "IMAGE" || document.fileUrl.toLowerCase().match(/\.(png|jpe?g|webp|gif)$/);
  const isVideo = document.fileType === "VIDEO" || document.fileUrl.toLowerCase().match(/\.(mp4|webm|mov)$/);
  const isAudio = document.fileType === "AUDIO" || document.fileUrl.toLowerCase().match(/\.(mp3|wav|m4a|ogg)$/);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div><p className="font-semibold text-white">{document.title}</p><p className="text-xs text-slate-500">{document.fileType} - version {document.version}</p></div>
          <div className="flex gap-2"><a href={`/api/v1/academy/documents/${document.id}/download`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200"><Download className="size-4" /> Download</a><Button variant="secondary" onClick={onClose}>Close</Button></div>
        </div>
        <div className="h-[70vh] bg-slate-900 p-4">
          {isImage ? <img src={document.fileUrl} alt={document.title} className="h-full w-full object-contain" /> : isVideo ? <video src={document.fileUrl} controls className="h-full w-full bg-black" /> : isAudio ? <div className="flex h-full items-center justify-center"><audio src={document.fileUrl} controls className="w-full max-w-xl" /></div> : <iframe title={document.title} src={document.fileUrl} className="h-full w-full rounded-lg bg-white" />}
        </div>
      </section>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function TextInput({ label, value, onChange, type = "text", className }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return <label className={cn("text-sm text-slate-300", className)}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500/40" /></label>;
}

function TextArea({ label, value, onChange, className, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; className?: string; rows?: number }) {
  return <label className={cn("text-sm text-slate-300", className)}>{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500/40" /></label>;
}

function SelectInput({ label, value, options, labels = {}, onChange, className }: { label: string; value: string; options: readonly string[]; labels?: Record<string, string>; onChange: (value: string) => void; className?: string }) {
  return <label className={cn("text-sm text-slate-300", className)}>{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500/40">{options.map((option) => <option key={option || "none"} value={option}>{labels[option] ?? (option.replace(/_/g, " ") || "None")}</option>)}</select></label>;
}

function DrawerActions({ busy, disabled, onClose, onSave, label }: { busy: boolean; disabled?: boolean; onClose: () => void; onSave: () => void; label: string }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button disabled={busy || disabled} onClick={onSave}>{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} {label}</Button>
    </div>
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

function detectDocumentType(fileName: string, mime: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "DOCX";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "XLSX";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "PPTX";
  if (lower.endsWith(".zip")) return "ZIP";
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  return "PDF";
}

export function LessonContentManager({ lessons, documents, action }: { lessons: AcademyLesson[]; documents: AcademyDocument[]; action: (body: Record<string, unknown>, success: string) => Promise<unknown> }) {
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [contentTab, setContentTab] = useState<"videos" | "documents" | "resources" | "downloads">("videos");
  const [drawer, setDrawer] = useState<"video" | "resource" | "download" | "document" | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const busy = false;

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  return (
    <div className="space-y-4">
      <AdminFilterBar>
        <SelectInput
          label="Select Lesson"
          value={selectedLessonId}
          options={["", ...lessons.map((l) => l.id)]}
          labels={Object.fromEntries(lessons.map((l) => [l.id, `${l.title} (${l.section?.module?.course?.title ?? "No course"})`]))}
          onChange={setSelectedLessonId}
          className="lg:flex-1"
        />
        {selectedLesson && (
          <div className="flex gap-2">
            <Button variant={contentTab === "videos" ? "primary" : "secondary"} onClick={() => setContentTab("videos")}>Videos</Button>
            <Button variant={contentTab === "documents" ? "primary" : "secondary"} onClick={() => setContentTab("documents")}>Documents</Button>
            <Button variant={contentTab === "resources" ? "primary" : "secondary"} onClick={() => setContentTab("resources")}>Resources</Button>
            <Button variant={contentTab === "downloads" ? "primary" : "secondary"} onClick={() => setContentTab("downloads")}>Downloads</Button>
          </div>
        )}
      </AdminFilterBar>

      {!selectedLesson && (
        <AdminEmptyState icon={BookOpen} title="Select a lesson" description="Choose a lesson above to manage its content (videos, documents, resources, and downloads)." />
      )}

      {selectedLesson && contentTab === "videos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedItem(null); setDrawer("video"); }}><Plus className="size-4" /> Add Video</Button>
          </div>
          <AdminDataTable
            rows={selectedLesson.lessonVideos ?? []}
            columns={[
              { key: "title", header: "Video", render: (video: any) => <p className="font-semibold text-white">{video.title}</p> },
              { key: "provider", header: "Provider", render: (video: any) => video.provider },
              { key: "duration", header: "Duration", render: (video: any) => `${Math.round(video.durationSeconds / 60)} min` },
              {
                key: "actions",
                header: "Actions",
                render: (video: any) => (
                  <div className="flex gap-2">
                    <IconAction label="Edit" icon={Pencil} onClick={() => { setSelectedItem(video); setDrawer("video"); }} />
                    <IconAction label="Delete" icon={Trash2} onClick={() => {
                      if (window.confirm(`Delete video "${video.title}"?`)) {
                        void action({ action: "delete_lesson_video", videoId: video.id }, "Video deleted.");
                      }
                    }} />
                  </div>
                ),
              },
            ]}
            emptyMessage="No videos added to this lesson yet."
          />
        </div>
      )}

      {selectedLesson && contentTab === "documents" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedItem(null); setDrawer("document"); }}><Plus className="size-4" /> Link Document</Button>
          </div>
          <AdminDataTable
            rows={selectedLesson.lessonDocuments ?? []}
            columns={[
              { key: "document", header: "Document", render: (link: any) => {
                const doc = documents.find((d) => d.id === link.documentId);
                return <p className="font-semibold text-white">{doc?.title ?? "Unknown"}</p>;
              }},
              { key: "type", header: "Type", render: (link: any) => {
                const doc = documents.find((d) => d.id === link.documentId);
                return <AdminStatusBadge status={doc?.fileType ?? "PDF"} variant="info" />;
              }},
              {
                key: "actions",
                header: "Actions",
                render: (link: any) => (
                  <IconAction label="Remove" icon={Trash2} onClick={() => {
                    if (window.confirm("Remove this document link?")) {
                      void action({ action: "remove_lesson_document", linkId: link.id }, "Document removed.");
                    }
                  }} />
                ),
              },
            ]}
            emptyMessage="No documents linked to this lesson yet."
          />
        </div>
      )}

      {selectedLesson && contentTab === "resources" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedItem(null); setDrawer("resource"); }}><Plus className="size-4" /> Add Resource</Button>
          </div>
          <AdminDataTable
            rows={selectedLesson.lessonResources ?? []}
            columns={[
              { key: "title", header: "Resource", render: (resource: any) => <p className="font-semibold text-white">{resource.title}</p> },
              { key: "type", header: "Type", render: (resource: any) => resource.type },
              { key: "body", header: "Content", render: (resource: any) => <p className="text-xs text-slate-400 line-clamp-2">{resource.body}</p> },
              {
                key: "actions",
                header: "Actions",
                render: (resource: any) => (
                  <div className="flex gap-2">
                    <IconAction label="Edit" icon={Pencil} onClick={() => { setSelectedItem(resource); setDrawer("resource"); }} />
                    <IconAction label="Delete" icon={Trash2} onClick={() => {
                      if (window.confirm(`Delete resource "${resource.title}"?`)) {
                        void action({ action: "delete_lesson_resource", resourceId: resource.id }, "Resource deleted.");
                      }
                    }} />
                  </div>
                ),
              },
            ]}
            emptyMessage="No resources added to this lesson yet."
          />
        </div>
      )}

      {selectedLesson && contentTab === "downloads" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedItem(null); setDrawer("download"); }}><Plus className="size-4" /> Add Download</Button>
          </div>
          <AdminDataTable
            rows={selectedLesson.lessonDownloads ?? []}
            columns={[
              { key: "title", header: "Download", render: (download: any) => <p className="font-semibold text-white">{download.title}</p> },
              { key: "type", header: "Type", render: (download: any) => <AdminStatusBadge status={download.type} variant="info" /> },
              {
                key: "actions",
                header: "Actions",
                render: (download: any) => (
                  <div className="flex gap-2">
                    <IconAction label="Edit" icon={Pencil} onClick={() => { setSelectedItem(download); setDrawer("download"); }} />
                    <IconAction label="Delete" icon={Trash2} onClick={() => {
                      if (window.confirm(`Delete download "${download.title}"?`)) {
                        void action({ action: "delete_lesson_download", downloadId: download.id }, "Download deleted.");
                      }
                    }} />
                  </div>
                ),
              },
            ]}
            emptyMessage="No downloads added to this lesson yet."
          />
        </div>
      )}

      <LessonVideoDrawer open={drawer === "video"} busy={busy} lessonId={selectedLessonId} video={selectedItem} onClose={() => { setDrawer(null); setSelectedItem(null); }} onSave={(video) => action(selectedItem ? { action: "update_lesson_video", videoId: selectedItem.id, video } : { action: "add_lesson_video", video }, selectedItem ? "Video updated." : "Video added.")} />
      <LessonResourceDrawer open={drawer === "resource"} busy={busy} lessonId={selectedLessonId} resource={selectedItem} onClose={() => { setDrawer(null); setSelectedItem(null); }} onSave={(resource) => action(selectedItem ? { action: "update_lesson_resource", resourceId: selectedItem.id, resource } : { action: "add_lesson_resource", resource }, selectedItem ? "Resource updated." : "Resource added.")} />
      <LessonDownloadDrawer open={drawer === "download"} busy={busy} lessonId={selectedLessonId} download={selectedItem} onClose={() => { setDrawer(null); setSelectedItem(null); }} onSave={(download) => action(selectedItem ? { action: "update_lesson_download", downloadId: selectedItem.id, download } : { action: "add_lesson_download", download }, selectedItem ? "Download updated." : "Download added.")} />
    </div>
  );
}

function LessonVideoDrawer({ open, busy, lessonId, video, onClose, onSave }: { open: boolean; busy: boolean; lessonId: string; video?: any; onClose: () => void; onSave: (video: Record<string, unknown>) => Promise<unknown> }) {
  const [form, setForm] = useState({
    title: video?.title ?? "",
    url: video?.url ?? "",
    provider: video?.provider ?? "UPLOAD",
    durationSeconds: video?.durationSeconds ?? 0,
    captionsUrl: video?.captionsUrl ?? "",
    downloadable: video?.downloadable ?? false,
  });
  const editing = Boolean(video);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Video" : "Add Video"} description="Add or edit lesson video content." onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Video title" value={form.title} onChange={(title) => setForm({ ...form, title })} className="sm:col-span-2" />
        <TextInput label="Video URL" value={form.url} onChange={(url) => setForm({ ...form, url })} className="sm:col-span-2" />
        <SelectInput label="Provider" value={form.provider} options={["UPLOAD", "YOUTUBE", "VIMEO", "EXTERNAL"]} onChange={(provider) => setForm({ ...form, provider })} />
        <TextInput label="Duration (seconds)" type="number" value={String(form.durationSeconds)} onChange={(durationSeconds) => setForm({ ...form, durationSeconds: Number(durationSeconds) })} />
        <TextInput label="Captions URL" value={form.captionsUrl} onChange={(captionsUrl) => setForm({ ...form, captionsUrl })} />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.downloadable} onChange={(e) => setForm({ ...form, downloadable: e.target.checked })} />
          Downloadable
        </label>
      </FormGrid>
      <DrawerActions busy={busy} disabled={!form.title.trim() || !form.url.trim()} onClose={onClose} onSave={() => onSave({ ...form, lessonId })} label={editing ? "Update video" : "Add video"} />
    </AdminDrawer>
  );
}

function LessonResourceDrawer({ open, busy, lessonId, resource, onClose, onSave }: { open: boolean; busy: boolean; lessonId: string; resource?: any; onClose: () => void; onSave: (resource: Record<string, unknown>) => Promise<unknown> }) {
  const [form, setForm] = useState({
    title: resource?.title ?? "",
    body: resource?.body ?? "",
    type: resource?.type ?? "TEXT",
    sortOrder: resource?.sortOrder ?? 0,
  });
  const editing = Boolean(resource);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Resource" : "Add Resource"} description="Add or edit lesson resources (text, links, etc.)." onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Resource title" value={form.title} onChange={(title) => setForm({ ...form, title })} className="sm:col-span-2" />
        <TextArea label="Resource content" value={form.body} onChange={(body) => setForm({ ...form, body })} className="sm:col-span-2" />
        <SelectInput label="Resource type" value={form.type} options={["TEXT", "LINK", "CODE", "QUOTE"]} onChange={(type) => setForm({ ...form, type })} />
        <TextInput label="Sort order" type="number" value={String(form.sortOrder)} onChange={(sortOrder) => setForm({ ...form, sortOrder: Number(sortOrder) })} />
      </FormGrid>
      <DrawerActions busy={busy} disabled={!form.title.trim()} onClose={onClose} onSave={() => onSave({ ...form, lessonId })} label={editing ? "Update resource" : "Add resource"} />
    </AdminDrawer>
  );
}

function LessonDownloadDrawer({ open, busy, lessonId, download, onClose, onSave }: { open: boolean; busy: boolean; lessonId: string; download?: any; onClose: () => void; onSave: (download: Record<string, unknown>) => Promise<unknown> }) {
  const [form, setForm] = useState({
    title: download?.title ?? "",
    url: download?.url ?? "",
    type: download?.type ?? "PDF",
  });
  const editing = Boolean(download);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Download" : "Add Download"} description="Add or edit lesson downloadable files." onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Download title" value={form.title} onChange={(title) => setForm({ ...form, title })} className="sm:col-span-2" />
        <TextInput label="Download URL" value={form.url} onChange={(url) => setForm({ ...form, url })} className="sm:col-span-2" />
        <SelectInput label="File type" value={form.type} options={["PDF", "DOCX", "XLSX", "PPTX", "IMAGE", "VIDEO", "AUDIO", "ZIP"]} onChange={(type) => setForm({ ...form, type })} />
      </FormGrid>
      <DrawerActions busy={busy} disabled={!form.title.trim() || !form.url.trim()} onClose={onClose} onSave={() => onSave({ ...form, lessonId })} label={editing ? "Update download" : "Add download"} />
    </AdminDrawer>
  );
}
