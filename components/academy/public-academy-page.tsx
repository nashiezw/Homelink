"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
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
import { TrainingDisclaimer } from "@/components/legal/training-disclaimer";
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
  averageRating?: number;
  totalReviews?: number;
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
  "Practical readiness: can the learner use the tools correctly with a real client?",
];

const ACADEMY_VALUE_PROOF = [
  "Structured sessions instead of random property tips.",
  "Module quizzes with pass marks.",
  "Admin-reviewed practical assignments.",
  "Roleplay and simulation evidence.",
  "Field-ready branded PDF tools.",
  "Portfolio and final exam gate for HouseLink training completion.",
  "Public certificate verification.",
  "Specialisation and annual renewal path.",
];

const TRAINING_STANDARD_PROOFS = [
  {
    icon: BookOpen,
    title: "Field-ready skills",
    body: "Learners practise the daily work agents are judged on: prospecting, listings, viewings, client follow-up, and clean files.",
  },
  {
    icon: ListChecks,
    title: "Reviewed evidence",
    body: "Progress is backed by quizzes, practical tasks, roleplay, portfolio work, and admin review instead of passive watching only.",
  },
  {
    icon: ShieldCheck,
    title: "Verifiable trust",
    body: "Graduates earn HouseLink training certificates that clients, agencies, and HouseLink teams can verify.",
  },
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
    couponCode: "",
  });
  const [couponValidation, setCouponValidation] = useState<{
    valid: boolean;
    discountAmount: number;
    finalAmount: number;
    savings: number;
    message?: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

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
    let basePrice = isAgent && form.registrationIntent === "AGENT_TRAINING" ? selected.agentPrice : selected.publicPrice;
    if (couponValidation?.valid) {
      return Math.max(0, basePrice - couponValidation.discountAmount);
    }
    return basePrice;
  }, [selected, isAgent, form.registrationIntent, couponValidation]);

  async function validateCoupon() {
    if (!form.couponCode.trim() || !selected) {
      setCouponValidation(null);
      return;
    }
    setValidatingCoupon(true);
    const result = await apiFetch<{
      valid: boolean;
      discountAmount: number;
      finalAmount: number;
      savings: number;
    }>("/api/v1/academy/coupons/validate", {
      method: "POST",
      body: JSON.stringify({
        code: form.couponCode,
        courseId: selected.id,
        amount: isAgent && form.registrationIntent === "AGENT_TRAINING" ? selected.agentPrice : selected.publicPrice,
      }),
    });
    setValidatingCoupon(false);
    if (result.error) {
      setCouponValidation({ valid: false, discountAmount: 0, finalAmount: 0, savings: 0, message: result.error.message });
    } else if (result.data) {
      setCouponValidation({ valid: result.data.valid, discountAmount: result.data.discountAmount, finalAmount: result.data.finalAmount, savings: result.data.savings });
    }
  }

  useEffect(() => {
    setCouponValidation(null);
  }, [selectedId, form.registrationIntent]);

  async function register() {
    if (!selected || selectedRegistration !== "NOT_REGISTERED") return;
    setBusy(true);
    const result = await apiFetch<{ id: string; paymentId?: string; status: string; finalPrice?: number; currency?: string; emailSent?: boolean; emailError?: string; verificationToken?: string; verificationLink?: string }>("/api/v1/academy/register", {
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
        couponCode: form.couponCode || undefined,
      }),
    });
    setBusy(false);
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    
    if (result.data.status === "PENDING_EMAIL_VERIFICATION") {
      showToast("Please verify your email to complete registration.");
      if (result.data.verificationLink && process.env.NODE_ENV === "development") {
        // In development, show the verification link
        window.open(result.data.verificationLink, "_blank");
      }
      router.push("/academy/verify-email?pending=true");
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
      const emailSent = result.data.emailSent ?? false;
      const emailError = result.data.emailError;
      const finalPrice = result.data.finalPrice;
      const currency = result.data.currency;
      
      if (emailError) {
        showToast("Registration submitted, but email delivery failed. Check your dashboard for payment instructions.", "info");
      } else if (!emailSent) {
        showToast("Registration submitted. Payment instructions may be in your dashboard.", "info");
      } else {
        showToast("Registration submitted successfully. Payment instructions sent to your email.");
      }
      
      router.push(`/academy/registration-confirmation?id=${result.data.id}&emailSent=${emailSent}&finalPrice=${finalPrice ?? 0}&currency=${currency || 'USD'}`);
      return;
    }
    showToast("Registration saved.");
    router.push(`/academy/registration-confirmation?id=${result.data.id}`);
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
        <Link href="/dashboard/academy" className="w-full bg-white text-slate-950 hover:bg-emerald-50 sm:w-auto">
          <PlayCircle className="mr-2 size-4" />
          Continue Learning
        </Link>
      )}
      {isAdmin && (
        <Link href="/dashboard/admin/academy" className="w-full border border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto">
          <Settings className="mr-2 size-4" />
          Manage Academy
        </Link>
      )}
      {!academyStatus?.hasActiveAccess && (
        <Link href="/dashboard/academy" className="w-full bg-white text-slate-950 hover:bg-emerald-50 sm:w-auto">
          My Dashboard
        </Link>
      )}
      <Link href="/academy/verify" className="w-full border border-white/25 bg-white/10 text-white hover:bg-white/15 sm:w-auto">
        <ShieldCheck className="mr-2 size-4" />
        Verify certificate
      </Link>
    </div>
  ) : (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link href="#academy-programmes" className="w-full bg-white text-slate-950 shadow-xl shadow-emerald-950/20 hover:bg-emerald-50 sm:w-auto">
        Explore programmes
        <ArrowRight className="ml-2 size-4" />
      </Link>
      <Link href="/academy/verify" className="w-full border border-white/25 bg-white/10 text-white hover:bg-white/15 sm:w-auto">
        <ShieldCheck className="mr-2 size-4" />
        Verify certificate
      </Link>
    </div>
  );

  return (
    <PageShell
      eyebrow={academySettings?.academyName ?? "HouseLink Academy"}
      title={browseMode && academyStatus?.hasActiveAccess ? "Browse More Courses" : "Become the agent clients trust."}
      description={
        browseMode && academyStatus?.hasActiveAccess
          ? "You already have active course access. Browse additional courses or return to your learning dashboard."
          : "Practical training, reviewed assignments, field tools, roleplay evidence, and verifiable HouseLink completion certificates for Zimbabwe property work."
      }
      highlights={[
        { value: "3 levels", label: "training pathway" },
        { value: `${courses.reduce((sum, course) => sum + (course.assignmentCount ?? 0) + (course.quizCount ?? 0), 0) || 16} checks`, label: "quizzes and tasks" },
        { value: "Field tools", label: "downloadable PDFs" },
      ]}
      compactHero
      heroMode="immersive"
      heroAside={<AcademyHeroVisual />}
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

      <AcademyPromiseStrip />
      <TrainingDisclaimer compact className="mb-6" />

      <section id="academy-programmes" className="mb-6 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="p-5 sm:p-6 lg:p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Choose your programme</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Training certificate pathway</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Start with the pathway. Select one level, scan the value, then expand only the details you need: outcomes, certificate requirements, curriculum, and toolkit.
            </p>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/40 lg:border-l lg:border-t-0">
            <div className="grid grid-cols-3 gap-2 text-center">
              <StandardStat value="3" label="levels" />
              <StandardStat value={String(courses.reduce((sum, course) => sum + (course.assignmentCount ?? 0) + (course.quizCount ?? 0), 0))} label="checks" />
              <StandardStat value={String(courses.reduce((sum, course) => sum + (course.toolkitCount ?? 0), 0))} label="tools" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_21rem] xl:items-start">
        <PathwayRail courses={courses} selectedId={selectedId} academyStatus={academyStatus} onSelect={setSelectedId} />
        <section className="min-w-0">
          {selected ? (
            <SelectedProgrammeDetail
              course={selected}
              index={Math.max(0, courses.findIndex((course) => course.id === selected.id))}
              registration={selectedRegistration}
              academyStatus={academyStatus}
              selected={true}
              onSelect={() => setSelectedId(selected.id)}
            />
          ) : null}
          {!courses.length && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <BookOpen className="size-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No courses available</p>
              <p className="text-sm text-slate-500 mt-2">Check back soon for new training opportunities.</p>
            </div>
          )}
        </section>

        <aside className="lg:h-fit lg:sticky lg:top-4 order-first lg:order-last">
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
              couponValidation={couponValidation}
              validatingCoupon={validatingCoupon}
              validateCoupon={validateCoupon}
              onRegister={() => void register()}
              courses={courses}
              selectedId={selectedId}
              onSelectCourse={setSelectedId}
          />
        </aside>
      </div>

      <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Academy standard</p>
            <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <h2 className="max-w-2xl text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  Proof that learners can handle real clients
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  HouseLink Academy is built around practical competence: stronger listings, safer client handling, sharper market judgement, and evidence that an admin can review.
                </p>
              </div>
              <Link href="/academy/verify" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200 sm:w-auto">
                <ShieldCheck className="size-4" />
                Verify certificate
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {TRAINING_STANDARD_PROOFS.map((item) => (
                <TrainingStandardCard key={item.title} {...item} />
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_36%),#020617] p-5 text-white dark:border-slate-800 lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Training credential signal</p>
                <p className="mt-3 text-xl font-black leading-tight">A HouseLink certificate should prove discipline, evidence, and client trust inside the HouseLink training standard.</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  The goal is not to create agents who only know theory. It is to produce agents who can protect clients, document work, and represent property professionally.
                </p>
              </div>
              <div className="grid gap-2">
                <EvidencePill label="Admin-reviewed assignments" />
                <EvidencePill label="Roleplay and scenario checks" />
                <EvidencePill label="Public certificate verification" />
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/35 sm:p-5">
          <AcademyAccordion
            accent="#008b68"
            items={[
              {
                id: "academy-standard-learn",
                title: "What agents learn",
                subtitle: "Client work, listing quality, pricing, viewings, and compliance",
                meta: `${GRADUATE_CAPABILITY_MAP.length} capabilities`,
                content: <CompactProofGrid items={GRADUATE_CAPABILITY_MAP} />,
              },
              {
                id: "academy-standard-certification",
                title: "How certificate completion works",
                subtitle: "Practical submissions are checked against a professional rubric",
                meta: `${SAMPLE_PUBLIC_ASSIGNMENTS.length} examples`,
                content: (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <CompactProofList title="Sample assignments" items={SAMPLE_PUBLIC_ASSIGNMENTS} />
                    <CompactProofList title="Grading standard" items={ASSESSMENT_GRADING_STANDARD} />
                  </div>
                ),
              },
              {
                id: "academy-standard-toolkit",
                title: "Field tools included",
                subtitle: "Training, reviewed work, PDFs, certificates, and progression",
                meta: `${ACADEMY_VALUE_PROOF.length} value points`,
                content: <CompactProofGrid items={ACADEMY_VALUE_PROOF} />,
              },
              {
                id: "academy-standard-difference",
                title: "What makes HouseLink agents different",
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

function PathwayRail({
  courses,
  selectedId,
  academyStatus,
  onSelect,
}: {
  courses: PublicCourse[];
  selectedId: string;
  academyStatus: AcademyStatus | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="academy-panel rounded-2xl p-3 sm:sticky sm:top-4">
      <div className="px-2 pb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Guided pathway</p>
        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Move from foundation habits to listing mastery and professional training.</p>
      </div>
      <div className="relative grid gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
        <div className="absolute left-6 top-6 hidden h-[calc(100%-3rem)] w-px bg-gradient-to-b from-emerald-200 via-slate-200 to-amber-200 dark:from-emerald-900 dark:via-slate-800 dark:to-amber-900 lg:block" />
        {courses.map((course, index) => {
          const accent = course.theme?.accent ?? "#008b68";
          const active = course.id === selectedId;
          const registration = courseRegistrationState(academyStatus, course.id);
          const locked = course.prerequisiteCourseId && courseRegistrationState(academyStatus, course.prerequisiteCourseId) !== "APPROVED" && registration !== "APPROVED";
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => onSelect(course.id)}
              className={cn(
                "group relative min-w-0 rounded-xl border p-3 text-left transition",
                active ? "bg-white shadow-lg shadow-slate-950/10 dark:bg-slate-950" : "border-slate-200 bg-slate-50/80 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-950",
              )}
              style={active ? { borderColor: accent } : undefined}
            >
              <div className="flex items-start gap-3">
                <span className="relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ring-4 ring-white dark:ring-slate-950" style={{ backgroundColor: accent }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black leading-snug text-slate-950 dark:text-white">{course.title}</span>
                  <span className="mt-1 block text-xs font-semibold" style={{ color: accent }}>{course.theme?.label ?? course.difficulty}</span>
                  <span className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-semibold text-slate-500">
                    <span>{course.lessonCount} sessions</span>
                    <span>{course.estimatedHours || Math.round(course.durationMinutes / 60)}h guided</span>
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1">
                    {registration === "APPROVED" && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Enrolled</span>}
                    {registration === "PENDING" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Pending</span>}
                    {locked && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Locked</span>}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function SelectedProgrammeDetail({
  course,
  index,
  registration,
  academyStatus,
  selected,
  onSelect,
}: {
  course: PublicCourse;
  index: number;
  registration: ReturnType<typeof courseRegistrationState>;
  academyStatus: AcademyStatus | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const accent = course.theme?.accent ?? "#008b68";
  const locked = course.prerequisiteCourseId && courseRegistrationState(academyStatus, course.prerequisiteCourseId) !== "APPROVED" && registration !== "APPROVED";
  const stageNumber = String(index + 1).padStart(2, "0");
  const totalChecks = (course.quizCount ?? 0) + (course.assignmentCount ?? 0) + (course.roleplayCount ?? 0) + (course.hasFinalExam ? 1 : 0);

  return (
    <article className="academy-programme-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950" style={{ borderColor: selected ? accent : undefined }}>
      <div className="absolute inset-x-0 top-0 h-32 opacity-90" style={{ background: `linear-gradient(135deg, ${accent}14, transparent 62%)` }} />
      <div className={cn("relative h-2 bg-gradient-to-r", course.theme?.gradient ?? "from-emerald-500 to-teal-600")} />
      <div className="relative p-5 sm:p-6 lg:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shadow-sm" style={{ backgroundColor: accent }}>
                {stageNumber}
              </span>
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", course.theme?.chip ?? "bg-emerald-100 text-emerald-800")}>{course.theme?.label}</span>
              {course.certificateEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"><Award className="size-3 shrink-0" /> Certificate</span>
              )}
              {locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  <Lock className="size-3 shrink-0" /> Complete previous programme
                </span>
              )}
            </div>
            <h3 className="mt-4 text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-3xl">{course.title}</h3>
            <p className="mt-1 text-sm font-bold leading-relaxed" style={{ color: accent }}>{course.subtitle}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{course.shortDescription ?? course.description}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-950 lg:text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Programme access</p>
            <p className="mt-1 text-3xl font-black tracking-tight" style={{ color: accent }}>{course.publicPrice ? `${course.currency} ${course.publicPrice.toFixed(2)}` : "Free"}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{course.accessDurationDays} days access</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {totalChecks} reviewed checkpoints
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CourseMetric icon={BookOpen} value={String(course.lessonCount)} label="sessions" accent={accent} />
          <CourseMetric icon={ListChecks} value={`${course.quizCount ?? 0}/${course.assignmentCount ?? 0}`} label="quizzes/tasks" accent={accent} />
          <CourseMetric icon={Clock} value={`${course.estimatedHours || Math.round(course.durationMinutes / 60)}h`} label="guided" accent={accent} />
          <CourseMetric icon={ShieldCheck} value={String(course.toolkitCount ?? 0)} label="PDF tools" accent={accent} />
        </div>

        <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
          <ProgrammeProofCard title="Practice" body="Real client scenarios, roleplay prompts, and field notes before learners move on." accent={accent} />
          <ProgrammeProofCard title="Evidence" body="Quizzes, submitted assignments, toolkit work, and portfolio proof are reviewed." accent={accent} />
          <ProgrammeProofCard title="Trust" body="Graduates earn a public certificate that can be verified by clients and teams." accent={accent} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <TrustChip label="Admin reviewed" />
          <TrustChip label="Field toolkit" />
          {course.hasFinalExam && <TrustChip label="Final exam" tone="amber" />}
          {course.portfolioRequired && <TrustChip label="Portfolio" tone="sky" />}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/70 sm:p-4">
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
                title: "Value and certificate requirements",
                subtitle: course.assessmentSummary ?? "Sessions, toolkits, assessments, and HouseLink certificate completion",
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
                        <p className="mt-1 text-xs text-slate-500">{module.lessons.length} training sessions / {module.lessons.reduce((n, lesson) => n + lesson.estimatedMinutes, 0)} min</p>
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

        <CourseActionButton
          courseId={course.id}
          registration={registration}
          selected={selected}
          locked={!!locked}
          accent={accent}
          onSelect={onSelect}
        />
      </div>
    </article>
  );
}

function AcademyHeroVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-emerald-300/20 via-white/5 to-sky-300/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.45rem] border border-white/15 bg-white/10 p-2.5 shadow-2xl shadow-emerald-950/35 backdrop-blur">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.15rem] bg-slate-950">
        <Image
          src="/images/academy/agent-academy-hero.png"
          alt="Professional agents in a HouseLink Academy training session"
          fill
          priority
          className="object-cover"
          sizes="576px"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.1),rgba(2,6,23,0.02)_42%,rgba(2,6,23,0.28)),linear-gradient(180deg,rgba(2,6,23,0)_30%,rgba(2,6,23,0.92))]" />
        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/60 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur sm:left-4 sm:top-4">
          <BookOpen className="size-3.5 text-emerald-300" />
          Field-ready academy
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 sm:bottom-4 sm:left-4 sm:right-4 sm:gap-4">
          <div className="max-w-[13rem] rounded-2xl border border-white/15 bg-white/95 p-3 text-slate-950 shadow-2xl sm:max-w-[16rem] sm:p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Credential pathway</p>
            <p className="mt-1 text-base font-black leading-tight sm:mt-2 sm:text-xl">HouseLink Training Graduate</p>
            <div className="mt-4 hidden grid-cols-3 gap-1.5 text-center sm:grid">
              <HeroProof value="3" label="levels" />
              <HeroProof value="16" label="tasks" />
              <HeroProof value="PDF" label="tools" />
            </div>
          </div>
          <div className="hidden max-w-[10rem] rounded-2xl border border-white/15 bg-slate-950/70 p-3 text-white shadow-2xl backdrop-blur sm:block">
            <div className="flex items-center gap-2 text-xs font-bold">
              <ShieldCheck className="size-4 text-emerald-300" />
              Publicly verifiable
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">Proof clients and teams can check.</p>
          </div>
        </div>
        <div className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-2xl border border-emerald-200/70 bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-950/30 sm:right-4 sm:top-4 sm:size-14">
          <Award className="size-5 sm:size-7" />
        </div>
        </div>
      </div>
    </div>
  );
}

function HeroProof({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <p className="text-base font-black text-slate-950">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function AcademyPromiseStrip() {
  const promises = [
    "Train with Zimbabwe field scenarios",
    "Submit practical evidence for review",
    "Earn HouseLink certificates clients can verify",
  ];

  return (
    <section className="-mt-2 mb-6 rounded-2xl border border-emerald-100 bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-emerald-900/40 dark:bg-slate-950">
      <div className="grid gap-2 md:grid-cols-3">
        {promises.map((promise) => (
          <div key={promise} className="flex items-center gap-3 rounded-xl bg-emerald-50/70 px-4 py-3 text-sm font-bold text-slate-900 dark:bg-emerald-950/25 dark:text-white">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <span>{promise}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidencePill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-slate-100">
      <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
      {label}
    </div>
  );
}

function StandardStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-2 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
      <p className="text-base font-black text-slate-950 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  );
}

function TrainingStandardCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BookOpen;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
    </div>
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
    <div className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:justify-start sm:rounded-full sm:px-3">
      <Icon className="size-4 shrink-0" style={{ color: accent }} />
      <span className="font-bold leading-none text-slate-950 dark:text-white">{value}</span>
      <span className="min-w-0 text-xs font-medium leading-tight text-slate-500">{label}</span>
    </div>
  );
}

function ProgrammeProofCard({ title, body, accent }: { title: string; body: string; accent: string }) {
  return (
    <div className="group flex min-h-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-[0_16px_42px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 sm:bg-slate-50/80">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}14`, color: accent }}
      >
        <CheckCircle2 className="size-4" strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 max-w-prose text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
      </div>
    </div>
  );
}

function TrustChip({ label, tone = "emerald" }: { label: string; tone?: "emerald" | "amber" | "sky" }) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
    sky: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200",
  };

  return (
    <span className={`inline-flex min-h-9 w-full items-center justify-center rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold sm:w-auto sm:rounded-full ${styles[tone]}`}>
      {label}
    </span>
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
  couponValidation,
  validatingCoupon,
  validateCoupon,
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
  form: { phone: string; organisation: string; motivation: string; paymentMethod: string; registrationIntent: "TRAINING_ONLY" | "AGENT_TRAINING"; couponCode: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  displayPrice: number | null;
  busy: boolean;
  couponValidation: { valid: boolean; discountAmount: number; finalAmount: number; savings: number; message?: string } | null;
  validatingCoupon: boolean;
  validateCoupon: () => void;
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
            {!user ? "Create an account to enrol" : selectedRegistration === "APPROVED" ? "Continue where you left off" : selectedRegistration === "PENDING" ? "Finish payment to start learning" : "Complete registration for a new course"}
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
            <div className="grid gap-2">
              <Link href="/dashboard/academy" className="block w-full">
                <Button className="w-full"><PlayCircle className="size-4 mr-2" /> Go to Learning Dashboard</Button>
              </Link>
            </div>
          )}

          <Link href="/academy/verify" className="block w-full">
            <Button variant="secondary" className="w-full"><ShieldCheck className="size-4 mr-2" /> Verify Certificate</Button>
          </Link>

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
              {displayPrice === 0 ? (
                <p className="mt-2 text-emerald-700 dark:text-emerald-300 font-medium">Your coupon made this course free! No payment proof needed.</p>
              ) : (
                <Link href="/dashboard/academy" className="mt-4 block">
                  <Button className="w-full" variant="secondary"><Upload className="size-4 mr-2" /> Upload Payment Proof</Button>
                </Link>
              )}
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
                <div className={`rounded-xl border p-4 text-sm ${couponValidation?.valid ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50'}`}>
                  <p className="font-semibold">Course fee</p>
                  {couponValidation?.valid ? (
                    <div className="mt-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-through">
                        {selected.currency} {(isAgent && form.registrationIntent === "AGENT_TRAINING" ? selected.agentPrice : selected.publicPrice).toFixed(2)}
                      </p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {displayPrice > 0 ? `${selected.currency} ${displayPrice.toFixed(2)}` : "FREE"}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-medium">
                        You save {selected.currency} {couponValidation.savings.toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{displayPrice > 0 ? `${selected.currency} ${displayPrice.toFixed(2)}` : "Free"}</p>
                  )}
                </div>
              )}
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Coupon Code
                <div className="mt-2 flex gap-2">
                  <input 
                    type="text" 
                    value={form.couponCode} 
                    onChange={(event) => setForm({ ...form, couponCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} 
                    placeholder="Enter coupon code" 
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={validateCoupon} 
                    disabled={!form.couponCode.trim() || validatingCoupon}
                  >
                    {validatingCoupon ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  </Button>
                </div>
              </label>
              {couponValidation && (
                <div className={`rounded-xl p-4 text-sm ${couponValidation.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'}`}>
                  {couponValidation.valid ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Coupon applied successfully!</p>
                        <p className="mt-1">You save {selected?.currency || "USD"} {couponValidation.savings.toFixed(2)}</p>
                        <p className="text-xs mt-1">Final price: {selected?.currency || "USD"} {couponValidation.finalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="size-5 mt-0.5 flex-shrink-0 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center text-red-800 dark:text-red-200 text-xs font-bold">!</div>
                      <p>{couponValidation.message || "Invalid coupon code"}</p>
                    </div>
                  )}
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
    course.hasFinalExam ? "Pass the final HouseLink examination" : "",
    "Earn a publicly verifiable HouseLink training certificate",
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
        <div className="mt-4 grid grid-cols-2 gap-2">
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
