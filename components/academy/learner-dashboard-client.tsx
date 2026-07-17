"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Bell,
  Bookmark,
  BookOpen,
  Download,
  FileText,
  Flame,
  Lock,
  Play,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  AcademyResourcePurchaseModal,
  buildManualProduct,
  buildToolkitProduct,
} from "@/components/academy/academy-resource-purchase";
import { AcademyPaymentDetails } from "@/components/academy/academy-payment-details";
import type { ToolkitAccessState } from "@/components/academy/academy-accordion";
import { PaymentProofUpload } from "@/components/payments/payment-proof-upload";
import type { PublicPaymentConfig } from "@/lib/payments/public-payment-config";

type LearnerDashboard = {
  settings?: { academyName: string; primaryColour?: string; dashboardWelcome?: string; paymentInstructions?: string };
  metrics: Record<string, number>;
  streak?: number;
  continueLearning?: {
    lessonId: string;
    lessonTitle: string;
    courseId: string;
    courseTitle: string;
    lastViewedAt: string;
  } | null;
  badges?: Array<{ id: string; name: string; description?: string | null; xp: number; awardedAt: string }>;
  bookmarks?: Array<{ lessonId: string; title: string; courseId: string; courseTitle: string }>;
  programmeCourses?: Array<{
    id: string;
    title: string;
    subtitle: string;
    theme: { label: string; accent: string; gradient: string; sidebar: string; chip: string };
    sortOrder: number;
    unlocked: boolean;
    progress: number;
    completed: boolean;
    badgeEarned: boolean;
    badgeName: string;
    certificate: { id: string; certificateNumber: string; downloadUrl: string } | null;
  }>;
  certificates: Array<{
    id: string;
    certificateNumber: string;
    courseTitle: string;
    issuedAt: string;
    expiresAt?: string | null;
    verifyUrl: string;
    downloadUrl?: string;
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
    payment: { id: string; status: string; proofStatus?: string; proofUrl?: string; method?: string; referenceNumber?: string | null } | null;
    course: { id: string; title: string; slug?: string; description: string; certificateEnabled: boolean };
  }>;
  activeCourseId?: string | null;
  activeCourseToolkit?: {
    courseId: string;
    courseTitle: string;
    theme: { label: string; accent: string; gradient: string; sidebar: string; chip: string } | null;
    itemCount: number;
    access?: {
      unlocked: boolean;
      salesEnabled: boolean;
      price: number;
      currency: string;
      status: string | null;
      paymentId: string | null;
    };
    groups: Array<{
      category: string;
      description: string;
      items: Array<{ id: string; title: string; description: string; fileUrl?: string; locked?: boolean }>;
    }>;
  } | null;
  courseToolkits?: Array<{
    courseId: string;
    courseTitle: string;
    theme: { label: string; accent: string; gradient: string; sidebar: string; chip: string } | null;
    itemCount: number;
    groups: Array<{
      category: string;
      description: string;
      items: Array<{ id: string; title: string; description: string; fileUrl: string }>;
    }>;
  }>;
  referenceManual?: {
    title: string;
    description: string;
    downloadUrl: string | null;
    access?: {
      unlocked: boolean;
      salesEnabled: boolean;
      price: number;
      currency: string;
      status: string | null;
      paymentId: string | null;
      proofUrl?: string | null;
      adminNote?: string | null;
    };
  } | null;
  resourceAccess?: Array<{
    id: string;
    resourceKind: string;
    status: string;
    amount: number;
    currency: string;
    proofUrl?: string | null;
    course: { id: string; title: string } | null;
    payment: { id: string; status: string; proofStatus?: string } | null;
  }>;
  announcements: Array<{ id: string; title: string; body: string; createdAt: string }>;
};

