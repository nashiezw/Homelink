"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Calendar,
  Clock3,
  Home,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { RoommateEnquiryPanel } from "@/components/enquiries/roommate-enquiry-panel";
import { ListingCard } from "@/components/listings/listing-card";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { recommendedRoommates } from "@/lib/roommates/content";
import {
  labelGender,
  labelHousehold,
  labelMarital,
  labelReligion,
} from "@/lib/roommates/types";
import {
  RESIDENCE_ROLE_LABELS,
  TENANCY_STATUS_LABELS,
  VERIFICATION_SOURCE_LABELS,
  type PublicResidenceRecord,
} from "@/lib/residence/types";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

type PublicProfile = {
  userId: string;
  name: string;
  city?: string;
  profile: {
    lookingFor: "room" | "roommate";
    budgetMin: number;
    budgetMax: number;
    occupation: string;
    lifestyle: string;
    bio?: string;
    photoUrl?: string;
    photos?: string[];
    gender: string;
    age: number;
    religion?: string;
    maritalStatus: string;
    householdType: string;
    householdSize?: number;
    smoking: boolean;
    pets: boolean;
    furnished?: boolean;
    availableNow?: boolean;
    moveInDate?: string;
    preferredLocations: string[];
    suburb?: string;
    verified?: boolean;
    featured?: boolean;
    genderPreference?: string;
    religionPreference?: string;
    maritalStatusPreference?: string;
    preferredAgeMin?: number;
    preferredAgeMax?: number;
  };
  residenceHistory: PublicResidenceRecord[];
  listings: Listing[];
};

const LIFESTYLE_STYLES: Record<string, string> = {
  quiet: "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:ring-sky-800",
  professional: "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800",
  student: "bg-violet-50 text-violet-900 ring-violet-200 dark:bg-violet-950 dark:text-violet-100 dark:ring-violet-800",
  social: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-800",
};

function isListingPlaceholderPhoto(url?: string) {
  if (!url) return true;
  if (url.includes("/uploads/")) return false;
  const filename = url.split("/").pop() ?? url;
  if (/^portrait-/i.test(filename)) return false;
  return /^(photo-|cover-|room-share-|hero|house|flat|cottage|listing|property|bulawayo|kwekwe|gweru|avondale)/i.test(filename);
}

function profilePhotoFor(profile: PublicProfile["profile"], userId: string) {
  const candidates = [
    profile.photoUrl,
    ...(profile.photos ?? []),
    recommendedRoommates.find((person) => person.id === userId)?.avatarUrl,
  ];
  return candidates.find((url) => url && !isListingPlaceholderPhoto(url));
}

function profileTagline(bio: string) {
  const sentence = bio.split(/(?<=[.!?])\s+/)[0] ?? bio;
  return sentence.length > 140 ? `${sentence.slice(0, 137)}...` : sentence;
}

