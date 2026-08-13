"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, CheckCircle2, MessageSquareText, Megaphone, Send, ShieldCheck, Sparkles, Star, Trash2, TrendingUp, Users } from "lucide-react";
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
  moduleFeedback: Array<{ id: string; learnerId: string; courseId: string; moduleId: string; lessonId?: string | null; question: string; response: string; status: string; adminNote?: string | null; reviewedAt?: string | null; archivedAt?: string | null; createdAt: string; learner?: { name?: string | null; email?: string | null } | null; course?: { title: string } | null; module?: { title: string; sortOrder?: number | null } | null; lesson?: { title: string; sortOrder?: number | null } | null }>;
  automationRules: Array<{ key: string; label: string; trigger: string; message: string; enabled: boolean }>;
  qaChecklist: Array<{ key: string; label: string; status: string; detail: string }>;
  engagementScores: Array<{ learnerId: string; score: number; detail: string[]; learner?: { name?: string | null; email?: string | null } | null }>;
  learnerTimelines: Array<{ learnerId: string; learner?: { name?: string | null; email?: string | null } | null; events: Array<{ id: string; type: string; title: string; detail: string; createdAt: string }> }>;
  notificationHistory: Array<{ id: string; userId: string; eventType: string; channel: string; subject: string; body: string; status: string; displayStatus?: string; createdAt: string; sentAt?: string | null; deliveryLabel?: string; category?: string; cooldownLabel?: string; nextEligibleAt?: string | null; receipt?: { readAt?: string | null; clickedAt?: string | null; dismissedAt?: string | null } | null; learner?: { name?: string | null; email?: string | null } | null }>;
  deliverySummary?: { total: number; visibleInApp: number; waiting: number; failed: number; read: number; actionRecorded: number };
  deliveryIntegrations?: Array<{ channel: string; label: string; connected: boolean; receiptSupport: string; adminAction: string }>;
  storageHealth?: Array<{ table: string; status: string; message: string }>;
  diagnostics?: Array<{ section: string; status: string; message: string }>;
  reporting: {
    engagementRate: number;
    referralConversionRate: number;
    testimonialApprovalRate: number;
    challengeApprovalRate: number;
    rsvpRate: number;
    pendingWork: number;
    stageCounts: { notStarted: number; started: number; halfway: number; nearlyComplete: number; completed: number };
    recentActivity: Array<{ id: string; type: string; title: string; status: string; createdAt: string; actor?: string | null; context?: string | null; preview?: string | null }>;
  };
};

type SelectedLearnerEngagement = {
  timeline: EngagementData["learnerTimelines"][number] | null;
  score: EngagementData["engagementScores"][number] | null;
  profile: EngagementData["profiles"][number] | null;
  notifications: EngagementData["notificationHistory"];
};

type EngagementSection = "overview" | "messaging" | "settings" | "moderation" | "feedback" | "programmes" | "learners" | "health";

