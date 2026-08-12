"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, CheckCircle2, Megaphone, Send, ShieldCheck, Sparkles, Star, Trash2, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type EngagementData = {
  settings: Record<string, any>;
  courses: Array<{ id: string; title: string; status: string }>;
  metrics: Record<string, number>;
  profiles: Array<{ id: string; learnerId: string; communityOptIn: boolean; ambassadorOptIn: boolean; directoryOptIn: boolean; spotlightConsent: boolean; publicVisibility: string; spotlightStatus?: string; sharedPostConfirmed?: boolean; learner?: { name?: string | null; email?: string | null } | null }>;
  testimonials: Array<{ id: string; title: string; body: string; rating?: number | null; status: string; publicConsent: boolean; learner?: { name?: string | null; email?: string | null } | null; course?: { title: string } | null; createdAt: string }>;
  challenges: Array<{ id: string; title: string; instructions: string; rewardLabel?: string | null; status: string; courseId?: string | null; course?: { title: string } | null; startsAt?: string | null; endsAt?: string | null; submissions: number }>;
  challengeSubmissions: Array<{ id: string; evidence: string; status: string; learner?: { name?: string | null; email?: string | null } | null; challenge?: { title: string } | null; submittedAt: string }>;
  officeHours: Array<{ id: string; title: string; description?: string | null; startsAt: string; link?: string | null; capacity?: number | null; active: boolean; courseId?: string | null; course?: { title: string } | null; rsvps: number }>;
  referrals: Array<{ id: string; referralCode: string; status: string; referredName?: string | null; referredEmail?: string | null; referrer?: { name?: string | null; email?: string | null } | null; course?: { title: string } | null; createdAt: string }>;
  moduleFeedback: Array<{ id: string; learnerId: string; courseId: string; moduleId: string; question: string; response: string; status: string; createdAt: string; learner?: { name?: string | null; email?: string | null } | null; course?: { title: string } | null }>;
  automationRules: Array<{ key: string; label: string; trigger: string; message: string; enabled: boolean }>;
  qaChecklist: Array<{ key: string; label: string; status: string; detail: string }>;
  engagementScores: Array<{ learnerId: string; score: number; detail: string[]; learner?: { name?: string | null; email?: string | null } | null }>;
  learnerTimelines: Array<{ learnerId: string; learner?: { name?: string | null; email?: string | null } | null; events: Array<{ id: string; type: string; title: string; detail: string; createdAt: string }> }>;
  notificationHistory: Array<{ id: string; userId: string; eventType: string; channel: string; subject: string; body: string; status: string; createdAt: string; sentAt?: string | null; deliveryLabel?: string; learner?: { name?: string | null; email?: string | null } | null }>;
  reporting: {
    engagementRate: number;
    referralConversionRate: number;
    testimonialApprovalRate: number;
    challengeApprovalRate: number;
    rsvpRate: number;
    pendingWork: number;
    stageCounts: { notStarted: number; started: number; halfway: number; nearlyComplete: number; completed: number };
    recentActivity: Array<{ id: string; type: string; title: string; status: string; createdAt: string }>;
  };
};

const defaultChallenge = { title: "", instructions: "", rewardLabel: "", status: "DRAFT", courseId: "", startsAt: "", endsAt: "" };
const defaultOfficeHour = { title: "", description: "", startsAt: "", link: "", capacity: "", courseId: "", active: true };

