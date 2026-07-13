"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  Loader2,
  Lock,
  PlayCircle,
  Settings,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { AcademyAccordion, ToolkitGrid } from "@/components/academy/academy-accordion";
import { HomeLinkBrand } from "@/components/brand/homelink-logo";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import type { PublicPaymentConfig } from "@/lib/payments/public-payment-config";
import type { CourseRegistrationSummary } from "@/lib/academy/academy-user-status";

import { cn } from "@/lib/utils";

type PublicCourse = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  shortDescription?: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  durationMinutes: number;
  instructor?: string;
  price: number;
  publicPrice: number;
  agentPrice: number;
  currency: string;
  accessDurationDays: number;
  certificateEnabled: boolean;
  featured: boolean;
  sortOrder?: number;
  prerequisiteCourseId?: string | null;
  toolkitCount?: number;
  badgeName?: string | null;
  certificateTitle?: string | null;
  learningOutcomes?: string[];
  includes?: string[];
  assessmentSummary?: string | null;
  theme?: { label: string; accent: string; gradient: string; chip: string } | null;
  toolkitPreview?: Array<{ category: string; description: string; items: Array<{ id: string; title: string; description: string; fileUrl: string }> }>;
  lessonCount: number;
  modules: Array<{ id: string; title: string; description?: string | null; lessons: Array<{ id: string; title: string; estimatedMinutes: number }> }>;
};

type AcademyStatus = {
  hasActiveAccess: boolean;
  hasLearnerActivity: boolean;
  activeEnrolments: Array<{ courseId: string; courseTitle: string; slug: string | null }>;
  pendingApplications: Array<{ courseId: string; courseTitle: string; status: string; paymentId: string | null }>;
  registrationsByCourseId: Record<string, CourseRegistrationSummary>;
  primaryCourseId: string | null;
};

function courseRegistrationState(status: AcademyStatus | null, courseId: string) {
  const registration = status?.registrationsByCourseId[courseId];
  if (!registration) return "NOT_REGISTERED" as const;
  if (registration.status === "APPROVED") return "APPROVED" as const;
  if (registration.status === "PENDING_PAYMENT" || registration.status === "PAYMENT_UPLOADED") return "PENDING" as const;
  return "NOT_REGISTERED" as const;
}