const ENGAGEMENT_SECTIONS: Array<{
  id: EngagementSection;
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  { id: "overview", label: "Overview", description: "Metrics and latest work", icon: TrendingUp },
  { id: "messaging", label: "Messaging", description: "Nudges and receipts", icon: Send },
  { id: "settings", label: "Community Settings", description: "Links, prompts, switches", icon: Megaphone },
  { id: "moderation", label: "Moderation", description: "Reviews and consent", icon: ShieldCheck },
  { id: "feedback", label: "Module Feedback", description: "Course improvement inbox", icon: MessageSquareText },
  { id: "programmes", label: "Challenges & Office Hours", description: "Events and tasks", icon: Sparkles },
  { id: "learners", label: "Learner Insights", description: "Timelines and scores", icon: Users },
  { id: "health", label: "System Health", description: "Storage and delivery", icon: Activity },
];

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
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [section, setSection] = useState<EngagementSection>("overview");
  const [filters, setFilters] = useState({ query: "", course: "", stage: "", delivery: "" });

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
  const moduleFeedbackCounts = useMemo(() => {
    const rows = data?.moduleFeedback ?? [];
    return {
      all: rows.length,
      new: rows.filter((item) => item.status === "NEW").length,
      reviewed: rows.filter((item) => item.status === "REVIEWED").length,
      archived: rows.filter((item) => item.status === "ARCHIVED").length,
    };
  }, [data]);
  const filteredLearnerTimelines = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return (data?.learnerTimelines ?? []).filter((timeline) => {
      const learnerText = `${timeline.learner?.name ?? ""} ${timeline.learner?.email ?? ""} ${timeline.learnerId}`.toLowerCase();
      const eventText = timeline.events.map((event) => `${event.title} ${event.detail} ${event.type}`).join(" ").toLowerCase();
      if (query && !`${learnerText} ${eventText}`.includes(query)) return false;
      if (filters.course && !eventText.includes((data?.courses.find((course) => course.id === filters.course)?.title ?? filters.course).toLowerCase())) return false;
      if (filters.stage && !timeline.events.some((event) => event.type.toLowerCase().includes(filters.stage.toLowerCase()) || event.title.toLowerCase().includes(filters.stage.toLowerCase()))) return false;
      return true;
    });
  }, [data, filters]);
  const filteredScores = useMemo(() => {
    const ids = new Set(filteredLearnerTimelines.map((row) => row.learnerId));
    const query = filters.query.trim().toLowerCase();
    return (data?.engagementScores ?? []).filter((row) => {
      if (ids.size && !ids.has(row.learnerId)) return false;
      if (!query) return true;
      return `${row.learner?.name ?? ""} ${row.learner?.email ?? ""} ${row.learnerId} ${row.detail.join(" ")}`.toLowerCase().includes(query);
    });
  }, [data, filteredLearnerTimelines, filters.query]);
  const filteredNotifications = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return (data?.notificationHistory ?? []).filter((item) => {
      if (filters.delivery && item.status !== filters.delivery) return false;
      const text = `${item.learner?.name ?? ""} ${item.learner?.email ?? ""} ${item.subject} ${item.body} ${item.category ?? ""} ${item.eventType}`.toLowerCase();
      return !query || text.includes(query);
    });
  }, [data, filters.delivery, filters.query]);
  const selectedLearner = useMemo(() => {
    if (!selectedLearnerId || !data) return null;
    return {
      timeline: data.learnerTimelines.find((row) => row.learnerId === selectedLearnerId) ?? null,
      score: data.engagementScores.find((row) => row.learnerId === selectedLearnerId) ?? null,
      profile: data.profiles.find((row) => row.learnerId === selectedLearnerId) ?? null,
      notifications: data.notificationHistory.filter((row) => row.userId === selectedLearnerId),
      referrals: data.referrals.filter((row) => row.referrer?.email === data.learnerTimelines.find((item) => item.learnerId === selectedLearnerId)?.learner?.email),
      testimonials: data.testimonials.filter((row) => row.learner?.email === data.learnerTimelines.find((item) => item.learnerId === selectedLearnerId)?.learner?.email),
      challengeSubmissions: data.challengeSubmissions.filter((row) => row.learner?.email === data.learnerTimelines.find((item) => item.learnerId === selectedLearnerId)?.learner?.email),
    };
  }, [data, selectedLearnerId]);

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
      <section className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] shadow-2xl shadow-black/20">
        <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-end">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Academy Engagement Centre</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">Community, referrals, testimonials and learner success</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Manage the optional learner journey after enrolment: community channels, nudges, reviews, graduate visibility, referrals, challenges, and office hours.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill label="Public sharing" value="Consent based" tone="success" />
              <StatusPill label="Delivery truth" value="In-app, email, WhatsApp tracked" tone="info" />
              <StatusPill label="Course access" value="Separate from gates" tone="default" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <p className="px-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Admin actions</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <a href="/api/v1/admin/academy/engagement?format=csv" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-50">
                Export CSV
              </a>
              <Button variant="secondary" disabled={busy} onClick={() => action({ action: "run_engagement_scheduler" }, "Engagement scheduler ran for eligible learners.")}>Run scheduler</Button>
              <Button variant="secondary" disabled={busy} onClick={() => action({ action: "send_journey_playbook_nudges" }, "Journey playbook nudges sent to eligible learners.")}>Journey nudges</Button>
              <Button variant="secondary" disabled={busy} onClick={() => action({ action: "send_progress_nudges" }, "Progress nudges sent to eligible learners.")}>Progress nudges</Button>
              <Button className="sm:col-span-2" disabled={busy} onClick={() => action({ action: "update_settings", settings: settingsDraft }, "Engagement settings saved.")}>Save engagement settings</Button>
            </div>
          </div>
        </div>
        {message && <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">{message}</p>}
      </section>

      <EngagementSectionNav active={section} onChange={setSection} />

      {section === "overview" && (
        <>
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
                <p className="text-sm font-black text-white">Overall course progress distribution</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Calculated from active learner-course access, course progress records, and lesson activity. This is different from the Lesson 1 activation queue, which only checks whether the first lesson was opened.
                </p>
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
                detail: [item.actor, item.context || item.title, formatDateTime(item.createdAt)].filter(Boolean).join(" - "),
                body: item.preview,
              }))} />
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm font-black text-white">Automated learner communications</p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/80">Moderation decisions notify learners automatically. Office-hours announcements are sent once per event, and progress nudges can be sent manually without duplicating previous 25%, 50%, or 80% reminders.</p>
              </div>
            </Panel>
          </section>
        </>
      )}

      {section === "health" && (
        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <Panel title="Diagnostics and delivery" icon={ShieldCheck}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <DeliveryMetric label="Total Academy messages" value={data.deliverySummary?.total ?? 0} tone="default" />
            <DeliveryMetric label="Visible in app" value={data.deliverySummary?.visibleInApp ?? 0} tone="success" />
            <DeliveryMetric label="Read by learners" value={data.deliverySummary?.read ?? 0} tone="success" />
            <DeliveryMetric label="Waiting" value={data.deliverySummary?.waiting ?? 0} tone="warning" />
            <DeliveryMetric label="Failed" value={data.deliverySummary?.failed ?? 0} tone="danger" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">Production storage check</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Real tables required by the engagement system.</p>
                </div>
                <StatusBadge
                  label={(data.storageHealth ?? []).every((item) => item.status === "READY") ? "Ready" : "Review"}
                  tone={(data.storageHealth ?? []).every((item) => item.status === "READY") ? "success" : "warning"}
                />
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">These are the real database tables the engagement system needs. Missing items are shown here instead of causing a blank page.</p>
              <div className="mt-3 space-y-2">
                {(data.storageHealth ?? []).map((item) => (
                  <div key={item.table} className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-slate-950 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-words text-xs font-bold text-slate-200">{item.table}</span>
                    <StatusBadge label={item.status} tone={item.status === "READY" ? "success" : "danger"} />
                  </div>
                ))}
                {!data.storageHealth?.length && <p className="text-sm text-slate-500">Storage health has not reported any issues.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">Delivery integrations</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Only real configured senders are marked connected.</p>
                </div>
                <StatusBadge
                  label={`${(data.deliveryIntegrations ?? []).filter((item) => item.connected).length}/${data.deliveryIntegrations?.length ?? 0}`}
                  tone="info"
                />
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">No fake external delivery is shown. Email and WhatsApp are only marked connected when provider configuration exists.</p>
              <div className="mt-3 space-y-2">
                {(data.deliveryIntegrations ?? []).map((item) => (
                  <div key={item.channel} className="rounded-xl border border-white/[0.06] bg-slate-950 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-white">{item.label}</p>
                      <StatusBadge label={item.connected ? "Connected" : "Setup needed"} tone={item.connected ? "success" : "warning"} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{item.receiptSupport}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.adminAction}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {data.diagnostics?.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="text-sm font-black text-white">Items needing attention</p>
              <div className="mt-3 grid gap-2">
                {data.diagnostics.map((item, index) => (
                  <p key={`${item.section}-${index}`} className="rounded-xl bg-slate-950/70 p-3 text-xs leading-5 text-amber-100"><span className="font-black">{item.section}:</span> {item.message}</p>
                ))}
              </div>
            </div>
          ) : null}
          </Panel>

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
        </section>
      )}

      {section === "messaging" && (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Panel title="Messaging Filters" icon={Activity}>
            <AdminEngagementFilters data={data} filters={filters} setFilters={setFilters} />
          </Panel>
          <Panel title="Notification Delivery Ledger" icon={Send}>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <DeliveryMetric label="Total messages" value={data.deliverySummary?.total ?? 0} tone="default" />
              <DeliveryMetric label="Visible in app" value={data.deliverySummary?.visibleInApp ?? 0} tone="success" />
              <DeliveryMetric label="Read" value={data.deliverySummary?.read ?? 0} tone="success" />
              <DeliveryMetric label="Waiting" value={data.deliverySummary?.waiting ?? 0} tone="warning" />
              <DeliveryMetric label="Failed" value={data.deliverySummary?.failed ?? 0} tone="danger" />
            </div>
            <NotificationHistoryList notifications={filteredNotifications.slice(0, 20)} onOpen={setSelectedLearnerId} />
          </Panel>
        </section>
      )}

      {section === "learners" && (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Panel title="Learner Filters" icon={Activity}>
            <AdminEngagementFilters data={data} filters={filters} setFilters={setFilters} />
          </Panel>
          <Panel title="Learner Timeline And Scores" icon={Users}>
            <div className="grid gap-3 lg:grid-cols-2">
              <ScoreList rows={filteredScores.slice(0, 12)} onOpen={setSelectedLearnerId} />
              <NotificationHistoryList notifications={filteredNotifications.slice(0, 12)} onOpen={setSelectedLearnerId} />
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
              <h4 className="text-sm font-black text-white">Recent learner timelines</h4>
              <div className="mt-3 grid gap-3">
                {filteredLearnerTimelines.length ? filteredLearnerTimelines.slice(0, 10).map((timeline) => (
                  <div key={timeline.learnerId} className="rounded-xl bg-slate-950 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-white">{timeline.learner?.name ?? timeline.learner?.email ?? timeline.learnerId}</p>
                      <Button variant="secondary" onClick={() => setSelectedLearnerId(timeline.learnerId)}>Details</Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {timeline.events.slice(0, 4).map((event) => (
                        <div key={event.id} className="border-l border-emerald-400/40 pl-3">
                          <p className="text-sm font-bold text-slate-100">{event.type}: {event.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{event.detail} - {formatDateTime(event.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : <p className="text-sm text-slate-500">No learner journey events match these filters.</p>}
              </div>
            </div>
          </Panel>
        </section>
      )}

      {section === "settings" && (
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
      )}

      {section === "moderation" && (
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
      )}

      {section === "feedback" && (
        <ModuleFeedbackManager
          feedback={data.moduleFeedback}
          counts={moduleFeedbackCounts}
          busy={busy}
          onModerate={(feedbackId, status, adminNote) => action(
            { action: "moderate_module_feedback", feedbackId, status, adminNote },
            status === "ARCHIVED" ? "Feedback archived." : "Feedback marked reviewed.",
          )}
        />
      )}

      {section === "programmes" && (
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
      )}
      {selectedLearner && (
        <LearnerEngagementDrawer
          learner={selectedLearner}
          onClose={() => setSelectedLearnerId(null)}
        />
      )}
    </div>
  );
}

function EngagementSectionNav({ active, onChange }: { active: EngagementSection; onChange: (section: EngagementSection) => void }) {
  return (
    <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7" aria-label="Engagement centre sections">
      {ENGAGEMENT_SECTIONS.map((item) => {
        const Icon = item.icon;
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "group min-h-[92px] rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-300",
              selected
                ? "border-emerald-300/50 bg-emerald-400/15 shadow-lg shadow-emerald-950/30"
                : "border-white/10 bg-slate-950/90 hover:border-emerald-300/30 hover:bg-slate-900",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <Icon className={cn("size-5 shrink-0", selected ? "text-emerald-200" : "text-slate-400 group-hover:text-emerald-300")} />
              {selected && <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">Open</span>}
            </div>
            <p className="mt-3 text-sm font-black leading-tight text-white">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
          </button>
        );
      })}
    </nav>
  );
}

function AdminEngagementFilters({
  data,
  filters,
  setFilters,
}: {
  data: EngagementData;
  filters: { query: string; course: string; stage: string; delivery: string };
  setFilters: (filters: { query: string; course: string; stage: string; delivery: string }) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Search learner, message, or event" value={filters.query} onChange={(query) => setFilters({ ...filters, query })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Course" value={filters.course} options={[{ value: "", label: "All courses" }, ...data.courses.map((course) => ({ value: course.id, label: course.title }))]} onChange={(course) => setFilters({ ...filters, course })} />
        <Select label="Journey signal" value={filters.stage} options={["", "Progress", "Notification", "Referral", "Certificate", "Challenge", "Office hours", "Feedback"].map((value) => ({ value, label: value || "All signals" }))} onChange={(stage) => setFilters({ ...filters, stage })} />
        <Select label="Notification state" value={filters.delivery} options={["", "DELIVERED", "SENT", "QUEUED", "FAILED", "SKIPPED"].map((value) => ({ value, label: value || "All states" }))} onChange={(delivery) => setFilters({ ...filters, delivery })} />
      </div>
      <Button variant="secondary" onClick={() => setFilters({ query: "", course: "", stage: "", delivery: "" })}>Clear filters</Button>
    </div>
  );
}

function ModuleFeedbackManager({
  feedback,
  counts,
  busy,
  onModerate,
}: {
  feedback: EngagementData["moduleFeedback"];
  counts: { all: number; new: number; reviewed: number; archived: number };
  busy: boolean;
  onModerate: (feedbackId: string, status: "REVIEWED" | "ARCHIVED", adminNote: string) => void;
}) {
  const [status, setStatus] = useState<"NEW" | "REVIEWED" | "ARCHIVED" | "ALL">("NEW");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return feedback.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (!search) return true;
      return [
        item.learner?.name,
        item.learner?.email,
        item.course?.title,
        item.module?.title,
        item.lesson?.title,
        item.response,
        item.adminNote,
        item.status,
      ].filter(Boolean).join(" ").toLowerCase().includes(search);
    });
  }, [feedback, query, status]);
  const mostReportedModules = useMemo(() => {
    const countsByModule = new Map<string, { title: string; count: number; newCount: number }>();
    for (const item of feedback) {
      const title = item.module?.title ?? item.course?.title ?? "Unlinked module";
      const current = countsByModule.get(title) ?? { title, count: 0, newCount: 0 };
      current.count += 1;
      if (item.status === "NEW") current.newCount += 1;
      countsByModule.set(title, current);
    }
    return Array.from(countsByModule.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [feedback]);

  return (
    <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
      <Panel title="Feedback Dashboard" icon={MessageSquareText}>
        <div className="grid gap-3 sm:grid-cols-2">
          <DeliveryMetric label="New feedback" value={counts.new} tone="warning" />
          <DeliveryMetric label="Reviewed" value={counts.reviewed} tone="success" />
          <DeliveryMetric label="Archived" value={counts.archived} tone="default" />
          <DeliveryMetric label="Total records" value={counts.all} tone="default" />
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-sm font-black text-white">Most reported modules</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Use this to spot lessons that may need clearer examples, visuals, or rewrite work.</p>
          <div className="mt-3 space-y-2">
            {mostReportedModules.length ? mostReportedModules.map((item) => (
              <div key={item.title} className="rounded-xl bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 break-words text-sm font-bold text-white">{item.title}</p>
                  <StatusBadge label={`${item.count}`} tone={item.newCount ? "warning" : "success"} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.newCount} new item(s) still need review.</p>
              </div>
            )) : <p className="text-sm text-slate-500">No module feedback has been submitted yet.</p>}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-sm font-black text-white">Recommended workflow</p>
          <p className="mt-2 text-sm leading-6 text-emerald-100/80">Review new feedback daily, add an internal note when a lesson needs improvement, then archive items that no longer need active attention.</p>
        </div>
      </Panel>

      <Panel title="Module Feedback Inbox" icon={MessageSquareText}>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <Field label="Search feedback" value={query} onChange={setQuery} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
            {[
              { value: "NEW", label: "New", count: counts.new },
              { value: "REVIEWED", label: "Reviewed", count: counts.reviewed },
              { value: "ARCHIVED", label: "Archived", count: counts.archived },
              { value: "ALL", label: "All", count: counts.all },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value as typeof status)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] transition",
                  status === item.value
                    ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100"
                    : "border-white/10 bg-slate-900 text-slate-400 hover:border-emerald-300/30",
                )}
              >
                <span className="block text-base text-white">{item.count}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {filtered.length ? filtered.map((item) => {
            const noteValue = notes[item.id] ?? item.adminNote ?? "";
            const reviewed = item.status === "REVIEWED";
            const archived = item.status === "ARCHIVED";
            return (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={item.status} tone={item.status === "NEW" ? "warning" : item.status === "REVIEWED" ? "success" : "info"} />
                      <span className="text-xs font-semibold text-slate-500">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <h4 className="mt-3 break-words text-lg font-black text-white">{item.module?.title ?? item.course?.title ?? "Module feedback"}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{item.lesson?.title ? `Lesson: ${item.lesson.title}` : "No lesson context saved"} · {item.course?.title ?? "Course unknown"}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.learner?.name ?? item.learner?.email ?? "Learner"}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:w-[280px]">
                    <InfoBlock label="Reviewed" value={item.reviewedAt ? formatDateTime(item.reviewedAt) : reviewed ? "Reviewed" : "Not reviewed yet"} />
                    <InfoBlock label="Archived" value={item.archivedAt ? formatDateTime(item.archivedAt) : archived ? "Archived" : "Not archived"} />
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{item.question}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{item.response}</p>
                </div>
                <Textarea
                  label="Admin note"
                  help="Internal only. Use this to record whether the lesson needs a rewrite, extra example, or follow-up."
                  value={noteValue}
                  onChange={(value) => setNotes({ ...notes, [item.id]: value })}
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {item.status === "NEW" && (
                    <Button disabled={busy} onClick={() => onModerate(item.id, "REVIEWED", noteValue)}>
                      <CheckCircle2 className="size-4" /> Mark reviewed
                    </Button>
                  )}
                  {item.status !== "ARCHIVED" && (
                    <Button variant="secondary" disabled={busy} onClick={() => onModerate(item.id, "ARCHIVED", noteValue)}>
                      <Trash2 className="size-4" /> Archive
                    </Button>
                  )}
                  {item.status !== "NEW" && (
                    <span className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300">
                      {archived ? "Archived feedback is kept for course history." : "Reviewed feedback stays available for course improvement reports."}
                    </span>
                  )}
                </div>
              </article>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-8 text-center">
              <MessageSquareText className="mx-auto size-8 text-slate-500" />
              <p className="mt-3 text-sm font-bold text-white">No feedback in this view</p>
              <p className="mt-1 text-sm text-slate-500">Try another status tab or clear your search.</p>
            </div>
          )}
        </div>
      </Panel>
    </section>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: "default" | "success" | "info" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold",
      tone === "success"
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
        : tone === "info"
          ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-white/5 text-slate-200",
    )}>
      <span className="text-slate-400">{label}</span>
      {value}
    </span>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "success" | "warning" | "danger" | "info" }) {
  return (
    <span className={cn(
      "w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
      tone === "success"
        ? "bg-emerald-400/10 text-emerald-200"
        : tone === "warning"
          ? "bg-amber-400/10 text-amber-200"
          : tone === "danger"
            ? "bg-red-400/10 text-red-200"
            : "bg-cyan-400/10 text-cyan-200",
    )}>
      {label}
    </span>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="flex items-start justify-between gap-3">
        <Icon className="size-5 text-emerald-300" />
        <p className="text-2xl font-black tabular-nums text-white">{value}</p>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 sm:tracking-[0.16em]">{label}</p>
    </div>
  );
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

function MiniList({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; title: string; detail: string; body?: string | null }> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
      <h4 className="text-sm font-black text-white">{title}</h4>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.id} className="rounded-xl bg-slate-950 p-3">
            <p className="text-sm font-semibold text-white">{row.title}</p>
            <p className="mt-1 break-words text-xs leading-5 text-slate-400">{row.detail}</p>
            {row.body ? <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">{row.body}</p> : null}
          </div>
        )) : <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  );
}