export function AcademyEngagementCentre() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, any>>({});
  const [challengeDraft, setChallengeDraft] = useState(defaultChallenge);
  const [officeDraft, setOfficeDraft] = useState(defaultOfficeHour);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const result = await apiFetch<EngagementData>("/api/v1/admin/academy/engagement", { cache: "no-store" });
    if (result.data) {
      setData(result.data);
      setSettingsDraft(result.data.settings);
      return;
    }
    setLoadError(result.error?.message ?? "Academy engagement data could not be loaded.");
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
    return (
      <div className="min-h-[320px] rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-slate-300 sm:p-8">
        {loadError ? (
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Engagement Centre needs attention</p>
            <h2 className="mt-2 text-2xl font-black text-white">The engagement dashboard could not load</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{loadError}</p>
            <Button className="mt-5" onClick={() => void load()}>Retry loading engagement centre</Button>
          </div>
        ) : "Loading Engagement Centre..."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/30 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Academy Engagement Centre</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white">Community, referrals, testimonials and learner success</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Engagement is optional and separate from course access, assessments, progress and certificates. Admin controls what is visible and moderates every public-facing learner submission.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href="/api/v1/admin/academy/engagement?format=csv" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-50">
              Export CSV
            </a>
            <Button variant="secondary" disabled={busy} onClick={() => action({ action: "send_journey_playbook_nudges" }, "Journey playbook nudges sent to eligible learners.")}>Send journey nudges</Button>
            <Button variant="secondary" disabled={busy} onClick={() => action({ action: "send_progress_nudges" }, "Progress nudges sent to eligible learners.")}>Send progress nudges</Button>
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

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Engagement Reporting" icon={TrendingUp}>
          <div className="grid gap-3 sm:grid-cols-2">
            <RateBar label="Learner engagement rate" value={data.reporting.engagementRate} />
            <RateBar label="Referral conversion" value={data.reporting.referralConversionRate} />
            <RateBar label="Testimonial approval" value={data.reporting.testimonialApprovalRate} />
            <RateBar label="Challenge approval" value={data.reporting.challengeApprovalRate} />
            <RateBar label="Office-hours RSVP rate" value={data.reporting.rsvpRate} />
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">Pending admin work</p>
              <p className="mt-3 text-3xl font-black text-white">{data.reporting.pendingWork}</p>
              <p className="mt-1 text-sm text-amber-100/80">Testimonials, challenges, feedback, and spotlights awaiting review.</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-sm font-black text-white">Learner journey stage distribution</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">Calculated from real active enrolments, approved learner applications, and course progress records.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StageCard label="Not started" value={data.reporting.stageCounts.notStarted} tone="warning" />
              <StageCard label="Started" value={data.reporting.stageCounts.started} />
              <StageCard label="Halfway" value={data.reporting.stageCounts.halfway} />
              <StageCard label="Nearly complete" value={data.reporting.stageCounts.nearlyComplete} tone="success" />
              <StageCard label="Completed" value={data.reporting.stageCounts.completed} tone="success" />
            </div>
          </div>
        </Panel>
        <Panel title="Recent Engagement Activity" icon={Activity}>
          <MiniList title="Latest records" empty="No engagement activity yet." rows={data.reporting.recentActivity.map((item) => ({
            id: item.id,
            title: `${item.type} - ${item.status}`,
            detail: `${item.title} - ${formatDateTime(item.createdAt)}`,
          }))} />
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-sm font-black text-white">Automated learner communications</p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">Moderation decisions notify learners automatically. Office-hours announcements are sent once per event, and progress nudges can be sent manually without duplicating previous 25%, 50%, or 80% reminders.</p>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Automation Rules And QA" icon={CheckCircle2}>
          <div className="grid gap-3">
            {data.automationRules.map((rule) => (
              <div key={rule.key} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-black text-white">{rule.label}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{rule.trigger}</p>
                  </div>
                  <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-black uppercase", rule.enabled ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-800 text-slate-400")}>{rule.enabled ? "Enabled" : "Off"}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{rule.message}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
            <h4 className="text-sm font-black text-white">Engagement QA checklist</h4>
            <div className="mt-3 grid gap-2">
              {data.qaChecklist.map((item) => (
                <div key={item.key} className="rounded-xl bg-slate-950 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-semibold text-white">{item.label}</p>
                    <span className={cn("w-fit rounded-full px-2 py-1 text-[11px] font-black uppercase", checklistTone(item.status))}>{item.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Learner Timeline And Scores" icon={Users}>
          <div className="grid gap-3 lg:grid-cols-2">
            <MiniList title="Top engagement scores" empty="No engagement scores yet." rows={data.engagementScores.slice(0, 8).map((row) => ({
              id: row.learnerId,
              title: row.learner?.name ?? row.learner?.email ?? row.learnerId,
              detail: `${row.score}/100 - ${row.detail.join(", ")}`,
            }))} />
            <NotificationHistoryList notifications={data.notificationHistory.slice(0, 8)} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
            <h4 className="text-sm font-black text-white">Recent learner timelines</h4>
            <div className="mt-3 grid gap-3">
              {data.learnerTimelines.length ? data.learnerTimelines.slice(0, 6).map((timeline) => (
                <div key={timeline.learnerId} className="rounded-xl bg-slate-950 p-3">
                  <p className="font-semibold text-white">{timeline.learner?.name ?? timeline.learner?.email ?? timeline.learnerId}</p>
                  <div className="mt-3 space-y-2">
                    {timeline.events.slice(0, 4).map((event) => (
                      <div key={event.id} className="border-l border-emerald-400/40 pl-3">
                        <p className="text-sm font-bold text-slate-100">{event.type}: {event.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{event.detail} - {formatDateTime(event.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">No learner journey events yet.</p>}
            </div>
          </div>
        </Panel>
      </section>

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
              ["spotlightEnabled", "Learner spotlight"],
              ["challengesEnabled", "Practical challenges"],
              ["officeHoursEnabled", "Office hours"],
              ["moduleFeedbackEnabled", "Module feedback"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-100">
                {label}
                <input type="checkbox" checked={Boolean(settingsDraft[key])} onChange={(event) => setSettingsDraft({ ...settingsDraft, [key]: event.target.checked })} />
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <Field label="Community name" help="Shown as the learner Engagement Hub heading." value={settingsDraft.communityName ?? ""} onChange={(communityName) => setSettingsDraft({ ...settingsDraft, communityName })} />
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-sm font-black text-white">Community and sharing destinations</p>
              <p className="mt-1 text-sm leading-6 text-emerald-100/80">These links are what learners see in the Engage tab. Leave any network blank to hide it.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="WhatsApp group invite URL" help="Adds the Join WhatsApp group button for learners." value={settingsDraft.whatsappUrl ?? ""} onChange={(whatsappUrl) => setSettingsDraft({ ...settingsDraft, whatsappUrl })} />
                <Field label="WhatsApp channel URL" help="Adds the WhatsApp channel button when saved." value={settingsDraft.whatsappChannelUrl ?? ""} onChange={(whatsappChannelUrl) => setSettingsDraft({ ...settingsDraft, whatsappChannelUrl })} />
                <Field label="Facebook page/group URL" help="Adds the Facebook community button when saved." value={settingsDraft.facebookPageUrl ?? ""} onChange={(facebookPageUrl) => setSettingsDraft({ ...settingsDraft, facebookPageUrl })} />
                <Field label="LinkedIn page URL" help="Adds the LinkedIn community button when saved." value={settingsDraft.linkedinPageUrl ?? ""} onChange={(linkedinPageUrl) => setSettingsDraft({ ...settingsDraft, linkedinPageUrl })} />
              </div>
            </div>
            <Textarea label="Learner invitation" help="Short introduction displayed at the top of the learner Engage tab." value={settingsDraft.invitation ?? ""} onChange={(invitation) => setSettingsDraft({ ...settingsDraft, invitation })} />
            <Textarea label="Share prompt" help="Copied into the learner's share message. Their referral link/code is appended automatically." value={settingsDraft.sharePrompt ?? ""} onChange={(sharePrompt) => setSettingsDraft({ ...settingsDraft, sharePrompt })} />
            <Field label="Referral reward label" help="Leave blank if there is no reward. This is visible to learners." value={settingsDraft.referralRewardLabel ?? ""} onChange={(referralRewardLabel) => setSettingsDraft({ ...settingsDraft, referralRewardLabel })} />
            <Textarea label="Campaign schedule" help="Internal admin reminder copy. This is not shown as a learner calendar unless you also add themes below." value={settingsDraft.campaignSchedule ?? ""} onChange={(campaignSchedule) => setSettingsDraft({ ...settingsDraft, campaignSchedule })} />
            <Textarea label="Community calendar themes" help="One learner-facing item per line. Leave blank to hide the Community calendar card." value={settingsDraft.weeklyThemes ?? ""} onChange={(weeklyThemes) => setSettingsDraft({ ...settingsDraft, weeklyThemes })} />
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <p className="text-sm font-black text-white">Journey playbook messages</p>
              <p className="mt-1 text-sm leading-6 text-cyan-100/80">These are admin-managed notification bodies used by Send journey nudges. Keep them practical and action-focused.</p>
              <div className="mt-4 grid gap-3">
                <Textarea label="Lesson 1 start playbook" help="Sent once to learners with active access but no course progress yet." value={settingsDraft.lessonOnePlaybook ?? ""} onChange={(lessonOnePlaybook) => setSettingsDraft({ ...settingsDraft, lessonOnePlaybook })} />
                <Textarea label="Progress playbook" help="Sent once per learner/course stage while the learner is progressing." value={settingsDraft.progressPlaybook ?? ""} onChange={(progressPlaybook) => setSettingsDraft({ ...settingsDraft, progressPlaybook })} />
                <Textarea label="Completion playbook" help="Sent once after completion to encourage review, directory opt-in, or referral sharing." value={settingsDraft.completionPlaybook ?? ""} onChange={(completionPlaybook) => setSettingsDraft({ ...settingsDraft, completionPlaybook })} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Consent And Moderation" icon={ShieldCheck}>
          <div className="grid gap-3 md:grid-cols-2">
            <MiniList title="Learner opt-ins" empty="No learner opt-ins yet." rows={data.profiles.slice(0, 8).map((profile) => ({
              id: profile.id,
              title: profile.learner?.name ?? profile.learner?.email ?? profile.learnerId,
              detail: [profile.communityOptIn && "Community", profile.ambassadorOptIn && "Ambassador", profile.directoryOptIn && "Directory", profile.spotlightConsent && `Spotlight ${profile.spotlightStatus ?? ""}`, profile.sharedPostConfirmed && "Shared post confirmed"].filter(Boolean).join(" / ") || "No active consent",
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
          <ModerationList
            title="Module feedback"
            empty="No learner module feedback yet."
            items={data.moduleFeedback.slice(0, 8).map((item) => ({ id: item.id, title: item.course?.title ?? "Course feedback", detail: `${item.learner?.name ?? item.learner?.email ?? "Learner"} - ${item.status}`, body: item.response }))}
            approveLabel="Mark reviewed"
            rejectLabel="Archive"
            onApprove={(id) => action({ action: "moderate_module_feedback", feedbackId: id, status: "REVIEWED" }, "Feedback marked reviewed.")}
            onReject={(id) => action({ action: "moderate_module_feedback", feedbackId: id, status: "ARCHIVED" }, "Feedback archived.")}
          />
          <ModerationList
            title="Learner spotlights"
            empty="No spotlight permissions waiting for review."
            items={data.profiles.filter((profile) => profile.spotlightConsent && profile.spotlightStatus === "PENDING").map((profile) => ({
              id: profile.id,
              title: profile.learner?.name ?? profile.learner?.email ?? "Learner",
              detail: profile.publicVisibility,
              body: "Learner has given optional permission to be considered for a graduate spotlight.",
            }))}
            approveLabel="Approve spotlight"
            rejectLabel="Reject"
            onApprove={(id) => action({ action: "moderate_spotlight", profileId: id, status: "APPROVED" }, "Spotlight approved.")}
            onReject={(id) => action({ action: "moderate_spotlight", profileId: id, status: "REJECTED" }, "Spotlight rejected.")}
          />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Practical Challenges" icon={Sparkles}>
          <EngagementForm>
            <Field label="Challenge title" help="Shown on the learner Engage tab only when this challenge is published." value={challengeDraft.title} onChange={(title) => setChallengeDraft({ ...challengeDraft, title })} />
            <Textarea label="Learner instructions" help="Tell learners exactly what evidence, link, or written summary to submit." value={challengeDraft.instructions} onChange={(instructions) => setChallengeDraft({ ...challengeDraft, instructions })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Course" value={challengeDraft.courseId} options={[{ value: "", label: "All enrolled learners" }, ...data.courses.map((course) => ({ value: course.id, label: course.title }))]} onChange={(courseId) => setChallengeDraft({ ...challengeDraft, courseId })} />
              <Select label="Status" value={challengeDraft.status} options={["DRAFT", "PUBLISHED", "ARCHIVED"].map((status) => ({ value: status, label: status }))} onChange={(status) => setChallengeDraft({ ...challengeDraft, status })} />
              <Field label="Reward label" help="Optional learner-facing recognition text." value={challengeDraft.rewardLabel} onChange={(rewardLabel) => setChallengeDraft({ ...challengeDraft, rewardLabel })} />
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
            <Field label="Event title" help="Shown on the learner Engage tab and notification." value={officeDraft.title} onChange={(title) => setOfficeDraft({ ...officeDraft, title })} />
            <Textarea label="Description / reminder copy" help="Use this for what learners should bring, prepare, or ask." value={officeDraft.description} onChange={(description) => setOfficeDraft({ ...officeDraft, description })} />
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
  return <div className="rounded-2xl border border-white/10 bg-slate-950 p-4"><Icon className="size-5 text-emerald-300" /><p className="mt-4 text-2xl font-black text-white">{value}</p><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 sm:tracking-[0.16em]">{label}</p></div>;
}

function RateBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-100">{label}</p>
        <p className="text-sm font-black text-emerald-300">{value}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function StageCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" | "success" }) {
  return (
    <div className={cn(
      "rounded-2xl border p-4",
      tone === "warning"
        ? "border-amber-400/20 bg-amber-400/10"
        : tone === "success"
          ? "border-emerald-400/20 bg-emerald-400/10"
          : "border-white/10 bg-slate-950/70",
    )}>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
    </div>
  );
}

function checklistTone(status: string) {
  if (status === "READY" || status === "EMPTY_OK") return "bg-emerald-400/10 text-emerald-200";
  if (status === "OFF") return "bg-slate-800 text-slate-400";
  if (status === "NEEDS_REVIEW") return "bg-amber-400/10 text-amber-200";
  return "bg-red-400/10 text-red-200";
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-xl shadow-black/20"><div className="mb-4 flex items-center gap-2"><Icon className="size-5 shrink-0 text-emerald-300" /><h3 className="min-w-0 text-lg font-black leading-tight text-white">{title}</h3></div>{children}</section>;
}

function Field({ label, value, onChange, type = "text", help }: { label: string; value: string; onChange: (value: string) => void; type?: string; help?: string }) {
  return <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-400" />{help && <span className="mt-1 block text-xs normal-case leading-5 tracking-normal text-slate-500">{help}</span>}</label>;
}

function Textarea({ label, value, onChange, help }: { label: string; value: string; onChange: (value: string) => void; help?: string }) {
  return <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}<textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-400" />{help && <span className="mt-1 block text-xs normal-case leading-5 tracking-normal text-slate-500">{help}</span>}</label>;
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

function NotificationHistoryList({
  notifications,
}: {
  notifications: EngagementData["notificationHistory"];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
      <h4 className="text-sm font-black text-white">Notification history</h4>
      <p className="mt-1 text-xs leading-5 text-slate-500">Shows records created by the Academy system. In-app delivery means the learner can see it in their notification centre; external delivery receipts require a connected sender.</p>
      <div className="mt-3 space-y-2">
        {notifications.length ? notifications.map((item) => (
          <div key={item.id} className="rounded-xl bg-slate-950 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-white">{item.learner?.name ?? item.learner?.email ?? item.userId}</p>
                <p className="mt-1 break-words text-xs text-slate-400">{item.subject}</p>
              </div>
              <span className={cn("w-fit rounded-full px-2 py-1 text-[11px] font-black uppercase", notificationTone(item.status))}>{item.status}</span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
              <p><span className="font-bold text-slate-300">Channel:</span> {item.channel}</p>
              <p><span className="font-bold text-slate-300">Created:</span> {formatDateTime(item.createdAt)}</p>
              <p><span className="font-bold text-slate-300">Sent:</span> {item.sentAt ? formatDateTime(item.sentAt) : "Not marked sent"}</p>
              <p><span className="font-bold text-slate-300">Delivery:</span> {item.deliveryLabel ?? "Unknown"}</p>
            </div>
          </div>
        )) : <p className="text-sm text-slate-500">No Academy notifications yet.</p>}
      </div>
    </div>
  );
}

function notificationTone(status: string) {
  if (status === "DELIVERED" || status === "SENT") return "bg-emerald-400/10 text-emerald-200";
  if (status === "FAILED") return "bg-red-400/10 text-red-200";
  return "bg-amber-400/10 text-amber-200";
}

function ModerationList({ title, empty, items, approveLabel = "Approve", rejectLabel = "Needs work / reject", onApprove, onReject }: { title: string; empty: string; items: Array<{ id: string; title: string; detail: string; body: string }>; approveLabel?: string; rejectLabel?: string; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-3"><h4 className="text-sm font-black text-white">{title}</h4><div className="mt-3 space-y-2">{items.length ? items.map((item) => <div key={item.id} className="rounded-xl bg-slate-950 p-3"><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-slate-400">{item.detail}</p><p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button onClick={() => onApprove(item.id)}><CheckCircle2 className="size-4" /> {approveLabel}</Button><Button variant="secondary" onClick={() => onReject(item.id)}>{rejectLabel}</Button></div></div>) : <p className="text-sm text-slate-500">{empty}</p>}</div></div>;
}

function ItemStack({ items }: { items: Array<{ id: string; title: string; detail: string; onEdit: () => void; onDelete: () => void }> }) {
  return <div className="space-y-2">{items.length ? items.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{item.title}</p><p className="mt-1 break-words text-xs leading-5 text-slate-400">{item.detail}</p></div><div className="grid grid-cols-[1fr_auto] gap-2 sm:flex"><Button className="w-full sm:w-auto" variant="secondary" onClick={item.onEdit}>Edit</Button><Button variant="secondary" className={cn("text-red-200")} onClick={item.onDelete}><Trash2 className="size-4" /></Button></div></div>) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Nothing created yet.</p>}</div>;
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
