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
  Layers,
  Library,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Trophy,
  Upload,
  XCircle,
  Users,
  Ticket,
  AlertTriangle,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { useSearchParams } from "next/navigation";
import { CertificateTemplateManagement } from "@/components/admin/academy/certificate-template-management";
import { CertificateMonitoringDashboard } from "@/components/admin/academy/certificate-monitoring-dashboard";
import { AssignmentReviewPanel } from "@/components/admin/academy/assignment-review-panel";
import { StudentAnalyticsDashboard } from "@/components/admin/academy/student-analytics-dashboard";
import { AnalyticsDateRangeFilter } from "@/components/admin/analytics-date-range-filter";
import {
  AdminDataTable,
  AdminConfirmDialog,
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
import { EmailTemplatesManagementPanel, BrandingManagementPanel, InstructorsManagementPanel, RefundsManagementPanel } from "@/components/admin/academy/enhancement-panels";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AcademyCoupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minPurchaseAmount: number | null;
  validFrom: string;
  validUntil: string | null;
  applicableCourses: string[];
  applicableRoles: string[];
  active: boolean;
  remainingUses: number | null;
  isValid: boolean;
  createdByUser: { id: string; name: string; email: string } | null;
};

type AcademyData = {
  metrics: Record<string, number>;
  courses: AcademyCourse[];
  lessons: AcademyLesson[];
  documents: AcademyDocument[];
  videos: AcademyVideo[];
  quizzes: Array<{ id: string; title: string; passingPercentage: number; active: boolean }>;
  assignments: Array<{ id: string; title: string; points: number; active: boolean }>;
  assignmentSubmissions?: Array<{
    id: string;
    assignmentId: string;
    assignmentTitle: string;
    agentId: string;
    status: string;
    notes?: string | null;
    fileUrls: string[];
    grade?: number | null;
    reviewerNote?: string | null;
    submittedAt: string;
    reviewedAt?: string | null;
  }>;
  exams: Array<{ id: string; title: string; durationMinutes: number; passingScore: number; active: boolean }>;
  certificates: Array<{ id: string; certificateNumber: string; agentId: string; learnerName?: string | null; learnerEmail?: string | null; courseTitle?: string | null; status: string; issuedAt: string; expiresAt?: string | null }>;
  learningPaths: Array<{ id: string; title: string; description?: string; status: string; badgeTitle?: string; courses: Array<{ id: string; sortOrder: number; required: boolean; course: AcademyCourse }> }>;
  announcements: Array<{ id: string; title: string; body: string; audience: string; expiresAt: string | null; createdAt: string }>;
  badges: Array<{ id: string; name: string; description: string; xp: number; iconUrl: string | null; active: boolean }>;
  settings: Record<string, unknown>;
  coupons?: AcademyCoupon[];
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
    course: { id: string; title: string } | null;
    learner: { id: string; name: string; email: string; phone?: string; roles: string[] };
    payment: { id: string; status: string; proofStatus?: string; proofUrl?: string } | null;
    updatedAt: string;
  }>;
  trainingSettings?: { id: string; payload: Record<string, unknown>; updatedAt: string } | null;
  auditLogs: Array<{ id: string; actorId?: string; action: string; target: string; createdAt: string }>;
  topCourses: Array<{ id: string; title: string; completions: number; enrolments: number; activeLearners?: number }>;
  mostDifficultCourse?: { title: string; average: number };
  mostFailedQuiz?: { title: string; failed: number; attempts: number };
  trainerInsights?: {
    lowConfidence: Array<{ id: string; agentId: string; assessmentTitle: string; confidence: string; score: number; submittedAt: string }>;
    repeatedFailures: Array<{ agentId: string; quizTitle: string; failures: number; latestAt: string }>;
    weakTopics: Array<{ topic: string; count: number }>;
    rushedAttempts: Array<{ id: string; agentId: string; assessmentTitle: string; seconds: number; score: number }>;
    practicalRisk: Array<{ id: string; assignmentId: string; agentId: string; status: string; grade: number | null; submittedAt: string }>;
  };
  learnerProfiles?: Array<{
    agentId: string;
    courses: number;
    averageProgress: number;
    averageScore: number;
    passedAttempts: number;
    failedAttempts: number;
    reviewedAssignments: number;
    mentorSignoffs: number;
    certificates: number;
    weakTopics: string[];
    riskFlags: string[];
    recommendation: string;
    latestActivity?: string | null;
  }>;
  mostActiveAgents: Array<{ agentId: string; actions: number }>;
  agentsNeedingAttention: Array<{ id: string; agentId: string; courseId: string; percentComplete: number }>;
  recentlyCompletedCourses: Array<{ id: string; agentId: string; courseId: string; completedAt?: string }>;
  recentCertificates: Array<{ id: string; certificateNumber: string; agentId: string; learnerName?: string | null; learnerEmail?: string | null; courseTitle?: string | null; issuedAt: string }>;
  upcomingExpiringCertificates: Array<{ id: string; certificateNumber: string; agentId: string; learnerName?: string | null; learnerEmail?: string | null; courseTitle?: string | null; expiresAt?: string | null }>;
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
  subtitle?: string | null;
  description: string;
  shortDescription?: string | null;
  categoryId?: string;
  category?: { id: string; name: string } | null;
  tags: string[];
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  durationMinutes: number;
  instructor?: string;
  learningOutcomes?: string[];
  targetAudience?: string | null;
  prerequisites?: string[];
  thumbnailUrl?: string | null;
  bannerUrl?: string | null;
  introVideoUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
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
  "Student Analytics",
  "Certificates",
  "Certificate Templates",
  "Certificate Monitoring",
  "Assignment Review",
  "Coupons",
  "Training Resources",
  "Video Library",
  "Learning Paths",
  "Badges",
  "Leaderboard",
  "Announcements",
  "Discussion Board",
  "Analytics",
  "Email Templates",
  "Branding",
  "Instructors",
  "Refunds",
  "Settings",
] as const;

type AcademyTab = (typeof academyTabs)[number];