function ScoreList({ rows, onOpen }: { rows: EngagementData["engagementScores"]; onOpen: (learnerId: string) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
      <h4 className="text-sm font-black text-white">Top engagement scores</h4>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.learnerId} className="rounded-xl bg-slate-950 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-white">{row.learner?.name ?? row.learner?.email ?? row.learnerId}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{row.detail.join(", ") || "No score details yet"}</p>
              </div>
              <span className="w-fit rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">{row.score}/100</span>
            </div>
            <Button className="mt-3 w-full sm:w-auto" variant="secondary" onClick={() => onOpen(row.learnerId)}>Open learner detail</Button>
          </div>
        )) : <p className="text-sm text-slate-500">No engagement scores match these filters.</p>}
      </div>
    </div>
  );
}

function DeliveryMetric({ label, value, tone }: { label: string; value: number; tone: "default" | "success" | "warning" | "danger" }) {
  return (
    <div className={cn(
      "rounded-2xl border p-4",
      tone === "success" ? "border-emerald-400/20 bg-emerald-400/10" :
        tone === "warning" ? "border-amber-400/20 bg-amber-400/10" :
          tone === "danger" ? "border-red-400/20 bg-red-400/10" :
            "border-white/10 bg-slate-900/80",
    )}>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
    </div>
  );
}