export function LearnerDashboardClient() {
  const { user, showToast } = useApp();
  const [data, setData] = useState<LearnerDashboard | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [checkout, setCheckout] = useState<"toolkit" | "manual" | null>(null);
  const primary = data?.settings?.primaryColour ?? "#008b68";

  const load = useCallback(async () => {
    const result = await apiFetch<LearnerDashboard>("/api/v1/academy/me");
    if (result.data) setData(result.data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void apiFetch<PublicPaymentConfig>("/api/v1/payments/config").then((result) => {
      if (result.data) {
        setPaymentConfig({
          currency: result.data.currency,
          bankDetails: result.data.bankDetails,
          manualMethods: result.data.manualMethods,
        });
      }
    });
  }, []);

  if (!user) {
    return (
      <PageShell eyebrow="Academy" title="Sign in required" description="Create a learner account or sign in to access your Academy dashboard.">
        <Link href="/auth?next=/dashboard/academy" className="font-semibold text-emerald-700 hover:underline">Sign in to access your courses</Link>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell eyebrow="Academy" title="Learner dashboard" description="Loading your training workspace...">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </PageShell>
    );
  }

  const approvedCourse = data.applications.find((a) => a.status === "APPROVED");
  const toolkitItems = (data.activeCourseToolkit?.groups ?? []).flatMap((group) => group.items);
  const toolkitPreview = toolkitItems.slice(0, 6);

  return (
    <PageShell
      eyebrow={data.settings?.academyName ?? "HouseLink Academy"}
      title={`Welcome back, ${user.name.split(" ")[0]}`}
      description={data.settings?.dashboardWelcome ?? "Track your progress, access course materials, and manage your Academy journey."}
      actions={
        <Link href="/academy?browse=1" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full"><BookOpen className="size-4 mr-2" /> Browse Courses</Button>
        </Link>
      }
    >
      {/* Hero continue learning */}
      {data.continueLearning && approvedCourse && (
        <section
          className="academy-panel relative overflow-hidden rounded-xl p-6 sm:p-8"
          style={{ background: `linear-gradient(135deg, ${primary}15 0%, transparent 60%)` }}
        >
          <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(16,32,36,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(16,32,36,0.03)_1px,transparent_1px)] bg-[size:34px_34px] lg:block" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Continue learning</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{data.continueLearning.lessonTitle}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{data.continueLearning.courseTitle}</p>
            </div>
            <Link href={`/dashboard/academy/${data.continueLearning.courseId}`} className="w-full lg:w-auto">
              <Button className="w-full shadow-soft px-6 py-3 text-base lg:w-auto" style={{ backgroundColor: primary }}>
                <Play className="size-5 mr-2" /> {data.continueLearning.lessonId ? "Resume lesson" : "Open programme"}
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Stats grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={TrendingUp} label="Overall progress" value={`${data.metrics.progress ?? 0}%`} accent={primary} />
        <StatCard icon={Flame} label="Learning streak" value={`${data.streak ?? 0} days`} accent="#f59e0b" highlight />
        <StatCard icon={BookOpen} label="Active courses" value={String(data.metrics.enrolledCourses)} accent={primary} />
        <StatCard icon={Sparkles} label="XP earned" value={String(data.metrics.xp ?? 0)} accent="#8b5cf6" />
        <StatCard icon={Award} label="Certificates" value={String(data.metrics.certificates)} accent="#6366f1" />
      </div>

      {!!data.programmeCourses?.length && (
        <section className="mt-8">
          <h2 className="text-xl font-bold sm:text-2xl">Certification pathway</h2>
          <p className="mt-1 text-sm text-slate-600">Foundations → Listing & Client Mastery → Professional Certification. Earn a badge and downloadable certificate after each programme.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.programmeCourses.map((course) => (
              <article
                key={course.id}
                className={cn(
                  "academy-card relative overflow-hidden rounded-xl p-5",
                  course.unlocked ? "bg-white" : "bg-slate-50 opacity-90",
                )}
                style={{ borderColor: `${course.theme.accent}33` }}
              >
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: course.theme.accent }} />
                <div className="pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide", course.theme.chip)}>{course.theme.label}</span>
                    {!course.unlocked && <Lock className="size-4 text-slate-400" />}
                    {course.badgeEarned && <Sparkles className="size-4" style={{ color: course.theme.accent }} />}
                  </div>
                  <h3 className="mt-3 text-lg font-bold leading-snug">{course.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{course.subtitle}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${course.progress}%`, backgroundColor: course.theme.accent }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{course.progress}% complete · {course.badgeName}</p>
                  <div className="mt-4 flex flex-col gap-2">
                    {course.unlocked ? (
                      <Link href={`/dashboard/academy/${course.id}`} className="w-full">
                        <Button className="w-full text-sm px-3 py-2.5" style={{ backgroundColor: course.theme.accent }}>{course.completed ? "Review course" : "Continue"}</Button>
                      </Link>
                    ) : (
                      <Button className="w-full text-sm px-3 py-2.5" variant="secondary" disabled>Locked</Button>
                    )}
                    {course.certificate && (
                      <Link href={course.certificate.downloadUrl} className="w-full">
                        <Button className="w-full text-sm px-3 py-2.5" variant="secondary"><Download className="size-3.5 mr-1.5" /> Certificate</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <section className="space-y-5">
          <h2 className="text-xl font-bold sm:text-2xl">My courses</h2>
          {data.applications.map((application) => (
            <article key={application.id} className="academy-card overflow-hidden rounded-xl">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <StatusPill status={application.status} />
                    <h3 className="mt-2 text-lg font-bold sm:text-xl">{application.course.title}</h3>
                  </div>
                  <p className="text-lg font-bold" style={{ color: primary }}>{application.currency} {application.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                {application.status === "APPROVED" && (
                  <div className="mb-4">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-500">Course progress</span>
                      <span className="font-semibold">{application.progress ?? 0}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${application.progress ?? 0}%`, backgroundColor: primary }} />
                    </div>
                  </div>
                )}
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3">{application.course.description}</p>

                {application.status !== "APPROVED" && application.payment && (
                  <div className="mt-5 space-y-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">Payment approval required</p>
                    <p className="text-sm text-amber-800/90 dark:text-amber-200/90">
                      Pay {application.currency} {application.amount.toFixed(2)} using the details below, then upload proof for admin review.
                    </p>
                    <AcademyPaymentDetails
                      config={paymentConfig}
                      paymentMethod={application.payment.method ?? "bank_transfer"}
                      amount={application.amount}
                      currency={application.currency}
                      extraInstructions={
                        application.payment.referenceNumber
                          ? `Include reference ${application.payment.referenceNumber} in your transfer narration.`
                          : undefined
                      }
                      variant="proof"
                    />
                    <PaymentProofUpload
                      paymentId={application.payment.id}
                      onUploaded={() => void load()}
                      showToast={showToast}
                      className="w-full"
                    />
                  </div>
                )}

                {application.status === "APPROVED" && (
                  <Link href={`/dashboard/academy/${application.course.id}`} className="mt-5 block w-full">
                    <Button className="w-full" style={{ backgroundColor: primary }}>
                      <BookOpen className="size-4 mr-2" /> Open course
                    </Button>
                  </Link>
                )}
              </div>
            </article>
          ))}
          {!data.applications.length && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
              <BookOpen className="mx-auto size-12 text-slate-300" />
              <p className="mt-4 text-lg font-semibold">No courses yet</p>
              <Link href="/academy?browse=1" className="mt-4 inline-flex items-center gap-2 font-semibold text-emerald-600">
                <Zap className="size-4" /> Browse courses
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          {!!data.badges?.length && (
            <SidebarCard title="Achievements" icon={Award}>
              <div className="space-y-2">
                {data.badges.map((badge) => (
                  <div key={badge.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/40">
                      <Sparkles className="size-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{badge.name}</p>
                      <p className="text-xs text-slate-500">{badge.xp} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </SidebarCard>
          )}

          {!!data.bookmarks?.length && (
            <SidebarCard title="Bookmarks" icon={Bookmark}>
              <div className="space-y-2">
                {data.bookmarks.map((item) => (
                  <Link key={item.lessonId} href={`/dashboard/academy/${item.courseId}`} className="block rounded-xl border border-slate-100 p-3 text-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-slate-800 dark:hover:border-emerald-900">
                    <p className="font-semibold line-clamp-1">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.courseTitle}</p>
                  </Link>
                ))}
              </div>
            </SidebarCard>
          )}

          {!!data.certificates.length && (
            <SidebarCard title="Certificates" icon={Award}>
              {data.certificates.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-100 p-3 text-sm dark:border-slate-800">
                  <p className="font-semibold">{c.courseTitle}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {c.downloadUrl && (
                      <Link href={c.downloadUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline">
                        <Download className="size-3" /> Download
                      </Link>
                    )}
                    <a href={c.verifyUrl} className="text-xs font-semibold text-slate-500 hover:underline">Verify</a>
                  </div>
                </div>
              ))}
            </SidebarCard>
          )}

          <SidebarCard title="Field Toolkit" icon={Download}>
            {data.activeCourseToolkit ? (
              <>
                <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    {data.activeCourseToolkit.theme?.label ?? "Your programme"}
                  </p>
                  <p className="mt-0.5 text-sm font-bold line-clamp-2">{data.activeCourseToolkit.courseTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">{data.activeCourseToolkit.itemCount} branded resources for this stage</p>
                </div>
                {toolkitPreview.map((item) =>
                  item.fileUrl && data.activeCourseToolkit?.access?.unlocked ? (
                    <a key={item.id} href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-xl p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                      <FileText className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span className="line-clamp-2 font-medium">{item.title}</span>
                    </a>
                  ) : (
                    <div key={item.id} className="flex gap-3 rounded-xl p-2 text-sm text-slate-500">
                      <Lock className="size-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 font-medium">{item.title}</span>
                    </div>
                  ),
                )}
                {data.activeCourseToolkit.access && !data.activeCourseToolkit.access.unlocked && (
                  <div className="mt-2 space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Toolkit locked — {data.activeCourseToolkit.access.currency} {data.activeCourseToolkit.access.price.toFixed(2)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">Review what is included, choose a payment method, and upload proof in checkout.</p>
                    <Button className="w-full" onClick={() => setCheckout("toolkit")}>
                      {data.activeCourseToolkit.access.paymentId ? "Continue checkout" : "Buy toolkit — open checkout"}
                    </Button>
                  </div>
                )}
                {data.activeCourseToolkit.itemCount > toolkitPreview.length && (
                  <Link
                    href={`/dashboard/academy/${data.activeCourseToolkit.courseId}?tab=toolkit`}
                    className="block pt-1 text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    View all {data.activeCourseToolkit.itemCount} toolkit resources →
                  </Link>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">Enrol in a programme to unlock your stage-specific field toolkit.</p>
            )}
            {data.referenceManual && (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex gap-3">
                  {data.referenceManual.access?.unlocked && data.referenceManual.downloadUrl ? (
                    <a href={data.referenceManual.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:opacity-80">
                      <FileText className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span>
                        <span className="block font-medium">{data.referenceManual.title}</span>
                        <span className="text-xs text-slate-500">Full manual reference</span>
                      </span>
                    </a>
                  ) : (
                    <>
                      <Lock className="size-4 shrink-0 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <span className="block font-medium">{data.referenceManual.title}</span>
                        <span className="text-xs text-slate-500">
                          {data.referenceManual.access
                            ? `${data.referenceManual.access.currency} ${data.referenceManual.access.price.toFixed(2)} — checkout required`
                            : "Purchase and admin approval required"}
                        </span>
                        {data.referenceManual.access && (
                          <Button className="mt-2 w-full" variant="secondary" onClick={() => setCheckout("manual")}>
                            {data.referenceManual.access.paymentId ? "Continue checkout" : "Buy manual — open checkout"}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </SidebarCard>

          <SidebarCard title="Announcements" icon={Bell}>
            {data.announcements.slice(0, 4).map((a) => (
              <div key={a.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900/50">
                <p className="font-semibold">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-slate-500">{a.body}</p>
              </div>
            ))}
          </SidebarCard>
        </aside>
      </div>

      {checkout === "toolkit" && data.activeCourseToolkit?.access && (
        <AcademyResourcePurchaseModal
          open
          onClose={() => setCheckout(null)}
          onComplete={load}
          product={buildToolkitProduct({
            courseId: data.activeCourseToolkit.courseId,
            courseTitle: data.activeCourseToolkit.courseTitle,
            itemCount: data.activeCourseToolkit.itemCount,
            groups: data.activeCourseToolkit.groups,
          })}
          access={data.activeCourseToolkit.access as ToolkitAccessState}
          paymentInstructions={data.settings?.paymentInstructions}
          accent={data.activeCourseToolkit.theme?.accent ?? primary}
          showToast={showToast}
        />
      )}

      {checkout === "manual" && data.referenceManual?.access && (
        <AcademyResourcePurchaseModal
          open
          onClose={() => setCheckout(null)}
          onComplete={load}
          product={buildManualProduct()}
          access={data.referenceManual.access as ToolkitAccessState}
          paymentInstructions={data.settings?.paymentInstructions}
          accent={primary}
          showToast={showToast}
        />
      )}
    </PageShell>
  );
}

function StatCard({ icon: Icon, label, value, accent, highlight }: { icon: typeof BookOpen; label: string; value: string; accent: string; highlight?: boolean }) {
  return (
    <div className={cn("academy-card rounded-xl p-5", highlight ? "border-amber-200 dark:border-amber-900/50" : "")}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${accent}18` }}>
          <Icon className="size-5" style={{ color: accent }} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs font-medium text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SidebarCard({ title, icon: Icon, children }: { title: string; icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <div className="academy-panel rounded-xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-5 text-emerald-600" />
        <h3 className="font-bold">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    PENDING_PAYMENT: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    PAYMENT_UPLOADED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  };
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", styles[status] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
