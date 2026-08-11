"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Search, Filter, AlertTriangle, User, BarChart3, Download, BookOpen, Award, Clock, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { AdminStatPill, AdminStatusBadge } from "@/components/admin/ui/admin-ui";

type StudentProgressAnalytics = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  averageCompletionRate: number;
  totalLearningMinutes: number;
  lastActivityDate: Date | null;
  enrollmentDate: Date | null;
  courses: CourseProgressDetail[];
};

type CourseProgressDetail = {
  courseId: string;
  courseTitle: string;
  enrollmentDate: Date;
  status: string;
  completionPercentage: number;
  learningMinutes: number;
  averageScore: number;
  completedAt: Date | null;
  lastActivityDate: Date | null;
  modulesCompleted: number;
  totalModules: number;
  lessonsCompleted: number;
  totalLessons: number;
  currentLesson: string | null;
  timeSpentPerLesson: number;
  estimatedCompletionDate: Date | null;
};

type StudentQuizAnalytics = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizAttempts: QuizAttemptDetail[];
  examAttempts: ExamAttemptDetail[];
  assignmentSubmissions: AssignmentSubmissionDetail[];
  overallStats: {
    totalQuizzesAttempted: number;
    averageQuizScore: number;
    quizPassRate: number;
    totalExamsAttempted: number;
    averageExamScore: number;
    examPassRate: number;
    totalAssignmentsSubmitted: number;
    averageAssignmentGrade: number;
    onTimeSubmissionRate: number;
  };
};

type QuizAttemptDetail = {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  score: number;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  timeSpentMinutes: number;
  answers: any;
  passed: boolean;
  attemptNumber: number;
};

type ExamAttemptDetail = {
  attemptId: string;
  examId: string;
  examTitle: string;
  courseId: string;
  courseTitle: string;
  score: number;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  timeSpentMinutes: number;
  passed: boolean;
  attemptNumber: number;
};

type AssignmentSubmissionDetail = {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  grade: number | null;
  maxPoints?: number;
  status: string;
  submittedAt: Date;
  gradedAt: Date | null;
  onTime: boolean;
  reviewerNote: string | null;
  attemptNumber: number;
};

type AtRiskStudent = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  riskType: "INACTIVE" | "STRUGGLING" | "STUCK" | "BEHIND_SCHEDULE";
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  riskDescription: string;
  lastActivityDate: Date | null;
  daysSinceLastActivity: number | null;
  consecutiveFailures: number;
  currentLesson: string | null;
  timeOnCurrentLesson: number;
  progressPercentage: number;
  expectedProgress: number;
  interventionRecommended: boolean;
  interventionActions: string[];
};

type RawAtRiskStudent = Partial<AtRiskStudent> & {
  learnerId?: string;
  learnerName?: string;
  learnerEmail?: string;
  riskFactors?: string[];
  engagementScore?: number;
  lastActivity?: string | Date | null;
};

type StudentSearchResult = {
  id: string;
  name: string;
  email: string;
};

type LearnerCourseRow = {
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  courseId: string;
  courseTitle: string;
  courseStatus: string;
  enrolmentStatus: string;
  enrolledAt: string;
  dueAt: string | null;
  status: string;
  completionPercentage: number;
  completedLessons: number;
  totalLessons: number;
  learningMinutes: number;
  averageScore: number;
  quizAttempts: number;
  examAttempts: number;
  failedAttempts: number;
  assignmentsSubmitted: number;
  assignmentsReviewed: number;
  assignmentsPending: number;
  averageAssignmentGrade: number | null;
  certificateStatus: string;
  certificateIssuedAt: string | null;
  certificateEnabled: boolean;
  lastActivityDate: string | null;
  lastLearningActivityDate?: string | null;
  lastSeenAt?: string | null;
  isOnline?: boolean;
  currentLesson: string | null;
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | null;
  riskDescription: string | null;
};

type LearnerCourseGroup = {
  courseId: string;
  courseTitle: string;
  courseStatus: string;
  totalLearners: number;
  completedLearners: number;
  inProgressLearners: number;
  atRiskLearners: number;
  averageProgress: number;
  learners: LearnerCourseRow[];
};

