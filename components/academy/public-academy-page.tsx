"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, BookOpen, CheckCircle2, Clock, CreditCard, GraduationCap, Loader2, ShieldCheck, Upload } from "lucide-react";
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
  const [form, setForm] = useState({ phone: "", organisation: "", motivation: "", paymentMethod: "bank_transfer" });

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
      title="Professional property training without becoming an agent"
      description="Public learners can register, pay for approved courses, submit proof of payment, and study independently from the HomeLink agent network."
      highlights={[
        { value: String(courses.length), label: "public courses" },
        { value: "Admin", label: "approval workflow" },
        { value: "LMS", label: "learner dashboard" },
      ]}
      actions={user ? <Link href="/dashboard/academy"><Button variant="secondary">My learner dashboard</Button></Link> : undefined}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <section className="grid gap-4">
          {courses.map((course) => (
            <article key={course.id} className={`premium-card rounded-xl p-5 transition ${selectedId === course.id ? "ring-2 ring-emerald-500/40" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{course.category}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{course.difficulty.toLowerCase()}</span>
                    {course.certificateEnabled && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Certificate</span>}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-ink dark:text-white">{course.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{course.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-700">{course.price ? `${course.currency} ${course.price.toFixed(2)}` : "Free"}</p>
                  <p className="text-xs text-slate-500">{course.accessDurationDays} days access</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoPill icon={BookOpen} label={`${course.lessonCount} lessons`} />
                <InfoPill icon={Clock} label={`${course.estimatedHours || Math.round(course.durationMinutes / 60)} hours`} />
                <InfoPill icon={GraduationCap} label={course.instructor || "HomeLink trainers"} />
              </div>
              {!!course.modules.length && (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {course.modules.slice(0, 4).map((module) => (
                    <div key={module.id} className="rounded-lg border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="font-semibold">{module.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{module.lessons.length} lessons</p>
                    </div>
                  ))}
                </div>
              )}
              <Button className="mt-5" variant={selectedId === course.id ? "primary" : "secondary"} onClick={() => setSelectedId(course.id)}>
                <CheckCircle2 className="size-4" /> Select course
              </Button>
            </article>
          ))}
          {!courses.length && <div className="premium-card rounded-xl p-8 text-center text-sm text-slate-600">No public Academy courses are open right now.</div>}
        </section>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            <h2 className="font-semibold">Public learner registration</h2>
          </div>
          {!user ? (
            <div className="mt-4">
              <AuthForm initialMode="register" showBrand={false} redirectTo={null} />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                Signed in as <span className="font-semibold">{user.email}</span>. This will create a learner record, not an agent application.
              </div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Course
                <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
              </label>
              <TextInput label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
              <TextInput label="Organisation (optional)" value={form.organisation} onChange={(organisation) => setForm({ ...form, organisation })} />
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Payment method
                <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="zipit">ZIPIT</option>
                  <option value="cash">Cash deposit</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Motivation
                <textarea value={form.motivation} onChange={(event) => setForm({ ...form, motivation: event.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <Button className="w-full" disabled={!selected || busy} onClick={() => void register()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />} Register as public learner
              </Button>
              <Link href="/dashboard/academy" className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                <Upload className="size-4" /> Upload proof after registering
              </Link>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
}

function InfoPill({ icon: Icon, label }: { icon: typeof Award; label: string }) {
  return <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"><Icon className="size-4 text-emerald-600" />{label}</div>;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
    </label>
  );
}
