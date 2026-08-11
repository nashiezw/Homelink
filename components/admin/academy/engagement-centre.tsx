"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Megaphone, Send, ShieldCheck, Sparkles, Star, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type EngagementData = {
  settings: Record<string, any>;
  courses: Array<{ id: string; title: string; status: string }>;
  metrics: Record<string, number>;
  profiles: Array<{ id: string; learnerId: string; communityOptIn: boolean; ambassadorOptIn: boolean; directoryOptIn: boolean; spotlightConsent: boolean; publicVisibility: string; learner?: { name?: string | null; email?: string | null } | null }>;
  testimonials: Array<{ id: string; title: string; body: string; rating?: number | null; status: string; publicConsent: boolean; learner?: { name?: string | null; email?: string | null } | null; course?: { title: string } | null; createdAt: string }>;
  challenges: Array<{ id: string; title: string; instructions: string; rewardLabel?: string | null; status: string; courseId?: string | null; course?: { title: string } | null; startsAt?: string | null; endsAt?: string | null; submissions: number }>;
  challengeSubmissions: Array<{ id: string; evidence: string; status: string; learner?: { name?: string | null; email?: string | null } | null; challenge?: { title: string } | null; submittedAt: string }>;
  officeHours: Array<{ id: string; title: string; description?: string | null; startsAt: string; link?: string | null; capacity?: number | null; active: boolean; courseId?: string | null; course?: { title: string } | null; rsvps: number }>;
  referrals: Array<{ id: string; referralCode: string; status: string; referredName?: string | null; referredEmail?: string | null; referrer?: { name?: string | null; email?: string | null } | null; course?: { title: string } | null; createdAt: string }>;
};

const defaultChallenge = { title: "", instructions: "", rewardLabel: "", status: "DRAFT", courseId: "", startsAt: "", endsAt: "" };
const defaultOfficeHour = { title: "", description: "", startsAt: "", link: "", capacity: "", courseId: "", active: true };

