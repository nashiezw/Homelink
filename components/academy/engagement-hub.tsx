"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Copy, MessageCircle, Send, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type EngagementData = {
  settings: Record<string, any>;
  courses: Array<{ id: string; title: string }>;
  profile: { communityOptIn: boolean; ambassadorOptIn: boolean; directoryOptIn: boolean; spotlightConsent: boolean; profileHeadline?: string | null; profileBio?: string | null; referralCode?: string | null } | null;
  referrals: Array<{ id: string; referralCode: string; status: string; referredName?: string | null; referredEmail?: string | null; createdAt: string }>;
  testimonials: Array<{ id: string; title: string; status: string; rating?: number | null; createdAt: string }>;
  challenges: Array<{ id: string; title: string; instructions: string; rewardLabel?: string | null; startsAt?: string | null; endsAt?: string | null; submitted: boolean; submission?: { status: string; adminNote?: string | null } | null }>;
  officeHours: Array<{ id: string; title: string; description?: string | null; startsAt: string; link?: string | null; capacity?: number | null; rsvp?: { status: string } | null }>;
};

export function AcademyEngagementHub({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState({ communityOptIn: false, ambassadorOptIn: false, directoryOptIn: false, spotlightConsent: false, profileHeadline: "", profileBio: "" });
  const [testimonial, setTestimonial] = useState({ courseId: "", rating: "5", title: "", body: "", publicConsent: true });
  const [referral, setReferral] = useState({ courseId: "", referredName: "", referredEmail: "" });
  const [challengeEvidence, setChallengeEvidence] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const result = await apiFetch<EngagementData>("/api/v1/academy/engagement", { cache: "no-store" });
    if (result.data) {
      setData(result.data);
      setProfile({
        communityOptIn: Boolean(result.data.profile?.communityOptIn),
        ambassadorOptIn: Boolean(result.data.profile?.ambassadorOptIn),
        directoryOptIn: Boolean(result.data.profile?.directoryOptIn),
        spotlightConsent: Boolean(result.data.profile?.spotlightConsent),
        profileHeadline: result.data.profile?.profileHeadline ?? "",
        profileBio: result.data.profile?.profileBio ?? "",
      });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const referralCode = data?.profile?.referralCode ?? data?.referrals[0]?.referralCode ?? "";
  const shareText = useMemo(() => {
    const prompt = data?.settings.sharePrompt ?? "I am learning through HouseLink Academy.";
    return referralCode ? `${prompt} Use my referral code: ${referralCode}` : prompt;
  }, [data?.settings.sharePrompt, referralCode]);

  async function action(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setMessage(null);
    const result = await apiFetch("/api/v1/academy/engagement", { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(success);
    await load();
  }

  async function copyShareText() {
    await navigator.clipboard?.writeText(shareText).catch(() => null);
    setMessage("Sharing message copied.");
  }

  if (!data || data.settings.enabled === false) return null;

  return (
    <section className={compact ? "space-y-4" : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"}>
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/60 to-white p-4 shadow-sm dark:border-emerald-400/20 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-950 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Optional Learner Engagement</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{data.settings.communityName ?? "Academy Engagement Hub"}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{data.settings.invitation}</p>
          </div>
          {data.settings.whatsappUrl && (
            <a href={data.settings.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-500">
              <MessageCircle className="mr-2 size-4" /> Join community
            </a>
          )}
        </div>
        {message && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">{message}</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <HubCard title="Consent and visibility" icon={ShieldCheck}>
          <p className="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">These activities are optional. They never block your course progress, assessments, certificates or access.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["communityOptIn", "Community updates"],
              ["ambassadorOptIn", "Ambassador programme"],
              ["directoryOptIn", "Graduate directory"],
              ["spotlightConsent", "Learner spotlight permission"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                {label}
                <input type="checkbox" checked={Boolean((profile as any)[key])} onChange={(event) => setProfile({ ...profile, [key]: event.target.checked })} />
              </label>
            ))}
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="Directory headline" value={profile.profileHeadline} onChange={(profileHeadline) => setProfile({ ...profile, profileHeadline })} />
            <Textarea label="Public profile bio" value={profile.profileBio} onChange={(profileBio) => setProfile({ ...profile, profileBio })} />
          </div>
          <Button className="mt-4 w-full sm:w-auto" disabled={busy} onClick={() => action({ action: "save_profile", profile }, "Engagement preferences saved.")}>Save preferences</Button>
        </HubCard>

        <HubCard title="Referral and sharing" icon={Send}>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-200">Your referral code</p>
            <p className="mt-2 break-all text-2xl font-black text-slate-950 dark:text-white">{referralCode || "Save preferences to generate"}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{data.settings.referralRewardLabel}</p>
            <Button variant="secondary" className="mt-3" onClick={copyShareText}><Copy className="size-4" /> Copy share message</Button>
          </div>
          <div className="mt-4 grid gap-3">
            <Select label="Course interest" value={referral.courseId} options={[{ value: "", label: "General Academy referral" }, ...data.courses.map((course) => ({ value: course.id, label: course.title }))]} onChange={(courseId) => setReferral({ ...referral, courseId })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={referral.referredName} onChange={(referredName) => setReferral({ ...referral, referredName })} />
              <Field label="Email" value={referral.referredEmail} onChange={(referredEmail) => setReferral({ ...referral, referredEmail })} />
            </div>
            <Button disabled={busy} onClick={() => action({ action: "create_referral", ...referral, rewardLabel: data.settings.referralRewardLabel }, "Referral recorded.")}>Record referral</Button>
          </div>
        </HubCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <HubCard title="Course review / testimonial" icon={Star}>
          <div className="grid gap-3">
            <Select label="Course" value={testimonial.courseId} options={[{ value: "", label: "General Academy experience" }, ...data.courses.map((course) => ({ value: course.id, label: course.title }))]} onChange={(courseId) => setTestimonial({ ...testimonial, courseId })} />
            <Field label="Title" value={testimonial.title} onChange={(title) => setTestimonial({ ...testimonial, title })} />
            <Select label="Rating" value={testimonial.rating} options={[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} star${value === 1 ? "" : "s"}` }))} onChange={(rating) => setTestimonial({ ...testimonial, rating })} />
            <Textarea label="Your testimonial" value={testimonial.body} onChange={(body) => setTestimonial({ ...testimonial, body })} />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={testimonial.publicConsent} onChange={(event) => setTestimonial({ ...testimonial, publicConsent: event.target.checked })} /> I allow HouseLink to review this for public use.</label>
            <Button disabled={busy || !testimonial.title.trim() || !testimonial.body.trim()} onClick={() => action({ action: "submit_testimonial", testimonial }, "Testimonial submitted for moderation.")}>Submit testimonial</Button>
          </div>
          <MiniStatus rows={data.testimonials.map((item) => ({ id: item.id, title: item.title, detail: item.status }))} empty="No testimonials submitted yet." />
        </HubCard>

        <HubCard title="Practical challenges" icon={Sparkles}>
          <div className="space-y-3">
            {data.challenges.length ? data.challenges.map((challenge) => (
              <div key={challenge.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="font-black text-slate-950 dark:text-white">{challenge.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{challenge.instructions}</p>
                {challenge.rewardLabel && <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">{challenge.rewardLabel}</p>}
                {challenge.submitted ? <p className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">Submitted: {challenge.submission?.status}</p> : (
                  <div className="mt-3 grid gap-2">
                    <Textarea label="Evidence / link / summary" value={challengeEvidence[challenge.id] ?? ""} onChange={(value) => setChallengeEvidence({ ...challengeEvidence, [challenge.id]: value })} />
                    <Button disabled={busy || !challengeEvidence[challenge.id]?.trim()} onClick={() => action({ action: "submit_challenge", challengeId: challenge.id, evidence: challengeEvidence[challenge.id] }, "Challenge evidence submitted.")}>Submit evidence</Button>
                  </div>
                )}
              </div>
            )) : <p className="text-sm text-slate-500">No active challenges right now.</p>}
          </div>
        </HubCard>

        <HubCard title="Office hours" icon={CalendarClock}>
          <div className="space-y-3">
            {data.officeHours.length ? data.officeHours.map((officeHour) => (
              <div key={officeHour.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="font-black text-slate-950 dark:text-white">{officeHour.title}</p>
                <p className="text-sm text-slate-500">{formatDateTime(officeHour.startsAt)}</p>
                {officeHour.description && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{officeHour.description}</p>}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button disabled={busy} onClick={() => action({ action: "rsvp_office_hour", officeHourId: officeHour.id, status: officeHour.rsvp?.status === "GOING" ? "CANCELLED" : "GOING" }, officeHour.rsvp?.status === "GOING" ? "RSVP cancelled." : "RSVP saved.")}>{officeHour.rsvp?.status === "GOING" ? "Cancel RSVP" : "RSVP"}</Button>
                  {officeHour.link && <a href={officeHour.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100">Open link</a>}
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No upcoming office hours yet.</p>}
          </div>
        </HubCard>
      </div>
    </section>
  );
}

function HubCard({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><Icon className="size-5" /></span><h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3></div>{children}</section>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none focus:border-emerald-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}<textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none focus:border-emerald-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none focus:border-emerald-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function MiniStatus({ rows, empty }: { rows: Array<{ id: string; title: string; detail: string }>; empty: string }) {
  return <div className="mt-4 space-y-2">{rows.length ? rows.slice(0, 4).map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900"><span className="min-w-0 truncate font-semibold">{row.title}</span><span className="shrink-0 text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">{row.detail}</span></div>) : <p className="text-sm text-slate-500">{empty}</p>}</div>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
