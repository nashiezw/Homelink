"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, ClipboardCheck, Eye, FileText, Loader2, RotateCcw, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useApp } from "@/components/providers/app-provider";
import {
  AdminConfirmDialog,
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

type AssignmentSubmission = {
  id: string;
  status: string;
  notes: string | null;
  fileUrls: string[];
  grade: number | null;
  reviewerNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  assignment: {
    id: string;
    title: string;
    description: string;
    points: number;
    course: { title: string } | null;
    lesson: { title: string } | null;
  };
  agent: {
    name: string;
    email: string;
  };
};

type ReviewDecision = "APPROVED" | "REJECTED" | "GRADED" | "RESUBMISSION_REQUESTED";

export function AssignmentReviewPanel() {
  const { showToast } = useApp();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("SUBMITTED");
  const [search, setSearch] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(null);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");

  useEffect(() => {
    void loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const filteredSubmissions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return submissions;
    return submissions.filter((submission) =>
      [
        submission.assignment.title,
        submission.assignment.course?.title ?? "",
        submission.assignment.lesson?.title ?? "",
        submission.agent.name,
        submission.agent.email,
        submission.status,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [search, submissions]);

  async function loadSubmissions() {
    setLoading(true);
    const result = await apiFetch<AssignmentSubmission[]>(`/api/v1/admin/academy/assignments/submissions?status=${filterStatus}`);
    if (result.data) {
      setSubmissions(result.data);
    } else {
      showToast(result.error?.message ?? "Assignment submissions could not be loaded.", "error");
    }
    setLoading(false);
  }

  function openSubmission(submission: AssignmentSubmission) {
    setSelectedSubmission(submission);
    setGrade(submission.grade == null ? "" : String(submission.grade));
    setReviewerNote(submission.reviewerNote ?? "");
  }

  function requestDecision(status: ReviewDecision) {
    if (!selectedSubmission) return;
    if (status === "APPROVED" || status === "GRADED") {
      const numericGrade = Number(grade);
      if (!Number.isFinite(numericGrade) || numericGrade < 0 || numericGrade > selectedSubmission.assignment.points) {
        showToast(`Enter a grade between 0 and ${selectedSubmission.assignment.points}.`, "error");
        return;
      }
    }
    setPendingDecision(status);
  }

  async function submitDecision() {
    if (!selectedSubmission || !pendingDecision) return;
    setGrading(true);
    const result = await apiFetch(`/api/v1/admin/academy/assignments/submissions/${selectedSubmission.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: pendingDecision,
        grade: pendingDecision === "APPROVED" || pendingDecision === "GRADED" ? Number(grade) : null,
        reviewerNote: reviewerNote.trim() || null,
      }),
    });
    if (result.data) {
      showToast(reviewSuccessMessage(pendingDecision));
      setSelectedSubmission(null);
      setPendingDecision(null);
      setGrade("");
      setReviewerNote("");
      await loadSubmissions();
    } else {
      showToast(result.error?.message ?? "Assignment review could not be saved.", "error");
    }
    setGrading(false);
  }

  const pendingCount = submissions.filter((submission) => submission.status === "SUBMITTED").length;
  const approvedCount = submissions.filter((submission) => submission.status === "APPROVED").length;
  const gradedSubmissions = submissions.filter((submission) => submission.grade != null && submission.assignment.points > 0);
  const averageGrade = gradedSubmissions.length
    ? gradedSubmissions.reduce((sum, submission) => sum + assignmentGradePercent(submission), 0) / gradedSubmissions.length
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white">Assignment Review</h3>
          <p className="text-sm text-slate-400">Review submissions, open supporting files, and return feedback to learners.</p>
        </div>
        <Button className="w-full sm:w-auto" variant="secondary" onClick={loadSubmissions} disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Refresh
        </Button>
      </div>

      <AdminMetricGrid cols={4}>
        <AdminStatPill label="Visible" value={submissions.length} />
        <AdminStatPill label="Pending" value={pendingCount} tone={pendingCount ? "warning" : "default"} />
        <AdminStatPill label="Approved" value={approvedCount} tone="success" />
        <AdminStatPill label="Avg Grade" value={averageGrade == null ? "N/A" : `${averageGrade.toFixed(1)}%`} />
      </AdminMetricGrid>

      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search learner, course, assignment..." className="lg:flex-1" />
        <AdminSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: "SUBMITTED", label: "Pending Review" },
            { value: "APPROVED", label: "Approved" },
            { value: "GRADED", label: "Graded" },
            { value: "RESUBMISSION_REQUESTED", label: "Resubmission Requested" },
            { value: "REJECTED", label: "Rejected" },
            { value: "", label: "All Statuses" },
          ]}
        />
      </AdminFilterBar>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <AdminEmptyState
          icon={ClipboardCheck}
          title="No assignment submissions found"
          description="Submitted assignments will appear here once learners upload their work."
        />
      ) : (
        <AdminDataTable
          rows={filteredSubmissions}
          onRowClick={openSubmission}
          emptyMessage="No assignment submissions found."
          columns={[
            {
              key: "assignment",
              header: "Assignment",
              render: (submission) => (
                <div className="min-w-0">
                  <p className="break-words font-semibold text-white [overflow-wrap:anywhere]">{submission.assignment.title}</p>
                  <p className="text-xs text-slate-500">{submission.assignment.course?.title ?? "No course"}</p>
                </div>
              ),
            },
            {
              key: "learner",
              header: "Learner",
              render: (submission) => (
                <div className="min-w-0">
                  <p className="break-words text-slate-200 [overflow-wrap:anywhere]">{submission.agent.name}</p>
                  <p className="break-words text-xs text-slate-500 [overflow-wrap:anywhere]">{submission.agent.email}</p>
                </div>
              ),
            },
            { key: "status", header: "Status", render: (submission) => <SubmissionStatus status={submission.status} /> },
            { key: "grade", header: "Grade", render: (submission) => submission.grade == null ? "Not graded" : `${submission.grade}/${submission.assignment.points} (${assignmentGradePercent(submission).toFixed(0)}%)` },
            { key: "submitted", header: "Submitted", render: (submission) => new Date(submission.submittedAt).toLocaleDateString() },
            {
              key: "actions",
              header: "Actions",
              render: (submission) => (
                <Button variant="secondary" onClick={(event) => { event.stopPropagation(); openSubmission(submission); }}>
                  <Eye className="mr-2 size-4" />
                  Details
                </Button>
              ),
            },
          ]}
        />
      )}

      <AdminDrawer
        open={Boolean(selectedSubmission)}
        width="xl"
        title="Review Assignment"
        description={selectedSubmission ? `${selectedSubmission.agent.name} / ${selectedSubmission.assignment.title}` : undefined}
        onClose={() => setSelectedSubmission(null)}
      >
        {selectedSubmission && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Assignment" value={selectedSubmission.assignment.title} />
              <Detail label="Learner" value={`${selectedSubmission.agent.name} (${selectedSubmission.agent.email})`} />
              <Detail label="Course" value={selectedSubmission.assignment.course?.title ?? "N/A"} />
              <Detail label="Submitted" value={new Date(selectedSubmission.submittedAt).toLocaleString()} />
            </div>

            {selectedSubmission.assignment.description && (
              <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assignment Brief</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{selectedSubmission.assignment.description}</p>
              </section>
            )}

            <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student Notes</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{selectedSubmission.notes || "No notes submitted."}</p>
            </section>

            <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Uploaded Files</p>
              <div className="mt-3 grid gap-2">
                {selectedSubmission.fileUrls.length ? selectedSubmission.fileUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white transition hover:border-emerald-500/30"
                  >
                    <FileText className="size-4 shrink-0 text-emerald-300" />
                    <span className="min-w-0 flex-1 truncate">Submission file {index + 1}</span>
                    <Eye className="size-4 shrink-0 text-slate-400" />
                  </a>
                )) : (
                  <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">No files were uploaded with this submission.</p>
                )}
              </div>
            </section>

            {selectedSubmission.status === "SUBMITTED" ? (
              <ReviewEditor
                submission={selectedSubmission}
                grade={grade}
                reviewerNote={reviewerNote}
                grading={grading}
                onGradeChange={setGrade}
                onReviewerNoteChange={setReviewerNote}
                onDecision={requestDecision}
              />
            ) : (
              <section className="space-y-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <SubmissionStatus status={selectedSubmission.status} />
                    <p className="mt-3 text-sm text-slate-300">Grade: {selectedSubmission.grade == null ? "Not graded" : `${selectedSubmission.grade}/${selectedSubmission.assignment.points} (${assignmentGradePercent(selectedSubmission).toFixed(0)}%)`}</p>
                    {selectedSubmission.reviewerNote && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">{selectedSubmission.reviewerNote}</p>}
                  </div>
                  {selectedSubmission.reviewedAt && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reviewed {new Date(selectedSubmission.reviewedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-white">Re-mark assignment</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Update the mark, change the outcome, or request another submission. The learner is notified and the audit trail is updated.
                  </p>
                </div>
                <ReviewEditor
                  submission={selectedSubmission}
                  grade={grade}
                  reviewerNote={reviewerNote}
                  grading={grading}
                  remark
                  onGradeChange={setGrade}
                  onReviewerNoteChange={setReviewerNote}
                  onDecision={requestDecision}
                />
              </section>
            )}
          </div>
        )}
      </AdminDrawer>

      <AdminConfirmDialog
        open={Boolean(pendingDecision)}
        danger={pendingDecision === "REJECTED"}
        title={reviewDialogTitle(pendingDecision)}
        description={reviewDialogDescription(pendingDecision)}
        confirmLabel={reviewDialogConfirmLabel(pendingDecision)}
        onCancel={() => setPendingDecision(null)}
        onConfirm={submitDecision}
      />
    </div>
  );
}

function ReviewEditor({
  submission,
  grade,
  reviewerNote,
  grading,
  remark = false,
  onGradeChange,
  onReviewerNoteChange,
  onDecision,
}: {
  submission: AssignmentSubmission;
  grade: string;
  reviewerNote: string;
  grading: boolean;
  remark?: boolean;
  onGradeChange: (value: string) => void;
  onReviewerNoteChange: (value: string) => void;
  onDecision: (status: ReviewDecision) => void;
}) {
  return (
    <section className={remark ? "space-y-3" : "space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4"}>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Grade out of {submission.assignment.points}</span>
        <input
          type="number"
          value={grade}
          onChange={(event) => onGradeChange(event.target.value)}
          min={0}
          max={submission.assignment.points}
          className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500/40 focus:outline-none"
          placeholder="Enter grade"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Reviewer Note</span>
        <textarea
          value={reviewerNote}
          onChange={(event) => onReviewerNoteChange(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500/40 focus:outline-none"
          placeholder="Add feedback for the learner..."
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => onDecision("APPROVED")} disabled={grading}>
          <CheckCircle className="mr-2 size-4" />
          {remark ? "Approve Again" : "Approve"}
        </Button>
        <Button variant="secondary" onClick={() => onDecision("GRADED")} disabled={grading}>
          <Save className="mr-2 size-4" />
          Save Mark
        </Button>
        <Button variant="secondary" onClick={() => onDecision("RESUBMISSION_REQUESTED")} disabled={grading}>
          <RotateCcw className="mr-2 size-4" />
          Resubmit
        </Button>
        <Button variant="secondary" onClick={() => onDecision("REJECTED")} disabled={grading}>
          <XCircle className="mr-2 size-4" />
          Reject
        </Button>
      </div>
    </section>
  );
}

function reviewDialogTitle(decision: ReviewDecision | null) {
  if (decision === "APPROVED") return "Approve Assignment";
  if (decision === "GRADED") return "Save Updated Mark";
  if (decision === "RESUBMISSION_REQUESTED") return "Request Resubmission";
  return "Reject Assignment";
}

function reviewDialogDescription(decision: ReviewDecision | null) {
  if (decision === "APPROVED") return "This will save the grade, notify the learner, re-check certificate eligibility, and write an audit event.";
  if (decision === "GRADED") return "This will update the mark and feedback, notify the learner, re-check certificate eligibility, and write an audit event.";
  if (decision === "RESUBMISSION_REQUESTED") return "This will ask the learner to submit the assignment again and write an audit event.";
  return "This will reject the submission, notify the learner, and write an audit event.";
}

function reviewDialogConfirmLabel(decision: ReviewDecision | null) {
  if (decision === "APPROVED") return "Approve";
  if (decision === "GRADED") return "Save Mark";
  if (decision === "RESUBMISSION_REQUESTED") return "Request Resubmission";
  return "Reject";
}

function reviewSuccessMessage(decision: ReviewDecision) {
  if (decision === "APPROVED") return "Assignment approved and graded.";
  if (decision === "GRADED") return "Assignment mark updated.";
  if (decision === "RESUBMISSION_REQUESTED") return "Resubmission requested.";
  return "Assignment rejected with feedback.";
}

function SubmissionStatus({ status }: { status: string }) {
  return (
    <AdminStatusBadge
      status={status}
      variant={status === "APPROVED" || status === "GRADED" ? "success" : status === "REJECTED" ? "danger" : "warning"}
    />
  );
}

function assignmentGradePercent(submission: AssignmentSubmission) {
  if (submission.grade == null || submission.assignment.points <= 0) return 0;
  return Math.round((Number(submission.grade) / submission.assignment.points) * 1000) / 10;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-white [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}