function formatLifestyle(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function intentLabel(lookingFor: "room" | "roommate") {
  return lookingFor === "room" ? "Looking for a room" : "Looking for a roommate";
}

function moveInLabel(profile: PublicProfile["profile"]) {
  if (profile.availableNow) return "Available now";
  if (profile.moveInDate) return profile.moveInDate;
  return "Flexible";
}

export function RoommatePublicProfile({ userId }: { userId: string }) {
  const { user, showToast } = useApp();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void apiFetch<PublicProfile>(`/api/v1/roommates/profiles/${userId}`).then((res) => {
      if (res.data) setData(res.data);
      else setNotFound(true);
    });
  }, [userId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-slate-600 dark:text-slate-300">This roommate profile is not available.</p>
        <Link href="/roommates" className="mt-4 inline-block font-medium text-emerald-700 hover:underline">
          Back to roommates
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  const { profile, name } = { profile: data.profile, name: data.name };
  const photo = profilePhotoFor(profile, data.userId);
  const verifiedStays = data.residenceHistory.filter((r) => r.verified);
  const isSelf = user?.id === userId;
  const lifestyleStyle = LIFESTYLE_STYLES[profile.lifestyle] ?? LIFESTYLE_STYLES.professional;
  const locationLabel = profile.suburb
    ? `${profile.suburb}, ${data.city ?? profile.preferredLocations[0] ?? "Zimbabwe"}`
    : profile.preferredLocations.join("  / ") || data.city || "Zimbabwe";
  const firstName = name.split(" ")[0];

  const preferenceChips = [
    profile.smoking ? "Smoker" : "Non-smoker",
    profile.pets ? "Pet-friendly" : "No pets",
    profile.furnished ? "Prefers furnished" : "Unfurnished OK",
    labelGender(profile.gender),
    `${profile.age} yrs`,
    labelMarital(profile.maritalStatus),
  ].filter(Boolean);

  const lookingForChips = [
    intentLabel(profile.lookingFor),
    `Budget US$${profile.budgetMin}-${profile.budgetMax}`,
    profile.genderPreference && profile.genderPreference !== "any"
      ? `Prefers ${labelGender(profile.genderPreference).toLowerCase()} housemates`
      : null,
    profile.preferredAgeMin && profile.preferredAgeMax
      ? `Ages ${profile.preferredAgeMin}-${profile.preferredAgeMax}`
      : null,
    profile.religionPreference && profile.religionPreference !== "any"
      ? `${labelReligion(profile.religionPreference)} household preferred`
      : null,
  ].filter(Boolean) as string[];

  return (
    <main className="bg-mist pb-16 dark:bg-slate-950">
      <div className="relative h-36 overflow-hidden bg-ink sm:h-44">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.35),transparent_50%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.2),transparent_40%),linear-gradient(120deg,rgba(6,78,59,0.5),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="premium-card -mt-20 overflow-hidden rounded-3xl sm:-mt-24">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <AgentAvatar
                  name={name}
                  photoUrl={photo}
                  size="xl"
                  verified={profile.verified ?? false}
                  priority
                  className="-mt-2 sm:-mt-4"
                />

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {profile.verified && (
                      <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        <BadgeCheck className="size-3.5" />
                        Verified seeker
                      </p>
                    )}
                    {profile.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-800">
                        <Star className="size-3.5" />
                        Featured
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ring-1 ring-inset",
                        lifestyleStyle,
                      )}
                    >
                      <Sparkles className="size-3.5" />
                      {formatLifestyle(profile.lifestyle || "Flexible")}
                    </span>
                  </div>

                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    {name}
                  </h1>

                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{intentLabel(profile.lookingFor)}</span>
                    {profile.occupation && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="size-3.5 text-emerald-600" />
                        {profile.occupation}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5 text-emerald-600" />
                      {locationLabel}
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                      US${profile.budgetMin}-{profile.budgetMax}
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400"> /month</span>
                    </span>
                    {profile.availableNow && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        Available now
                      </span>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                      {profileTagline(profile.bio)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52">
                {!isSelf && (
                  <RoommateEnquiryPanel
                    roommateUserId={data.userId}
                    roommateName={name}
                    lookingFor={profile.lookingFor}
                  />
                )}
                {!isSelf && user ? (
                  <Link
                    href="/messages"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <MessageCircle className="size-4" />
                    Messages
                  </Link>
                ) : !user ? (
                  <Link
                    href="/auth"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Sign in
                  </Link>
                ) : null}

                {isSelf && (
                  <>
                    <Link
                      href="/roommates/profile"
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                    >
                      Edit profile
                    </Link>
                    <Link
                      href="/dashboard/tenancies"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Manage tenancies
                    </Link>
                  </>
                )}

                <Link
                  href="/roommates"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Browse roommates
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(window.location.href);
                    showToast("Profile link copied.");
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Share2 className="size-4" />
                  Share profile
                </button>
              </div>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Monthly budget" value={`US$${profile.budgetMin}-${profile.budgetMax}`} />
              <MetricCard label="Age" value={`${profile.age} yrs`} />
              <MetricCard label="Verified stays" value={String(verifiedStays.length)} />
              <MetricCard label="Move-in" value={moveInLabel(profile)} />
            </dl>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="space-y-8">
            <section className="premium-card rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">About {firstName}</h2>
              {profile.bio && (
                <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">{profile.bio}</p>
              )}

              <div className={cn("grid gap-8 sm:grid-cols-2", profile.bio ? "mt-8" : "mt-4")}>
                  <ChipGroup
                    title="Lifestyle"
                    icon={<Sparkles className="size-4 text-emerald-600" />}
                    items={preferenceChips}
                  />
                  <ChipGroup
                    title="Looking for"
                    icon={<Target className="size-4 text-emerald-600" />}
                    items={lookingForChips}
                  />
                  <ChipGroup
                    title="Preferred areas"
                    icon={<MapPin className="size-4 text-emerald-600" />}
                    items={profile.preferredLocations.length > 0 ? profile.preferredLocations : [locationLabel]}
                  />
                  <ChipGroup
                    title="Household"
                    icon={<Home className="size-4 text-emerald-600" />}
                    items={[
                      labelHousehold(profile.householdType),
                      profile.religion ? labelReligion(profile.religion) : null,
                    ].filter(Boolean) as string[]}
                  />
                </div>
              </section>

            {data.listings.length > 0 && (
              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Active listings</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {data.listings.length} {data.listings.length === 1 ? "room" : "rooms"} available now
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  {data.listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </section>
            )}

            {data.residenceHistory.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Stay history</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Verified residence records on HomeLink
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {data.residenceHistory.map((record) => (
                    <StayCard key={record.id} record={record} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <SidebarCard title="Connect">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                  <MapPin className="size-4 shrink-0 text-emerald-600" />
                  {locationLabel}
                </li>
                <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                  <Calendar className="size-4 shrink-0 text-emerald-600" />
                  Move-in: {moveInLabel(profile)}
                </li>
                <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                  <Clock3 className="size-4 shrink-0 text-emerald-600" />
                  Message securely via HomeLink
                </li>
              </ul>
            </SidebarCard>

            {profile.preferredLocations.length > 0 && (
              <SidebarCard title="Preferred areas">
                <ul className="space-y-4">
                  {profile.preferredLocations.map((loc) => (
                    <li key={loc}>
                      <p className="font-medium text-slate-950 dark:text-white">{loc}</p>
                      {data.city && (
                        <p className="text-sm text-slate-500">{data.city}, Zimbabwe</p>
                      )}
                    </li>
                  ))}
                </ul>
              </SidebarCard>
            )}

            <SidebarCard title="Preferences">
              <dl className="space-y-3 text-sm">
                <CredRow label="Smoking" value={profile.smoking ? "Smoker" : "Non-smoker"} />
                <CredRow label="Pets" value={profile.pets ? "Has pets" : "No pets"} highlight={profile.pets} />
                <CredRow
                  label="Furnished"
                  value={profile.furnished ? "Prefers furnished" : "Flexible"}
                />
                {profile.genderPreference && profile.genderPreference !== "any" && (
                  <CredRow label="Housemate gender" value={labelGender(profile.genderPreference)} />
                )}
                {profile.preferredAgeMin && profile.preferredAgeMax && (
                  <CredRow label="Preferred ages" value={`${profile.preferredAgeMin}-${profile.preferredAgeMax}`} />
                )}
              </dl>
            </SidebarCard>

            <SidebarCard title="Trust & credentials">
              <dl className="space-y-3 text-sm">
                <CredRow
                  label="Profile status"
                  value={profile.verified ? "Verified seeker" : "Unverified"}
                  highlight={profile.verified}
                />
                <CredRow label="Verified stays" value={String(verifiedStays.length)} />
                <CredRow label="Household type" value={labelHousehold(profile.householdType)} />
                <CredRow label="Marital status" value={labelMarital(profile.maritalStatus)} />
              </dl>
              <Link
                href="/safety"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                <ShieldCheck className="size-4" />
                Safety tips
              </Link>
            </SidebarCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
      <dt className="text-sm font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{value}</dd>
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="premium-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CredRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-600 dark:text-slate-400">{label}</dt>
      <dd
        className={cn(
          "text-right font-semibold",
          highlight ? "text-emerald-700 dark:text-emerald-400" : "text-slate-950 dark:text-white",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StayCard({ record }: { record: PublicResidenceRecord }) {
  return (
    <article className="premium-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">
            {record.suburb}, {record.city}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">{RESIDENCE_ROLE_LABELS[record.role]}</p>
        </div>
        {record.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <BadgeCheck className="size-3.5" />
            Verified
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-500">Unverified</span>
        )}
      </div>
      {record.fullAddress && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{record.fullAddress}</p>
      )}
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {TENANCY_STATUS_LABELS[record.status]}  / {VERIFICATION_SOURCE_LABELS[record.verificationSource]}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {record.startDate}
        {record.endDate ? ` - ${record.endDate}` : " - present"}
      </p>
      {record.hasOpenDispute && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="size-3" />
          Open dispute
        </p>
      )}
    </article>
  );
}

function ChipGroup({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
        {icon}
        {title}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
