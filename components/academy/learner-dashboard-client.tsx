"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Award, Bell, BookOpen, Download, FileText, Loader2, Upload, Clock, TrendingUp, Zap } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type LearnerDashboard = {
  settings?: { academyName: string; primaryColour?: string };
  metrics: Record<string, number>;
  certificates: Array<{
    id: string;
    certificateNumber: string;
    courseTitle: string;
    issuedAt: string;
    expiresAt?: string | null;
    verifyUrl: string;
  }>;
  applications: Array<{
    id: string;
    status: string;
    learnerType?: string;
    progress?: number;
    amount: number;
    currency: string;
    proofUrl?: string;
    accessEndsAt?: string;
    adminNote?: string;
    payment: { id: string; status: string; proofStatus?: string; proofUrl?: string; method?: string } | null;
    course: {
      id: string;
      title: string;
      slug?: string;
      description: string;
      certificateEnabled: boolean;
      modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; summary?: string; richText?: string; estimatedMinutes: number; completionRequirement?: string; videoUrl?: string; embeddedVideoUrl?: string; pdfUrl?: string; completed?: boolean; lessonVideos?: Array<{ id: string; title: string; url: string; provider: string }>; lessonDownloads?: Array<{ id: string; title: string; url: string; type: string }> }> }>;
    };
  }>;
  documents: Array<{ id: string; title: string; description?: string; fileType: string; category?: string; downloadUrl: string }>;
  announcements: Array<{ id: string; title: string; body: string; createdAt: string }>;
  notifications: Array<{ id: string; subject: string; body: string; createdAt: string }>;
};