export function AcademyEngagementCentre() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, any>>({});
  const [challengeDraft, setChallengeDraft] = useState(defaultChallenge);
  const [officeDraft, setOfficeDraft] = useState(defaultOfficeHour);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<EngagementData>("/api/v1/admin/academy/engagement", { cache: "no-store" });
    if (result.data) {
      setData(result.data);
      setSettingsDraft(result.data.settings);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pendingTestimonials = useMemo(() => data?.testimonials.filter((item) => item.status === "PENDING") ?? [], [data]);
  const pendingChallengeSubmissions = useMemo(() => data?.challengeSubmissions.filter((item) => item.status === "SUBMITTED") ?? [], [data]);

  async function action(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setMessage(null);
    const result = await apiFetch("/api/v1/admin/academy/engagement", { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(success);
    await load();
  }

  function editChallenge(challenge: EngagementData["challenges"][number]) {
    setEditingChallengeId(challenge.id);
    setChallengeDraft({
      title: challenge.title,
      instructions: challenge.instructions,
      rewardLabel: challenge.rewardLabel ?? "",
      status: challenge.status,
      courseId: challenge.courseId ?? "",
      startsAt: toInputDateTime(challenge.startsAt),
      endsAt: toInputDateTime(challenge.endsAt),
    });
  }

  function editOfficeHour(officeHour: EngagementData["officeHours"][number]) {
    setEditingOfficeId(officeHour.id);
    setOfficeDraft({
      title: officeHour.title,
      description: officeHour.description ?? "",
      startsAt: toInputDateTime(officeHour.startsAt),
      link: officeHour.link ?? "",
      capacity: officeHour.capacity ? String(officeHour.capacity) : "",
      courseId: officeHour.courseId ?? "",
      active: officeHour.active,
    });
  }

  if (!data) {
    return <div className="min-h-[320px] rounded-2xl border border-white/10 bg-slate-950/80 p-8 text-slate-300">Loading Engagement Centre...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/30 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Academy Engagement Centre</p>
            <h2 className="mt-2 text-2xl font-black text-white">Community, referrals, testimonials and learner success</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Engagement is optional and separate from course access, assessments, progress and certificates. Admin controls what is visible and moderates every public-facing learner submission.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href="/api/v1/admin/academy/engagement?format=csv" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-50">
              Export CSV
            </a>
            <Button disabled={busy} onClick={() => action({ action: "update_settings", settings: settingsDraft }, "Engagement settings saved.")}>Save engagement settings</Button>
          </div>
        </div>
        {message && <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">{message}</p>}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric icon={Users} label="Opted in" value={data.metrics.optedInLearners ?? 0} />
        <Metric icon={ShieldCheck} label="Directory" value={data.metrics.directoryProfiles ?? 0} />
        <Metric icon={Star} label="Testimonials pending" value={data.metrics.pendingTestimonials ?? 0} />
        <Metric icon={Sparkles} label="Active challenges" value={data.metrics.activeChallenges ?? 0} />
        <Metric icon={CalendarClock} label="Office hours" value={data.metrics.upcomingOfficeHours ?? 0} />
        <Metric icon={Send} label="Referrals" value={data.metrics.referrals ?? 0} />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Engagement Controls" icon={Megaphone}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["enabled", "Master enable"],
              ["communityEnabled", "WhatsApp community"],
              ["ambassadorEnabled", "Ambassador opt-in"],
              ["referralsEnabled", "Referral programme"],
              ["testimonialsEnabled", "Testimonials"],
              ["directoryEnabled", "Graduate directory"],
              ["challengesEnabled", "Practical challenges"],
              ["officeHoursEnabled", "Office hours"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-100">
                {label}
                <input type="checkbox" checked={Boolean(settingsDraft[key])} onChange={(event) => setSettingsDraft({ ...settingsDraft, [key]: event.target.checked })} />
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <Field label="Community name" value={settingsDraft.communityName ?? ""} onChange={(communityName) => setSettingsDraft({ ...settingsDraft, communityName })} />
            <Field label="WhatsApp invite URL" value={settingsDraft.whatsappUrl ?? ""} onChange={(whatsappUrl) => setSettingsDraft({ ...settingsDraft, whatsappUrl })} />
            <Textarea label="Learner invitation" value={settingsDraft.invitation ?? ""} onChange={(invitation) => setSettingsDraft({ ...settingsDraft, invitation })} />
            <Textarea label="Share prompt" value={settingsDraft.sharePrompt ?? ""} onChange={(sharePrompt) => setSettingsDraft({ ...settingsDraft, sharePrompt })} />
            <Field label="Referral reward label" value={settingsDraft.referralRewardLabel ?? ""} onChange={(referralRewardLabel) => setSettingsDraft({ ...settingsDraft, referralRewardLabel })} />
            <Textarea label="Campaign schedule" value={settingsDraft.campaignSchedule ?? ""} onChange={(campaignSchedule) => setSettingsDraft({ ...settingsDraft, campaignSchedule })} />
          </div>
        </Panel>

        <Panel title="Consent And Moderation" icon={ShieldCheck}>
          <div className="grid gap-3 md:grid-cols-2">
            <MiniList title="Learner opt-ins" empty="No learner opt-ins yet." rows={data.profiles.slice(0, 8).map((profile) => ({
              id: profile.id,
              title: profile.learner?.name ?? profile.learner?.email ?? profile.learnerId,
              detail: [profile.communityOptIn && "Community", profile.ambassadorOptIn && "Ambassador", profile.directoryOptIn && "Directory", profile.spotlightConsent && "Spotlight"].filter(Boolean).join(" / ") || "No active consent",
            }))} />
            <MiniList title="Referral activity" empty="No referrals yet." rows={data.referrals.slice(0, 8).map((referral) => ({
              id: referral.id,
              title: referral.referrer?.name ?? referral.referrer?.email ?? "Learner",
              detail: `${referral.referralCode} - ${referral.referredName ?? referral.referredEmail ?? referral.status}`,
            }))} />
          </div>
          <ModerationList
            title="Pending testimonials"
            empty="No testimonials waiting for review."
            items={pendingTestimonials.map((item) => ({ id: item.id, title: item.title, detail: `${item.learner?.name ?? item.learner?.email ?? "Learner"} - ${item.course?.title ?? "General"} - ${item.rating ?? "No"} stars`, body: item.body }))}
            onApprove={(id) => action({ action: "moderate_testimonial", testimonialId: id, status: "APPROVED" }, "Testimonial approved.")}
            onReject={(id) => action({ action: "moderate_testimonial", testimonialId: id, status: "REJECTED" }, "Testimonial rejected.")}
          />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Practical Challenges" icon={Sparkles}>
          <EngagementForm>
            <Field label="Challenge title" value={challengeDraft.title} onChange={(title) => setChallengeDraft({ ...challengeDraft, title })} />
            <Textarea label="Learner instructions" value={challengeDraft.instructions} onChange={(instructions) => setChallengeDraft({ ...challengeDraft, instructions })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Course" value={challengeDraft.courseId} options={[{ value: "", label: "All enrolled learners" }, ...data.courses.map((course) => ({ value: course.id, label: course.title }))]} onChange={(courseId) => setChallengeDraft({ ...challengeDraft, courseId })} />
              <Select label="Status" value={challengeDraft.status} options={["DRAFT", "PUBLISHED", "ARCHIVED"].map((status) => ({ value: status, label: status }))} onChange={(status) => setChallengeDraft({ ...challengeDraft, status })} />
              <Field label="Reward label" value={challengeDraft.rewardLabel} onChange={(rewardLabel) => setChallengeDraft({ ...challengeDraft, rewardLabel })} />
              <Field type="datetime-local" label="Starts" value={challengeDraft.startsAt} onChange={(startsAt) => setChallengeDraft({ ...challengeDraft, startsAt })} />
              <Field type="datetime-local" label="Ends" value={challengeDraft.endsAt} onChange={(endsAt) => setChallengeDraft({ ...challengeDraft, endsAt })} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={busy || !challengeDraft.title.trim() || !challengeDraft.instructions.trim()} onClick={() => action({ action: "save_challenge", challengeId: editingChallengeId, challenge: challengeDraft }, editingChallengeId ? "Challenge updated." : "Challenge created.")}>{editingChallengeId ? "Update challenge" : "Create challenge"}</Button>
              <Button variant="secondary" onClick={() => { setEditingChallengeId(null); setChallengeDraft(defaultChallenge); }}>Clear</Button>
            </div>
          </EngagementForm>
          <ItemStack items={data.challenges.map((challenge) => ({ id: challenge.id, title: challenge.title, detail: `${challenge.status} - ${challenge.course?.title ?? "All learners"} - ${challenge.submissions} submission(s)`, onEdit: () => editChallenge(challenge), onDelete: () => action({ action: "delete_challenge", challengeId: challenge.id }, "Challenge deleted.") }))} />
          <ModerationList
            title="Challenge submissions"
            empty="No challenge submissions waiting for review."
            items={pendingChallengeSubmissions.map((item) => ({ id: item.id, title: item.challenge?.title ?? "Challenge", detail: item.learner?.name ?? item.learner?.email ?? "Learner", body: item.evidence }))}
            onApprove={(id) => action({ action: "moderate_challenge_submission", submissionId: id, status: "APPROVED" }, "Challenge submission approved.")}
            onReject={(id) => action({ action: "moderate_challenge_submission", submissionId: id, status: "NEEDS_WORK" }, "Learner asked to improve submission.")}
          />
        </Panel>

        <Panel title="Office Hours" icon={CalendarClock}>
          <EngagementForm>
            <Field label="Event title" value={officeDraft.title} onChange={(title) => setOfficeDraft({ ...officeDraft, title })} />
            <Textarea label="Description / reminder copy" value={officeDraft.description} onChange={(description) => setOfficeDraft({ ...officeDraft, description })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Course" value={officeDraft.courseId} options={[{ value: "", label: "All enrolled learners" }, ...data.courses.map((course) => ({ value: course.id, label: course.title }))]} onChange={(courseId) => setOfficeDraft({ ...officeDraft, courseId })} />
              <Field type="datetime-local" label="Date and time" value={officeDraft.startsAt} onChange={(startsAt) => setOfficeDraft({ ...officeDraft, startsAt })} />
              <Field label="Meeting / WhatsApp link" value={officeDraft.link} onChange={(link) => setOfficeDraft({ ...officeDraft, link })} />
              <Field type="number" label="Capacity" value={officeDraft.capacity} onChange={(capacity) => setOfficeDraft({ ...officeDraft, capacity })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={officeDraft.active} onChange={(event) => setOfficeDraft({ ...officeDraft, active: event.target.checked })} /> Active</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={busy || !officeDraft.title.trim() || !officeDraft.startsAt} onClick={() => action({ action: "save_office_hour", officeHourId: editingOfficeId, officeHour: officeDraft }, editingOfficeId ? "Office hours updated." : "Office hours created.")}>{editingOfficeId ? "Update office hours" : "Create office hours"}</Button>
              <Button variant="secondary" onClick={() => { setEditingOfficeId(null); setOfficeDraft(defaultOfficeHour); }}>Clear</Button>
            </div>
          </EngagementForm>
          <ItemStack items={data.officeHours.map((officeHour) => ({ id: officeHour.id, title: officeHour.title, detail: `${formatDateTime(officeHour.startsAt)} - ${officeHour.course?.title ?? "All learners"} - ${officeHour.rsvps} RSVP(s)`, onEdit: () => editOfficeHour(officeHour), onDelete: () => action({ action: "delete_office_hour", officeHourId: officeHour.id }, "Office hours deleted.") }))} />
        </Panel>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950 p-4"><Icon className="size-5 text-emerald-300" /><p className="mt-4 text-2xl font-black text-white">{value}</p><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p></div>;
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-xl shadow-black/20"><div className="mb-4 flex items-center gap-2"><Icon className="size-5 text-emerald-300" /><h3 className="text-lg font-black text-white">{title}</h3></div>{children}</section>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-400" /></label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}<textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-400" /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-400">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function EngagementForm({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">{children}</div>;
}

function MiniList({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; title: string; detail: string }> }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3"><h4 className="text-sm font-black text-white">{title}</h4><div className="mt-3 space-y-2">{rows.length ? rows.map((row) => <div key={row.id} className="rounded-xl bg-slate-950 p-3"><p className="text-sm font-semibold text-white">{row.title}</p><p className="mt-1 text-xs text-slate-400">{row.detail}</p></div>) : <p className="text-sm text-slate-500">{empty}</p>}</div></div>;
}

function ModerationList({ title, empty, items, onApprove, onReject }: { title: string; empty: string; items: Array<{ id: string; title: string; detail: string; body: string }>; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-3"><h4 className="text-sm font-black text-white">{title}</h4><div className="mt-3 space-y-2">{items.length ? items.map((item) => <div key={item.id} className="rounded-xl bg-slate-950 p-3"><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-slate-400">{item.detail}</p><p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button onClick={() => onApprove(item.id)}><CheckCircle2 className="size-4" /> Approve</Button><Button variant="secondary" onClick={() => onReject(item.id)}>Needs work / reject</Button></div></div>) : <p className="text-sm text-slate-500">{empty}</p>}</div></div>;
}

function ItemStack({ items }: { items: Array<{ id: string; title: string; detail: string; onEdit: () => void; onDelete: () => void }> }) {
  return <div className="space-y-2">{items.length ? items.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{item.title}</p><p className="mt-1 text-xs text-slate-400">{item.detail}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={item.onEdit}>Edit</Button><Button variant="secondary" className={cn("text-red-200")} onClick={item.onDelete}><Trash2 className="size-4" /></Button></div></div>) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Nothing created yet.</p>}</div>;
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