type LearnerOverviewPayload = {
  generatedAt: string;
  totals: {
    learners: number;
    enrolments: number;
    courses: number;
    completed: number;
    inProgress: number;
    atRisk: number;
    certificatesIssued: number;
    averageProgress: number;
  };
  courseGroups: LearnerCourseGroup[];
  learners: LearnerCourseRow[];
};

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportStudentProgress(analytics: StudentProgressAnalytics) {
  downloadCsv(`student-progress-${analytics.studentId}-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Course", "Status", "Completion %", "Completed Lessons", "Total Lessons", "Average Score", "Learning Minutes", "Last Activity"],
    ...analytics.courses.map((course) => [
      course.courseTitle,
      course.status,
      course.completionPercentage,
      course.lessonsCompleted,
      course.totalLessons,
      course.averageScore,
      course.learningMinutes,
      course.lastActivityDate ? new Date(course.lastActivityDate).toISOString() : "",
    ]),
  ]);
}

function exportStudentQuizAnalytics(analytics: StudentQuizAnalytics) {
  downloadCsv(`student-assessments-${analytics.studentId}-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Type", "Title", "Course", "Score/Grade", "Status", "Passed/On Time", "Attempt", "Date"],
    ...analytics.quizAttempts.map((attempt) => ["Quiz", attempt.quizTitle, attempt.courseTitle, attempt.score, attempt.status, attempt.passed ? "Yes" : "No", attempt.attemptNumber, new Date(attempt.startedAt).toISOString()]),
    ...analytics.examAttempts.map((attempt) => ["Exam", attempt.examTitle, attempt.courseTitle, attempt.score, attempt.status, attempt.passed ? "Yes" : "No", attempt.attemptNumber, new Date(attempt.startedAt).toISOString()]),
    ...analytics.assignmentSubmissions.map((submission) => ["Assignment", submission.assignmentTitle, submission.courseTitle, submission.grade ?? "", submission.status, submission.onTime ? "Yes" : "No", submission.attemptNumber, new Date(submission.submittedAt).toISOString()]),
  ]);
}

function normalizeAtRiskStudent(student: RawAtRiskStudent): AtRiskStudent {
  const riskFactors = Array.isArray(student.riskFactors) ? student.riskFactors : [];
  const rawLastActivity = student.lastActivityDate ?? student.lastActivity ?? null;
  const riskType =
    student.riskType ??
    (riskFactors.some((factor) => factor.toLowerCase().includes("completion")) ? "BEHIND_SCHEDULE" :
      riskFactors.some((factor) => factor.toLowerCase().includes("score")) ? "STRUGGLING" :
      "INACTIVE");
  return {
    studentId: student.studentId ?? student.learnerId ?? "",
    studentName: student.studentName ?? student.learnerName ?? "Unknown learner",
    studentEmail: student.studentEmail ?? student.learnerEmail ?? "",
    courseId: student.courseId ?? "",
    courseTitle: student.courseTitle ?? "Unknown course",
    riskType,
    riskLevel: student.riskLevel ?? "MEDIUM",
    riskDescription: student.riskDescription ?? (riskFactors.length ? riskFactors.join(", ") : "Learner may need support"),
    lastActivityDate: rawLastActivity ? new Date(rawLastActivity) : null,
    daysSinceLastActivity: student.daysSinceLastActivity ?? null,
    consecutiveFailures: student.consecutiveFailures ?? 0,
    currentLesson: student.currentLesson ?? null,
    timeOnCurrentLesson: student.timeOnCurrentLesson ?? 0,
    progressPercentage: student.progressPercentage ?? 0,
    expectedProgress: student.expectedProgress ?? 0,
    interventionRecommended: student.interventionRecommended ?? riskFactors.length > 0,
    interventionActions: student.interventionActions ?? ["Send reminder email", "Schedule check-in call"],
  };
}