export function LearnerDashboardClient() {
  const { user, showToast } = useApp();
  const [data, setData] = useState<LearnerDashboard | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<string>("");

  const load = useCallback(async () => {
    const result = await apiFetch<LearnerDashboard>("/api/v1/academy/me");
    if (result.data) setData(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    const paymentId = paymentRef.current;
    if (!file || !paymentId) return;
    setBusyPaymentId(paymentId);
    const dataUrl = await readFile(file);
    const uploaded = await apiFetch<{ url: string }>("/api/v1/uploads", {
      method: "POST",
      body: JSON.stringify({ dataUrl, kind: "document", folder: "academy-payments" }),
    });
    if (uploaded.error || !uploaded.data) {
      setBusyPaymentId(null);
      showToast(uploaded.error?.message ?? "Proof upload failed.", "error");
      return;
    }
    const proof = await apiFetch(`/api/v1/payments/${paymentId}/proof`, {
      method: "POST",
      body: JSON.stringify({ proofUrl: uploaded.data.url }),
    });
    setBusyPaymentId(null);
    if (proof.error) {
      showToast(proof.error.message, "error");
      return;
    }
    showToast("Proof uploaded. Academy admin approval is now pending.");
    await load();
  }

  if (!user) {
    return (
      <PageShell eyebrow="Academy" title="Sign in required" description="Create a learner account or sign in to access your Academy dashboard.">
        <Link href="/auth?next=/dashboard/academy" className="text-emerald-700 font-semibold hover:underline">Sign in to access your courses</Link>
      </PageShell>
    );
  }

  if (!data) {
    return <PageShell eyebrow="Academy" title="Learner dashboard" description="Loading your training workspace..."><div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></PageShell>;
  }

  return (
    <PageShell
      eyebrow={data.settings?.academyName ?? "My Learning Dashboard"}
      title={`Welcome back, ${user.name}`}
      description="Track your progress, access course materials, and manage your Academy journey."
      actions={<Link href="/academy?browse=1"><Button variant="secondary"><BookOpen className="size-4 mr-2" /> Browse Courses</Button></Link>}
    >
      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <BookOpen className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.metrics.enrolledCourses}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Courses</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-900/30">
              <Clock className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.metrics.pendingApprovals}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pending Approvals</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-900/30">
              <Award className="size-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.metrics.certificates}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Certificates</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <TrendingUp className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.metrics.progress ?? 0}%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Overall Progress</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Courses</h2>
          </div>
          {data.applications.map((application) => (
            <article key={application.id} className="rounded-2xl border-2 border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      application.status === "APPROVED" 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" 
                        : application.status === "PENDING_PAYMENT" || application.status === "PAYMENT_UPLOADED"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {application.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{application.course.title}</h3>
                  {application.status === "APPROVED" && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Progress</span>
                        <span className="font-semibold text-emerald-600">{application.progress ?? 0}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${application.progress ?? 0}%` }} />
                      </div>
                    </div>
                  )}
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{application.course.description}</p>
                  {application.adminNote && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                      <p className="font-semibold">Admin Note:</p>
                      <p>{application.adminNote}</p>
                    </div>
                  )}
                  {application.accessEndsAt && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      <Clock className="inline size-4 mr-1" />
                      Access until {new Date(application.accessEndsAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">{application.currency} {application.amount.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">{application.payment?.method?.replace(/_/g, " ") ?? "Manual payment"}</p>
                </div>
              </div>
              
              {application.status !== "APPROVED" && application.payment && (
                <div className="mt-6 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                      <Upload className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 dark:text-amber-100">Payment approval required</p>
                      <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Upload proof of payment. An Academy admin will review and approve your registration.</p>
                      <Button
                        className="mt-3"
                        disabled={busyPaymentId === application.payment.id}
                        onClick={() => {
                          paymentRef.current = application.payment?.id ?? "";
                          fileRef.current?.click();
                        }}
                      >
                        {busyPaymentId === application.payment.id ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4 mr-2" />} Upload Proof
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {application.status === "APPROVED" && (
                <div className="mt-6">
                  <Link href={`/dashboard/academy/${application.course.id}`}>
                    <Button className="w-full sm:w-auto">
                      <BookOpen className="size-4 mr-2" /> Open Course — Modules, Lessons, Materials & Quizzes
                    </Button>
                  </Link>
                </div>
              )}
            </article>
          ))}
          {!data.applications.length && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <BookOpen className="size-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No courses yet</p>
              <p className="text-sm text-slate-500 mt-2 mb-4">Start your learning journey by enrolling in a course.</p>
              <Link href="/academy?browse=1" className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700">
                <Zap className="size-4" /> Browse Available Courses
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {!!data.certificates?.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-purple-100 p-2 dark:bg-purple-900/30">
                  <Award className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold">My Certificates</h3>
              </div>
              <div className="space-y-2">
                {data.certificates.map((certificate) => (
                  <div key={certificate.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <p className="font-semibold">{certificate.courseTitle}</p>
                    <p className="text-xs text-slate-500 mt-1">{certificate.certificateNumber}</p>
                    <a href={certificate.verifyUrl} className="mt-2 inline-flex text-xs font-semibold text-emerald-600 hover:underline">Verify certificate</a>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-blue-100 p-2 dark:bg-blue-900/30">
                <Download className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold">Downloads</h3>
            </div>
            <div className="space-y-2">
              {data.documents.map((document) => (
                <a key={document.id} href={document.downloadUrl} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 transition-colors">
                  <FileText className="mt-0.5 size-4 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{document.title}</p>
                    <p className="text-xs text-slate-500">{document.category ?? document.fileType}</p>
                  </div>
                </a>
              ))}
              {!data.documents.length && (
                <p className="text-sm text-slate-500 text-center py-4">No downloads available</p>
              )}
            </div>
          </div>
          
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-purple-100 p-2 dark:bg-purple-900/30">
                <Bell className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold">Announcements</h3>
            </div>
            <div className="space-y-3">
              {data.announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4 text-sm dark:from-purple-900/20 dark:to-pink-900/20">
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400 line-clamp-2">{announcement.body}</p>
                </div>
              ))}
              {!data.announcements.length && (
                <p className="text-sm text-slate-500 text-center py-4">No announcements</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(event) => void upload(event.target.files)} />
    </PageShell>
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
