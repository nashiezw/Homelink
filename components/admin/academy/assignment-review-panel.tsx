"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";

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
    course: {
      title: string;
    } | null;
    lesson: {
      title: string;
    } | null;
  };
  agent: {
    name: string;
    email: string;
  };
};

export function AssignmentReviewPanel() {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("SUBMITTED");
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/academy/assignments/submissions?status=${filterStatus}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedSubmission) return;

    setGrading(true);
    try {
      const response = await fetch(`/api/v1/admin/academy/assignments/submissions/${selectedSubmission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          grade: status === "APPROVED" ? grade : null,
          reviewerNote,
        }),
      });

      if (response.ok) {
        setSelectedSubmission(null);
        setGrade("");
        setReviewerNote("");
        loadSubmissions();
      }
    } catch (error) {
      console.error("Failed to grade submission:", error);
    } finally {
      setGrading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading submissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Assignment Review</h3>
          <p className="text-sm text-slate-400">Review and grade student assignment submissions</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="SUBMITTED">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="rounded-xl border border-white/10 bg-slate-900/60 p-4 cursor-pointer hover:border-white/20 transition"
            onClick={() => setSelectedSubmission(submission)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-sm truncate">{submission.assignment.title}</h4>
                <p className="text-xs text-slate-400 truncate">{submission.agent.name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ml-2 ${
                submission.status === "SUBMITTED" ? "bg-amber-500/20 text-amber-400" :
                submission.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {submission.status}
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <p>Course: {submission.assignment.course?.title || "N/A"}</p>
              <p>Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</p>
              {submission.grade && <p className="text-emerald-400">Grade: {submission.grade}</p>}
            </div>
          </div>
        ))}
      </div>

      {submissions.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-400">
          No submissions found
        </div>
      )}

      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Review Assignment</h3>
                <Button variant="secondary" onClick={() => setSelectedSubmission(null)}>Close</Button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400">Assignment</p>
                  <p className="font-semibold text-white">{selectedSubmission.assignment.title}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Student</p>
                  <p className="font-semibold text-white">{selectedSubmission.agent.name} ({selectedSubmission.agent.email})</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Course</p>
                  <p className="text-white">{selectedSubmission.assignment.course?.title || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Submitted</p>
                  <p className="text-white">{new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedSubmission.notes && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Student Notes</p>
                  <div className="bg-slate-950 rounded-lg p-3 text-white text-sm">
                    {selectedSubmission.notes}
                  </div>
                </div>
              )}

              {selectedSubmission.fileUrls.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Uploaded Files</p>
                  <div className="space-y-2">
                    {selectedSubmission.fileUrls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-slate-950 rounded-lg p-3 text-white text-sm hover:bg-slate-800 transition"
                      >
                        <FileText className="size-4" />
                        <span className="flex-1 truncate">File {index + 1}</span>
                        <Eye className="size-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedSubmission.status === "SUBMITTED" && (
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div>
                    <label className="block text-sm text-white mb-1">Grade (out of {selectedSubmission.assignment.points})</label>
                    <input
                      type="number"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="Enter grade"
                      max={selectedSubmission.assignment.points}
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white mb-1">Reviewer Note</label>
                    <textarea
                      value={reviewerNote}
                      onChange={(e) => setReviewerNote(e.target.value)}
                      rows={3}
                      placeholder="Add feedback for the student..."
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleGrade("APPROVED")}
                      disabled={grading}
                      className="flex-1"
                    >
                      {grading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4 mr-2" />}
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleGrade("REJECTED")}
                      disabled={grading}
                      className="flex-1"
                    >
                      {grading ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4 mr-2" />}
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {selectedSubmission.status !== "SUBMITTED" && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-slate-400 mb-1">Grade</p>
                  <p className="font-semibold text-white">{selectedSubmission.grade || "Not graded"}</p>
                  {selectedSubmission.reviewerNote && (
                    <>
                      <p className="text-sm text-slate-400 mb-1 mt-3">Reviewer Note</p>
                      <p className="text-white">{selectedSubmission.reviewerNote}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
