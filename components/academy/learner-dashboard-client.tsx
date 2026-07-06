"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Award, Bell, BookOpen, CheckCircle2, Download, FileText, Loader2, Upload } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type LearnerDashboard = {
  metrics: Record<string, number>;
  applications: Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    proofUrl?: string;
    accessEndsAt?: string;
    adminNote?: string;
    payment: { id: string; status: string; proofStatus?: string; proofUrl?: string; method?: string } | null;
    course: {
      id: string;
      title: string;
      description: string;
      certificateEnabled: boolean;
      modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; summary?: string; estimatedMinutes: number; videoUrl?: string; pdfUrl?: string }> }>;
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
        <Link href="/academy" className="text-emerald-700 font-semibold hover:underline">Open public Academy registration</Link>
      </PageShell>
    );
  }

  if (!data) {
    return <PageShell eyebrow="Academy" title="Learner dashboard" description="Loading your training workspace..."><div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></PageShell>;
  }

  return (
    <PageShell
      eyebrow="Academy learner"
      title={`Welcome, ${user.name}`}
      description="Your public learning dashboard for courses, payment approval, resources, announcements, and certificates."
      actions={<Link href="/academy"><Button variant="secondary">Browse courses</Button></Link>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active courses" value={String(data.metrics.enrolledCourses)} icon={BookOpen} helper="Approved enrolments" />
        <StatCard label="Pending approvals" value={String(data.metrics.pendingApprovals)} icon={Upload} helper="Payment/proof workflow" />
        <StatCard label="Certificates" value={String(data.metrics.certificates)} icon={Award} helper="Available after completion" />
        <StatCard label="Resources" value={String(data.metrics.downloads)} icon={Download} helper="Download library" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <section className="space-y-4">
          {data.applications.map((application) => (
            <article key={application.id} className="premium-card rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{application.status.replace(/_/g, " ")}</p>
                  <h2 className="mt-1 text-xl font-semibold">{application.course.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{application.course.description}</p>
                  {application.adminNote && <p className="mt-2 text-sm font-medium text-amber-700">{application.adminNote}</p>}
                  {application.accessEndsAt && <p className="mt-2 text-xs text-slate-500">Access until {new Date(application.accessEndsAt).toLocaleDateString()}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{application.currency} {application.amount.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{application.payment?.method?.replace(/_/g, " ") ?? "Manual payment"}</p>
                </div>
              </div>
              {application.status !== "APPROVED" && application.payment && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Payment approval required</p>
                  <p className="mt-1">Upload proof of payment. An Academy admin can approve or reject the registration from the admin dashboard.</p>
                  <Button
                    className="mt-3"
                    disabled={busyPaymentId === application.payment.id}
                    onClick={() => {
                      paymentRef.current = application.payment?.id ?? "";
                      fileRef.current?.click();
                    }}
                  >
                    {busyPaymentId === application.payment.id ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload proof
                  </Button>
                </div>
              )}
              {application.status === "APPROVED" && (
                <div className="mt-4 grid gap-3">
                  {application.course.modules.map((module) => (
                    <div key={module.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                      <p className="font-semibold">{module.title}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {module.lessons.map((lesson) => (
                          <div key={lesson.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{lesson.title}</p>
                                <p className="text-xs text-slate-500">{lesson.estimatedMinutes} minutes</p>
                              </div>
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            </div>
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{lesson.summary}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {lesson.videoUrl && <a href={lesson.videoUrl} className="text-xs font-semibold text-emerald-700">Watch video</a>}
                              {lesson.pdfUrl && <a href={lesson.pdfUrl} className="text-xs font-semibold text-emerald-700">Open PDF</a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
          {!data.applications.length && (
            <div className="premium-card rounded-xl p-8 text-center">
              <p className="font-semibold">No Academy registrations yet</p>
              <Link href="/academy" className="mt-3 inline-flex text-emerald-700 font-semibold hover:underline">Browse public learner courses</Link>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <Panel title="Downloads" icon={Download}>
            {data.documents.map((document) => (
              <a key={document.id} href={document.downloadUrl} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <FileText className="mt-0.5 size-4 text-emerald-600" />
                <span><span className="block font-semibold">{document.title}</span><span className="text-xs text-slate-500">{document.category ?? document.fileType}</span></span>
              </a>
            ))}
          </Panel>
          <Panel title="Announcements" icon={Bell}>
            {data.announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                <p className="font-semibold">{announcement.title}</p>
                <p className="mt-1 text-xs text-slate-500">{announcement.body}</p>
              </div>
            ))}
          </Panel>
        </aside>
      </div>

      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(event) => void upload(event.target.files)} />
    </PageShell>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Bell; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center gap-2"><Icon className="size-4 text-emerald-600" /><h2 className="font-semibold">{title}</h2></div>
      <div className="space-y-2">{children}</div>
    </section>
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