export function PublicAcademyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const browseMode = searchParams.get("browse") === "1";
  const { user, showToast } = useApp();
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [academySettings, setAcademySettings] = useState<{ academyName?: string; paymentInstructions?: string } | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [academyStatus, setAcademyStatus] = useState<AcademyStatus | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    phone: "",
    organisation: "",
    motivation: "",
    paymentMethod: "bank_transfer",
    registrationIntent: "TRAINING_ONLY" as "TRAINING_ONLY" | "AGENT_TRAINING",
  });

  const isAdmin = user?.roles?.some((role) => ["ADMIN", "SUPER_ADMIN", "ACADEMY_ADMIN"].includes(role)) ?? false;
  const isAgent = user?.roles?.includes("AGENT") ?? false;

  const load = useCallback(async () => {
    const [coursesResult, settingsResult, paymentConfigResult] = await Promise.all([
      apiFetch<PublicCourse[]>("/api/v1/academy/courses"),
      apiFetch<{ academyName: string; paymentInstructions: string }>("/api/v1/academy/settings"),
      apiFetch<PublicPaymentConfig & { plans?: unknown[]; gateways?: unknown[] }>("/api/v1/payments/config"),
    ]);
    const statusResult = user ? await apiFetch<AcademyStatus>("/api/v1/academy/status") : null;

    if (coursesResult.data) {
      setCourses(coursesResult.data);
      setSelectedId((current) => current || coursesResult.data![0]?.id || "");
    }
    if (settingsResult.data) setAcademySettings(settingsResult.data);
    if (paymentConfigResult.data) {
      setPaymentConfig({
        currency: paymentConfigResult.data.currency,
        bankDetails: paymentConfigResult.data.bankDetails,
        manualMethods: paymentConfigResult.data.manualMethods,
      });
      if (paymentConfigResult.data.manualMethods[0]?.id) {
        setForm((current) => ({ ...current, paymentMethod: paymentConfigResult.data!.manualMethods[0]!.id }));
      }
    }
    if (statusResult?.data) setAcademyStatus(statusResult.data);
    setStatusLoaded(true);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || !statusLoaded || !academyStatus?.hasLearnerActivity || browseMode) return;
    router.replace("/dashboard/academy");
  }, [user, statusLoaded, academyStatus, browseMode, router]);

  const selected = useMemo(() => courses.find((course) => course.id === selectedId), [courses, selectedId]);
  const selectedRegistration = selected ? courseRegistrationState(academyStatus, selected.id) : "NOT_REGISTERED";

  const displayPrice = useMemo(() => {
    if (!selected) return null;
    if (isAgent && form.registrationIntent === "AGENT_TRAINING") return selected.agentPrice;
    return selected.publicPrice;
  }, [selected, isAgent, form.registrationIntent]);

  async function register() {
    if (!selected || selectedRegistration !== "NOT_REGISTERED") return;
    setBusy(true);
    const result = await apiFetch<{ id: string; paymentId?: string; status: string }>("/api/v1/academy/register", {
      method: "POST",
      body: JSON.stringify({
        courseId: selected.id,
        fullName: user?.name,
        email: user?.email,
        phone: form.phone || user?.phone,
        organisation: form.organisation,
        motivation: form.motivation,
        paymentMethod: form.paymentMethod,
        registrationIntent: form.registrationIntent,
      }),
    });
    setBusy(false);
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    const approved = result.data.status === "APPROVED";
    const pending = result.data.status === "PENDING_PAYMENT" || result.data.status === "PAYMENT_UPLOADED";
    if (approved) {
      showToast("Your course access is active.");
      router.push(`/dashboard/academy/${selected.id}`);
      return;
    }
    if (pending) {
      showToast("You already registered for this course. Upload payment proof from your dashboard.");
      router.push("/dashboard/academy");
      return;
    }
    showToast("Registration saved.");
    router.push("/dashboard/academy");
  }

  if (user && (!statusLoaded || (academyStatus?.hasLearnerActivity && !browseMode))) {
    return (
      <PageShell eyebrow={academySettings?.academyName ?? "HomeLink Academy"} title="Loading your Academy..." description="">
        <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </PageShell>
    );
  }

  const pageActions = user ? (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
      {academyStatus?.hasActiveAccess && (
        <Link href="/dashboard/academy" className="w-full sm:w-auto">
          <Button className="w-full"><PlayCircle className="size-4 mr-2" /> Continue Learning</Button>
        </Link>
      )}
      {isAdmin && (
        <Link href="/dashboard/admin?tab=academy" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full"><Settings className="size-4 mr-2" /> Manage Academy</Button>
        </Link>
      )}
      {!academyStatus?.hasActiveAccess && (
        <Link href="/dashboard/academy" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full">My Dashboard</Button>
        </Link>
      )}
    </div>
  ) : undefined;

  return (
    <PageShell
      eyebrow={academySettings?.academyName ?? "HomeLink Academy"}
      title={browseMode && academyStatus?.hasActiveAccess ? "Browse More Courses" : "Professional Property Training"}
      description={
        browseMode && academyStatus?.hasActiveAccess
          ? "You already have active course access. Browse additional courses or return to your learning dashboard."
          : "Master real estate with Zimbabwe's leading property platform. Train with HomeLink as a public learner — no agent application required."
      }
      highlights={[
        { value: "3", label: "Programme Levels" },
        { value: "Certified", label: "Each Stage" },
        { value: "50+", label: "Toolkit PDFs" },
      ]}
      actions={pageActions}
    >
      {browseMode && academyStatus?.hasActiveAccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100">
          <p className="font-semibold">You are already enrolled.</p>
          <p className="mt-1">Return to your dashboard to continue lessons, or enrol in another course below.</p>
          <Link href="/dashboard/academy" className="mt-3 inline-flex font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
            Go to My Learning Dashboard →
          </Link>
        </div>
      )}

      <section className="academy-panel rounded-xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <GraduationCap className="size-6 shrink-0 sm:size-7" />
              <span className="text-sm font-semibold sm:text-base">Why train with HomeLink</span>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              {user && academyStatus?.hasActiveAccess
                ? "Browse the course catalog, track progress from your dashboard, and pick up where you left off."
                : "Learn from industry experts, gain practical skills, and earn your certification. Training-only enrolment is available — you do not need to become a HomeLink agent."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/40">
            <BookOpen className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100 sm:text-base">Interactive Lessons</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/40">
            <Award className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100 sm:text-base">Certified Completion</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/40">
            <Users className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100 sm:text-base">Expert Support</span>
          </div>
        </div>
      </section>

      <div className="mt-8 grid min-w-0 grid-cols-2 gap-3 max-md:[&>*]:min-w-0 md:grid-cols-4 md:gap-4">
        <StatCard icon={BookOpen} value={String(courses.reduce((sum, c) => sum + c.lessonCount, 0))} label="Programme Lessons" color="emerald" />
        <StatCard icon={Award} value="3" label="Certification Levels" color="amber" />
        <StatCard icon={Clock} value={`${courses.reduce((sum, c) => sum + (c.estimatedHours || Math.round(c.durationMinutes / 60)), 0)}h`} label="Guided Learning" color="blue" />
        <StatCard icon={TrendingUp} value={String(courses.reduce((sum, c) => sum + (c.toolkitCount ?? 0), 0))} label="Toolkit Downloads" color="purple" />
      </div>

      <section className="academy-panel mt-10 rounded-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Your certification pathway</h2>
        <p className="mt-2 max-w-3xl text-slate-600">Three focused programmes — Foundations, Listing & Client Mastery, and Professional Certification. Complete each level, pass assessments, and unlock badges plus downloadable HomeLink certificates.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="academy-card rounded-xl p-4 sm:p-5" style={{ borderColor: `${course.theme?.accent ?? "#008b68"}44` }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: course.theme?.accent }}>{course.theme?.label}</p>
              <p className="mt-2 text-base font-bold leading-snug sm:text-lg">{course.title}</p>
              <p className="mt-2 text-sm text-slate-500">{course.lessonCount} lessons · {course.toolkitCount ?? 0} toolkit PDFs</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex min-w-0 flex-col gap-8 max-md:overflow-x-clip lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:gap-6">
        <section className="order-2 grid min-w-0 gap-6 lg:order-none">
          <h2 className="text-xl font-bold sm:text-2xl">Programme Catalog</h2>
          {courses.map((course, index) => {
            const registration = courseRegistrationState(academyStatus, course.id);
            const accent = course.theme?.accent ?? "#008b68";
            const locked = course.prerequisiteCourseId && courseRegistrationState(academyStatus, course.prerequisiteCourseId) !== "APPROVED" && registration !== "APPROVED";
            return (
              <article
                key={course.id}
                className={cn(
                  "academy-card relative min-w-0 max-w-full overflow-hidden rounded-xl border-2 transition-all duration-300",
                  selectedId === course.id ? "shadow-xl" : "border-slate-200 hover:shadow-lg dark:border-slate-800",
                )}
                style={selectedId === course.id ? { borderColor: accent, boxShadow: `0 20px 50px ${accent}22` } : undefined}
              >
                <div className={cn("h-2 bg-gradient-to-r", course.theme?.gradient ?? "from-emerald-500 to-teal-600")} />
                {registration === "APPROVED" && (
                  <div className="absolute top-4 right-4 left-4 sm:left-auto sm:max-w-[12rem] rounded-full bg-emerald-600 px-3 py-1 text-center text-xs font-bold text-white">Enrolled</div>
                )}
                {locked && (
                  <div className="absolute top-4 right-4 left-4 sm:left-auto sm:max-w-[14rem] inline-flex items-center justify-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    <Lock className="size-3 shrink-0" /> Complete previous programme
                  </div>
                )}
                <div className="p-4 pt-14 sm:p-6 sm:pt-6 md:p-8">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="shrink-0 rounded-2xl bg-white p-2 shadow ring-1 ring-slate-100">
                        <HomeLinkBrand variant="icon" iconOnly />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", course.theme?.chip ?? "bg-emerald-100 text-emerald-800")}>{course.theme?.label}</span>
                          {course.certificateEnabled && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 inline-flex items-center gap-1"><Award className="size-3 shrink-0" /> Certificate</span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold leading-snug sm:text-2xl">{course.title}</h3>
                        <p className="mt-1 text-sm font-medium leading-relaxed" style={{ color: accent }}>{course.subtitle}</p>
                        <p className="mt-3 text-sm text-slate-600 leading-relaxed sm:text-base">{course.shortDescription ?? course.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 dark:border-slate-800 dark:bg-slate-900/40 sm:dark:bg-transparent">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">Programme fee</p>
                      <div className="text-right sm:ml-auto">
                        <p className="text-2xl font-bold sm:text-3xl" style={{ color: accent }}>{course.publicPrice ? `${course.currency} ${course.publicPrice.toFixed(2)}` : "Free"}</p>
                        <p className="text-xs text-slate-500">{course.accessDurationDays} days access</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900"><BookOpen className="size-4 mb-1" style={{ color: accent }} /><span className="font-semibold">{course.lessonCount} lessons</span></div>
                    <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900"><Clock className="size-4 mb-1" style={{ color: accent }} /><span className="font-semibold">{course.estimatedHours || Math.round(course.durationMinutes / 60)} hours</span></div>
                    <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900"><ShieldCheck className="size-4 mb-1" style={{ color: accent }} /><span className="font-semibold">{course.toolkitCount ?? 0} toolkit PDFs</span></div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <AcademyAccordion
                      accent={accent}
                      items={[
                        {
                          id: `${course.id}-outcomes`,
                          title: "What you will achieve",
                          subtitle: "Learning outcomes for this programme",
                          meta: `${course.learningOutcomes?.length ?? 0} outcomes`,
                          content: (
                            <ul className="space-y-2 text-sm text-slate-600">
                              {(course.learningOutcomes ?? []).map((outcome) => (
                                <li key={outcome} className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 mt-0.5" style={{ color: accent }} />{outcome}</li>
                              ))}
                            </ul>
                          ),
                        },
                        {
                          id: `${course.id}-includes`,
                          title: "What's included",
                          subtitle: course.assessmentSummary ?? "Lessons, toolkits, assessments, and certification",
                          meta: course.badgeName ?? "Certificate",
                          content: (
                            <ul className="space-y-2 text-sm text-slate-600">
                              {(course.includes ?? []).map((item) => (
                                <li key={item} className="flex gap-2"><Award className="size-4 shrink-0 mt-0.5 text-amber-600" />{item}</li>
                              ))}
                            </ul>
                          ),
                        },
                        {
                          id: `${course.id}-curriculum`,
                          title: "Curriculum modules",
                          subtitle: "Expand to preview what you will learn",
                          meta: `${course.modules.length} modules`,
                          defaultOpen: index === 0,
                          content: (
                            <div className="space-y-3">
                              {course.modules.map((module) => (
                                <div key={module.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                                  <p className="font-semibold">{module.title}</p>
                                  <p className="mt-1 text-xs text-slate-500">{module.lessons.length} lessons · {module.lessons.reduce((n, l) => n + l.estimatedMinutes, 0)} min</p>
                                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                                    {module.lessons.slice(0, 4).map((lesson) => <li key={lesson.id}>• {lesson.title}</li>)}
                                    {module.lessons.length > 4 && <li className="text-xs text-slate-400">+ {module.lessons.length - 4} more lessons</li>}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ),
                        },
                        {
                          id: `${course.id}-toolkit`,
                          title: "Field toolkit included",
                          subtitle: "HomeLink-branded print-ready PDFs for this level",
                          meta: `${course.toolkitCount ?? 0} downloads`,
                          content: <ToolkitGrid groups={course.toolkitPreview ?? []} accent={accent} preview />,
                        },
                      ]}
                    />
                  </div>

                  <CourseActionButton
                    courseId={course.id}
                    registration={registration}
                    selected={selectedId === course.id}
                    locked={!!locked}
                    accent={accent}
                    onSelect={() => setSelectedId(course.id)}
                  />
                </div>
              </article>
            );
          })}
          {!courses.length && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <BookOpen className="size-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No courses available</p>
              <p className="text-sm text-slate-500 mt-2">Check back soon for new training opportunities.</p>
            </div>
          )}
        </section>

        <aside className="order-1 min-w-0 max-w-full lg:order-none lg:h-fit">
          <div className="lg:sticky lg:top-4">
            <AcademySidePanel
              user={user}
              selected={selected}
              selectedRegistration={selectedRegistration}
              paymentConfig={paymentConfig}
              academyStatus={academyStatus}
              isAdmin={isAdmin}
              isAgent={isAgent}
              form={form}
              setForm={setForm}
              displayPrice={displayPrice}
              busy={busy}
              onRegister={() => void register()}
              courses={courses}
              selectedId={selectedId}
              onSelectCourse={setSelectedId}
            />
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof BookOpen;
  value: string;
  label: string;
  color: "emerald" | "amber" | "blue" | "purple";
}) {
  const colors = {
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <div className="academy-card min-w-0 max-w-full rounded-xl p-4 sm:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`shrink-0 rounded-lg p-2.5 sm:p-3 ${colors[color]}`}>
          <Icon className="size-5 sm:size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold sm:text-2xl">{value}</p>
          <p className="break-words text-xs text-slate-600 dark:text-slate-400 sm:text-sm">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CourseActionButton({
  courseId,
  registration,
  selected,
  locked,
  accent = "#008b68",
  onSelect,
}: {
  courseId: string;
  registration: ReturnType<typeof courseRegistrationState>;
  selected: boolean;
  locked?: boolean;
  accent?: string;
  onSelect: () => void;
}) {
  if (registration === "APPROVED") {
    return (
      <Link href={`/dashboard/academy/${courseId}`} className="mt-6 block">
        <Button className="w-full" style={{ backgroundColor: accent }}><PlayCircle className="size-4 mr-2" /> Continue Programme</Button>
      </Link>
    );
  }
  if (registration === "PENDING") {
    return (
      <Link href="/dashboard/academy" className="mt-6 block">
        <Button className="w-full" variant="secondary"><Upload className="size-4 mr-2" /> Complete Payment</Button>
      </Link>
    );
  }
  if (locked) {
    return (
      <Button className="mt-6 w-full" variant="secondary" disabled>
        <Lock className="size-4 mr-2" /> Complete previous programme first
      </Button>
    );
  }
  return (
    <Button className="mt-6 w-full" variant={selected ? "primary" : "secondary"} style={selected ? { backgroundColor: accent } : undefined} onClick={onSelect}>
      {selected ? <><CheckCircle2 className="size-4 mr-2" /> Selected for enrolment</> : <><Zap className="size-4 mr-2" /> Select Programme</>}
    </Button>
  );
}

function AcademySidePanel({
  user,
  selected,
  selectedRegistration,
  paymentConfig,
  academyStatus,
  isAdmin,
  isAgent,
  form,
  setForm,
  displayPrice,
  busy,
  onRegister,
  courses,
  selectedId,
  onSelectCourse,
}: {
  user: ReturnType<typeof useApp>["user"];
  selected?: PublicCourse;
  selectedRegistration: ReturnType<typeof courseRegistrationState>;
  paymentConfig: PublicPaymentConfig | null;
  academyStatus: AcademyStatus | null;
  isAdmin: boolean;
  isAgent: boolean;
  form: { phone: string; organisation: string; motivation: string; paymentMethod: string; registrationIntent: "TRAINING_ONLY" | "AGENT_TRAINING" };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  displayPrice: number | null;
  busy: boolean;
  onRegister: () => void;
  courses: PublicCourse[];
  selectedId: string;
  onSelectCourse: (id: string) => void;
}) {
  const accent = selected?.theme?.accent ?? "#008b68";

  return (
    <div className="space-y-4">
      {selected && (
        <ProgrammeEnrolmentPreview course={selected} accent={accent} />
      )}
      <div className="academy-panel min-w-0 max-w-full rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
          <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {!user ? "Get Started" : selectedRegistration === "APPROVED" ? "Your Course" : selectedRegistration === "PENDING" ? "Payment Pending" : "Enrol in a Course"}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {!user ? "Create an account to enrol" : selectedRegistration === "APPROVED" ? "Continue where you left off" : selectedRegistration === "PENDING" ? "Finish payment to unlock access" : "Complete registration for a new course"}
          </p>
        </div>
      </div>

      {!user ? (
        <AuthForm initialMode="register" showBrand={false} redirectTo={null} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-sm dark:border-emerald-900/40 dark:from-emerald-900/20 dark:to-teal-900/20">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Signed in as {user.email}</p>
            {academyStatus?.hasActiveAccess && (
              <p className="text-emerald-700 dark:text-emerald-300 mt-1">You have active course access.</p>
            )}
          </div>

          {isAdmin && (
            <Link href="/dashboard/admin?tab=academy" className="block w-full">
              <Button variant="secondary" className="w-full"><Settings className="size-4 mr-2" /> Manage Academy (Admin)</Button>
            </Link>
          )}

          {academyStatus?.hasActiveAccess && (
            <Link href="/dashboard/academy" className="block w-full">
              <Button className="w-full"><PlayCircle className="size-4 mr-2" /> Go to Learning Dashboard</Button>
            </Link>
          )}

          {selectedRegistration === "APPROVED" && selected && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-900/20">
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">You are enrolled in this course</p>
              <p className="mt-1 text-emerald-800 dark:text-emerald-200">Open the course to view modules, lessons, materials, and quizzes.</p>
              <Link href={`/dashboard/academy/${selected.id}`} className="mt-4 block">
                <Button className="w-full"><PlayCircle className="size-4 mr-2" /> Continue {selected.title}</Button>
              </Link>
            </div>
          )}

          {selectedRegistration === "PENDING" && selected && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-900/20">
              <p className="font-semibold text-amber-900 dark:text-amber-100">Payment approval pending</p>
              <p className="mt-1 text-amber-800 dark:text-amber-200">Upload proof of payment from your learner dashboard. An admin will activate your access.</p>
              <Link href="/dashboard/academy" className="mt-4 block">
                <Button className="w-full" variant="secondary"><Upload className="size-4 mr-2" /> Upload Payment Proof</Button>
              </Link>
            </div>
          )}

          {selectedRegistration === "NOT_REGISTERED" && (
            <>
              <label className="block min-w-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                Select Course
                <select value={selectedId} onChange={(event) => onSelectCourse(event.target.value)} className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500">
                  <option value="">Choose a course...</option>
                  {courses.map((course) => {
                    const state = courseRegistrationState(academyStatus, course.id);
                    const suffix = state === "APPROVED" ? " (Enrolled)" : state === "PENDING" ? " (Pending)" : "";
                    return <option key={course.id} value={course.id}>{course.title}{suffix}</option>;
                  })}
                </select>
              </label>
              <TextInput label="Phone Number" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
              <TextInput label="Organization (Optional)" value={form.organisation} onChange={(organisation) => setForm({ ...form, organisation })} />
              <label className="block min-w-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                Registration type
                <select
                  value={form.registrationIntent}
                  onChange={(event) => setForm({ ...form, registrationIntent: event.target.value as "TRAINING_ONLY" | "AGENT_TRAINING" })}
                  className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="TRAINING_ONLY">Training only (not an agent application)</option>
                  {isAgent && <option value="AGENT_TRAINING">Agent training — I am a HomeLink agent</option>}
                </select>
              </label>
              {selected && displayPrice !== null && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="font-semibold">Course fee</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{displayPrice > 0 ? `${selected.currency} ${displayPrice.toFixed(2)}` : "Free"}</p>
                </div>
              )}
              <label className="block min-w-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                Payment Method
                <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500">
                  {(paymentConfig?.manualMethods.length ? paymentConfig.manualMethods : [
                    { id: "bank_transfer", label: "Bank Transfer" },
                    { id: "zipit", label: "ZIPIT" },
                    { id: "cash", label: "Cash Deposit" },
                  ]).map((method) => (
                    <option key={method.id} value={method.id}>{method.label}</option>
                  ))}
                </select>
              </label>
              {selected && displayPrice !== null && displayPrice > 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  Payment instructions and your unique reference are issued immediately after you submit registration.
                </div>
              )}
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tell us about yourself
                <textarea value={form.motivation} onChange={(event) => setForm({ ...form, motivation: event.target.value })} rows={4} placeholder="Why do you want to take this course?" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500" />
              </label>
              <Button className="w-full" disabled={!selected || busy} onClick={onRegister}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />} Complete Registration
              </Button>
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function ProgrammeEnrolmentPreview({ course, accent }: { course: PublicCourse; accent: string }) {
  return (
    <div className="academy-panel overflow-hidden rounded-xl border-2" style={{ borderColor: `${accent}44` }}>
      <div className={cn("h-2 bg-gradient-to-r", course.theme?.gradient ?? "from-emerald-500 to-teal-600")} />
      <div className="p-5">
        <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", course.theme?.chip ?? "bg-emerald-100 text-emerald-800")}>
          {course.theme?.label}
        </span>
        <h3 className="mt-3 text-xl font-bold leading-snug">{course.title}</h3>
        <p className="mt-1 text-sm font-medium" style={{ color: accent }}>{course.subtitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{course.description}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3 sm:gap-2">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><BookOpen className="mx-auto size-4 mb-1" style={{ color: accent }} /><span className="font-semibold leading-snug">{course.lessonCount} lessons</span></div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><Clock className="mx-auto size-4 mb-1" style={{ color: accent }} /><span className="font-semibold leading-snug">{course.estimatedHours || Math.round(course.durationMinutes / 60)}h guided</span></div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><ShieldCheck className="mx-auto size-4 mb-1" style={{ color: accent }} /><span className="font-semibold leading-snug">{course.toolkitCount ?? 0} toolkit PDFs</span></div>
        </div>
        {course.badgeName && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: `${accent}33`, color: accent }}>
            <Award className="size-4" /> Earn: {course.badgeName}
          </p>
        )}
        <div className="mt-4">
          <AcademyAccordion
            accent={accent}
            items={[
              {
                id: `${course.id}-side-curriculum`,
                title: "Curriculum preview",
                subtitle: `${course.modules.length} modules · expand to view`,
                defaultOpen: false,
                content: (
                  <div className="space-y-2">
                    {course.modules.map((module) => (
                      <div key={module.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                        <p className="font-semibold">{module.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{module.lessons.length} lessons</p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
    </label>
  );
}