function NotificationHistoryList({
  notifications,
  onOpen,
}: {
  notifications: EngagementData["notificationHistory"];
  onOpen?: (learnerId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
      <h4 className="text-sm font-black text-white">Notification history</h4>
      <p className="mt-1 text-xs leading-5 text-slate-500">In-app messages are visible to learners when marked delivered. Email and WhatsApp only show external delivery when a sender is configured and the workflow actually uses that channel.</p>
      <div className="mt-4 space-y-3">
        {notifications.length ? notifications.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">{item.category ?? "Academy"} / {item.channel}</p>
                <p className="break-words text-sm font-semibold text-white">{item.learner?.name ?? item.learner?.email ?? item.userId}</p>
                <p className="mt-2 break-words text-base font-black leading-snug text-slate-100">{item.subject}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{item.body}</p>
              </div>
              <span className={cn("w-fit shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase", notificationTone(item.displayStatus ?? item.status))}>{item.displayStatus ?? item.status}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoBlock label="Created" value={formatDateTime(item.createdAt)} />
              <InfoBlock label="Sent / visible" value={item.sentAt ? formatDateTime(item.sentAt) : item.channel === "IN_APP" ? "Waiting to be visible in app" : "Waiting for sender"} />
              <InfoBlock label="Delivery note" value={item.deliveryLabel ?? "Unknown"} />
              <InfoBlock label="Cooldown" value={item.cooldownLabel ?? "No cooldown"} />
              <InfoBlock label="Read receipt" value={item.receipt?.readAt ? formatDateTime(item.receipt.readAt) : "Not read yet"} />
              <InfoBlock label="Action receipt" value={item.receipt?.clickedAt ? formatDateTime(item.receipt.clickedAt) : "No action recorded"} />
            </div>
            {onOpen && <Button className="mt-3 w-full sm:w-auto" variant="secondary" onClick={() => onOpen(item.userId)}>Open learner detail</Button>}
          </div>
        )) : <p className="text-sm text-slate-500">No Academy notifications yet.</p>}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-200">{value}</p>
    </div>
  );
}

