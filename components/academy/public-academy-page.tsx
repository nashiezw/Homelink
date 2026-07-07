"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, BookOpen, CheckCircle2, Clock, CreditCard, GraduationCap, Loader2, ShieldCheck, Upload, Star, TrendingUp, Users, Zap } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

type PublicCourse = {
  id: string;
  title: string;
  description: string;
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
  lessonCount: number;
  modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; estimatedMinutes: number }> }>;
};

export function PublicAcademyPage() {
  const { user, showToast } = useApp();
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    phone: "",
    organisation: "",
    motivation: "",
    paymentMethod: "bank_transfer",
    registrationIntent: "TRAINING_ONLY" as "TRAINING_ONLY" | "AGENT_TRAINING",
  });

  const load = useCallback(async () => {
    const result = await apiFetch<PublicCourse[]>("/api/v1/academy/courses");
    if (result.data) {
      setCourses(result.data);
      setSelectedId((current) => current || result.data[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(() => courses.find((course) => course.id === selectedId), [courses, selectedId]);
  const isAgent = user?.roles?.includes("AGENT") ?? false;
  const displayPrice = useMemo(() => {
    if (!selected) return null;
    if (isAgent && form.registrationIntent === "AGENT_TRAINING") {
      return selected.agentPrice;
    }
    return selected.publicPrice;
  }, [selected, isAgent, form.registrationIntent]);

  async function register() {
    if (!selected) return;
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
    showToast(result.data.status === "APPROVED" ? "Your Academy access is active." : "Registration saved. Upload proof of payment from your learner dashboard.");
  }

  return (
    <PageShell
      eyebrow="HomeLink Academy"
      title="Professional Property Training"
      description="Master real estate with Zimbabwe's leading property platform. Train with HomeLink as a public learner — no agent application required."
      highlights={[
        { value: String(courses.length), label: "Available Courses" },
        { value: "Certified", label: "Training" },
        { value: "Expert", label: "Instructors" },
      ]}
      actions={user ? <Link href="/dashboard/academy"><Button variant="secondary">My Dashboard</Button></Link> : undefined}
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-8 md:p-12 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="size-8" />
            <span className="text-lg font-semibold">HomeLink Academy</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Train with HomeLink Academy</h1>
          <p className="text-lg text-emerald-100 mb-6 max-w-2xl">
            Learn from industry experts, gain practical skills, and earn your certification. You do not need to become a HomeLink agent to register — choose training-only enrolment and access your courses from your learner dashboard.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
              <BookOpen className="size-5" />
              <span className="font-medium">Interactive Lessons</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
              <Award className="size-5" />
              <span className="font-medium">Certified Completion</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
              <Users className="size-5" />
              <span className="font-medium">Expert Support</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-4 mt-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <BookOpen className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{courses.reduce((sum, c) => sum + c.lessonCount, 0)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Lessons</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <Award className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{courses.filter(c => c.certificateEnabled).length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Certified Courses</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <Clock className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{courses.reduce((sum, c) => sum + (c.estimatedHours || Math.round(c.durationMinutes / 60)), 0)}h</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Learning Hours</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
              <TrendingUp className="size-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{courses.length ? `${Math.round(courses.reduce((sum, c) => sum + c.lessonCount, 0) / Math.max(courses.length, 1))}+` : "0"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Avg Lessons / Course</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)] mt-8">
        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Available Courses</h2>
            <div className="flex gap-2">
              <Button variant={selectedId === "" ? "primary" : "secondary"} onClick={() => setSelectedId("")}>All</Button>
            </div>
          </div>
          {courses.map((course) => (
            <article key={course.id} className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${selectedId === course.id ? "border-emerald-500 shadow-xl shadow-emerald-500/30" : "border-slate-200 hover:border-emerald-400 hover:shadow-lg dark:border-slate-800"}`}>
              {course.featured && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-orange-500 px-4 py-1 text-xs font-bold text-white">
                  <Star className="inline size-3 mr-1" /> Featured
                </div>
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-emerald-500/30">{course.category}</span>
                      <span className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-blue-500/30">{course.difficulty}</span>
                      {course.certificateEnabled && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1"><Award className="size-3" /> Certificate</span>}
                    </div>
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{course.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-emerald-600">
                      {course.publicPrice ? `${course.currency} ${course.publicPrice.toFixed(2)}` : "Free"}
                    </p>
                    {course.agentPrice < course.publicPrice && (
                      <p className="text-xs text-emerald-600 font-medium">Agents: {course.currency} {course.agentPrice.toFixed(2)}</p>
                    )}
                    <p className="text-sm text-slate-500">{course.accessDurationDays} days access</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <BookOpen className="size-5 text-emerald-500" />
                    <span className="font-medium">{course.lessonCount} lessons</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="size-5 text-emerald-500" />
                    <span className="font-medium">{course.estimatedHours || Math.round(course.durationMinutes / 60)} hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <GraduationCap className="size-5 text-emerald-500" />
                    <span className="font-medium">{course.instructor || "HomeLink trainers"}</span>
                  </div>
                </div>
                {!!course.modules.length && (
                  <div className="mt-6">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Course Modules</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {course.modules.slice(0, 4).map((module) => (
                        <div key={module.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                          <p className="font-semibold text-slate-900 dark:text-white">{module.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{module.lessons.length} lessons</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button className="mt-6 w-full" variant={selectedId === course.id ? "primary" : "secondary"} onClick={() => setSelectedId(course.id)}>
                  {selectedId === course.id ? <><CheckCircle2 className="size-4 mr-2" /> Selected</> : <><Zap className="size-4 mr-2" /> Enroll Now</>}
                </Button>
              </div>
            </article>
          ))}
          {!courses.length && <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <BookOpen className="size-12 mx-auto text-slate-400 mb-4" />
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No courses available</p>
            <p className="text-sm text-slate-500 mt-2">Check back soon for new training opportunities.</p>
          </div>}
        </section>

        <aside className="h-fit">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
                  <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Get Started</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Register in minutes</p>
                </div>
              </div>
              {!user ? (
                <div className="space-y-4">
                  <AuthForm initialMode="register" showBrand={false} redirectTo={null} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-sm dark:from-emerald-900/20 dark:to-teal-900/20">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">Welcome back!</p>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-1">Signed in as <span className="font-medium">{user.email}</span></p>
                  </div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select Course
                    <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500">
                      <option value="">Choose a course...</option>
                      {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
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
                      <option value="TRAINING_ONLY">Training only — I am not applying to become a HomeLink agent</option>
                      {isAgent && <option value="AGENT_TRAINING">Agent training — I am a HomeLink agent</option>}
                    </select>
                  </label>
                  {form.registrationIntent === "TRAINING_ONLY" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                      You will get a learner account and course access only. This registration does not make you a HomeLink agent.
                    </div>
                  )}
                  {selected && displayPrice !== null && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50">
                      <p className="font-semibold">Course fee</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {displayPrice > 0 ? `${selected.currency} ${displayPrice.toFixed(2)}` : "Free"}
                      </p>
                    </div>
                  )}
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Payment Method
                    <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500">
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="zipit">ZIPIT</option>
                      <option value="cash">Cash Deposit</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tell us about yourself
                    <textarea value={form.motivation} onChange={(event) => setForm({ ...form, motivation: event.target.value })} rows={4} placeholder="Why do you want to take this course?" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500" />
                  </label>
                  <Button className="w-full" disabled={!selected || busy} onClick={() => void register()}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />} Complete Registration
                  </Button>
                  <Link href="/dashboard/academy" className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                    <Upload className="size-4" /> Already registered? Upload proof
                  </Link>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
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