const documentTypes = ["PDF", "DOCX", "XLSX", "PPTX", "IMAGE", "VIDEO", "AUDIO", "ZIP"] as const;
const featureTiles: Array<[AcademyTab, LucideIcon, string]> = [
  ["Learning Paths", Library, "Programme sequencing for multi-course training certificate journeys."],
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
  const [drawer, setDrawer] = useState<"course" | "document" | "video" | "quiz" | "exam" | "assignment" | "path" | "announcement" | "badge" | "lesson" | "module" | "coupon" | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<AcademyDocument | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [viewCourse, setViewCourse] = useState<AcademyCourse | null>(null);
  const [buildingCourseId, setBuildingCourseId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AcademyDocument | null>(null);
  const [documentMode, setDocumentMode] = useState<"create" | "edit" | "replace">("create");
  const [selectedLesson, setSelectedLesson] = useState<AcademyLesson | null>(null);
  const [selectedModule, setSelectedModule] = useState<{ id: string; courseId: string; title: string; description?: string; sortOrder: number } | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<AcademyCoupon | null>(null);
  const [selectedPath, setSelectedPath] = useState<AcademyData["learningPaths"][number] | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AcademyData["announcements"][number] | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<AcademyData["badges"][number] | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(30);
  const [analyticsPeriodLabel, setAnalyticsPeriodLabel] = useState("Last 30 days");
  const [selectedCourseForDrilldown, setSelectedCourseForDrilldown] = useState<{ id: string; title: string } | null>(null);
  const [comparativeAnalytics, setComparativeAnalytics] = useState<Record<string, unknown> | null>(null);
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<Record<string, unknown> | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const load = useCallback(async () => {
    const result = await apiFetch<AcademyData>("/api/v1/admin/academy?compact=1");
    if (result.data) setData(result.data);
    else showToast(result.error?.message ?? "Academy could not load.", "error");
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== "Analytics") return;
    void apiFetch<Record<string, unknown>>(`/api/v1/admin/academy/analytics?includeAtRisk=true&period=${analyticsPeriod}`).then((result) => {
      if (result.data) setAnalytics(result.data);
    });
  }, [tab, analyticsPeriod]);

  // Fetch comparative analytics when a course is selected for drill-down
  useEffect(() => {
    if (selectedCourseForDrilldown) {
      void apiFetch<Record<string, unknown>>(`/api/v1/admin/academy/analytics?type=comparative&courseId=${selectedCourseForDrilldown.id}&period=${analyticsPeriod}`).then((result) => {
        if (result.data) setComparativeAnalytics(result.data);
      });
      void apiFetch<Record<string, unknown>>(`/api/v1/admin/academy/analytics?type=predictions&courseId=${selectedCourseForDrilldown.id}`).then((result) => {
        if (result.data) setPredictiveAnalytics(result.data);
      });
    } else {
      setComparativeAnalytics(null);
      setPredictiveAnalytics(null);
    }
  }, [selectedCourseForDrilldown, analyticsPeriod]);

  useEffect(() => {
    const requested = searchParams?.get("academyView");
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

  function handleDeleteCoupon(coupon: AcademyCoupon) {
    confirmAction({
      title: "Delete Coupon",
      description: `Are you sure you want to delete coupon "${coupon.code}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        const result = await action({ action: "delete_coupon", couponId: coupon.id }, "Coupon deleted.");
        if (result) {
          await load();
        }
      },
    });
  }

  function handleResetCoupon(coupon: AcademyCoupon) {
    confirmAction({
      title: "Reset Coupon Usage",
      description: `Are you sure you want to reset the usage count for coupon "${coupon.code}"? This will remove all coupon usage records and set the count to 0.`,
      confirmLabel: "Reset",
      onConfirm: async () => {
        const result = await action({ action: "reset_coupon_usage", couponId: coupon.id }, "Coupon usage reset.");
        if (result) {
          await load();
        }
      },
    });
  }

  function confirmAction(config: NonNullable<typeof confirm>) {
    setConfirm(config);
  }

  const courses = useMemo(() => {
    const needle = query.toLowerCase();
    return (data?.courses ?? []).filter((course) => {
      const matchesStatus = statusFilter === "ALL" || course.status === statusFilter;
      const matchesText = !needle || `${course.title} ${course.description} ${course.tags.join(" ")}`.toLowerCase().includes(needle);
      return matchesStatus && matchesText;
    });
  }, [data?.courses, query, statusFilter]);

  function openTab(nextTab: AcademyTab) {
    setTab(nextTab);
    setPrimaryTab(resolveAcademyNav(nextTab).primary);
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Loading academy control centre</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">Preparing courses, learner approvals, resources, certificates, and community tools.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  const metric = (key: string, fallback = 0) => toFiniteNumber(data.metrics?.[key], fallback);
  const totalEnrolments = metric("totalEnrolments", metric("enrolments"));
  const totalCertificates = metric("totalCertificates", metric("certificatesIssued"));
  const academyRevenue = metric("academyRevenue");
  const averageScore = metric("averageScore");
  const videoWatchPercent = metric("videoWatchPercent");
  const pendingPublicApplications = data.publicLearnerApplications.filter((application) => isPendingPublicApproval(application.status));
  const selectedCourseAnalytics = selectedCourseForDrilldown
    ? {
        course: data.courses.find((course) => course.id === selectedCourseForDrilldown.id),
        popularity: (analytics?.popularCourses as Array<{ courseId: string; courseTitle: string; _count: number }> | undefined)?.find((course) => course.courseId === selectedCourseForDrilldown.id),
        completion: (analytics?.completionRates as Array<{ courseId?: string; title: string; enrolled: number; completed: number; completion_rate: number; avg_progress: number }> | undefined)?.find(
          (course) => course.courseId === selectedCourseForDrilldown.id || course.title === selectedCourseForDrilldown.title,
        ),
        courseStats: (analytics?.courses as Array<{ id: string; title: string; enrolments: number; inProgress: number; certificates: number }> | undefined)?.find((course) => course.id === selectedCourseForDrilldown.id),
      }
    : null;
  const selectedCourseAtRisk = selectedCourseForDrilldown
    ? ((analytics?.atRiskLearners as Array<{ learnerId: string; learnerName: string; learnerEmail: string; courseId?: string; riskScore: number; riskFactors?: string[] }> | undefined) ?? []).filter(
        (learner) => !learner.courseId || learner.courseId === selectedCourseForDrilldown.id,
      )
    : [];

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <ExecutiveTile label="Total Courses" value={data.metrics.totalCourses} icon={GraduationCap} onClick={() => openTab("Courses")} />
            <ExecutiveTile label="Published" value={data.metrics.publishedCourses} icon={CheckCircle2} tone="success" onClick={() => openTab("Courses")} />
            <ExecutiveTile label="Draft" value={data.metrics.draftCourses} icon={FileText} tone="warning" onClick={() => openTab("Courses")} />
            <ExecutiveTile label="Lessons" value={data.metrics.totalLessons} icon={BookOpen} onClick={() => openTab("Courses")} />
            <ExecutiveTile label="Enrolments" value={totalEnrolments} icon={Users} onClick={() => openTab("Public Learners")} />
            <ExecutiveTile label="Certificates" value={totalCertificates} icon={Award} onClick={() => openTab("Certificates")} />
          </div>
          <AdminMetricGrid cols={6}>
            <ClickableStatPill label="Videos Uploaded" value={data.metrics.videosUploaded} onClick={() => openTab("Video Library")} />
            <ClickableStatPill label="PDF Resources" value={data.metrics.pdfResources} onClick={() => openTab("Training Resources")} />
            <ClickableStatPill label="Quizzes" value={data.metrics.quizzes} onClick={() => openTab("Courses")} />
            <ClickableStatPill label="Assignments" value={data.metrics.assignments} onClick={() => openTab("Analytics")} />
            <ClickableStatPill label="Exams" value={data.metrics.exams} onClick={() => openTab("Courses")} />
            <ClickableStatPill label="Certificates Issued" value={data.metrics.certificatesIssued} tone="success" onClick={() => openTab("Certificates")} />
            <ClickableStatPill label="Inactive Learners" value={data.metrics.inactiveLearners} tone="warning" onClick={() => openTab("Analytics")} />
            <ClickableStatPill label="Average Score" value={`${averageScore}%`} tone="info" onClick={() => openTab("Analytics")} />
            <ClickableStatPill label="Learning Hours" value={data.metrics.learningHours} onClick={() => openTab("Analytics")} />
            <ClickableStatPill label="Downloads" value={data.metrics.downloads} onClick={() => openTab("Training Resources")} />
            <ClickableStatPill label="Video Watch %" value={`${videoWatchPercent}%`} onClick={() => openTab("Analytics")} />
            <ClickableStatPill label="Overdue Assignments" value={data.overdueAssignments} tone={data.overdueAssignments ? "warning" : "default"} onClick={() => openTab("Analytics")} />
            <ClickableStatPill label="Public Learners" value={data.metrics.publicLearners} tone="info" onClick={() => openTab("Public Learners")} />
            <ClickableStatPill label="Pending Public Approvals" value={data.metrics.pendingPublicApprovals} tone={data.metrics.pendingPublicApprovals ? "warning" : "success"} onClick={() => openTab("Public Learners")} />
            <ClickableStatPill label="Academy Revenue" value={`$${academyRevenue}`} tone="success" onClick={() => openTab("Analytics")} />
          </AdminMetricGrid>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TopCoursesPanel courses={data.topCourses} />
            <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Risk Radar</h3>
              <div className="mt-4 space-y-4">
                <RiskLine label="Most difficult course" value={data.mostDifficultCourse?.title ?? "No scored courses yet"} helper={data.mostDifficultCourse ? `${Math.round(data.mostDifficultCourse.average)}% average` : "Waiting for scored learner progress"} />
                <RiskLine label="Most failed quiz" value={data.mostFailedQuiz?.title ?? "No failed quizzes yet"} helper={data.mostFailedQuiz ? `${data.mostFailedQuiz.failed} failed attempts` : "Waiting for failed attempts"} />
                <RiskLine label="Agents needing attention" value={String(data.agentsNeedingAttention.length)} helper="Low progress or stalled learning" />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ActivityPanel title="Recent Applications" icon={Users}>
                {data.publicLearnerApplications.length ? data.publicLearnerApplications.slice(0, 5).map((item) => <MetricRow key={item.id} label={item.fullName} value={item.course.title} />) : <EmptyPanelText>No learner applications yet.</EmptyPanelText>}
              </ActivityPanel>
              <ActivityPanel title="Recent Certificates" icon={Award}>
                {data.certificates.length ? data.certificates.slice(0, 5).map((item) => <MetricRow key={item.id} label={item.certificateNumber} value={item.learnerName ?? item.learnerEmail ?? "Unknown learner"} />) : <EmptyPanelText>No certificate records yet.</EmptyPanelText>}
              </ActivityPanel>
              <ActivityPanel title="Top Courses" icon={BookOpen}>
                {data.topCourses.length ? data.topCourses.map((item) => <MetricRow key={item.id} label={item.title} value={item.completions > 0 ? `${item.completions} completions` : `${item.enrolments} enrolled`} />) : <EmptyPanelText>No course activity yet.</EmptyPanelText>}
              </ActivityPanel>
              <ActivityPanel title="Pending Applications" icon={FileText}>
                {pendingPublicApplications.length ? pendingPublicApplications.slice(0, 5).map((item) => <MetricRow key={item.id} label={item.fullName} value={item.course.title} />) : <EmptyPanelText>No pending applications.</EmptyPanelText>}
              </ActivityPanel>
            </div>
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
            <Button onClick={() => { setSelectedCourse(null); setDrawer("course"); }} className="flex-1 sm:flex-none"><Plus className="size-4" /> New Course</Button>
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
                  <ActionToolbar
                    primary={{ label: "Build", icon: Layers, onClick: () => setBuildingCourseId(course.id) }}
                    actions={[
                      { label: "View", icon: Eye, onClick: () => setViewCourse(course) },
                      { label: "Edit", icon: Pencil, onClick: () => { setSelectedCourse(course); setDrawer("course"); } },
                      { label: "Duplicate", icon: Copy, onClick: () => void action({ action: "duplicate_course", courseId: course.id }, "Course duplicated."), more: true },
                      course.status === "PUBLISHED"
                        ? { label: "Unpublish", icon: FileText, onClick: () => void action({ action: "unpublish_course", courseId: course.id }, "Course unpublished."), more: true }
                        : { label: "Publish", icon: CheckCircle2, onClick: () => void action({ action: "publish_course", courseId: course.id }, "Course published."), more: true },
                      course.status === "ARCHIVED"
                        ? { label: "Restore", icon: RotateCcw, onClick: () => void action({ action: "restore_course", courseId: course.id }, "Course restored."), more: true }
                        : { label: "Archive", icon: Archive, onClick: () => void action({ action: "archive_course", courseId: course.id }, "Course archived."), more: true },
                      {
                        label: "Delete",
                        icon: Trash2,
                        tone: "danger",
                        more: true,
                        onClick: () => confirmAction({
                          title: "Delete course?",
                          description: `This permanently removes ${course.title}, including modules, lessons, enrolments, assessments, and public learner applications.`,
                          confirmLabel: "Delete course",
                          danger: true,
                          onConfirm: () => void action({ action: "delete_course", courseId: course.id }, "Course permanently deleted."),
                        }),
                      },
                    ]}
                  />
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
          onCreate={() => {
            setSelectedDocument(null);
            setDocumentMode("create");
            setDrawer("document");
          }}
          onPreview={setPreviewDocument}
          onEdit={(document) => {
            setSelectedDocument(document);
            setDocumentMode("edit");
            setDrawer("document");
          }}
          onReplace={(document) => {
            setPreviewDocument(null);
            setSelectedDocument(document);
            setDocumentMode("replace");
            setDrawer("document");
            showToast(`Upload a replacement for ${document.title}. The old version will remain in history.`, "info");
          }}
          onDelete={(document) => confirmAction({
            title: "Delete document?",
            description: `This removes ${document.title} from the Academy library.`,
            confirmLabel: "Delete document",
            danger: true,
            onConfirm: () => void action({ action: "delete_document", documentId: document.id }, "Document deleted from the library."),
          })}
        />
      )}

      {tab === "Video Library" && (
        <div className="space-y-4">
          <AdminFilterBar>
            <div className="flex-1 text-sm text-slate-400">Streaming videos, captions, watch history, resume progress, and analytics are stored in PostgreSQL.</div>
            <Button onClick={() => setDrawer("video")} className="flex-1 sm:flex-none"><Upload className="size-4" /> Add Video</Button>
          </AdminFilterBar>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.videos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
                <video src={video.videoUrl} controls className="aspect-video w-full bg-black object-contain" preload="metadata" />
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{video.title}</p>
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

      {["Certificates", "Certificate Templates", "Certificate Monitoring", "Assignment Review", "Student Analytics", "Coupons", "Public Learners", "Learning Paths", "Announcements", "Discussion Board", "Leaderboard", "Badges", "Analytics", "Settings", "Email Templates", "Branding", "Instructors", "Refunds"].includes(tab) && (
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
          onEditPath={(path) => { setSelectedPath(path); setDrawer("path"); }}
          onEditAnnouncement={(announcement) => { setSelectedAnnouncement(announcement); setDrawer("announcement"); }}
          onEditBadge={(badge) => { setSelectedBadge(badge); setDrawer("badge"); }}
          onEditCoupon={(coupon) => { setSelectedCoupon(coupon); setDrawer("coupon"); }}
          onResetCoupon={handleResetCoupon}
          onDeleteCoupon={handleDeleteCoupon}
          setSelectedCourseForDrilldown={setSelectedCourseForDrilldown}
          analyticsPeriodLabel={analyticsPeriodLabel}
          onAnalyticsRangeChange={(range, preset) => {
            const days = Math.max(1, Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / 86400000));
            setAnalyticsPeriod(days);
            const labels: Record<string, string> = {
              "7d": "Last 7 days",
              "30d": "Last 30 days",
              "90d": "Last 90 days",
              ytd: "Year to date",
              "12m": "Last 12 months",
              custom: `${range.startDate.toLocaleDateString()} - ${range.endDate.toLocaleDateString()}`,
            };
            setAnalyticsPeriodLabel(labels[preset] ?? `${days} days`);
          }}
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
      <DocumentDrawer
        open={drawer === "document"}
        busy={busy}
        document={selectedDocument}
        mode={documentMode}
        onClose={() => {
          setDrawer(null);
          setSelectedDocument(null);
          setDocumentMode("create");
        }}
        onSave={(document) => {
          if (documentMode === "edit" && selectedDocument) {
            return action({ action: "update_document", documentId: selectedDocument.id, document }, "Document details updated.");
          }
          if (documentMode === "replace" && selectedDocument) {
            return action({ action: "replace_document", documentId: selectedDocument.id, document }, "Document replaced with a new version.");
          }
          return action({ action: "create_document", document }, "Document saved with version control.");
        }}
      />
      <VideoDrawer open={drawer === "video"} busy={busy} onClose={() => setDrawer(null)} onSave={(video) => action({ action: "create_video", video }, "Video added to the Academy library.")} />
      <QuickBuilderDrawer type={drawer} busy={busy} courses={data.courses} onClose={() => setDrawer(null)} onSave={action} />
      <LearningPathDrawer
        open={drawer === "path"}
        busy={busy}
        courses={data.courses}
        path={selectedPath}
        onClose={() => { setDrawer(null); setSelectedPath(null); }}
        onSave={(path) => selectedPath
          ? action({ action: "update_learning_path", pathId: selectedPath.id, path }, "Learning path updated.")
          : action({ action: "create_learning_path", path }, "Learning path created.")}
      />
      <AnnouncementDrawer
        open={drawer === "announcement"}
        busy={busy}
        announcement={selectedAnnouncement}
        onClose={() => { setDrawer(null); setSelectedAnnouncement(null); }}
        onSave={(announcement) => selectedAnnouncement
          ? action({ action: "update_announcement", announcementId: selectedAnnouncement.id, announcement }, "Announcement updated.")
          : action({ action: "create_announcement", announcement }, "Announcement published.")}
      />
      <BadgeDrawer
        open={drawer === "badge"}
        busy={busy}
        badge={selectedBadge}
        onClose={() => { setDrawer(null); setSelectedBadge(null); }}
        onSave={(badge) => selectedBadge
          ? action({ action: "update_badge", badgeId: selectedBadge.id, badge }, "Badge updated.")
          : action({ action: "create_badge", badge }, "Badge created.")}
      />
      
      {/* Course Drill-down Drawer */}
      <AdminDrawer
        open={!!selectedCourseForDrilldown}
        onClose={() => setSelectedCourseForDrilldown(null)}
        title={`Course Analytics: ${selectedCourseForDrilldown?.title || ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Database-backed course performance for the selected period.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ActivityPanel title="Enrollment Trends" icon={BarChart3}>
              <MetricRow label="Total enrolled" value={selectedCourseAnalytics?.completion?.enrolled ?? selectedCourseAnalytics?.popularity?._count ?? selectedCourseAnalytics?.courseStats?.enrolments ?? 0} />
              <MetricRow label="Active learners" value={selectedCourseAnalytics?.courseStats?.inProgress ?? 0} />
              <MetricRow label="Published state" value={selectedCourseAnalytics?.course?.status ?? "Unknown"} />
            </ActivityPanel>
            <ActivityPanel title="Completion Metrics" icon={Trophy}>
              <MetricRow label="Completion rate" value={`${toFiniteNumber(selectedCourseAnalytics?.completion?.completion_rate).toFixed(1)}%`} />
              <MetricRow label="Average progress" value={`${toFiniteNumber(selectedCourseAnalytics?.completion?.avg_progress).toFixed(1)}%`} />
              <MetricRow label="Certificates" value={selectedCourseAnalytics?.courseStats?.certificates ?? 0} />
            </ActivityPanel>
            <ActivityPanel title="Learner Progress" icon={Target}>
              <MetricRow label="Completed" value={selectedCourseAnalytics?.completion?.completed ?? 0} />
              <MetricRow label="In progress records" value={selectedCourseAnalytics?.courseStats?.inProgress ?? 0} />
              <MetricRow label="Not started" value={Math.max(0, toFiniteNumber(selectedCourseAnalytics?.completion?.enrolled) - toFiniteNumber(selectedCourseAnalytics?.courseStats?.inProgress))} />
            </ActivityPanel>
            <ActivityPanel title="Assessment Performance" icon={BookOpen}>
              <MetricRow label="Average score" value={`${toFiniteNumber((comparativeAnalytics as any)?.currentPeriod?.averageScore ?? analytics?.averageScore).toFixed(1)}%`} />
              <MetricRow label="Score trend" value={String((comparativeAnalytics as any)?.trendAnalysis?.scoreTrend ?? "No trend yet")} />
              <MetricRow label="Assessment data" value={comparativeAnalytics ? "Loaded" : "Select course activity"} />
            </ActivityPanel>
          </div>
          
          {/* Comparative Analytics Section */}
          {comparativeAnalytics && (
            <ActivityPanel title="Period-over-Period Comparison" icon={Trophy}>
              <div className="space-y-3">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">Current Period (Last 30 days)</p>
                  <MetricRow label="Enrollments" value={String((comparativeAnalytics as any).currentPeriod?.totalEnrollments ?? 0)} />
                  <MetricRow label="Completion rate" value={`${toFiniteNumber((comparativeAnalytics as any).currentPeriod?.completionRate).toFixed(1)}%`} />
                  <MetricRow label="Average score" value={`${toFiniteNumber((comparativeAnalytics as any).currentPeriod?.averageScore).toFixed(1)}%`} />
                </div>
                <div className="rounded-lg bg-slate-500/10 border border-slate-500/20 p-3">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Previous Period (30 days prior)</p>
                  <MetricRow label="Enrollments" value={String((comparativeAnalytics as any).previousPeriod?.totalEnrollments ?? 0)} />
                  <MetricRow label="Completion rate" value={`${toFiniteNumber((comparativeAnalytics as any).previousPeriod?.completionRate).toFixed(1)}%`} />
                  <MetricRow label="Average score" value={`${toFiniteNumber((comparativeAnalytics as any).previousPeriod?.averageScore).toFixed(1)}%`} />
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Trend Analysis</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Enrollment trend</span>
                      <span className={cn(
                        "font-semibold",
                        (comparativeAnalytics as any).trendAnalysis?.enrollmentTrend === "INCREASING" ? "text-emerald-400" :
                        (comparativeAnalytics as any).trendAnalysis?.enrollmentTrend === "DECREASING" ? "text-red-400" : "text-slate-300"
                      )}>
                        {(comparativeAnalytics as any).trendAnalysis?.enrollmentTrend ?? "STABLE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Completion trend</span>
                      <span className={cn(
                        "font-semibold",
                        (comparativeAnalytics as any).trendAnalysis?.completionTrend === "INCREASING" ? "text-emerald-400" :
                        (comparativeAnalytics as any).trendAnalysis?.completionTrend === "DECREASING" ? "text-red-400" : "text-slate-300"
                      )}>
                        {(comparativeAnalytics as any).trendAnalysis?.completionTrend ?? "STABLE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Score trend</span>
                      <span className={cn(
                        "font-semibold",
                        (comparativeAnalytics as any).trendAnalysis?.scoreTrend === "IMPROVING" ? "text-emerald-400" :
                        (comparativeAnalytics as any).trendAnalysis?.scoreTrend === "DECLINING" ? "text-red-400" : "text-slate-300"
                      )}>
                        {(comparativeAnalytics as any).trendAnalysis?.scoreTrend ?? "STABLE"}
                      </span>
                    </div>
                  </div>
                </div>
                {(comparativeAnalytics as any).trendAnalysis?.keyInsights && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">Key Insights</p>
                    <ul className="space-y-1">
                      {((comparativeAnalytics as any).trendAnalysis.keyInsights as string[]).map((insight, i) => (
                        <li key={i} className="text-xs text-slate-300">• {insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(comparativeAnalytics as any).trendAnalysis?.recommendations && (
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3">
                    <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Recommendations</p>
                    <ul className="space-y-1">
                      {((comparativeAnalytics as any).trendAnalysis.recommendations as string[]).map((rec, i) => (
                        <li key={i} className="text-xs text-slate-300">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ActivityPanel>
          )}
          
          {/* Predictive Analytics Section */}
          {predictiveAnalytics && (
            <ActivityPanel title="Completion Predictions" icon={Target}>
              <div className="space-y-3">
                <p className="text-sm text-slate-400">AI-powered predictions for learner completion based on progress, activity, and performance.</p>
                <div className="grid gap-2">
                  {(Array.isArray((predictiveAnalytics as any).predictions) ? ((predictiveAnalytics as any).predictions as Array<{ studentId: string; predictedCompletionProbability: number; estimatedCompletionDate: Date | null; riskFactors: string[]; recommendations: string[] }>) : []).map((prediction, i) => {
                    const completionProbability = toFiniteNumber(prediction.predictedCompletionProbability);
                    const riskFactors = Array.isArray(prediction.riskFactors) ? prediction.riskFactors : [];
                    const recommendations = Array.isArray(prediction.recommendations) ? prediction.recommendations : [];
                    return (
                    <div key={i} className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">Student {String(prediction.studentId ?? "unknown").slice(0, 8)}...</span>
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-full",
                          completionProbability >= 80 ? "bg-emerald-500/20 text-emerald-300" :
                          completionProbability >= 50 ? "bg-amber-500/20 text-amber-300" :
                          "bg-red-500/20 text-red-300"
                        )}>
                          {completionProbability.toFixed(0)}% likely to complete
                        </span>
                      </div>
                      {prediction.estimatedCompletionDate && (
                        <p className="text-xs text-slate-400 mb-2">
                          Est. completion: {new Date(prediction.estimatedCompletionDate).toLocaleDateString()}
                        </p>
                      )}
                      {riskFactors.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-red-300 mb-1">Risk Factors:</p>
                          <ul className="space-y-1">
                            {riskFactors.map((factor, fi) => (
                              <li key={fi} className="text-xs text-slate-400">• {factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {recommendations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-300 mb-1">Recommendations:</p>
                          <ul className="space-y-1">
                            {recommendations.map((rec, ri) => (
                              <li key={ri} className="text-xs text-slate-400">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </ActivityPanel>
          )}
          
          <ActivityPanel title="At-Risk Learners in this Course" icon={AlertTriangle}>
            {selectedCourseAtRisk.length ? (
              selectedCourseAtRisk.slice(0, 6).map((learner) => (
                <MetricRow key={learner.learnerId} label={learner.learnerName || learner.learnerEmail} value={`${toFiniteNumber(learner.riskScore).toFixed(0)}% risk`} />
              ))
            ) : (
              <EmptyPanelText>No course-specific at-risk learner records for this period.</EmptyPanelText>
            )}
          </ActivityPanel>
          <ActivityPanel title="Module Completion Rates" icon={ClipboardCheck}>
            <EmptyPanelText>Module-level completion is not stored as a separate aggregate yet. Lesson and course progress above are calculated from database records.</EmptyPanelText>
          </ActivityPanel>
        </div>
      </AdminDrawer>
      <AdminConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
      />
      <LessonDrawer open={drawer === "lesson"} busy={busy} lesson={selectedLesson} courses={data.courses} onClose={() => { setDrawer(null); setSelectedLesson(null); }} onSave={(lesson) => selectedLesson
        ? action({ action: "update_lesson", lessonId: selectedLesson.id, lesson }, "Lesson updated.")
        : action({ action: "create_lesson", lesson }, "Lesson created.")} />
      <ModuleDrawer open={drawer === "module"} busy={busy} module={selectedModule} courses={data.courses} onClose={() => { setDrawer(null); setSelectedModule(null); }} onSave={(module) => selectedModule
        ? action({ action: "update_module", moduleId: selectedModule.id, module }, "Module updated.")
        : action({ action: "create_module", module }, "Module created.")} />
      <CouponDrawer open={drawer === "coupon"} busy={busy} coupon={selectedCoupon} courses={data.courses} onClose={() => { setDrawer(null); setSelectedCoupon(null); }} onSave={async (coupon) => {
        const result = await apiFetch("/api/v1/admin/academy/coupons" + (selectedCoupon ? `/${selectedCoupon.id}` : ""), {
          method: selectedCoupon ? "PATCH" : "POST",
          body: JSON.stringify(coupon),
        });
        if (result.error) {
          showToast(result.error.message, "error");
          return false;
        }
        showToast(selectedCoupon ? "Coupon updated." : "Coupon created.");
        setDrawer(null);
        setSelectedCoupon(null);
        await load();
        return true;
      }} />
      {previewDocument && <DocumentPreview document={previewDocument} onClose={() => setPreviewDocument(null)} />}
      {viewCourse && <CoursePreview course={viewCourse} onClose={() => setViewCourse(null)} />}
    </div>
  );
}

function ExecutiveTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string | number;
  icon: typeof GraduationCap;
  tone?: "default" | "success" | "warning" | "info";
  onClick?: () => void;
}) {
  const styles = {
    default: "border-white/10 bg-slate-900/70 text-slate-100",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    info: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
  };
  const content = (
    <>
      <Icon className="size-5 opacity-80" />
      <p className="mt-4 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/60", styles[tone])}>
        {content}
      </button>
    );
  }
  return (
    <div className={cn("rounded-xl border p-4", styles[tone])}>
      {content}
    </div>
  );
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isPendingPublicApproval(status: string) {
  return ["PENDING", "PENDING_PAYMENT", "PAYMENT_UPLOADED"].includes(status);
}

function ClickableStatPill({
  label,
  value,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl text-left transition hover:-translate-y-0.5 hover:ring-2 hover:ring-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60">
      <AdminStatPill label={label} value={value} tone={tone} />
    </button>
  );
}

function EmptyPanelText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-white/10 bg-slate-950/35 p-3 text-sm text-slate-400">{children}</p>;
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

function TopCoursesPanel({ courses }: { courses: AcademyData["topCourses"] }) {
  const chartRows = courses.map((course) => ({
    label: course.title.slice(0, 24),
    value: course.completions > 0 ? course.completions : Math.max(course.enrolments, course.activeLearners ?? 0),
  }));
  const hasActivity = chartRows.some((course) => course.value > 0);
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 xl:col-span-2">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Top Courses</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Ranked by completions, with enrolment demand shown beside each programme.</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
          <BarChart3 className="size-4" />
        </span>
      </div>
      {hasActivity ? (
        <BarChart data={chartRows} color="bg-emerald-500" />
      ) : (
        <div className="grid gap-3">
          {courses.map((course, index) => (
            <div key={course.id} className="rounded-xl border border-white/[0.06] bg-slate-950/55 p-3">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-bold text-emerald-300">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-white">{course.title}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-slate-300">{course.enrolments} enrolled</span>
                    <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-slate-300">{course.completions} completed</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!courses.length && <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No course activity has been captured yet.</p>}
        </div>
      )}
    </section>
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

function IconAction({ label, icon: Icon, onClick, tone = "default" }: { label: string; icon: typeof Copy; onClick: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border transition",
        tone === "danger"
          ? "border-red-500/20 text-red-300 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
          : "border-white/10 text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

type ToolbarAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: "default" | "danger";
  more?: boolean;
};

function ActionToolbar({ primary, actions }: { primary?: ToolbarAction; actions: ToolbarAction[] }) {
  const [open, setOpen] = useState(false);
  const visible = actions.filter((item) => !item.more);
  const overflow = actions.filter((item) => item.more);
  const mobileActions = primary ? [primary, ...actions] : actions;
  const run = (item: ToolbarAction) => {
    setOpen(false);
    item.onClick();
  };
  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap justify-end gap-2 sm:hidden">
        {mobileActions.map((item) => (
          <IconAction key={item.label} label={item.label} icon={item.icon} tone={item.tone} onClick={() => run(item)} />
        ))}
      </div>
      <div className="hidden flex-wrap justify-end gap-2 sm:flex">
        {primary && (
          <button
            type="button"
            onClick={() => run(primary)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
          >
            <primary.icon className="size-4" />
            {primary.label}
          </button>
        )}
        {visible.map((item) => (
          <IconAction key={item.label} label={item.label} icon={item.icon} tone={item.tone} onClick={() => run(item)} />
        ))}
        {overflow.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white"
              title="More actions"
              aria-label="More actions"
              aria-expanded={open}
            >
              <MoreHorizontal className="size-4" />
            </button>
            {open && (
              <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-slate-950 py-1 shadow-2xl">
                {overflow.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => run(item)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/[0.06]",
                      item.tone === "danger" ? "text-red-300" : "text-slate-200",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LibraryView({
  documents,
  onCreate,
  onPreview,
  onEdit,
  onReplace,
  onDelete,
}: {
  documents: AcademyDocument[];
  onCreate: () => void;
  onPreview: (document: AcademyDocument) => void;
  onEdit: (document: AcademyDocument) => void;
  onReplace: (document: AcademyDocument) => void;
  onDelete: (document: AcademyDocument) => void;
}) {
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
              <ActionToolbar
                actions={[
                  { label: "Preview", icon: Search, onClick: () => onPreview(document) },
                  { label: "Download", icon: Download, onClick: () => window.open(`/api/v1/academy/documents/${document.id}/download`, "_blank") },
                  { label: "Edit", icon: Pencil, onClick: () => onEdit(document) },
                  { label: "Replace", icon: Upload, onClick: () => onReplace(document), more: true },
                  { label: "Delete", icon: Trash2, tone: "danger", onClick: () => onDelete(document), more: true },
                ]}
              />
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
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400">v{document.version}</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400">{document.downloadCount ?? 0} downloads</span>
        </div>
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
  onEditPath,
  onEditAnnouncement,
  onEditBadge,
  onEditCoupon,
  onResetCoupon,
  onDeleteCoupon,
  setSelectedCourseForDrilldown,
  analyticsPeriodLabel,
  onAnalyticsRangeChange,
}: {
  tab: AcademyTab;
  data: AcademyData;
  analytics: Record<string, unknown> | null;
  openDrawer: (drawer: "quiz" | "exam" | "assignment" | "path" | "announcement" | "badge" | null) => void;
  action: (body: Record<string, unknown>, success: string) => Promise<unknown>;
  query: string;
  setQuery: (query: string) => void;
  setSelectedLesson: (lesson: AcademyLesson | null) => void;
  setDrawer: (drawer: "course" | "document" | "video" | "quiz" | "exam" | "assignment" | "path" | "announcement" | "badge" | "lesson" | "module" | "coupon" | null) => void;
  onEditPath: (path: AcademyData["learningPaths"][number]) => void;
  onEditAnnouncement: (announcement: AcademyData["announcements"][number]) => void;
  onEditBadge: (badge: AcademyData["badges"][number]) => void;
  onEditCoupon: (coupon: AcademyCoupon | null) => void;
  onResetCoupon: (coupon: AcademyCoupon) => void;
  onDeleteCoupon: (coupon: AcademyCoupon) => void;
  setSelectedCourseForDrilldown: (course: { id: string; title: string } | null) => void;
  analyticsPeriodLabel: string;
  onAnalyticsRangeChange: (range: { startDate: Date; endDate: Date }, preset: string) => void;
}) {
  if (tab === "Certificates") {
    return <CertificateManagementPanel certificates={data.certificates} action={action} />;
  }
  if (tab === "Student Analytics") {
    return <StudentAnalyticsDashboard />;
  }
  if (tab === "Certificate Templates") {
    return <CertificateTemplateManagement />;
  }
  if (tab === "Certificate Monitoring") {
    return <CertificateMonitoringDashboard />;
  }
  if (tab === "Assignment Review") {
    return <AssignmentReviewPanel />;
  }
  if (tab === "Coupons") {
    return <CouponManagementPanel coupons={data.coupons || []} onEditCoupon={(coupon) => onEditCoupon(coupon)} onCreateCoupon={() => onEditCoupon(null)} onResetCoupon={onResetCoupon} onDeleteCoupon={onDeleteCoupon} setDrawer={_setDrawer} />;
  }
  if (tab === "Public Learners") {
    return <PublicLearnersPanel applications={data.publicLearnerApplications} resourceApplications={data.resourceAccessApplications ?? []} action={action} />;
  }
  if (tab === "Learning Paths") {
    return <BuilderList title="Learning Paths" icon={Library} rows={data.learningPaths.map((path) => ({ id: path.id, title: path.title, active: path.status === "PUBLISHED", detail: `${path.courses.length} course(s) - ${path.badgeTitle ?? "No badge"}`, source: path }))} actionLabel="Create Path" onCreate={() => openDrawer("path")} onEdit={(row) => onEditPath(row.source as AcademyData["learningPaths"][number])} onArchive={(row) => action({ action: row.active === false ? "restore_learning_path" : "archive_learning_path", pathId: row.id }, row.active === false ? "Learning path restored." : "Learning path archived.")} onDelete={(row) => action({ action: "delete_learning_path", pathId: row.id }, "Learning path deleted.")} />;
  }
  if (tab === "Announcements") {
    return <BuilderList title="Announcements" icon={Megaphone} rows={data.announcements.map((announcement) => ({ id: announcement.id, title: announcement.title, active: !announcement.expiresAt || new Date(announcement.expiresAt) > new Date(), detail: `${announcement.audience} - ${announcement.body}`, source: announcement }))} actionLabel="New Announcement" onCreate={() => openDrawer("announcement")} onEdit={(row) => onEditAnnouncement(row.source as AcademyData["announcements"][number])} onArchive={(row) => action({ action: row.active === false ? "restore_announcement" : "archive_announcement", announcementId: row.id }, row.active === false ? "Announcement restored." : "Announcement archived.")} onDelete={(row) => action({ action: "delete_announcement", announcementId: row.id }, "Announcement deleted.")} />;
  }
  if (tab === "Badges") {
    return <BuilderList title="Badges and Achievements" icon={BadgeCheck} rows={data.badges.map((badge) => ({ id: badge.id, title: badge.name, active: badge.active, detail: `${badge.xp} XP - ${badge.description ?? ""}`, source: badge }))} actionLabel="Create Badge" onCreate={() => openDrawer("badge")} onEdit={(row) => onEditBadge(row.source as AcademyData["badges"][number])} onArchive={(row) => action({ action: row.active === false ? "restore_badge" : "archive_badge", badgeId: row.id }, row.active === false ? "Badge restored." : "Badge archived.")} onDelete={(row) => action({ action: "delete_badge", badgeId: row.id }, "Badge deleted.")} />;
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
    try {
      const revenue = analytics?.revenue as { total?: number; count?: number } | undefined;
      const _insights = data.trainerInsights;
      const popularCourses = analytics?.popularCourses as Array<{ courseId: string; courseTitle: string; _count: number }> | undefined;
      const completionRates = analytics?.completionRates as Array<{ title: string; enrolled: number; completed: number; completion_rate: number; avg_progress: number }> | undefined;
      const _dailyActivity = analytics?.dailyActivity as Array<{ date: Date; actions: number }> | undefined;
      const atRiskLearners = analytics?.atRiskLearners as Array<{ learnerId: string; learnerName: string; learnerEmail: string; riskScore: number; riskFactors?: string[] }> | undefined;
      
      if (!analytics) {
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-8 text-center">
              <p className="text-slate-400">Loading analytics...</p>
            </div>
          </div>
        );
      }
      
      return (
      <div className="space-y-4">
        {/* Analytics Header with Date Range Filter */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">Academy Analytics</h2>
            <p className="text-sm text-slate-400">{analyticsPeriodLabel}</p>
          </div>
          <div className="w-full sm:w-auto">
            <AnalyticsDateRangeFilter 
              onRangeChange={onAnalyticsRangeChange}
              defaultPreset="30d"
            />
          </div>
        </div>
        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-2 flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">Trainer intelligence export</p>
              <p className="mt-1 text-sm text-emerald-100/70 line-clamp-2">Download learner scores, risk flags, practical reviews, sign-offs, and certificate status for coaching meetings.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="/api/v1/admin/academy/export?format=csv" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 whitespace-nowrap flex-1 sm:flex-none justify-center">
                <Download className="size-4" /> CSV
              </a>
              <a href="/api/v1/admin/academy/export?format=excel" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 whitespace-nowrap flex-1 sm:flex-none justify-center">
                <Download className="size-4" /> Excel
              </a>
              <a href="/api/v1/admin/academy/export?format=pdf" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 whitespace-nowrap flex-1 sm:flex-none justify-center">
                <Download className="size-4" /> PDF
              </a>
            </div>
          </div>
        
        {/* Revenue & Registrations */}
        <ActivityPanel title="Revenue & Registrations" icon={BarChart3}>
          <MetricRow label="Academy revenue" value={`USD ${Number(revenue?.total ?? data.metrics.academyRevenue ?? 0).toFixed(2)}`} />
          <MetricRow label="Paid registrations" value={String(revenue?.count ?? 0)} />
          <MetricRow label="Total registrations" value={String(analytics?.registrations ?? data.metrics.publicLearners ?? 0)} />
          <MetricRow label="Active learners (7d)" value={String(analytics?.activeLearners ?? data.metrics.activeLearners ?? 0)} />
        </ActivityPanel>
        
        {/* Completion & Certificates */}
        <ActivityPanel title="Completion & Certificates" icon={Trophy}>
          <MetricRow label="Course completions" value={String(analytics?.completions ?? 0)} />
          <MetricRow label="Certificates issued" value={String(analytics?.certificates ?? 0)} />
          <MetricRow label="Average score" value={`${Number(analytics?.averageScore ?? 0).toFixed(1)}%`} />
        </ActivityPanel>
        
        {/* Popular Courses */}
        <ActivityPanel title="Popular Courses" icon={BookOpen}>
          {popularCourses && popularCourses.length > 0 ? (
            <div className="space-y-2">
              {popularCourses.map((course) => (
                <div 
                  key={course.courseId} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3 cursor-pointer hover:border-emerald-500/30 transition"
                  onClick={() => setSelectedCourseForDrilldown({ id: course.courseId, title: course.courseTitle })}
                >
                  <span className="text-sm font-medium text-white truncate flex-1">{course.courseTitle}</span>
                  <span className="text-sm text-slate-400 sm:ml-2">{course._count || 0} enrolled</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No course enrollment data yet.</p>
          )}
        </ActivityPanel>
        
        {/* Course Completion Rates */}
        <ActivityPanel title="Course Completion Rates" icon={Target}>
          {completionRates && completionRates.length > 0 ? (
            <div className="space-y-2">
              {completionRates.map((rate) => (
                <div key={rate.title} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{rate.title}</p>
                    <p className="text-xs text-slate-500">{rate.completed} of {rate.enrolled} completed - Avg progress: {rate.avg_progress || 0}%</p>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold sm:ml-2",
                    Number(rate.completion_rate) >= 70 ? "text-emerald-400" :
                    Number(rate.completion_rate) >= 40 ? "text-amber-400" : "text-red-400"
                  )}>
                    {Number(rate.completion_rate || 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanelText>No database-backed course progress records are available for this period.</EmptyPanelText>
          )}
        </ActivityPanel>
        
        {/* At-Risk Learners */}
        <ActivityPanel title="At-Risk Learners" icon={AlertTriangle}>
          {atRiskLearners && atRiskLearners.length > 0 ? (
            <div className="space-y-2">
              {atRiskLearners.slice(0, 5).map((learner) => (
                <div key={learner.learnerId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{learner.learnerName}</p>
                    <p className="text-xs text-slate-400">{learner.learnerEmail}</p>
                  </div>
                  <div className="text-right sm:ml-2">
                    <p className="text-xs font-semibold text-red-300">{learner.riskScore}% risk</p>
                    <p className="text-xs text-slate-500">{learner.riskFactors?.length || 0} factors</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No at-risk learners identified.</p>
          )}
        </ActivityPanel>
        </div>
      </div>
    );
    } catch (error) {
      console.error("Error rendering analytics:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        analytics: analytics,
        dataKeys: analytics ? Object.keys(analytics) : 'No analytics data',
        atRiskLearners: analytics?.atRiskLearners,
        popularCourses: analytics?.popularCourses,
        completionRates: analytics?.completionRates
      });
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <p className="text-red-300">Error loading analytics</p>
            <p className="text-sm text-slate-400 mt-2">Please refresh the page or try again later.</p>
            <p className="text-xs text-slate-500 mt-2">{error instanceof Error ? error.message : String(error)}</p>
          </div>
        </div>
      );
    }
  }
  if (tab === "Email Templates") {
    return <EmailTemplatesManagementPanel />;
  }
  if (tab === "Branding") {
    return <BrandingManagementPanel />;
  }
  if (tab === "Instructors") {
    return <InstructorsManagementPanel />;
  }
  if (tab === "Refunds") {
    return <RefundsManagementPanel />;
  }
  if (tab === "Settings") {
    return <AcademySettingsPanel settings={data.trainingSettings?.payload as Record<string, unknown> ?? {}} auditLogs={data.auditLogs} onSave={(settings) => action({ action: "update_settings", settings }, "Academy settings saved.")} />;
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
  onEdit,
  onArchive,
  onDelete,
}: {
  title: string;
  icon: typeof ClipboardCheck;
  rows: Array<{ id: string; title: string; active?: boolean; [key: string]: unknown }>;
  actionLabel: string;
  onCreate?: () => void;
  onEdit?: (row: { id: string; title: string; active?: boolean; [key: string]: unknown }) => unknown;
  onArchive?: (row: { id: string; title: string; active?: boolean; [key: string]: unknown }) => unknown;
  onDelete?: (row: { id: string; title: string; active?: boolean; [key: string]: unknown }) => unknown;
}) {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; active?: boolean; [key: string]: unknown } | null>(null);
  const filteredRows = rows.filter((row) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${row.title} ${String(row.detail ?? "")}`.toLowerCase().includes(needle);
  });
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Icon className="size-5 text-emerald-400" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        {onCreate && <Button className="w-full sm:w-auto" onClick={onCreate}><Plus className="size-4" /> {actionLabel}</Button>}
      </div>
      <div className="border-b border-white/10 p-3">
        <AdminSearchInput value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}...`} />
      </div>
      <AdminDataTable
        rows={filteredRows}
        columns={[
          { key: "title", header: "Title", render: (row) => <span className="font-semibold text-white">{row.title}</span> },
          { key: "detail", header: "Detail", render: (row) => <span className="text-sm text-slate-400">{String(row.detail ?? "")}</span> },
          { key: "state", header: "State", render: (row) => <AdminStatusBadge status={row.active === false ? "Hidden" : "Active"} variant={row.active === false ? "muted" : "success"} /> },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              onEdit || onArchive || onDelete ? (
                <ActionToolbar
                  actions={[
                    ...(onEdit ? [{ label: "Edit", icon: Pencil, onClick: () => void onEdit(row) }] : []),
                    ...(onArchive ? [{ label: row.active === false ? "Restore" : "Archive", icon: row.active === false ? RotateCcw : Archive, onClick: () => void onArchive(row), more: true }] : []),
                    ...(onDelete ? [{ label: "Delete", icon: Trash2, tone: "danger" as const, onClick: () => setDeleteTarget(row), more: true }] : []),
                  ]}
                />
              ) : <span className="text-xs text-slate-500">{actionLabel}</span>
            ),
          },
        ]}
        emptyMessage={search ? "No matching records found." : "No records yet."}
      />
      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete record?"
        description={deleteTarget ? `This removes ${deleteTarget.title}. This action cannot be undone.` : ""}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void onDelete?.(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}

function CertificateManagementPanel({
  certificates,
  action,
}: {
  certificates: AcademyData["certificates"];
  action: (body: Record<string, unknown>, success: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState("Quality review required before the credential is shown publicly.");
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <h3 className="font-semibold text-white">Certificate Management</h3>
          <p className="mt-1 text-sm text-slate-400">Suspend, revoke, or reactivate public certificate verification with an audit reason.</p>
        </div>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white md:w-96"
          aria-label="Certificate status reason"
        />
      </div>
      <AdminDataTable
        rows={certificates}
        columns={[
          { key: "number", header: "Certificate", render: (certificate) => <span className="font-semibold text-white">{certificate.certificateNumber}</span> },
          {
            key: "agent",
            header: "Learner",
            render: (certificate) => (
              <span className="text-sm text-slate-300">{certificate.learnerName ?? certificate.learnerEmail ?? certificate.agentId}</span>
            ),
          },
          { key: "status", header: "Status", render: (certificate) => <AdminStatusBadge status={certificate.status} variant={certificate.status === "ACTIVE" ? "success" : "danger"} /> },
          { key: "issued", header: "Issued", render: (certificate) => new Date(certificate.issuedAt).toLocaleDateString() },
          {
            key: "actions",
            header: "Actions",
            render: (certificate) => (
              <div className="flex flex-wrap gap-2">
                {certificate.status !== "ACTIVE" ? (
                  <Button onClick={() => void action({ action: "update_certificate_status", certificateId: certificate.id, status: "ACTIVE" }, "Certificate reactivated.")}>Reactivate</Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => void action({ action: "update_certificate_status", certificateId: certificate.id, status: "SUSPENDED", reason }, "Certificate suspended.")}>Suspend</Button>
                    <Button variant="secondary" onClick={() => void action({ action: "update_certificate_status", certificateId: certificate.id, status: "REVOKED", reason }, "Certificate revoked.")}>Revoke</Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        emptyMessage="No issued certificates yet."
      />
    </section>
  );
}

function _AssignmentReviewQueue({
  submissions,
  action,
}: {
  submissions: NonNullable<AcademyData["assignmentSubmissions"]>;
  action: (body: Record<string, unknown>, success: string) => Promise<unknown>;
}) {
  const queue = submissions
    .filter((submission) => ["SUBMITTED", "RESUBMISSION_REQUESTED"].includes(submission.status))
    .slice(0, 8);
  return (
    <ActivityPanel title="Assignment Review Queue" icon={ClipboardCheck}>
      {queue.length === 0 ? (
        <p className="text-sm text-slate-400">No practical assignments are waiting for review.</p>
      ) : (
        <div className="space-y-3">
          {queue.map((submission) => (
            <div key={submission.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{submission.assignmentTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">{submission.agentId} - {new Date(submission.submittedAt).toLocaleDateString()}</p>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                  {submission.status.replace(/_/g, " ")}
                </span>
              </div>
              {submission.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-300">{submission.notes}</p>}
              {submission.fileUrls.length > 0 && (
                <a href={submission.fileUrls[0]} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-semibold text-emerald-300 hover:underline">
                  View submitted file
                </a>
              )}
              <AssignmentReviewControls submissionId={submission.id} assignmentTitle={submission.assignmentTitle} action={action} />
            </div>
          ))}
        </div>
      )}
    </ActivityPanel>
  );
}

function AssignmentReviewControls({
  submissionId,
  assignmentTitle,
  action,
}: {
  submissionId: string;
  assignmentTitle: string;
  action: (body: Record<string, unknown>, success: string) => Promise<unknown>;
}) {
  const rubric = assignmentRubricCriteria(assignmentTitle);
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(() => Object.fromEntries(rubric.map((item) => [item, 85])));
  const rubricSummary = rubric.map((item) => `${item}: ${criteriaScores[item] ?? 0}`).join("; ");
  const [reviewerNote, setReviewerNote] = useState("Mentor sign-off: granted. Practical work is client-ready with the corrections noted below.");
  const gradeNumber = Math.round(rubric.reduce((sum, item) => sum + Math.max(0, Math.min(100, Number(criteriaScores[item]) || 0)), 0) / Math.max(1, rubric.length));
  const fullReviewerNote = `Rubric scores: ${rubricSummary}. ${reviewerNote}`.trim();
  return (
    <div className="mt-3 space-y-2">
      <div className="grid gap-2 rounded-lg border border-white/10 bg-slate-900/70 p-2 text-[11px] leading-4 text-slate-300 sm:grid-cols-2">
        {rubric.map((item) => (
          <label key={item} className="grid gap-1 rounded-md bg-slate-950/60 px-2 py-1.5">
            <span>{item}</span>
            <input
              value={criteriaScores[item] ?? 0}
              onChange={(event) => setCriteriaScores({ ...criteriaScores, [item]: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })}
              type="number"
              min={0}
              max={100}
              className="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
              aria-label={`${item} score`}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
        <div className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300">
          Final: <span className="font-bold text-white">{gradeNumber}%</span>
        </div>
        <input
          value={reviewerNote}
          onChange={(event) => setReviewerNote(event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
          aria-label="Reviewer note"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
          onClick={() => void action({ action: "review_assignment_submission", submissionId, review: { status: "GRADED", grade: gradeNumber, reviewerNote: fullReviewerNote } }, "Assignment graded.")}
        >
          Grade and sign off
        </button>
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100"
          onClick={() => void action({ action: "review_assignment_submission", submissionId, review: { status: "RESUBMISSION_REQUESTED", reviewerNote: `Rubric scores: ${rubricSummary}. Resubmission required: ${reviewerNote}` } }, "Resubmission requested.")}
        >
          Request resubmission
        </button>
      </div>
    </div>
  );
}

function assignmentRubricCriteria(title: string) {
  if (/listing|cma|pricing|property/i.test(title)) {
    return ["Verified property facts", "Pricing evidence", "Risk notes", "Professional presentation"];
  }
  if (/client|viewing|offer|negotiation|qualification/i.test(title)) {
    return ["Client qualification", "Communication quality", "Documented follow-up", "Risk escalation"];
  }
  if (/compliance|document|inspection|file/i.test(title)) {
    return ["File completeness", "Authority checks", "Confidentiality", "Audit-ready notes"];
  }
  if (/portfolio|performance|pipeline|kpi/i.test(title)) {
    return ["Evidence completeness", "Data quality", "Reflection depth", "Improvement plan"];
  }
  return ["Practical application", "Evidence quality", "Professional judgement", "Clear next steps"];
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
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    fullName: string;
    productLabel: string;
    status: string;
    reviewAction: string;
    deleteAction: string;
    deleteIdKey: string;
  } | null>(null);
  const pendingCount =
    applications.filter((item) => item.status === "PAYMENT_UPLOADED" || item.status === "PENDING_PAYMENT").length +
    resourceApplications.filter((item) => item.status === "PAYMENT_UPLOADED" || item.status === "PENDING_PAYMENT").length;

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
    updatedAt: row.updatedAt,
    productLabel:
      row.resourceKind === "TRAINING_MANUAL"
        ? "Training manual"
        : `${row.course?.title ?? "Course"} toolkit`,
    reviewAction: "review_resource_access" as const,
    reviewIdKey: "accessId" as const,
    deleteAction: "delete_resource_access" as const,
    deleteIdKey: "accessId" as const,
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
    updatedAt: row.updatedAt,
    productLabel: row.course.title,
    reviewAction: "review_public_learner" as const,
    reviewIdKey: "applicationId" as const,
    deleteAction: "delete_public_learner" as const,
    deleteIdKey: "applicationId" as const,
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
            render: (row) => {
              const canReview = row.status !== "APPROVED" && row.status !== "REJECTED";
              return (
                <div className="flex flex-wrap justify-end gap-2">
                  {canReview ? (
                    <>
                      <Button onClick={() => void action({ action: row.reviewAction, [row.reviewIdKey]: row.id, status: "APPROVED" }, "Access approved.")}>
                        Approve
                      </Button>
                      <Button variant="secondary" onClick={() => void action({ action: row.reviewAction, [row.reviewIdKey]: row.id, status: "REJECTED", adminNote: "Payment proof could not be verified. Please upload a clearer proof of payment." }, "Registration rejected.")}>
                        Reject
                      </Button>
                    </>
                  ) : (
                    <span className="inline-flex min-h-10 flex-col justify-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400">
                      <span>{row.status === "APPROVED" ? "Already approved" : "Rejected"}</span>
                      <span className="mt-0.5 text-[10px] font-medium text-slate-500">Updated {formatShortDate(row.updatedAt)}</span>
                    </span>
                  )}
                  <ActionToolbar
                    actions={[
                      { label: "Delete", icon: Trash2, tone: "danger", more: !canReview, onClick: () => setDeleteTarget(row) },
                    ]}
                  />
                </div>
              );
            },
          },
        ]}
        emptyMessage="No learner registrations or resource access requests yet."
      />
      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete learner record?"
        description={deleteTarget ? `This removes ${deleteTarget.fullName}'s ${deleteTarget.productLabel} record${deleteTarget.status === "APPROVED" && deleteTarget.reviewAction === "review_public_learner" ? " and revokes course access" : ""}.` : ""}
        confirmLabel="Delete record"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void action({ action: deleteTarget.deleteAction, [deleteTarget.deleteIdKey]: deleteTarget.id }, "Record deleted.");
          setDeleteTarget(null);
        }}
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
    subtitle: course?.subtitle ?? "",
    description: course?.description ?? "",
    shortDescription: course?.shortDescription ?? "",
    categoryId: course?.categoryId ?? "",
    difficulty: course?.difficulty ?? "BEGINNER" as AcademyCourse["difficulty"],
    status: course?.status ?? "DRAFT" as AcademyCourse["status"],
    visibility: course?.visibility ?? "INTERNAL_ONLY" as AcademyCourse["visibility"],
    instructor: course?.instructor ?? "",
    learningOutcomes: course?.learningOutcomes?.join("\n") ?? "",
    targetAudience: course?.targetAudience ?? "",
    prerequisites: course?.prerequisites?.join("\n") ?? "",
    thumbnailUrl: course?.thumbnailUrl ?? "",
    bannerUrl: course?.bannerUrl ?? "",
    introVideoUrl: course?.introVideoUrl ?? "",
    seoTitle: course?.seoTitle ?? "",
    seoDescription: course?.seoDescription ?? "",
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
  const { showToast } = useApp();
  const [course, setCourse] = useState(courseFormDefaults(editingCourse));
  useEffect(() => {
    if (open) setCourse(courseFormDefaults(editingCourse));
  }, [editingCourse, open]);
  const editing = Boolean(editingCourse);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Course" : "Create Course"} description="Admin-controlled courses with status, visibility, public learner pricing, agent pricing, certificates, access duration, and analytics." onClose={onClose} width="xl">
      <FormGrid>
        <TextInput label="Course title" value={course.title} onChange={(title) => setCourse({ ...course, title })} />
        <TextInput label="Subtitle" value={course.subtitle} onChange={(subtitle) => setCourse({ ...course, subtitle })} />
        <TextInput label="Instructor" value={course.instructor} onChange={(instructor) => setCourse({ ...course, instructor })} />
        <TextArea label="Description" value={course.description} onChange={(description) => setCourse({ ...course, description })} className="sm:col-span-2" />
        <TextArea label="Short Description" value={course.shortDescription} onChange={(shortDescription) => setCourse({ ...course, shortDescription })} className="sm:col-span-2" />
        <TextArea label="Learning Outcomes (one per line)" value={course.learningOutcomes} onChange={(learningOutcomes) => setCourse({ ...course, learningOutcomes })} className="sm:col-span-2" />
        <TextArea label="Target Audience" value={course.targetAudience} onChange={(targetAudience) => setCourse({ ...course, targetAudience })} className="sm:col-span-2" />
        <TextArea label="Prerequisites (one per line)" value={course.prerequisites} onChange={(prerequisites) => setCourse({ ...course, prerequisites })} className="sm:col-span-2" />
        <MediaUrlInput label="Thumbnail" value={course.thumbnailUrl} folder="academy/courses" accept="image/*" kind="image" onChange={(thumbnailUrl) => setCourse({ ...course, thumbnailUrl })} onError={(message) => showToast(message, "error")} className="sm:col-span-2" />
        <MediaUrlInput label="Banner" value={course.bannerUrl} folder="academy/courses" accept="image/*" kind="image" onChange={(bannerUrl) => setCourse({ ...course, bannerUrl })} onError={(message) => showToast(message, "error")} className="sm:col-span-2" />
        <MediaUrlInput label="Intro Video" value={course.introVideoUrl} folder="academy/courses" accept="video/*" kind="video" onChange={(introVideoUrl) => setCourse({ ...course, introVideoUrl })} onError={(message) => showToast(message, "error")} className="sm:col-span-2" />
        <TextInput label="SEO Title" value={course.seoTitle} onChange={(seoTitle) => setCourse({ ...course, seoTitle })} />
        <TextInput label="SEO Description" value={course.seoDescription} onChange={(seoDescription) => setCourse({ ...course, seoDescription })} />
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
      <DrawerActions
        busy={busy}
        disabled={!course.title.trim() || !course.description.trim()}
        onClose={onClose}
        onSave={() => onSave({
          ...course,
          tags: course.tags,
          learningOutcomes: course.learningOutcomes.split("\n").map((item) => item.trim()).filter(Boolean),
          prerequisites: course.prerequisites.split("\n").map((item) => item.trim()).filter(Boolean),
        })}
        label={editing ? "Save course" : "Create course"}
      />
    </AdminDrawer>
  );
}

function DocumentDrawer({
  open,
  busy,
  document: existingDocument,
  mode = "create",
  onClose,
  onSave,
}: {
  open: boolean;
  busy: boolean;
  document?: AcademyDocument | null;
  mode?: "create" | "edit" | "replace";
  onClose: () => void;
  onSave: (document: Record<string, unknown>) => Promise<unknown>;
}) {
  const { showToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", description: "", fileUrl: "", fileName: "", fileType: "PDF", tags: "", permissions: "ADMIN,AGENT", fileSizeBytes: 0 });
  const editing = mode === "edit";
  const replacing = mode === "replace";

  useEffect(() => {
    if (!open) return;
    if (!existingDocument) {
      setForm({ title: "", description: "", fileUrl: "", fileName: "", fileType: "PDF", tags: "", permissions: "ADMIN,AGENT", fileSizeBytes: 0 });
      return;
    }
    setForm({
      title: existingDocument.title,
      description: existingDocument.description ?? "",
      fileUrl: replacing ? "" : existingDocument.fileUrl,
      fileName: replacing ? "" : existingDocument.fileName,
      fileType: existingDocument.fileType,
      tags: existingDocument.tags.join(", "),
      permissions: existingDocument.permissions.join(", "),
      fileSizeBytes: replacing ? 0 : existingDocument.fileSizeBytes,
    });
  }, [existingDocument, open, replacing]);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const dataUrl = await readFile(file);
    const result = await apiFetch<{ url: string; filename: string; size: number }>("/api/v1/uploads", { method: "POST", body: JSON.stringify({ dataUrl, kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "document", folder: "academy" }) });
    if (!result.data) {
      showToast(result.error?.message ?? "Upload failed.", "error");
      return;
    }
    setForm({ ...form, fileUrl: result.data.url, fileName: file.name, fileSizeBytes: result.data.size, title: form.title || file.name.replace(/\.[^.]+$/, ""), fileType: detectDocumentType(file.name, file.type) });
  }
  const drawerTitle = editing ? "Edit Document" : replacing ? "Replace Document" : "Upload Document";
  const drawerDescription = editing
    ? "Rename the document, update its description, tags, permissions, and visibility metadata."
    : replacing
      ? "Upload a new file for this document. The current document is kept as the previous version."
      : "PDF, DOCX, XLSX, PPTX, images, video, audio, and ZIP files with preview, download, versioning, search, permissions, and audit log.";
  const saveLabel = editing ? "Save changes" : replacing ? "Replace document" : "Save document";
  const saveDisabled = !form.title.trim() || (!editing && !form.fileUrl);
  return (
    <AdminDrawer open={open} title={drawerTitle} description={drawerDescription} onClose={onClose} width="xl">
      <div className="mb-4 rounded-xl border border-dashed border-white/15 bg-slate-900/60 p-5 text-center">
        <Upload className="mx-auto size-7 text-emerald-400" />
        <p className="mt-2 font-semibold text-white">{form.fileName || (editing ? existingDocument?.fileName : "Choose an Academy resource")}</p>
        <p className="mt-1 text-xs text-slate-500">Supported: {documentTypes.join(", ")}</p>
        <Button className="mt-4" variant="secondary" onClick={() => inputRef.current?.click()}>Select file</Button>
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.mp3,.wav,.m4a,.zip" onChange={(event) => void upload(event.target.files)} />
      </div>
      <FormGrid>
        <TextInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
        <SelectInput label="File type" value={form.fileType} options={[...documentTypes]} onChange={(fileType) => setForm({ ...form, fileType })} />
        <TextArea label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} className="sm:col-span-2" />
        <TextInput label="Tags" value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
        <TextInput label="Permissions" value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
      </FormGrid>
      <DrawerActions busy={busy} disabled={saveDisabled} onClose={onClose} onSave={() => onSave(form)} label={saveLabel} />
    </AdminDrawer>
  );
}

function VideoDrawer({ open, busy, onClose, onSave }: { open: boolean; busy: boolean; onClose: () => void; onSave: (video: Record<string, unknown>) => Promise<unknown> }) {
  const { showToast } = useApp();
  const [video, setVideo] = useState({ title: "", description: "", category: "Training", videoUrl: "", durationSeconds: 0, captionsUrl: "", downloadable: false, tags: "" });
  return (
    <AdminDrawer open={open} title="Add Video" description="Add streamed Academy videos with watch tracking, captions, bookmarks, notes, and analytics." onClose={onClose} width="xl">
      <FormGrid>
        <TextInput label="Title" value={video.title} onChange={(title) => setVideo({ ...video, title })} />
        <TextInput label="Category" value={video.category} onChange={(category) => setVideo({ ...video, category })} />
        <MediaUrlInput
          label="Video"
          value={video.videoUrl}
          folder="academy/videos"
          accept="video/*"
          kind="video"
          onChange={(videoUrl) => setVideo({ ...video, videoUrl })}
          onError={(message) => showToast(message, "error")}
          className="sm:col-span-2"
        />
        <TextArea label="Description" value={video.description} onChange={(description) => setVideo({ ...video, description })} className="sm:col-span-2" />
        <TextInput label="Duration seconds" type="number" value={String(video.durationSeconds)} onChange={(durationSeconds) => setVideo({ ...video, durationSeconds: Number(durationSeconds) })} />
        <MediaUrlInput
          label="Captions"
          value={video.captionsUrl}
          folder="academy/captions"
          accept=".vtt,.srt,text/vtt,text/plain"
          kind="document"
          onChange={(captionsUrl) => setVideo({ ...video, captionsUrl })}
          onError={(message) => showToast(message, "error")}
        />
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

function LearningPathDrawer({ open, busy, courses, path: editingPath, onClose, onSave }: { open: boolean; busy: boolean; courses: AcademyCourse[]; path?: AcademyData["learningPaths"][number] | null; onClose: () => void; onSave: (path: Record<string, unknown>) => Promise<unknown> }) {
  const [path, setPath] = useState({ title: "", description: "", status: "PUBLISHED", badgeTitle: "", courseIds: [] as string[] });
  useEffect(() => {
    if (!open) return;
    setPath({
      title: editingPath?.title ?? "",
      description: editingPath?.description ?? "",
      status: editingPath?.status ?? "PUBLISHED",
      badgeTitle: editingPath?.badgeTitle ?? "",
      courseIds: editingPath?.courses?.map((entry) => entry.course.id) ?? [],
    });
  }, [editingPath, open]);
  const editing = Boolean(editingPath);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Learning Path" : "Create Learning Path"} description="Combine courses into a sequenced Academy programme with automatic progress tracking." onClose={onClose} width="lg">
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
      <DrawerActions busy={busy} disabled={!path.title || !path.courseIds.length} onClose={onClose} onSave={() => onSave(path)} label={editing ? "Save path" : "Create path"} />
    </AdminDrawer>
  );
}

function AnnouncementDrawer({ open, busy, announcement: editingAnnouncement, onClose, onSave }: { open: boolean; busy: boolean; announcement?: AcademyData["announcements"][number] | null; onClose: () => void; onSave: (announcement: Record<string, unknown>) => Promise<unknown> }) {
  const [announcement, setAnnouncement] = useState({ title: "", body: "", audience: "ALL" });
  useEffect(() => {
    if (!open) return;
    setAnnouncement({
      title: editingAnnouncement?.title ?? "",
      body: editingAnnouncement?.body ?? "",
      audience: editingAnnouncement?.audience ?? "ALL",
    });
  }, [editingAnnouncement, open]);
  const editing = Boolean(editingAnnouncement);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Announcement" : "Publish Announcement"} description="Send Academy announcements to agents, learners, trainers, or all users." onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Title" value={announcement.title} onChange={(title) => setAnnouncement({ ...announcement, title })} />
        <SelectInput label="Audience" value={announcement.audience} options={["ALL", "AGENTS", "LEARNERS", "PUBLIC_LEARNERS", "TRAINERS", "ADMINS"]} onChange={(audience) => setAnnouncement({ ...announcement, audience })} />
        <TextArea label="Message" value={announcement.body} onChange={(body) => setAnnouncement({ ...announcement, body })} className="sm:col-span-2" />
      </FormGrid>
      <DrawerActions busy={busy} disabled={!announcement.title || !announcement.body} onClose={onClose} onSave={() => onSave(announcement)} label={editing ? "Update announcement" : "Publish announcement"} />
    </AdminDrawer>
  );
}

function BadgeDrawer({ open, busy, badge: editingBadge, onClose, onSave }: { open: boolean; busy: boolean; badge?: AcademyData["badges"][number] | null; onClose: () => void; onSave: (badge: Record<string, unknown>) => Promise<unknown> }) {
  const { showToast } = useApp();
  const [badge, setBadge] = useState({ name: "", description: "", xp: 100, iconUrl: "", active: true });
  useEffect(() => {
    if (!open) return;
    setBadge({
      name: editingBadge?.name ?? "",
      description: editingBadge?.description ?? "",
      xp: editingBadge?.xp ?? 100,
      iconUrl: editingBadge?.iconUrl ?? "",
      active: editingBadge?.active ?? true,
    });
  }, [editingBadge, open]);
  const editing = Boolean(editingBadge);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Badge" : "Create Badge"} description="Create automatic Academy achievements, XP rewards, and learner recognition badges." onClose={onClose} width="lg">
      <FormGrid>
        <TextInput label="Badge name" value={badge.name} onChange={(name) => setBadge({ ...badge, name })} />
        <TextInput label="XP" type="number" value={String(badge.xp)} onChange={(xp) => setBadge({ ...badge, xp: Number(xp) })} />
        <MediaUrlInput
          label="Badge Icon"
          value={badge.iconUrl}
          folder="academy/badges"
          accept="image/*"
          kind="image"
          onChange={(iconUrl) => setBadge({ ...badge, iconUrl })}
          onError={(message) => showToast(message, "error")}
        />
        <TextArea label="Description" value={badge.description} onChange={(description) => setBadge({ ...badge, description })} className="sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={badge.active} onChange={(event) => setBadge({ ...badge, active: event.target.checked })} />
          Active
        </label>
      </FormGrid>
      <DrawerActions busy={busy} disabled={!badge.name} onClose={onClose} onSave={() => onSave(badge)} label={editing ? "Save badge" : "Create badge"} />
    </AdminDrawer>
  );
}

function LessonDrawer({ open, busy, lesson: editingLesson, courses: _courses, onClose, onSave }: { open: boolean; busy: boolean; lesson?: AcademyLesson | null; courses: AcademyCourse[]; onClose: () => void; onSave: (lesson: Record<string, unknown>) => Promise<unknown> }) {
  const { showToast } = useApp();
  const [lesson, setLesson] = useState({
    title: editingLesson?.title ?? "",
    summary: editingLesson?.summary ?? "",
    richText: editingLesson?.richText ?? "",
    lessonDepth: lessonDepthFromResources(editingLesson?.lessonResources ?? []),
    videoUrl: editingLesson?.videoUrl ?? "",
    embeddedVideoUrl: editingLesson?.embeddedVideoUrl ?? "",
    pdfUrl: editingLesson?.pdfUrl ?? "",
    audioUrl: editingLesson?.audioUrl ?? "",
    estimatedMinutes: editingLesson?.estimatedMinutes ?? 30,
    completionRequirement: editingLesson?.completionRequirement ?? "VIEW",
    sortOrder: editingLesson?.sortOrder ?? 0,
  });
  useEffect(() => {
    if (!open) return;
    setLesson({
      title: editingLesson?.title ?? "",
      summary: editingLesson?.summary ?? "",
      richText: editingLesson?.richText ?? "",
      lessonDepth: lessonDepthFromResources(editingLesson?.lessonResources ?? []),
      videoUrl: editingLesson?.videoUrl ?? "",
      embeddedVideoUrl: editingLesson?.embeddedVideoUrl ?? "",
      pdfUrl: editingLesson?.pdfUrl ?? "",
      audioUrl: editingLesson?.audioUrl ?? "",
      estimatedMinutes: editingLesson?.estimatedMinutes ?? 30,
      completionRequirement: editingLesson?.completionRequirement ?? "VIEW",
      sortOrder: editingLesson?.sortOrder ?? 0,
    });
  }, [editingLesson, open]);
  const editing = Boolean(editingLesson);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Lesson" : "Create Lesson"} description="Create and edit Academy lessons with rich text, video, PDF, audio, and completion requirements." onClose={onClose} width="xl">
      <FormGrid>
        <TextInput label="Lesson title" value={lesson.title} onChange={(title) => setLesson({ ...lesson, title })} className="sm:col-span-2" />
        <TextArea label="Summary" value={lesson.summary} onChange={(summary) => setLesson({ ...lesson, summary })} className="sm:col-span-2" />
        <TextArea label="Rich content (HTML)" value={lesson.richText} onChange={(richText) => setLesson({ ...lesson, richText })} className="sm:col-span-2" rows={6} />
        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-sm font-semibold text-white">Premium lesson depth</p>
          <p className="mt-1 text-xs text-slate-400">Optional per-lesson content. Empty fields use smart fallbacks, so every lesson still displays well.</p>
          <div className="mt-4 grid gap-3">
            <TextArea label="Professional outcome" value={lesson.lessonDepth.outcome} onChange={(outcome) => setLesson({ ...lesson, lessonDepth: { ...lesson.lessonDepth, outcome } })} rows={3} />
            <TextArea label="HouseLink field standard (one point per line)" value={lesson.lessonDepth.standard} onChange={(standard) => setLesson({ ...lesson, lessonDepth: { ...lesson.lessonDepth, standard } })} rows={4} />
            <TextArea label="Common mistakes to avoid (one point per line)" value={lesson.lessonDepth.mistakes} onChange={(mistakes) => setLesson({ ...lesson, lessonDepth: { ...lesson.lessonDepth, mistakes } })} rows={4} />
            <TextArea label="Zimbabwe field scenario" value={lesson.lessonDepth.scenario} onChange={(scenario) => setLesson({ ...lesson, lessonDepth: { ...lesson.lessonDepth, scenario } })} rows={4} />
            <TextArea label="Practice before you move on" value={lesson.lessonDepth.practice} onChange={(practice) => setLesson({ ...lesson, lessonDepth: { ...lesson.lessonDepth, practice } })} rows={4} />
          </div>
        </div>
        <MediaUrlInput
          label="Video"
          value={lesson.videoUrl}
          folder="academy/lessons"
          accept="video/*"
          kind="video"
          onChange={(videoUrl) => setLesson({ ...lesson, videoUrl })}
          onError={(message) => showToast(message, "error")}
          className="sm:col-span-2"
        />
        <TextInput label="Embedded video URL (YouTube/Vimeo)" value={lesson.embeddedVideoUrl} onChange={(embeddedVideoUrl) => setLesson({ ...lesson, embeddedVideoUrl })} className="sm:col-span-2" />
        <MediaUrlInput
          label="PDF"
          value={lesson.pdfUrl}
          folder="academy/lessons"
          accept=".pdf,application/pdf"
          kind="document"
          onChange={(pdfUrl) => setLesson({ ...lesson, pdfUrl })}
          onError={(message) => showToast(message, "error")}
        />
        <MediaUrlInput
          label="Audio"
          value={lesson.audioUrl}
          folder="academy/lessons"
          accept="audio/*"
          kind="audio"
          onChange={(audioUrl) => setLesson({ ...lesson, audioUrl })}
          onError={(message) => showToast(message, "error")}
        />
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

function CouponManagementPanel({ coupons, onEditCoupon, onCreateCoupon, onResetCoupon, onDeleteCoupon, setDrawer }: { coupons: AcademyCoupon[]; onEditCoupon: (coupon: AcademyCoupon) => void; onCreateCoupon: () => void; onResetCoupon: (coupon: AcademyCoupon) => void; onDeleteCoupon: (coupon: AcademyCoupon) => void; setDrawer: (drawer: "coupon" | null) => void }) {
  const [search, setSearch] = useState("");
  const filtered = coupons.filter((coupon) => `${coupon.code} ${coupon.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search coupons by code..." className="lg:flex-1" />
        <Button onClick={() => { onCreateCoupon(); setDrawer("coupon"); }}><Plus className="size-4" /> New Coupon</Button>
      </AdminFilterBar>
      
      {/* Desktop table view */}
      <div className="hidden lg:block rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Discount</th>
              <th className="px-4 py-3 text-left font-medium">Usage</th>
              <th className="px-4 py-3 text-left font-medium">Validity</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-bold text-white font-mono">{coupon.code}</p>
                    <p className="text-xs text-slate-500">{coupon.description || "No description"}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">
                      {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                    </p>
                    <p className="text-xs text-slate-500">{coupon.discountType === "PERCENTAGE" ? "Percentage" : "Fixed amount"}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : " / Unlimited"}</p>
                    <p className="text-xs text-slate-500">{coupon.remainingUses !== null ? `${coupon.remainingUses} remaining` : "No limit"}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm text-white">{new Date(coupon.validFrom).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">{coupon.validUntil ? `to ${new Date(coupon.validUntil).toLocaleDateString()}` : "No expiry"}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge status={coupon.isValid ? (coupon.active ? "ACTIVE" : "INACTIVE") : "EXPIRED"} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => onEditCoupon(coupon)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" onClick={() => onResetCoupon(coupon)} title="Reset usage"><RotateCcw className="size-4" /></Button>
                    <Button variant="ghost" className="text-red-400" onClick={() => onDeleteCoupon(coupon)} title="Delete coupon"><Trash2 className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="p-8 text-center text-slate-500">
            <Ticket className="size-12 mx-auto mb-3 opacity-50" />
            <p>No coupons found</p>
          </div>
        )}
      </div>

      {/* Mobile card view */}
      <div className="lg:hidden grid gap-4">
        {filtered.map((coupon) => (
          <div key={coupon.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-bold text-white font-mono text-lg">{coupon.code}</p>
                <p className="text-sm text-slate-400">{coupon.description || "No description"}</p>
              </div>
              <AdminStatusBadge status={coupon.isValid ? (coupon.active ? "ACTIVE" : "INACTIVE") : "EXPIRED"} />
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-1">Discount</p>
                <p className="font-semibold text-white">
                  {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                </p>
                <p className="text-xs text-slate-500">{coupon.discountType === "PERCENTAGE" ? "Percentage" : "Fixed amount"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Usage</p>
                <p className="font-semibold text-white">{coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : " / Unlimited"}</p>
                <p className="text-xs text-slate-500">{coupon.remainingUses !== null ? `${coupon.remainingUses} remaining` : "No limit"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Valid From</p>
                <p className="text-sm text-white">{new Date(coupon.validFrom).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Expiry Date</p>
                <p className="text-sm text-white">{coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString() : "No expiry"}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <Button variant="secondary" className="flex-1" onClick={() => onEditCoupon(coupon)}>
                <Pencil className="size-4 mr-2" /> Edit
              </Button>
              {coupon.active ? (
                <Button variant="ghost" className="flex-1" onClick={() => onEditCoupon({ ...coupon, active: false } as AcademyCoupon)}>
                  <XCircle className="size-4 mr-2" /> Deactivate
                </Button>
              ) : (
                <Button variant="ghost" className="flex-1" onClick={() => onEditCoupon({ ...coupon, active: true } as AcademyCoupon)}>
                  <CheckCircle2 className="size-4 mr-2" /> Activate
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => onResetCoupon(coupon)}>
                <RotateCcw className="size-3 mr-1" /> Reset Usage
              </Button>
              <Button variant="ghost" className="flex-1 text-xs text-red-400" onClick={() => onDeleteCoupon(coupon)}>
                <Trash2 className="size-3 mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div className="p-8 text-center text-slate-500">
            <Ticket className="size-12 mx-auto mb-3 opacity-50" />
            <p>No coupons found</p>
          </div>
        )}
      </div>

      {!coupons.length && (
        <AdminEmptyState title="No coupons created" description="Create promotional coupons to offer discounts on Academy courses." action={<Button onClick={() => { onCreateCoupon(); setDrawer("coupon"); }}><Plus className="size-4" /> Create Coupon</Button>} />
      )}
    </div>
  );
}

function CouponDrawer({ open, busy, coupon: editingCoupon, courses, onClose, onSave }: { open: boolean; busy: boolean; coupon?: AcademyCoupon | null; courses: AcademyCourse[]; onClose: () => void; onSave: (coupon: Record<string, unknown>) => Promise<unknown> }) {
  const [couponData, setCouponData] = useState({
    code: editingCoupon?.code ?? "",
    description: editingCoupon?.description ?? "",
    discountType: editingCoupon?.discountType ?? "PERCENTAGE",
    discountValue: editingCoupon?.discountValue ?? 10,
    maxUses: editingCoupon?.maxUses ?? null,
    minPurchaseAmount: editingCoupon?.minPurchaseAmount ?? null,
    validFrom: editingCoupon?.validFrom ? new Date(editingCoupon.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: editingCoupon?.validUntil ? new Date(editingCoupon.validUntil).toISOString().split('T')[0] : "",
    applicableCourses: editingCoupon?.applicableCourses || [],
    applicableRoles: editingCoupon?.applicableRoles || [],
    active: editingCoupon?.active !== false,
  });
  const editing = Boolean(editingCoupon);
  return (
    <AdminDrawer open={open} title={editing ? "Edit Coupon" : "Create Coupon"} description="Create promotional coupons with discount rules, usage limits, and course restrictions." onClose={onClose} width="xl">
      <FormGrid>
        <TextInput label="Coupon code" value={couponData.code} onChange={(code) => setCouponData({ ...couponData, code: code.toUpperCase().replace(/[^A-Z0-9]/g, "") })} className="sm:col-span-2" />
        <TextArea label="Description" value={couponData.description} onChange={(description) => setCouponData({ ...couponData, description })} className="sm:col-span-2" />
        <SelectInput label="Discount type" value={couponData.discountType} options={["PERCENTAGE", "FIXED_AMOUNT"]} onChange={(discountType) => setCouponData({ ...couponData, discountType })} />
        <TextInput label="Discount value" type="number" value={String(couponData.discountValue)} onChange={(discountValue) => setCouponData({ ...couponData, discountValue: Number(discountValue) })} />
        <TextInput label="Max uses" type="number" value={couponData.maxUses ? String(couponData.maxUses) : ""} onChange={(maxUses) => setCouponData({ ...couponData, maxUses: maxUses ? Number(maxUses) : null })} />
        <TextInput label="Min purchase amount" type="number" value={couponData.minPurchaseAmount ? String(couponData.minPurchaseAmount) : ""} onChange={(minPurchaseAmount) => setCouponData({ ...couponData, minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : null })} />
        <TextInput label="Valid from" type="date" value={couponData.validFrom} onChange={(validFrom) => setCouponData({ ...couponData, validFrom })} />
        <TextInput label="Valid until" type="date" value={couponData.validUntil} onChange={(validUntil) => setCouponData({ ...couponData, validUntil })} />
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">Applicable courses (leave empty for all courses)</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {courses.map((course) => (
              <label key={course.id} className="flex items-center gap-2 text-sm text-slate-400">
                <input 
                  type="checkbox" 
                  checked={couponData.applicableCourses.includes(course.id)} 
                  onChange={(e) => setCouponData({ 
                    ...couponData, 
                    applicableCourses: e.target.checked 
                      ? [...couponData.applicableCourses, course.id] 
                      : couponData.applicableCourses.filter((id) => id !== course.id) 
                  })} 
                />
                {course.title}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">Applicable roles (leave empty for all roles)</label>
          <div className="flex flex-wrap gap-2">
            {["AGENT", "PUBLIC_LEARNER", "ADMIN"].map((role) => (
              <label key={role} className="flex items-center gap-2 text-sm text-slate-400">
                <input 
                  type="checkbox" 
                  checked={couponData.applicableRoles.includes(role)} 
                  onChange={(e) => setCouponData({ 
                    ...couponData, 
                    applicableRoles: e.target.checked 
                      ? [...couponData.applicableRoles, role] 
                      : couponData.applicableRoles.filter((r) => r !== role) 
                  })} 
                />
                {role}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
          <input type="checkbox" checked={couponData.active} onChange={(e) => setCouponData({ ...couponData, active: e.target.checked })} />
          Active (coupon can be used)
        </label>
      </FormGrid>
      <DrawerActions busy={busy} disabled={!couponData.code.trim() || couponData.code.length < 4} onClose={onClose} onSave={() => onSave(couponData)} label={editing ? "Update coupon" : "Create coupon"} />
    </AdminDrawer>
  );
}

function AcademySettingsPanel({ settings, auditLogs, onSave }: { settings: Record<string, unknown>; auditLogs: AcademyData["auditLogs"]; onSave: (settings: Record<string, unknown>) => Promise<unknown> }) {
  const quizSettings = (settings.quizSettings ?? {}) as Record<string, unknown>;
  const enrolmentSettings = (settings.enrolmentSettings ?? {}) as Record<string, unknown>;
  const completionRules = (settings.completionRules ?? {}) as Record<string, unknown>;
  const resourceAccess = (settings.resourceAccess ?? {}) as Record<string, unknown>;
  const [draft, setDraft] = useState({
    academyName: String(settings.academyName ?? "HouseLink Agent Academy"),
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
    requireEmailVerification: settings.requireEmailVerification !== false,
    autoIssueCertificate: completionRules.autoIssueCertificate !== false,
    requireAllLessons: completionRules.requireAllLessons !== false,
    emailFromName: String((settings.emailSettings as Record<string, unknown>)?.fromName ?? "HouseLink Academy"),
    emailWelcomeSubject: String((settings.emailSettings as Record<string, unknown>)?.welcomeSubject ?? "Welcome to HouseLink Academy"),
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
                branding: { ...(settings.branding as object), dashboardWelcome: draft.dashboardWelcome, logoUrl: "/brand/houselink-full-lockup.png" },
                resourceAccess: {
                  manualPublicPrice: Number(draft.manualPublicPrice) || 35,
                  manualAgentPrice: Number(draft.manualAgentPrice) || 15,
                  manualSalesEnabled: draft.manualSalesEnabled,
                },
                requireEmailVerification: draft.requireEmailVerification,
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
          <p className="mb-3 text-sm leading-6 text-slate-400">
            Controls the separate Complete Training Manual checkout shown in the learner dashboard. Programme and toolkit prices are edited on each course.
          </p>
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
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.requireEmailVerification} onChange={(e) => setDraft({ ...draft, requireEmailVerification: e.target.checked })} /> Require email verification before registration</label>
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

function MediaUrlInput({
  label,
  value,
  onChange,
  accept,
  kind,
  folder,
  className,
  onError,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accept: string;
  kind: "image" | "video" | "audio" | "document";
  folder: string;
  className?: string;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readFile(file);
      const result = await apiFetch<{ url: string }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl, kind, folder }),
      });
      if (!result.data?.url) {
        onError(result.error?.message ?? `${label} upload failed.`);
        return;
      }
      onChange(result.data.url);
    } catch (error) {
      onError(error instanceof Error ? error.message : `${label} upload failed.`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("min-w-0 text-sm text-slate-300", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{label}</span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          {value ? (
            <Button type="button" variant="secondary" disabled={uploading} onClick={() => onChange("")}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => void upload(event.currentTarget.files)} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste a hosted URL or upload a file"
        className="mt-1 w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500/40"
      />
      {value ? <p className="mt-1 truncate text-xs text-slate-500">{value}</p> : null}
    </div>
  );
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

function formatShortDate(value?: string) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-ZW", { month: "short", day: "numeric" });
}

export function LessonContentManager({ lessons, documents, action }: { lessons: AcademyLesson[]; documents: AcademyDocument[]; action: (body: Record<string, unknown>, success: string) => Promise<unknown> }) {
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [contentTab, setContentTab] = useState<"videos" | "documents" | "resources" | "downloads">("videos");
  const [drawer, setDrawer] = useState<"video" | "resource" | "download" | "document" | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
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
                  <ActionToolbar
                    actions={[
                      { label: "Edit", icon: Pencil, onClick: () => { setSelectedItem(video); setDrawer("video"); } },
                      {
                        label: "Delete",
                        icon: Trash2,
                        tone: "danger",
                        more: true,
                        onClick: () => setConfirm({
                          title: "Delete video?",
                          description: `This removes "${video.title}" from the lesson.`,
                          confirmLabel: "Delete video",
                          onConfirm: () => void action({ action: "delete_lesson_video", videoId: video.id }, "Video deleted."),
                        }),
                      },
                    ]}
                  />
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
                  <ActionToolbar
                    actions={[
                      {
                        label: "Remove",
                        icon: Trash2,
                        tone: "danger",
                        onClick: () => setConfirm({
                          title: "Remove document link?",
                          description: "This removes the document from this lesson but keeps it in the Academy library.",
                          confirmLabel: "Remove link",
                          onConfirm: () => void action({ action: "remove_lesson_document", linkId: link.id }, "Document removed."),
                        }),
                      },
                    ]}
                  />
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
                  <ActionToolbar
                    actions={[
                      { label: "Edit", icon: Pencil, onClick: () => { setSelectedItem(resource); setDrawer("resource"); } },
                      {
                        label: "Delete",
                        icon: Trash2,
                        tone: "danger",
                        more: true,
                        onClick: () => setConfirm({
                          title: "Delete resource?",
                          description: `This removes "${resource.title}" from the lesson.`,
                          confirmLabel: "Delete resource",
                          onConfirm: () => void action({ action: "delete_lesson_resource", resourceId: resource.id }, "Resource deleted."),
                        }),
                      },
                    ]}
                  />
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
                  <ActionToolbar
                    actions={[
                      { label: "Edit", icon: Pencil, onClick: () => { setSelectedItem(download); setDrawer("download"); } },
                      {
                        label: "Delete",
                        icon: Trash2,
                        tone: "danger",
                        more: true,
                        onClick: () => setConfirm({
                          title: "Delete download?",
                          description: `This removes "${download.title}" from the lesson.`,
                          confirmLabel: "Delete download",
                          onConfirm: () => void action({ action: "delete_lesson_download", downloadId: download.id }, "Download deleted."),
                        }),
                      },
                    ]}
                  />
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
      <AdminConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
      />
    </div>
  );
}

function LessonVideoDrawer({ open, busy, lessonId, video, onClose, onSave }: { open: boolean; busy: boolean; lessonId: string; video?: any; onClose: () => void; onSave: (video: Record<string, unknown>) => Promise<unknown> }) {
  const { showToast } = useApp();
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
        <MediaUrlInput
          label="Video"
          value={form.url}
          folder="academy/lesson-videos"
          accept="video/*"
          kind="video"
          onChange={(url) => setForm({ ...form, url })}
          onError={(message) => showToast(message, "error")}
          className="sm:col-span-2"
        />
        <SelectInput label="Provider" value={form.provider} options={["UPLOAD", "YOUTUBE", "VIMEO", "EXTERNAL"]} onChange={(provider) => setForm({ ...form, provider })} />
        <TextInput label="Duration (seconds)" type="number" value={String(form.durationSeconds)} onChange={(durationSeconds) => setForm({ ...form, durationSeconds: Number(durationSeconds) })} />
        <MediaUrlInput
          label="Captions"
          value={form.captionsUrl}
          folder="academy/captions"
          accept=".vtt,.srt,text/vtt,text/plain"
          kind="document"
          onChange={(captionsUrl) => setForm({ ...form, captionsUrl })}
          onError={(message) => showToast(message, "error")}
        />
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
