"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  ExternalLink,
  BookOpen,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type EngagementData = {
  settings: Record<string, any>;
  courses: Array<{ id: string; title: string }>;
  journey: {
    activeCourseCount: number;
    completedCourseCount: number;
    highestProgress: number;
    hasActiveCourse: boolean;
    hasMeaningfulProgress: boolean;
    stage: "NOT_ENROLLED" | "ACTIVE_LEARNER" | "IN_PROGRESS" | "GRADUATE";
    canUseCommunity: boolean;
    canUseReferrals: boolean;
    canUseChallenges: boolean;
    canUseOfficeHours: boolean;
    canSubmitReview: boolean;
    canJoinDirectory: boolean;
    canRequestSpotlight: boolean;
  };
  nextAction: {
    title: string;
    body: string;
    href: string;
    cta: string;
    tone: "info" | "warning" | "success";
  };
  timeline: Array<{ id: string; type: string; title: string; detail: string; createdAt: string }>;
  messages: Array<{ id: string; eventType: string; channel: string; subject: string; body: string; status: string; category?: string; deliveryLabel?: string; createdAt: string; sentAt?: string | null; receipt?: { readAt?: string | null; clickedAt?: string | null; dismissedAt?: string | null } | null }>;
  profile: {
    communityOptIn: boolean;
    ambassadorOptIn: boolean;
    directoryOptIn: boolean;
    spotlightConsent: boolean;
    profileHeadline?: string | null;
    profileBio?: string | null;
    referralCode?: string | null;
    sharedPostConfirmed?: boolean;
    sharedPostUrl?: string | null;
  } | null;
  referralUrl?: string | null;
  referrals: Array<{ id: string; referralCode: string; status: string; referredName?: string | null; referredEmail?: string | null; createdAt: string }>;
  testimonials: Array<{ id: string; title: string; status: string; rating?: number | null; createdAt: string }>;
  challenges: Array<{ id: string; title: string; instructions: string; rewardLabel?: string | null; startsAt?: string | null; endsAt?: string | null; submitted: boolean; submission?: { status: string; adminNote?: string | null } | null }>;
  officeHours: Array<{ id: string; title: string; description?: string | null; startsAt: string; link?: string | null; capacity?: number | null; rsvp?: { status: string } | null }>;
};

type ConsentKey = "communityOptIn" | "ambassadorOptIn" | "directoryOptIn" | "spotlightConsent" | "sharedPostConfirmed";

