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
  FileArchive,
  FileText,
  Film,
  GraduationCap,
  Library,
  Loader2,
  Megaphone,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
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
  AdminTabStrip,
} from "@/components/admin/ui/admin-ui";
import { BarChart, MetricRow } from "@/components/admin/charts";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AcademyData = {
  metrics: Record<string, number>;
  courses: AcademyCourse[];
  documents: AcademyDocument[];
  videos: AcademyVideo[];
  quizzes: Array<{ id: string; title: string; passingPercentage: number; active: boolean }>;
  assignments: Array<{ id: string; title: string; points: number; active: boolean }>;
  exams: Array<{ id: string; title: string; durationMinutes: number; passingScore: number; active: boolean }>;
  certificates: Array<{ id: string; certificateNumber: string; agentId: string; status: string; issuedAt: string; expiresAt?: string }>;
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
  "Lessons",
  "Documents Library",
  "Video Library",
  "Quizzes",
  "Assignments",
  "Final Exams",
  "Certificates",
  "Learning Paths",
  "Announcements",
  "Discussion Board",
  "Leaderboard",
  "Badges",
  "Analytics",
  "Settings",
] as const;

type AcademyTab = (typeof academyTabs)[number];

const documentTypes = ["PDF", "DOCX", "XLSX", "PPTX", "IMAGE", "VIDEO", "AUDIO", "ZIP"] as const;
const featureTiles: Array<[AcademyTab, LucideIcon, string]> = [
  ["Lessons", BookOpen, "Visual lesson builder with rich text, media, downloads, comments, bookmarks, and progress tracking."],
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
  const [tab, setTab] = useState<AcademyTab>("Dashboard");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [drawer, setDrawer] = useState<"course" | "document" | "video" | "quiz" | "exam" | "assignment" | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<AcademyDocument | null>(null);
  const load = useCallback(async () => {
    const result = await apiFetch<AcademyData>("/api/v1/admin/academy");
    if (result.data) setData(result.data);
    else showToast(result.error?.message ?? "Academy could not load.", "error");
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const requested = searchParams.get("academyView");
    if (requested && academyTabs.includes(requested as AcademyTab)) {
      setTab(requested as AcademyTab);
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
      <AdminTabStrip tabs={academyTabs.map((item) => ({ id: item, label: item }))} active={tab} onChange={(id) => setTab(id as AcademyTab)} />

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
          <AdminFilterBar>
            <AdminSearchInput value={query} onChange={setQuery} placeholder="Search courses, tags, instructors..." className="lg:flex-1" />
            <AdminSelect value={statusFilter} onChange={setStatusFilter} options={["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"].map((value) => ({ value, label: value.replace("_", " ") }))} />
            <Button onClick={() => setDrawer("course")}><Plus className="size-4" /> New Course</Button>
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
                    <IconAction label="Duplicate" icon={Copy} onClick={() => void action({ action: "duplicate_course", courseId: course.id }, "Course duplicated.")} />
                    {course.status === "ARCHIVED" ? (
                      <IconAction label="Restore" icon={RotateCcw} onClick={() => void action({ action: "restore_course", courseId: course.id }, "Course restored.")} />
                    ) : (
                      <IconAction label="Archive" icon={Archive} onClick={() => void action({ action: "archive_course", courseId: course.id }, "Course archived.")} />
                    )}
                  </div>
                ),
              },
            ]}
            emptyMessage="No Academy courses match your filters."
          />
        </div>
      )}

      {tab === "Documents Library" && (
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

      {["Lessons", "Quizzes", "Assignments", "Final Exams", "Certificates", "Learning Paths", "Announcements", "Discussion Board", "Leaderboard", "Badges", "Analytics", "Settings"].includes(tab) && (
        <FeatureWorkbench
          tab={tab}
          data={data}
          openDrawer={(next) => setDrawer(next)}
        />
      )}

      <CourseDrawer open={drawer === "course"} busy={busy} onClose={() => setDrawer(null)} onSave={(course) => action({ action: "create_course", course }, "Course created in PostgreSQL.")} />
      <DocumentDrawer open={drawer === "document"} busy={busy} onClose={() => setDrawer(null)} onSave={(document) => action({ action: "create_document", document }, "Document saved with version control.")} />
      <VideoDrawer open={drawer === "video"} busy={busy} onClose={() => setDrawer(null)} onSave={(video) => action({ action: "create_video", video }, "Video added to the Academy library.")} />
      <QuickBuilderDrawer type={drawer} busy={busy} courses={data.courses} onClose={() => setDrawer(null)} onSave={action} />
      {previewDocument && <DocumentPreview document={previewDocument} onClose={() => setPreviewDocument(null)} />}
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
          {
            key: "actions",
            header: "Actions",
            render: (document) => (
              <div className="flex flex-wrap gap-2">
                <IconAction label="Preview" icon={Search} onClick={() => onPreview(document)} />
                <a href={document.fileUrl} download className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white" title="Download">
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

function FeatureWorkbench({ tab, data, openDrawer }: { tab: AcademyTab; data: AcademyData; openDrawer: (drawer: "quiz" | "exam" | "assignment" | null) => void }) {
  if (tab === "Quizzes") return <BuilderList title="Quiz Builder" icon={ClipboardCheck} rows={data.quizzes} actionLabel="Create Quiz" onCreate={() => openDrawer("quiz")} />;
  if (tab === "Assignments") return <BuilderList title="Assignments" icon={ClipboardCheck} rows={data.assignments} actionLabel="Create Assignment" onCreate={() => openDrawer("assignment")} />;
  if (tab === "Final Exams") return <BuilderList title="Final Examination System" icon={GraduationCap} rows={data.exams} actionLabel="Create Exam" onCreate={() => openDrawer("exam")} />;
  if (tab === "Certificates") return <BuilderList title="Certificate Management" icon={Award} rows={data.certificates.map((c) => ({ id: c.id, title: c.certificateNumber, active: c.status === "ACTIVE" }))} actionLabel="Auto Generated" />;
  if (tab === "Analytics") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <ActivityPanel title="Most Active Agents" icon={Trophy}>{data.mostActiveAgents.map((item) => <MetricRow key={item.agentId} label={item.agentId} value={item.actions} />)}</ActivityPanel>
        <ActivityPanel title="Agents Needing Attention" icon={Users}>{data.agentsNeedingAttention.map((item) => <MetricRow key={item.id} label={item.agentId} value={`${item.percentComplete}%`} />)}</ActivityPanel>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {featureTiles.filter(([label]) => label === tab).map(([label, Icon, description]) => (
        <section key={String(label)} className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
          <Icon className="size-7 text-emerald-400" />
          <h3 className="mt-4 text-lg font-semibold text-white">{label}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          <p className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">Backed by dedicated PostgreSQL tables and Academy audit logs.</p>
        </section>
      ))}
    </div>
  );
}

function BuilderList({ title, icon: Icon, rows, actionLabel, onCreate }: { title: string; icon: typeof ClipboardCheck; rows: Array<{ id: string; title: string; active?: boolean; [key: string]: unknown }>; actionLabel: string; onCreate?: () => void }) {
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
          { key: "state", header: "State", render: (row) => <AdminStatusBadge status={row.active === false ? "Hidden" : "Active"} variant={row.active === false ? "muted" : "success"} /> },
        ]}
        emptyMessage="No records yet."
      />
    </section>
  );
}