function LearnerEngagementDrawer({ learner, onClose }: { learner: SelectedLearnerEngagement; onClose: () => void }) {
  const name = learner.timeline?.learner?.name ?? learner.timeline?.learner?.email ?? learner.score?.learner?.name ?? learner.score?.learner?.email ?? "Learner";
  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <aside className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Learner engagement detail</p>
              <h3 className="mt-1 break-words text-2xl font-black text-white">{name}</h3>
              <p className="mt-1 text-sm text-slate-400">{learner.score ? `${learner.score.score}/100 engagement score` : "No score calculated yet"}</p>
            </div>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm font-black text-white">Consent profile</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {learner.profile ? [
                  learner.profile.communityOptIn && "Community",
                  learner.profile.ambassadorOptIn && "Ambassador",
                  learner.profile.directoryOptIn && "Directory",
                  learner.profile.spotlightConsent && `Spotlight ${learner.profile.spotlightStatus ?? ""}`,
                  learner.profile.sharedPostConfirmed && "Shared post confirmed",
                ].filter(Boolean).join(" / ") || "No active consent" : "No engagement consent profile yet."}
              </p>
            </div>
            <NotificationHistoryList notifications={learner.notifications} />
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm font-black text-white">Timeline</p>
              <div className="mt-3 space-y-3">
                {learner.timeline?.events.length ? learner.timeline.events.map((event) => (
                  <div key={event.id} className="border-l border-emerald-400/40 pl-3">
                    <p className="text-sm font-bold text-slate-100">{event.type}: {event.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{event.detail} - {formatDateTime(event.createdAt)}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No timeline events yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function notificationTone(status: string) {
  if (status === "DELIVERED" || status === "SENT" || status === "VISIBLE IN APP" || status === "READ" || status === "ACTION RECORDED") return "bg-emerald-400/10 text-emerald-200";
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
