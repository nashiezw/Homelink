"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  ChevronDown,
  CheckCircle2,
  Clock,
  CreditCard,
  ListChecks,
  Loader2,
  Lock,
  PlayCircle,
  Settings,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { AcademyAccordion, ToolkitGrid } from "@/components/academy/academy-accordion";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import type { PublicPaymentConfig } from "@/lib/payments/public-payment-config";
import type { CourseRegistrationSummary } from "@/lib/academy/academy-user-status";
import {
  AGENT_PORTFOLIO_REQUIREMENTS,
  EXPERT_VIDEO_LIBRARY_PLAN,
  ROLEPLAY_ASSESSMENT_SCENARIOS,
  SPECIALISATION_TRACKS,
} from "@/lib/academy/academy-excellence";

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
  quizCount?: number;
  assignmentCount?: number;
  hasFinalExam?: boolean;
  portfolioRequired?: boolean;
  roleplayCount?: number;
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

const GRADUATE_CAPABILITY_MAP = [
  "Prospect consistently and qualify leads before spending field time.",
  "Win listings with authority checks, seller notes, inspection evidence, and a clean marketing file.",
  "Build a basic CMA using comparable evidence and defend a realistic price range.",
  "Write property descriptions, organise photos, and publish listings without misleading clients.",
  "Run buyer, tenant, landlord, and seller conversations with documented next steps.",
  "Manage viewing safety, feedback, offers, counter-offers, and escalation boundaries.",
  "Maintain compliant client files and know when to refer legal, finance, or valuation questions.",
];

const SAMPLE_PUBLIC_ASSIGNMENTS = [
  "Prospecting log with lead quality notes and follow-up dates.",
  "Complete listing file with authority notes, inspection checklist, photos, and marketing plan.",
  "CMA pricing pack with comparables, assumptions, recommended range, and objection response.",
  "Recorded listing or negotiation roleplay assessed against the HouseLink standard.",
  "Final field portfolio showing corrected client files, compliance notes, and self-review.",
];

const ASSESSMENT_GRADING_STANDARD = [
  "Accuracy of market reasoning, pricing evidence, and property facts.",
  "Professional communication, tone, follow-up discipline, and client respect.",
  "Listing quality, documentation completeness, and verification habits.",
  "Ethical judgement, confidentiality, safety awareness, and escalation decisions.",
  "Practical readiness: can the learner use the tools correctly in a real client workflow?",
];

const ACADEMY_VALUE_PROOF = [
  "Structured sessions instead of random property tips.",
  "Module quizzes with pass marks.",
  "Admin-reviewed practical assignments.",
  "Roleplay and simulation evidence.",
  "Field-ready branded PDF tools.",
  "Portfolio and final exam gate for professional certification.",
  "Public certificate verification.",
  "Specialisation and annual renewal path.",
];