function normalizeAtRiskStudents(students: RawAtRiskStudent[] = []) {
  return students.map(normalizeAtRiskStudent);
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function StudentAnalyticsDashboard() {
  const [view, setView] = useState<"overview" | "student" | "student-quiz" | "at-risk">("overview");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [studentAnalytics, setStudentAnalytics] = useState<StudentProgressAnalytics | null>(null);
  const [studentQuizAnalytics, setStudentQuizAnalytics] = useState<StudentQuizAnalytics | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [learnerOverview, setLearnerOverview] = useState<LearnerOverviewPayload | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [certificateFilter, setCertificateFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [analyticsResponse, learnersResponse] = await Promise.all([
        apiFetch<{ atRiskLearners: RawAtRiskStudent[] }>("/api/v1/admin/academy/analytics?includeAtRisk=true"),
        apiFetch<LearnerOverviewPayload>("/api/v1/admin/academy/analytics?type=learners-overview"),
      ]);
      if (analyticsResponse.data) setAtRiskStudents(normalizeAtRiskStudents(analyticsResponse.data.atRiskLearners || []));
      if (learnersResponse.data) setLearnerOverview(learnersResponse.data);
    } catch (error) {
      console.error("Failed to load overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentAnalytics = async (studentId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await apiFetch<StudentProgressAnalytics>(`/api/v1/admin/academy/analytics?type=student&studentId=${studentId}`);
      if (response.data) {
        setStudentAnalytics(response.data);
      } else if (response.error) {
        setError(response.error.message || "Failed to load student analytics");
        console.error(`[StudentAnalytics] API error:`, response.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to load student analytics: ${errorMessage}`);
      console.error("[StudentAnalytics] Failed to load student analytics:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadStudentQuizAnalytics = async (studentId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await apiFetch<StudentQuizAnalytics>(`/api/v1/admin/academy/analytics?type=student-quiz&studentId=${studentId}`);
      if (response.data) {
        setStudentQuizAnalytics(response.data);
      } else if (response.error) {
        setError(response.error.message || "Failed to load student quiz analytics");
        console.error(`[StudentAnalytics] API error:`, response.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to load student quiz analytics: ${errorMessage}`);
      console.error("[StudentAnalytics] Failed to load student quiz analytics:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const searchStudents = async (query: string) => {
    if (query.length < 2) {
      setStudentSearchResults([]);
      return;
    }
    try {
      const response = await apiFetch<StudentSearchResult[]>(`/api/v1/admin/academy/analytics?type=student-search&q=${encodeURIComponent(query)}`);
      if (response.data) {
        setStudentSearchResults(response.data);
      }
    } catch (error) {
      console.error("Failed to search students:", error);
    }
  };

  const selectStudent = (student: StudentSearchResult, mode: "progress" | "quiz") => {
    setSelectedStudentId(student.id);
    setSearchQuery(`${student.name} (${student.email})`);
    setShowStudentSearch(false);
    if (mode === "progress") {
      loadStudentAnalytics(student.id);
    } else {
      loadStudentQuizAnalytics(student.id);
    }
  };

  const loadSelectedStudent = (mode: "progress" | "quiz") => {
    const targetId = selectedStudentId || searchQuery.trim();
    if (!targetId) return;
    if (mode === "progress") {
      loadStudentAnalytics(targetId);
    } else {
      loadStudentQuizAnalytics(targetId);
    }
  };

  useEffect(() => {
    if (searchQuery.length >= 2 && showStudentSearch) {
      const debounceTimer = setTimeout(() => searchStudents(searchQuery), 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setStudentSearchResults([]);
    }
  }, [searchQuery, showStudentSearch]);


  const loadAtRiskStudents = async (courseId?: string) => {
    setLoading(true);
    try {
      const url = courseId 
        ? `/api/v1/admin/academy/analytics?type=at-risk&courseId=${courseId}`
        : "/api/v1/admin/academy/analytics?type=at-risk";
      const response = await apiFetch<RawAtRiskStudent[]>(url);
      if (response.data) {
        setAtRiskStudents(normalizeAtRiskStudents(response.data));
      }
    } catch (error) {
      console.error("Failed to load at-risk students:", error);
    } finally {
      setLoading(false);
    }
  };

  const normalizedSearchQuery = searchQuery.toLowerCase();
  const learnerRows = learnerOverview?.learners ?? [];
  const courseOptions = learnerOverview?.courseGroups ?? [];
  const filteredLearnerRows = learnerRows.filter((learner) => {
    const matchesSearch =
      !normalizedSearchQuery ||
      learner.learnerName.toLowerCase().includes(normalizedSearchQuery) ||
      learner.learnerEmail.toLowerCase().includes(normalizedSearchQuery) ||
      learner.courseTitle.toLowerCase().includes(normalizedSearchQuery);
    const matchesCourse = courseFilter === "all" || learner.courseId === courseFilter;
    const matchesStatus = statusFilter === "all" || learner.status === statusFilter;
    const matchesRisk = riskFilter === "all" || (riskFilter === "none" ? !learner.riskLevel : learner.riskLevel === riskFilter);
    const matchesCertificate = certificateFilter === "all" || (certificateFilter === "issued" ? learner.certificateStatus === "ACTIVE" : learner.certificateStatus !== "ACTIVE");
    return matchesSearch && matchesCourse && matchesStatus && matchesRisk && matchesCertificate;
  });
  const filteredCourseGroups = courseOptions
    .map((course) => ({ ...course, learners: filteredLearnerRows.filter((learner) => learner.courseId === course.courseId) }))
    .filter((course) => course.learners.length > 0);
  const filteredAtRiskStudents = atRiskStudents.filter((student) =>
    String(student.studentName ?? "").toLowerCase().includes(normalizedSearchQuery) ||
    String(student.studentEmail ?? "").toLowerCase().includes(normalizedSearchQuery) ||
    String(student.courseTitle ?? "").toLowerCase().includes(normalizedSearchQuery)
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-white">Student Progress Analytics</h2>
          <p className="mt-1 text-sm text-slate-400">Comprehensive learner performance tracking and insights</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
          <Button
            className="flex-1 sm:flex-none"
            variant={view === "overview" ? "primary" : "secondary"}
            onClick={() => setView("overview")}
          >
            <BarChart3 className="mr-2 size-4" />
            Overview
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            variant={view === "student" ? "primary" : "secondary"}
            onClick={() => setView("student")}
          >
            <User className="mr-2 size-4" />
            Student View
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            variant={view === "student-quiz" ? "primary" : "secondary"}
            onClick={() => setView("student-quiz")}
          >
            <Filter className="mr-2 size-4" />
            Quiz Analytics
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            variant={view === "at-risk" ? "primary" : "secondary"}
            onClick={() => {
              setView("at-risk");
              loadAtRiskStudents();
            }}
          >
            <AlertTriangle className="mr-2 size-4" />
            At-Risk Students
          </Button>
        </div>
      </div>

      {/* Overview View */}
      {view === "overview" && (
        <LearnerWorkspace
          overview={learnerOverview}
          courseOptions={courseOptions}
          filteredCourseGroups={filteredCourseGroups}
          filteredLearners={filteredLearnerRows}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          courseFilter={courseFilter}
          setCourseFilter={setCourseFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          certificateFilter={certificateFilter}
          setCertificateFilter={setCertificateFilter}
          onRefresh={loadOverviewData}
          onViewProgress={(learnerId) => {
            setSelectedStudentId(learnerId);
            void loadStudentAnalytics(learnerId);
            setView("student");
          }}
          onViewQuiz={(learnerId) => {
            setSelectedStudentId(learnerId);
            void loadStudentQuizAnalytics(learnerId);
            setView("student-quiz");
          }}
        />
      )}

      {/* Student View */}
      {view === "student" && (
        <div className="space-y-6">
          <LearnerWorkspace
            overview={learnerOverview}
            courseOptions={courseOptions}
            filteredCourseGroups={filteredCourseGroups}
            filteredLearners={filteredLearnerRows}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            courseFilter={courseFilter}
            setCourseFilter={setCourseFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            riskFilter={riskFilter}
            setRiskFilter={setRiskFilter}
            certificateFilter={certificateFilter}
            setCertificateFilter={setCertificateFilter}
            onRefresh={loadOverviewData}
            onViewProgress={(learnerId) => {
              setSelectedStudentId(learnerId);
              void loadStudentAnalytics(learnerId);
            }}
            onViewQuiz={(learnerId) => {
              setSelectedStudentId(learnerId);
              void loadStudentQuizAnalytics(learnerId);
              setView("student-quiz");
            }}
          />

          {detailLoading && view === "student" ? (
            <InlineAnalyticsLoading label="Loading learner progress..." />
          ) : studentAnalytics ? (
            <StudentDetailView analytics={studentAnalytics} />
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 text-center">
              <AlertTriangle className="mx-auto mb-4 size-12 text-red-500" />
              <p className="text-red-400 font-semibold mb-2">Error Loading Analytics</p>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                  <User className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">No learner selected</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Use View on any learner card above to open detailed course progress here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* At-Risk View */}
      {view === "at-risk" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by student name, email, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full flex-1 rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-white"
            />
            <Button className="w-full sm:w-auto" variant="secondary">
              <Search className="mr-2 size-4" />
              Search
            </Button>
            <Button className="w-full sm:w-auto" variant="secondary">
              <Filter className="mr-2 size-4" />
              Filter
            </Button>
          </div>

          <div className="space-y-4">
            {filteredAtRiskStudents.map(student => (
              <AtRiskStudentCard
                key={student.studentId}
                student={student}
                onViewDetails={() => loadStudentAnalytics(student.studentId)}
              />
            ))}
            {filteredAtRiskStudents.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-8 text-center">
                <AlertTriangle className="mx-auto mb-4 size-12 text-slate-500" />
                <p className="text-slate-400">No at-risk students found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Quiz Analytics View */}
      {view === "student-quiz" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedStudentId("");
                  setShowStudentSearch(true);
                }}
                onFocus={() => setShowStudentSearch(true)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-white"
              />
              {showStudentSearch && studentSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-white/10 bg-slate-950 p-2 z-10 max-h-64 overflow-y-auto">
                  {studentSearchResults.map(student => (
                    <button
                      key={student.id}
                      onClick={() => {
                        selectStudent(student, "quiz");
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-800 transition text-sm"
                    >
                      <p className="font-medium text-white">{student.name}</p>
                      <p className="text-xs text-slate-400">{student.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button 
              className="w-full sm:w-auto"
              variant="primary"
              onClick={() => loadSelectedStudent("quiz")}
            >
              <Search className="mr-2 size-4" />
              Load Analytics
            </Button>
          </div>

          {detailLoading && view === "student-quiz" ? (
            <InlineAnalyticsLoading label="Loading assessment analytics..." />
          ) : studentQuizAnalytics ? (
            <StudentQuizDetailView analytics={studentQuizAnalytics} />
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 text-center">
              <AlertTriangle className="mx-auto mb-4 size-12 text-red-500" />
              <p className="text-red-400 font-semibold mb-2">Error Loading Analytics</p>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-8 text-center">
              <Filter className="mx-auto mb-4 size-12 text-slate-500" />
              <p className="text-slate-400">Search for a student to view detailed quiz and assessment analytics</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InlineAnalyticsLoading({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 text-center">
      <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

function LearnerWorkspace({
  overview,
  courseOptions,
  filteredCourseGroups,
  filteredLearners,
  searchQuery,
  setSearchQuery,
  courseFilter,
  setCourseFilter,
  statusFilter,
  setStatusFilter,
  riskFilter,
  setRiskFilter,
  certificateFilter,
  setCertificateFilter,
  onRefresh,
  onViewProgress,
  onViewQuiz,
}: {
  overview: LearnerOverviewPayload | null;
  courseOptions: LearnerCourseGroup[];
  filteredCourseGroups: LearnerCourseGroup[];
  filteredLearners: LearnerCourseRow[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  courseFilter: string;
  setCourseFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  riskFilter: string;
  setRiskFilter: (value: string) => void;
  certificateFilter: string;
  setCertificateFilter: (value: string) => void;
  onRefresh: () => void;
  onViewProgress: (learnerId: string) => void;
  onViewQuiz: (learnerId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatPill label="Learners" value={String(overview?.totals.learners ?? 0)} />
        <AdminStatPill label="Course Enrolments" value={String(overview?.totals.enrolments ?? 0)} />
        <AdminStatPill label="Average Progress" value={`${overview?.totals.averageProgress ?? 0}%`} tone="info" />
        <AdminStatPill label="Certificates Issued" value={String(overview?.totals.certificatesIssued ?? 0)} tone="success" />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(130px,1fr))_auto]">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search learners, emails, or courses..."
              className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 pl-10 pr-3 text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none"
            />
          </label>
          <FilterSelect label="Course" value={courseFilter} onChange={setCourseFilter}>
            <option value="all">All courses</option>
            {courseOptions.map((course) => (
              <option key={course.courseId} value={course.courseId}>{course.courseTitle}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Progress" value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All progress</option>
            <option value="ACTIVE">Not started</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </FilterSelect>
          <FilterSelect label="Risk" value={riskFilter} onChange={setRiskFilter}>
            <option value="all">All risk</option>
            <option value="HIGH">High risk</option>
            <option value="MEDIUM">Medium risk</option>
            <option value="LOW">Low risk</option>
            <option value="none">No risk flag</option>
          </FilterSelect>
          <FilterSelect label="Certificate" value={certificateFilter} onChange={setCertificateFilter}>
            <option value="all">All certificates</option>
            <option value="issued">Issued</option>
            <option value="missing">Missing</option>
          </FilterSelect>
          <Button className="h-11 w-full lg:w-auto" variant="secondary" onClick={onRefresh}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing {filteredLearners.length} real enrolment records grouped by course.
        </p>
      </div>

      {filteredCourseGroups.length ? (
        <div className="space-y-4">
          {filteredCourseGroups.map((course) => (
            <CourseLearnerGroup key={course.courseId} course={course} onViewProgress={onViewProgress} onViewQuiz={onViewQuiz} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/50 p-8 text-center">
          <BookOpen className="mx-auto mb-3 size-10 text-slate-500" />
          <p className="font-semibold text-white">No learners match these filters</p>
          <p className="mt-1 text-sm text-slate-500">Clear a filter or search term to see the enrolled learners.</p>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white focus:border-emerald-500/40 focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function CourseLearnerGroup({ course, onViewProgress, onViewQuiz }: { course: LearnerCourseGroup; onViewProgress: (learnerId: string) => void; onViewQuiz: (learnerId: string) => void }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
      <div className="border-b border-white/10 bg-slate-950/50 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="size-4 text-emerald-300" />
              <h3 className="break-words text-lg font-bold text-white [overflow-wrap:anywhere]">{course.courseTitle}</h3>
              <AdminStatusBadge status={course.courseStatus} variant="info" />
            </div>
            <p className="mt-1 text-sm text-slate-500">{course.learners.length} visible learner records in this course</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:min-w-[460px]">
            <MiniMetric label="Learners" value={course.totalLearners} />
            <MiniMetric label="Completed" value={course.completedLearners} />
            <MiniMetric label="At risk" value={course.atRiskLearners} />
            <MiniMetric label="Avg progress" value={`${course.averageProgress}%`} />
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-3 xl:grid-cols-2">
        {course.learners.map((learner) => (
          <LearnerCourseCard key={`${learner.learnerId}:${learner.courseId}`} learner={learner} onViewProgress={onViewProgress} onViewQuiz={onViewQuiz} />
        ))}
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}

function LearnerCourseCard({ learner, onViewProgress, onViewQuiz }: { learner: LearnerCourseRow; onViewProgress: (learnerId: string) => void; onViewQuiz: (learnerId: string) => void }) {
  const riskVariant = learner.riskLevel === "HIGH" ? "danger" : learner.riskLevel === "MEDIUM" ? "warning" : learner.riskLevel === "LOW" ? "success" : "muted";
  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-base font-bold text-white [overflow-wrap:anywhere]">{learner.learnerName}</p>
          <p className="break-words text-sm text-slate-400 [overflow-wrap:anywhere]">{learner.learnerEmail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {learner.isOnline ? <AdminStatusBadge status="Online now" variant="success" /> : null}
            <AdminStatusBadge status={formatStatus(learner.status)} variant={learner.status === "COMPLETED" ? "success" : learner.status === "IN_PROGRESS" ? "warning" : "info"} />
            <AdminStatusBadge status={learner.certificateStatus === "ACTIVE" ? "Certificate issued" : "Certificate missing"} variant={learner.certificateStatus === "ACTIVE" ? "success" : "muted"} />
            {learner.riskLevel ? <AdminStatusBadge status={`${learner.riskLevel} risk`} variant={riskVariant} /> : null}
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => onViewProgress(learner.learnerId)}>
            <User className="mr-2 size-4" />
            View
          </Button>
          <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => onViewQuiz(learner.learnerId)}>
            <BarChart3 className="mr-2 size-4" />
            Assess
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-400">Course progress</span>
          <span className="font-bold text-white">{learner.completionPercentage}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-800">
          <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, Math.max(0, learner.completionPercentage))}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <LearnerFact icon={BookOpen} label="Lessons" value={`${learner.completedLessons}/${learner.totalLessons}`} />
        <LearnerFact icon={BarChart3} label="Avg score" value={learner.averageScore ? `${learner.averageScore}%` : "N/A"} />
        <LearnerFact icon={Award} label="Reviewed" value={`${learner.assignmentsReviewed}/${learner.assignmentsSubmitted}`} />
        <LearnerFact icon={Clock} label={learner.isOnline ? "Presence" : "Last active"} value={formatActivityStatus(learner)} />
      </div>

      {(learner.currentLesson || learner.riskDescription) && (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
          {learner.currentLesson ? <p className="text-slate-300"><span className="text-slate-500">Current:</span> {learner.currentLesson}</p> : null}
          {learner.riskDescription ? <p className="mt-1 text-amber-200"><span className="text-slate-500">Risk:</span> {learner.riskDescription}</p> : null}
        </div>
      )}
    </article>
  );
}

function LearnerFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-slate-900/70 p-3">
      <Icon className="mb-2 size-4 text-emerald-300" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 truncate font-bold text-white">{value}</p>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRelativeDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  return date.toLocaleDateString();
}

function formatActivityStatus(learner: LearnerCourseRow) {
  if (learner.isOnline) return "Online now";
  return formatRelativeDate(learner.lastActivityDate);
}

function StudentQuizDetailView({ analytics }: { analytics: StudentQuizAnalytics }) {
  return (
    <div className="space-y-6">
      {/* Student Overview */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">{analytics.studentName}</h3>
            <p className="text-slate-400">{analytics.studentEmail}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportStudentQuizAnalytics(analytics)}>
              <Download className="mr-2 size-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatPill label="Quizzes Attempted" value={String(toFiniteNumber(analytics.overallStats.totalQuizzesAttempted))} />
        <AdminStatPill label="Avg Quiz Score" value={`${toFiniteNumber(analytics.overallStats.averageQuizScore).toFixed(1)}%`} />
        <AdminStatPill label="Quiz Pass Rate" value={`${toFiniteNumber(analytics.overallStats.quizPassRate).toFixed(1)}%`} />
        <AdminStatPill label="Exams Attempted" value={String(toFiniteNumber(analytics.overallStats.totalExamsAttempted))} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatPill label="Avg Exam Score" value={`${toFiniteNumber(analytics.overallStats.averageExamScore).toFixed(1)}%`} />
        <AdminStatPill label="Exam Pass Rate" value={`${toFiniteNumber(analytics.overallStats.examPassRate).toFixed(1)}%`} />
        <AdminStatPill label="Assignments" value={String(toFiniteNumber(analytics.overallStats.totalAssignmentsSubmitted))} />
        <AdminStatPill label="Avg Grade" value={`${toFiniteNumber(analytics.overallStats.averageAssignmentGrade).toFixed(1)}%`} />
      </div>

      {/* Quiz Attempts */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Quiz Attempts</h3>
        {analytics.quizAttempts.length > 0 ? (
          <div className="space-y-4">
            {analytics.quizAttempts.map(attempt => (
              <div key={attempt.attemptId} className="rounded-lg border border-white/5 bg-slate-800/50 p-4">
                <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{attempt.quizTitle}</p>
                    <p className="text-sm text-slate-400">{attempt.courseTitle}</p>
                  </div>
                  <AdminStatusBadge 
                    status={attempt.passed ? "PASSED" : "FAILED"} 
                    variant={attempt.passed ? "success" : "danger"} 
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
                  <>
                    <p className="text-slate-400">Score</p>
                    <p className="font-semibold text-white">{attempt.score}%</p>
                  </>
                  <>
                    <p className="text-slate-400">Attempt</p>
                    <p className="font-semibold text-white">#{attempt.attemptNumber}</p>
                  </>
                  <>
                    <p className="text-slate-400">Time</p>
                    <p className="font-semibold text-white">{attempt.timeSpentMinutes} min</p>
                  </>
                  <>
                    <p className="text-slate-400">Date</p>
                    <p className="font-semibold text-white">{new Date(attempt.startedAt).toLocaleDateString()}</p>
                  </>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No quiz attempts recorded</p>
        )}
      </div>

      {/* Exam Attempts */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Exam Attempts</h3>
        {analytics.examAttempts.length > 0 ? (
          <div className="space-y-4">
            {analytics.examAttempts.map(attempt => (
              <div key={attempt.attemptId} className="rounded-lg border border-white/5 bg-slate-800/50 p-4">
                <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{attempt.examTitle}</p>
                    <p className="text-sm text-slate-400">{attempt.courseTitle}</p>
                  </div>
                  <AdminStatusBadge 
                    status={attempt.passed ? "PASSED" : "FAILED"} 
                    variant={attempt.passed ? "success" : "danger"} 
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
                  <>
                    <p className="text-slate-400">Score</p>
                    <p className="font-semibold text-white">{attempt.score}%</p>
                  </>
                  <>
                    <p className="text-slate-400">Attempt</p>
                    <p className="font-semibold text-white">#{attempt.attemptNumber}</p>
                  </>
                  <>
                    <p className="text-slate-400">Time</p>
                    <p className="font-semibold text-white">{attempt.timeSpentMinutes} min</p>
                  </>
                  <>
                    <p className="text-slate-400">Date</p>
                    <p className="font-semibold text-white">{new Date(attempt.startedAt).toLocaleDateString()}</p>
                  </>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No exam attempts recorded</p>
        )}
      </div>

      {/* Assignment Submissions */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Assignment Submissions</h3>
        {analytics.assignmentSubmissions.length > 0 ? (
          <div className="space-y-4">
            {analytics.assignmentSubmissions.map(submission => (
              <div key={submission.submissionId} className="rounded-lg border border-white/5 bg-slate-800/50 p-4">
                <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{submission.assignmentTitle}</p>
                    <p className="text-sm text-slate-400">{submission.courseTitle}</p>
                  </div>
                  <AdminStatusBadge 
                    status={submission.status} 
                    variant={submission.status === "GRADED" ? "success" : "info"} 
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
                  <>
                    <p className="text-slate-400">Grade</p>
                    <p className="font-semibold text-white">{submission.grade == null ? "Not graded" : `${submission.grade}%`}</p>
                  </>
                  <>
                    <p className="text-slate-400">Attempt</p>
                    <p className="font-semibold text-white">#{submission.attemptNumber}</p>
                  </>
                  <>
                    <p className="text-slate-400">Submitted</p>
                    <p className="font-semibold text-white">{new Date(submission.submittedAt).toLocaleDateString()}</p>
                  </>
                  <>
                    <p className="text-slate-400">On Time</p>
                    <p className="font-semibold text-white">{submission.onTime ? "Yes" : "No"}</p>
                  </>
                </div>
                {submission.reviewerNote && (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Reviewer Note:</p>
                    <p className="text-sm text-slate-300">{submission.reviewerNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No assignment submissions recorded</p>
        )}
      </div>
    </div>
  );
}

function StudentDetailView({ analytics }: { analytics: StudentProgressAnalytics }) {
  return (
    <div className="space-y-6">
      {/* Student Overview */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">{analytics.studentName}</h3>
            <p className="text-slate-400">{analytics.studentEmail}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportStudentProgress(analytics)}>
              <Download className="mr-2 size-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatPill label="Enrolled Courses" value={String(analytics.enrolledCourses)} />
        <AdminStatPill label="Completed Courses" value={String(analytics.completedCourses)} />
        <AdminStatPill label="In Progress" value={String(analytics.inProgressCourses)} />
        <AdminStatPill label="Learning Hours" value={`${Math.floor(analytics.totalLearningMinutes / 60)}h`} />
      </div>

      {/* Course Progress Details */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Course Progress Details</h3>
        {analytics.courses.length > 0 ? (
          <div className="space-y-4">
            {analytics.courses.map(course => (
            <div key={course.courseId} className="rounded-lg border border-white/5 bg-slate-800/50 p-4">
              <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">{course.courseTitle}</p>
                  <p className="text-sm text-slate-400">Enrolled: {new Date(course.enrollmentDate).toLocaleDateString()}</p>
                </div>
                <AdminStatusBadge status={course.status} variant={course.status === "COMPLETED" ? "success" : "warning"} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Completion</p>
                  <p className="text-lg font-bold text-white">{course.completionPercentage}%</p>
                  <div className="mt-1 h-2 rounded-full bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${course.completionPercentage}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Progress</p>
                  <p className="text-lg font-bold text-white">{course.lessonsCompleted}/{course.totalLessons} lessons</p>
                  <p className="text-xs text-slate-400">{course.modulesCompleted}/{course.totalModules} modules</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Time Spent</p>
                  <p className="text-lg font-bold text-white">{Math.floor(course.learningMinutes / 60)}h</p>
                  <p className="text-xs text-slate-400">{Math.floor(course.timeSpentPerLesson)}min/lesson avg</p>
                </div>
              </div>
              {course.currentLesson && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-slate-500">Current Lesson</p>
                  <p className="text-sm font-medium text-white">{course.currentLesson}</p>
                </div>
              )}
            </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
            This learner has no course progress records yet.
          </div>
        )}
      </div>
    </div>
  );
}

function AtRiskStudentCard({ student, onViewDetails }: { student: AtRiskStudent; onViewDetails: () => void }) {
  const riskColors = {
    HIGH: "border-red-500/50 bg-red-500/10",
    MEDIUM: "border-orange-500/50 bg-orange-500/10",
    LOW: "border-amber-500/50 bg-amber-500/10",
  };

  const riskBadgeColors = {
    HIGH: "danger",
    MEDIUM: "warning",
    LOW: "success",
  } as const;

  return (
    <div className={`rounded-xl border ${riskColors[student.riskLevel]} p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h4 className="text-lg font-bold text-white">{student.studentName}</h4>
            <AdminStatusBadge status={student.riskLevel} variant={riskBadgeColors[student.riskLevel]} />
          </div>
          <p className="text-sm text-slate-400 mb-3">{student.studentEmail}</p>
          <p className="text-sm text-slate-300 mb-2">{student.courseTitle}</p>
          <p className="text-sm text-slate-400">{student.riskDescription}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={onViewDetails}>
            View Details
          </Button>
          {student.interventionRecommended && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Intervention Recommended</p>
              <div className="flex flex-col gap-1 mt-1">
                {student.interventionActions.slice(0, 2).map((action, index) => (
                  <p key={index} className="text-xs text-slate-300">- {action}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 pt-4 border-t border-white/10 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Progress</p>
          <p className="text-lg font-bold text-white">{student.progressPercentage}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Last Activity</p>
          <p className="text-sm font-medium text-white">
            {student.daysSinceLastActivity ? `${student.daysSinceLastActivity} days ago` : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Current Lesson</p>
          <p className="text-sm font-medium text-white truncate">{student.currentLesson || "N/A"}</p>
        </div>
      </div>
    </div>
  );
}