function CourseDrawer({ open, busy, onClose, onSave }: { open: boolean; busy: boolean; onClose: () => void; onSave: (course: Record<string, unknown>) => Promise<unknown> }) {
  const [course, setCourse] = useState({ title: "", description: "", categoryId: "", difficulty: "BEGINNER", status: "DRAFT", visibility: "INTERNAL_ONLY", instructor: "", estimatedHours: 1, passingPercentage: 80, language: "English", tags: "", featured: false, certificateEnabled: true });
  return (
    <AdminDrawer open={open} title="Create Course" description="Unlimited courses with certificates, visibility, prerequisites, versioning, and analytics." onClose={onClose} width="xl">
      <FormGrid>
        <TextInput label="Course title" value={course.title} onChange={(title) => setCourse({ ...course, title })} />
        <TextInput label="Instructor" value={course.instructor} onChange={(instructor) => setCourse({ ...course, instructor })} />
        <TextArea label="Description" value={course.description} onChange={(description) => setCourse({ ...course, description })} className="sm:col-span-2" />
        <SelectInput label="Difficulty" value={course.difficulty} options={["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]} onChange={(difficulty) => setCourse({ ...course, difficulty })} />
        <SelectInput label="Status" value={course.status} options={["DRAFT", "PUBLISHED", "ARCHIVED"]} onChange={(status) => setCourse({ ...course, status })} />
        <SelectInput label="Visibility" value={course.visibility} options={["INTERNAL_ONLY", "PUBLIC", "BRANCH_SPECIFIC", "ROLE_BASED"]} onChange={(visibility) => setCourse({ ...course, visibility })} />
        <TextInput label="Estimated hours" type="number" value={String(course.estimatedHours)} onChange={(estimatedHours) => setCourse({ ...course, estimatedHours: Number(estimatedHours) })} />
        <TextInput label="Passing %" type="number" value={String(course.passingPercentage)} onChange={(passingPercentage) => setCourse({ ...course, passingPercentage: Number(passingPercentage) })} />
        <TextInput label="Tags" value={course.tags} onChange={(tags) => setCourse({ ...course, tags })} />
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={course.featured} onChange={(e) => setCourse({ ...course, featured: e.target.checked })} /> Featured course</label>
      </FormGrid>
      <DrawerActions busy={busy} onClose={onClose} onSave={() => onSave({ ...course, tags: course.tags })} label="Create course" />
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

function DocumentPreview({ document, onClose }: { document: AcademyDocument; onClose: () => void }) {
  const isImage = document.fileType === "IMAGE" || document.fileUrl.toLowerCase().match(/\.(png|jpe?g|webp|gif)$/);
  const isVideo = document.fileType === "VIDEO" || document.fileUrl.toLowerCase().match(/\.(mp4|webm|mov)$/);
  const isAudio = document.fileType === "AUDIO" || document.fileUrl.toLowerCase().match(/\.(mp3|wav|m4a|ogg)$/);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div><p className="font-semibold text-white">{document.title}</p><p className="text-xs text-slate-500">{document.fileType} - version {document.version}</p></div>
          <div className="flex gap-2"><a href={document.fileUrl} download className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200"><Download className="size-4" /> Download</a><Button variant="secondary" onClick={onClose}>Close</Button></div>
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

function TextArea({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={cn("text-sm text-slate-300", className)}>{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500/40" /></label>;
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