export function PublicAcademyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const browseMode = searchParams?.get("browse") === "1";
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
      <PageShell eyebrow={academySettings?.academyName ?? "HouseLink Academy"} title="Loading your Academy..." description="">
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
        <Link href="/dashboard/admin/academy" className="w-full sm:w-auto">
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
      eyebrow={academySettings?.academyName ?? "HouseLink Academy"}
      title={browseMode && academyStatus?.hasActiveAccess ? "Browse More Courses" : "Professional Property Training"}
      description={
        browseMode && academyStatus?.hasActiveAccess
          ? "You already have active course access. Browse additional courses or return to your learning dashboard."
          : "Master real estate with Zimbabwe's leading property platform. Train with HouseLink as a public learner - no agent application required."
      }
      actions={pageActions}
    >
      {browseMode && academyStatus?.hasActiveAccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100">
          <p className="font-semibold">You are already enrolled.</p>
          <p className="mt-1">Return to your dashboard to continue training sessions, or enrol in another course below.</p>
          <Link href="/dashboard/academy" className="mt-3 inline-flex font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
            Go to My Learning Dashboard -&gt;
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start lg:gap-6">
        <section className="order-1 grid min-w-0 gap-5 lg:order-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Choose your programme</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Certification Pathway</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
              Three focused levels. Open a programme for curriculum, requirements, and toolkit details.
            </p>
          </div>
          {courses.map((course, index) => {
            const registration = courseRegistrationState(academyStatus, course.id);
            const accent = course.theme?.accent ?? "#008b68";
            const locked = course.prerequisiteCourseId && courseRegistrationState(academyStatus, course.prerequisiteCourseId) !== "APPROVED" && registration !== "APPROVED";
            const stageNumber = String(index + 1).padStart(2, "0");
            return (
              <article
                key={course.id}
                className={cn(
                  "academy-programme-card relative overflow-hidden rounded-2xl border transition-all duration-300",
                  selectedId === course.id ? "shadow-[0_24px_70px_rgba(15,23,42,0.14)]" : "border-slate-200 hover:shadow-[0_18px_48px_rgba(15,23,42,0.10)] dark:border-slate-800",
                )}
                style={selectedId === course.id ? { borderColor: accent } : undefined}
              >
                <div className={cn("absolute inset-y-0 left-0 hidden w-2 bg-gradient-to-b sm:block", course.theme?.gradient ?? "from-emerald-500 to-teal-600")} />
                {registration === "APPROVED" && (
                  <div className="absolute top-4 right-4 left-4 sm:left-auto sm:max-w-[12rem] rounded-full bg-emerald-600 px-3 py-1 text-center text-xs font-bold text-white">Enrolled</div>
                )}
                {locked && (
                  <div className="absolute top-4 right-4 left-4 sm:left-auto sm:max-w-[14rem] inline-flex items-center justify-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    <Lock className="size-3 shrink-0" /> Complete previous programme
                  </div>
                )}
                <div className="p-5 pt-14 sm:p-6 sm:pl-8 sm:pt-6 md:p-7 md:pl-9">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_9.5rem] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shadow-sm" style={{ backgroundColor: accent }}>
                          {stageNumber}
                        </span>
                        <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", course.theme?.chip ?? "bg-emerald-100 text-emerald-800")}>{course.theme?.label}</span>
                        {course.certificateEnabled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"><Award className="size-3 shrink-0" /> Certificate</span>
                        )}
                      </div>
                      <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white">{course.title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-relaxed" style={{ color: accent }}>{course.subtitle}</p>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{course.shortDescription ?? course.description}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Programme fee</p>
                      <p className="mt-1 text-2xl font-black tracking-tight" style={{ color: accent }}>{course.publicPrice ? `${course.currency} ${course.publicPrice.toFixed(2)}` : "Free"}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{course.accessDurationDays} days access</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <CourseMetric icon={BookOpen} value={String(course.lessonCount)} label="sessions" accent={accent} />
                    <CourseMetric icon={ListChecks} value={`${course.quizCount ?? 0}/${course.assignmentCount ?? 0}`} label="quizzes/tasks" accent={accent} />
                    <CourseMetric icon={Clock} value={`${course.estimatedHours || Math.round(course.durationMinutes / 60)}h`} label="guided" accent={accent} />
                    <CourseMetric icon={ShieldCheck} value={String(course.toolkitCount ?? 0)} label="PDF tools" accent={accent} />
                  </div>

                  <details className="group mt-5 rounded-xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/70">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:content-none sm:px-5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Programme details</p>
                        <p className="mt-1 text-xs text-slate-500">Outcomes, inclusions, curriculum modules, and toolkit preview</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${accent}18`, color: accent }}>
                          Expand
                        </span>
                        <ChevronDown className="size-5 text-slate-400 transition group-open:rotate-180" />
                      </div>
                    </summary>
                    <div className="border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
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
                          title: "Value and certification requirements",
                          subtitle: course.assessmentSummary ?? "Sessions, toolkits, assessments, and certification",
                          meta: course.badgeName ?? "Certificate",
                          content: (
                            <div className="space-y-4">
                              <ul className="space-y-2 text-sm text-slate-600">
                                {certificationRequirements(course).map((item) => (
                                  <li key={item} className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 mt-0.5" style={{ color: accent }} />{item}</li>
                                ))}
                              </ul>
                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Included value</p>
                                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                                  {(course.includes ?? []).map((item) => (
                                    <li key={item} className="flex gap-2"><Award className="size-4 shrink-0 mt-0.5 text-amber-600" />{item}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: `${course.id}-curriculum`,
                          title: "Curriculum modules",
                          subtitle: "Expand to preview what you will learn",
                          meta: `${course.modules.length} modules`,
                          content: (
                            <div className="space-y-3">
                              {course.modules.map((module) => (
                                <div key={module.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                                  <p className="font-semibold">{module.title}</p>
                                  <p className="mt-1 text-xs text-slate-500">{module.lessons.length} training sessions / {module.lessons.reduce((n, l) => n + l.estimatedMinutes, 0)} min</p>
                                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                                    {module.lessons.map((lesson) => <li key={lesson.id} className="flex gap-2"><span style={{ color: accent }}>-</span>{lesson.title}</li>)}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ),
                        },
                        {
                          id: `${course.id}-toolkit`,
                          title: "Field toolkit included",
                          subtitle: "HouseLink-branded print-ready PDFs for this level",
                          meta: `${course.toolkitCount ?? 0} downloads`,
                          content: <ToolkitGrid groups={course.toolkitPreview ?? []} accent={accent} preview />,
                        },
                      ]}
                    />
                    </div>
                  </details>

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

        <aside className="order-2 lg:order-none lg:h-fit">
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

      <section className="academy-panel mt-10 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">For serious learners</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">Explore the HouseLink training standard</h2>
          </div>
          <Link href="/academy/verify" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300">
            Verify Certificate
          </Link>
        </div>
        <div className="mt-5">
          <AcademyAccordion
            accent="#008b68"
            items={[
              {
                id: "academy-standard-capability",
                title: "What graduates can do",
                subtitle: "Client work, listing quality, pricing, viewings, and compliance",
                meta: `${GRADUATE_CAPABILITY_MAP.length} capabilities`,
                content: <CompactProofGrid items={GRADUATE_CAPABILITY_MAP} />,
              },
              {
                id: "academy-standard-assessments",
                title: "Assignments and grading",
                subtitle: "Examples of practical work and how submissions are judged",
                meta: `${SAMPLE_PUBLIC_ASSIGNMENTS.length} examples`,
                content: (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <CompactProofList title="Sample assignments" items={SAMPLE_PUBLIC_ASSIGNMENTS} />
                    <CompactProofList title="Grading standard" items={ASSESSMENT_GRADING_STANDARD} />
                  </div>
                ),
              },
              {
                id: "academy-standard-value",
                title: "What the fee includes",
                subtitle: "Training, reviewed work, PDFs, certificates, and progression",
                meta: `${ACADEMY_VALUE_PROOF.length} value points`,
                content: <CompactProofGrid items={ACADEMY_VALUE_PROOF} />,
              },
              {
                id: "academy-standard-elite",
                title: "Top agent pathway",
                subtitle: "Mentor habits, roleplay, portfolio evidence, and specialisation",
                meta: "Advanced",
                content: (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <CompactProofList title="Expert sessions planned" items={EXPERT_VIDEO_LIBRARY_PLAN.map((item) => `${item.role}: ${item.topic}`)} />
                    <CompactProofList title="Roleplay assessments" items={ROLEPLAY_ASSESSMENT_SCENARIOS.slice(0, 5)} />
                    <CompactProofList title="Portfolio evidence" items={AGENT_PORTFOLIO_REQUIREMENTS.slice(0, 5)} />
                    <CompactProofList title="Specialisation tracks" items={SPECIALISATION_TRACKS.map((track) => `${track.title}: ${track.outcome}`)} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </section>
    </PageShell>
  );
}

function CourseMetric({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: typeof BookOpen;
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Icon className="size-4 shrink-0" style={{ color: accent }} />
      <span className="font-bold leading-none text-slate-950 dark:text-white">{value}</span>
      <span className="text-xs font-medium leading-none text-slate-500">{label}</span>
    </div>
  );
}

function CompactProofGrid({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function CompactProofList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-bold text-slate-950 dark:text-white">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
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
      <div className="academy-panel rounded-xl p-6">
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
            <Link href="/dashboard/admin/academy" className="block w-full">
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
              <p className="mt-1 text-emerald-800 dark:text-emerald-200">Open the course to view modules, training sessions, materials, and quizzes.</p>
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Select Course
                <select value={selectedId} onChange={(event) => onSelectCourse(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500">
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Registration type
                <select
                  value={form.registrationIntent}
                  onChange={(event) => setForm({ ...form, registrationIntent: event.target.value as "TRAINING_ONLY" | "AGENT_TRAINING" })}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="TRAINING_ONLY">Training only - I am not applying to become a HouseLink agent</option>
                  {isAgent && <option value="AGENT_TRAINING">Agent training - I am a HouseLink agent</option>}
                </select>
              </label>
              {selected && displayPrice !== null && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="font-semibold">Course fee</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{displayPrice > 0 ? `${selected.currency} ${displayPrice.toFixed(2)}` : "Free"}</p>
                </div>
              )}
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Payment Method
                <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500">
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

function certificationRequirements(course: PublicCourse) {
  const quizLabel = course.quizCount === 1 ? "module quiz" : "module quizzes";
  const taskLabel = course.assignmentCount === 1 ? "reviewed practical task" : "reviewed practical tasks";
  const simulationLabel = course.roleplayCount === 1 ? "roleplay or simulation assessment" : "roleplay or simulation assessments";

  return [
    `Complete ${course.lessonCount} training sessions`,
    course.quizCount ? `Pass ${course.quizCount} ${quizLabel}` : "",
    course.assignmentCount ? `Submit ${course.assignmentCount} ${taskLabel} for admin review` : "",
    course.roleplayCount ? `Complete ${course.roleplayCount} ${simulationLabel}` : "",
    course.portfolioRequired ? "Submit a field portfolio for sign-off" : "",
    course.hasFinalExam ? "Pass the final professional examination" : "",
    "Earn a publicly verifiable HouseLink certificate",
  ].filter(Boolean) as string[];
}

function ProgrammeEnrolmentPreview({ course, accent }: { course: PublicCourse; accent: string }) {
  return (
    <div className="academy-enrolment-preview overflow-hidden rounded-2xl border" style={{ borderColor: `${accent}44` }}>
      <div className={cn("h-2 bg-gradient-to-r", course.theme?.gradient ?? "from-emerald-500 to-teal-600")} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", course.theme?.chip ?? "bg-emerald-100 text-emerald-800")}>
            {course.theme?.label}
          </span>
          <p className="text-right text-lg font-black" style={{ color: accent }}>{course.publicPrice ? `${course.currency} ${course.publicPrice.toFixed(2)}` : "Free"}</p>
        </div>
        <h3 className="mt-4 text-xl font-bold leading-snug">{course.title}</h3>
        <p className="mt-1 text-sm font-medium" style={{ color: accent }}>{course.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CourseMetric icon={BookOpen} value={String(course.lessonCount)} label="training sessions" accent={accent} />
          <CourseMetric icon={ListChecks} value={`${course.quizCount ?? 0}/${course.assignmentCount ?? 0}`} label="quizzes/tasks" accent={accent} />
          <CourseMetric icon={Clock} value={`${course.estimatedHours || Math.round(course.durationMinutes / 60)}h`} label="guided learning" accent={accent} />
          <CourseMetric icon={ShieldCheck} value={String(course.toolkitCount ?? 0)} label="field toolkit PDFs" accent={accent} />
        </div>
        {course.badgeName && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 text-xs font-bold dark:bg-slate-950/80" style={{ borderColor: `${accent}33`, color: accent }}>
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
                subtitle: `${course.modules.length} modules / expand to view`,
                defaultOpen: false,
                content: (
                  <div className="space-y-2">
                    {course.modules.map((module) => (
                      <div key={module.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                        <p className="font-semibold">{module.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{module.lessons.length} training sessions</p>
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