export function AcademyEngagementHub({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    communityOptIn: false,
    ambassadorOptIn: false,
    directoryOptIn: false,
    spotlightConsent: false,
    sharedPostConfirmed: false,
    sharedPostUrl: "",
    profileHeadline: "",
    profileBio: "",
  });
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
        sharedPostConfirmed: Boolean(result.data.profile?.sharedPostConfirmed),
        sharedPostUrl: result.data.profile?.sharedPostUrl ?? "",
        profileHeadline: result.data.profile?.profileHeadline ?? "",
        profileBio: result.data.profile?.profileBio ?? "",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settings = useMemo(() => data?.settings ?? {}, [data?.settings]);
  const referralCode = data?.profile?.referralCode ?? data?.referrals[0]?.referralCode ?? "";
  const referralUrl = data?.referralUrl ?? "";
  const shareText = useMemo(() => {
    const prompt = settings.sharePrompt ?? "I am learning through HouseLink Academy.";
    return referralUrl ? `${prompt} ${referralUrl}` : referralCode ? `${prompt} Use my referral code: ${referralCode}` : prompt;
  }, [settings.sharePrompt, referralCode, referralUrl]);
  const consentOptions = useMemo(() => {
    if (!data) return [];
    const options: Array<readonly [ConsentKey, string, string] | null> = [
      settings.communityEnabled ? ["communityOptIn", "Community updates", "Receive optional learner community invitations."] : null,
      settings.ambassadorEnabled ? ["ambassadorOptIn", "Ambassador programme", "Be considered for optional sharing and referral recognition."] : null,
      settings.directoryEnabled ? ["directoryOptIn", "Graduate directory", "Show your public profile only after you consent."] : null,
      settings.spotlightEnabled ? ["spotlightConsent", "Learner spotlight", "Allow HouseLink to review you for a featured story."] : null,
      settings.ambassadorEnabled ? ["sharedPostConfirmed", "Shared my progress", "Record an optional enrolment or progress share."] : null,
    ];
    return options.filter((item): item is readonly [ConsentKey, string, string] => Boolean(item));
  }, [data, settings]);
  const weeklyThemes = String(settings.weeklyThemes ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const communityLinks = [
    settings.whatsappUrl && { label: "Join WhatsApp group", href: String(settings.whatsappUrl), tone: "primary" },
    settings.whatsappChannelUrl && { label: "Follow WhatsApp channel", href: String(settings.whatsappChannelUrl), tone: "soft" },
    settings.facebookPageUrl && { label: "Open Facebook page", href: String(settings.facebookPageUrl), tone: "soft" },
    settings.linkedinPageUrl && { label: "Open LinkedIn page", href: String(settings.linkedinPageUrl), tone: "soft" },
  ].filter((link): link is { label: string; href: string; tone: string } => Boolean(link));

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

  if (!data || settings.enabled === false) return null;

  const hasCommunityContent = communityLinks.length > 0 || weeklyThemes.length > 0;
  const activeOptIns = consentOptions.filter(([key]) => Boolean(profile[key])).length;
  const journeySteps = buildJourneySteps(data.journey);
  const canEditPublicProfile = data.journey.canJoinDirectory || data.journey.canRequestSpotlight;
  const visibleMessages = (data.messages ?? []).filter((item) => !item.receipt?.dismissedAt);

  return (
    <section className={compact ? "space-y-5" : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"}>
      <div className="overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_20px_60px_rgba(15,118,110,0.10)] dark:border-emerald-400/20 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 p-5 text-white sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-100">Learner Engagement Journey</p>
              <h2 className="mt-2 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">{settings.communityName ?? "HouseLink Academy Learner Community"}</h2>
              {settings.invitation && <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50/90">{settings.invitation}</p>}
            </div>
            {settings.communityEnabled && data.journey.canUseCommunity && communityLinks[0] && (
              <a href={communityLinks[0].href} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:w-auto">
                <MessageCircle className="mr-2 size-4" /> {communityLinks[0].label}
              </a>
            )}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <MiniMetric label="Active courses" value={data.journey.activeCourseCount} />
            <MiniMetric label="Best progress" value={data.journey.highestProgress} suffix="%" />
            <MiniMetric label="Completed" value={data.journey.completedCourseCount} />
            <MiniMetric label="Opt-ins" value={activeOptIns} />
          </div>
        </div>
        {message && <p className="border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">{message}</p>}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">How this unlocks</p>
            <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Your Academy participation path</h3>
          </div>
          {!data.journey.hasActiveCourse && <a href="/academy?browse=1" className="text-sm font-black text-emerald-700 hover:underline dark:text-emerald-300">Choose a course</a>}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {journeySteps.map((step) => (
            <div key={step.title} className={cn(
              "rounded-2xl border p-3",
              step.active
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-50"
                : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
            )}>
              <div className="flex items-center gap-2">
                <span className={cn("grid size-7 place-items-center rounded-full text-xs font-black", step.active ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{step.index}</span>
                <p className="font-black">{step.title}</p>
              </div>
              <p className="mt-2 text-sm leading-5">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      <section className={cn(
        "rounded-[24px] border p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-5",
        data.nextAction.tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-50"
          : data.nextAction.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-50"
            : "border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-50",
      )}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Recommended next step</p>
            <h3 className="mt-1 text-xl font-black">{data.nextAction.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 opacity-80">{data.nextAction.body}</p>
          </div>
          <a href={data.nextAction.href} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-emerald-50 sm:w-auto">
            {data.nextAction.cta}
          </a>
        </div>
      </section>

      {!data.journey.hasActiveCourse && (
        <HubCard title="Start with a course" icon={BookOpen} eyebrow="First step">
          <EmptyState title="Engagement unlocks after registration" body="Join an Academy course first. Then you can access learner community links, office hours, practical challenges, referrals, and later reviews or graduate visibility." />
          <a href="/academy?browse=1" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-emerald-500">Browse Academy courses</a>
        </HubCard>
      )}

      {data.journey.hasActiveCourse && (
        <HubCard title="Academy message centre" icon={MessageCircle} eyebrow="Your updates">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Messages here are generated from real Academy actions such as progress nudges, reviews, office hours, challenges, and certificates.</p>
          <div className="mt-4 space-y-3">
            {visibleMessages.length ? visibleMessages.slice(0, 8).map((item) => (
              <div key={item.id} className={cn(
                "rounded-2xl border p-3",
                item.receipt?.readAt
                  ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                  : "border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10",
              )}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">{item.category ?? "Academy"}</p>
                    <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{item.subject}</p>
                  </div>
                  <span className="w-fit rounded-full bg-white px-2 py-1 text-[11px] font-black uppercase text-slate-600 dark:bg-slate-950 dark:text-slate-300">{item.receipt?.readAt ? "Read" : "New"}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">{formatDateTime(item.createdAt)} - {item.deliveryLabel ?? item.channel}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {!item.receipt?.readAt && <Button variant="secondary" loading={busy} onClick={() => action({ action: "mark_notification_read", notificationId: item.id }, "Message marked as read.")}>Mark read</Button>}
                  {!item.receipt?.clickedAt && <Button loading={busy} onClick={() => action({ action: "mark_notification_clicked", notificationId: item.id }, "Message action recorded.")}>I acted on this</Button>}
                  <Button variant="ghost" loading={busy} onClick={() => action({ action: "dismiss_notification", notificationId: item.id }, "Message dismissed.")}>Dismiss</Button>
                </div>
              </div>
            )) : <EmptyState title="No Academy messages yet" body="When the Academy sends progress nudges, office-hours updates, review prompts, or certificate messages, they will appear here." />}
          </div>
        </HubCard>
      )}

      {data.journey.hasActiveCourse && (
        <HubCard title="Your engagement timeline" icon={CheckCircle2} eyebrow="Real activity">
          {data.timeline.length ? (
            <div className="space-y-3">
              {data.timeline.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-black text-slate-950 dark:text-white">{event.type}: {event.title}</p>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{event.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Your timeline starts with your next action" body="Open Lesson 1, submit a checkpoint, RSVP for office hours, or save your preferences to begin recording engagement activity." />
          )}
        </HubCard>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        {data.journey.hasActiveCourse && <HubCard title="Consent and public visibility" icon={ShieldCheck} eyebrow="Your choice">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">These options are voluntary. They do not affect course access, assessments, certificates, or progress.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {consentOptions.map(([key, label, detail]) => (
              <label key={key} className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition",
                profile[key]
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-50"
                  : "border-slate-200 bg-white text-slate-900 hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white",
              )}>
                <input className="mt-1" type="checkbox" checked={Boolean(profile[key])} onChange={(event) => setProfile({ ...profile, [key]: event.target.checked })} />
                <span className="min-w-0">
                  <span className="block text-sm font-black">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</span>
                </span>
              </label>
            ))}
          </div>
          {canEditPublicProfile ? (
            <div className="mt-4 grid gap-3">
              <Field label="Public headline" placeholder="e.g. Property assistant focused on rentals" value={profile.profileHeadline} onChange={(profileHeadline) => setProfile({ ...profile, profileHeadline })} />
              <Textarea label="Public profile bio" placeholder="Write a short, professional bio for directory or spotlight review." value={profile.profileBio} onChange={(profileBio) => setProfile({ ...profile, profileBio })} />
            </div>
          ) : (
            <LockedNotice title="Public profile unlocks later" body="Directory visibility requires a completed course. Learner spotlight unlocks after meaningful course progress." />
          )}
          {settings.ambassadorEnabled && data.journey.canUseReferrals && (
            <Field className="mt-3" label="Optional shared post link" placeholder="Paste a WhatsApp status, Facebook, or LinkedIn post link if available" value={profile.sharedPostUrl} onChange={(sharedPostUrl) => setProfile({ ...profile, sharedPostUrl })} />
          )}
          <Button className="mt-4 w-full sm:w-auto" loading={busy} loadingText="Saving..." onClick={() => action({ action: "save_profile", profile }, "Engagement preferences saved.")}>Save preferences</Button>
        </HubCard>}

        {settings.referralsEnabled && data.journey.canUseReferrals && (
          <HubCard title="Referral and sharing" icon={Send} eyebrow="Invite someone">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-200">Your referral code</p>
              <p className="mt-2 break-all text-2xl font-black text-slate-950 dark:text-white">{referralCode || "Not generated yet"}</p>
              {referralUrl && <p className="mt-2 break-all text-sm font-semibold text-emerald-900 dark:text-emerald-100">{referralUrl}</p>}
              {settings.referralRewardLabel && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{settings.referralRewardLabel}</p>}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={copyShareText}><Copy className="size-4" /> Copy share message</Button>
                {!referralCode && <Button variant="ghost" loading={busy} onClick={() => action({ action: "save_profile", profile }, "Referral code generated.")}>Generate code</Button>}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <Select label="Course interest" value={referral.courseId} options={[{ value: "", label: "General Academy referral" }, ...data.courses.map((course) => ({ value: course.id, label: course.title }))]} onChange={(courseId) => setReferral({ ...referral, courseId })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" value={referral.referredName} onChange={(referredName) => setReferral({ ...referral, referredName })} />
                <Field label="Email" type="email" value={referral.referredEmail} onChange={(referredEmail) => setReferral({ ...referral, referredEmail })} />
              </div>
              <Button loading={busy} disabled={!referral.referredName.trim() && !referral.referredEmail.trim()} onClick={() => action({ action: "create_referral", ...referral, rewardLabel: settings.referralRewardLabel }, "Referral recorded.")}>Record referral</Button>
            </div>
            <MiniStatus rows={data.referrals.map((item) => ({ id: item.id, title: item.referredName || item.referredEmail || "Referral", detail: item.status }))} empty="No referrals recorded yet." />
          </HubCard>
        )}
      </div>

      <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {settings.communityEnabled && data.journey.canUseCommunity && (
          <HubCard title="Community channels" icon={MessageCircle} eyebrow="Admin-managed">
            {hasCommunityContent ? (
              <div className="space-y-4">
                {communityLinks.length > 0 && (
                  <div className="grid gap-2">
                    {communityLinks.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className={cn(
                        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition",
                        link.tone === "primary"
                          ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500"
                          : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
                      )}>
                        <ExternalLink className="mr-2 size-4" /> {link.label}
                      </a>
                    ))}
                  </div>
                )}
                {weeklyThemes.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Community calendar</p>
                    <div className="space-y-2">
                      {weeklyThemes.map((theme) => (
                        <div key={theme} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">{theme}</div>
                      ))}
                    </div>
                  </div>
                )}
                <Button variant="secondary" onClick={copyShareText}><Copy className="size-4" /> Copy share message</Button>
              </div>
            ) : (
              <EmptyState title="No community links yet" body="Admin has not added WhatsApp, Facebook, LinkedIn, or calendar themes yet." />
            )}
          </HubCard>
        )}

        {settings.testimonialsEnabled && (
          <HubCard title="Course review" icon={Star} eyebrow="Moderated">
            {data.journey.canSubmitReview ? <div className="grid gap-3">
              <Select label="Course" value={testimonial.courseId} options={[{ value: "", label: "General Academy experience" }, ...data.courses.map((course) => ({ value: course.id, label: course.title }))]} onChange={(courseId) => setTestimonial({ ...testimonial, courseId })} />
              <Field label="Review title" value={testimonial.title} onChange={(title) => setTestimonial({ ...testimonial, title })} />
              <Select label="Rating" value={testimonial.rating} options={[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} star${value === 1 ? "" : "s"}` }))} onChange={(rating) => setTestimonial({ ...testimonial, rating })} />
              <Textarea label="Your testimonial" value={testimonial.body} onChange={(body) => setTestimonial({ ...testimonial, body })} />
              <label className="flex items-start gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <input className="mt-1" type="checkbox" checked={testimonial.publicConsent} onChange={(event) => setTestimonial({ ...testimonial, publicConsent: event.target.checked })} />
                <span>I allow HouseLink to review this for public use.</span>
              </label>
              <Button loading={busy} disabled={!testimonial.title.trim() || !testimonial.body.trim()} onClick={() => action({ action: "submit_testimonial", testimonial }, "Testimonial submitted for moderation.")}>Submit review</Button>
            </div> : <LockedNotice title="Reviews unlock after progress" body="Complete at least 25% of a course or finish a certificate before leaving a review. That keeps Academy reviews trustworthy." />}
            <MiniStatus rows={data.testimonials.map((item) => ({ id: item.id, title: item.title, detail: item.status }))} empty="No testimonials submitted yet." />
          </HubCard>
        )}

        {settings.challengesEnabled && data.journey.canUseChallenges && (
          <HubCard title="Practical challenges" icon={Sparkles} eyebrow="Weekly practice">
            <div className="space-y-3">
              {data.challenges.length ? data.challenges.map((challenge) => (
                <div key={challenge.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="font-black text-slate-950 dark:text-white">{challenge.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{challenge.instructions}</p>
                  {challenge.rewardLabel && <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">{challenge.rewardLabel}</p>}
                  {challenge.submitted ? (
                    <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-100">
                      Submitted: {challenge.submission?.status}
                      {challenge.submission?.adminNote && <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">{challenge.submission.adminNote}</p>}
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-2">
                      <Textarea label="Evidence / link / summary" value={challengeEvidence[challenge.id] ?? ""} onChange={(value) => setChallengeEvidence({ ...challengeEvidence, [challenge.id]: value })} />
                      <Button loading={busy} disabled={!challengeEvidence[challenge.id]?.trim()} onClick={() => action({ action: "submit_challenge", challengeId: challenge.id, evidence: challengeEvidence[challenge.id] }, "Challenge evidence submitted.")}>Submit evidence</Button>
                    </div>
                  )}
                </div>
              )) : <EmptyState title="No active challenges right now" body="When admin publishes practical challenges, they will appear here with an evidence box." />}
            </div>
          </HubCard>
        )}

        {settings.officeHoursEnabled && data.journey.canUseOfficeHours && (
          <HubCard title="Office hours" icon={CalendarClock} eyebrow="Live support">
            <div className="space-y-3">
              {data.officeHours.length ? data.officeHours.map((officeHour) => (
                <div key={officeHour.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="font-black text-slate-950 dark:text-white">{officeHour.title}</p>
                  <p className="text-sm text-slate-500">{formatDateTime(officeHour.startsAt)}</p>
                  {officeHour.description && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{officeHour.description}</p>}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button loading={busy} onClick={() => action({ action: "rsvp_office_hour", officeHourId: officeHour.id, status: officeHour.rsvp?.status === "GOING" ? "CANCELLED" : "GOING" }, officeHour.rsvp?.status === "GOING" ? "RSVP cancelled." : "RSVP saved.")}>{officeHour.rsvp?.status === "GOING" ? "Cancel RSVP" : "RSVP"}</Button>
                    {officeHour.link && <a href={officeHour.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100">Open link</a>}
                  </div>
                </div>
              )) : <EmptyState title="No upcoming office hours yet" body="When admin schedules a WhatsApp or Zoom session, you will be able to RSVP here." />}
            </div>
          </HubCard>
        )}
      </div>
    </section>
  );
}

function HubCard({ title, eyebrow, icon: Icon, children }: { title: string; eyebrow?: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section className="h-fit rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><Icon className="size-5" /></span>
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">{eyebrow}</p>}
          <h3 className="text-lg font-black leading-tight text-slate-950 dark:text-white">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniMetric({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
      <p className="text-2xl font-black">{value}{suffix}</p>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-50/80">{label}</p>
    </div>
  );
}

function LockedNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
      <p className="font-black">{title}</p>
      <p className="mt-1 leading-6">{body}</p>
    </div>
  );
}

function buildJourneySteps(journey: EngagementData["journey"]) {
  return [
    {
      index: 1,
      title: "Join",
      body: journey.hasActiveCourse ? "You are registered in the Academy." : "Choose and register for a course to begin.",
      active: journey.hasActiveCourse,
    },
    {
      index: 2,
      title: "Participate",
      body: journey.canUseCommunity ? "Community, office hours, referrals and challenges are available." : "Learner features unlock after registration.",
      active: journey.canUseCommunity,
    },
    {
      index: 3,
      title: "Reflect",
      body: journey.canSubmitReview ? "You can submit a moderated review or testimonial." : "Reviews unlock after 25% progress or completion.",
      active: journey.canSubmitReview,
    },
    {
      index: 4,
      title: "Graduate",
      body: journey.canJoinDirectory ? "Graduate directory visibility is available with consent." : "Directory visibility unlocks after course completion.",
      active: journey.canJoinDirectory,
    },
  ];
}

function Field({ label, value, onChange, type = "text", placeholder, className }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; className?: string }) {
  return <label className={cn("block text-xs font-black uppercase tracking-[0.14em] text-slate-500", className)}>{label}<input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-400/10" /></label>;
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}<textarea rows={4} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-400/10" /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm normal-case tracking-normal text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-400/10">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function MiniStatus({ rows, empty }: { rows: Array<{ id: string; title: string; detail: string }>; empty: string }) {
  return <div className="mt-4 space-y-2">{rows.length ? rows.slice(0, 4).map((row) => <div key={row.id} className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 break-words font-semibold">{row.title}</span><span className="shrink-0 text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">{row.detail}</span></div>) : <p className="text-sm text-slate-500">{empty}</p>}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex gap-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <p className="font-black text-slate-900 dark:text-white">{title}</p>
          <p className="mt-1 max-w-prose leading-6 text-slate-500 dark:text-slate-400">{body}</p>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
