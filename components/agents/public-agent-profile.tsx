"use client";

import {
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Star,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { ListingCard } from "@/components/listings/listing-card";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { apiFetch } from "@/lib/api/client";
import type { AgentLevel, AgentProfile, AgentRating, AgentTerritory } from "@/lib/agents/types";
import type { Listing } from "@/lib/types";
import { getWhatsAppHref } from "@/lib/settings/contact";
import { cn } from "@/lib/utils";

type PublicAgentData = {
  profile: AgentProfile;
  user: { name: string; city?: string; email?: string } | null;
  agency: {
    id: string;
    name: string;
    city?: string;
    verificationStatus: string;
  } | null;
  territories: Array<Pick<AgentTerritory, "id" | "name" | "province" | "city" | "suburbs">>;
  listings: Listing[];
  ratings: AgentRating[];
};

const LEVEL_STYLES: Record<AgentLevel, string> = {
  BRONZE: "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
  SILVER: "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600",
  GOLD: "bg-yellow-50 text-yellow-900 ring-yellow-200 dark:bg-yellow-950 dark:text-yellow-100 dark:ring-yellow-800",
  PLATINUM: "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:ring-sky-800",
  ELITE: "bg-violet-50 text-violet-900 ring-violet-200 dark:bg-violet-950 dark:text-violet-100 dark:ring-violet-800",
};

function formatPropertyType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function safeStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.length
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : fallback;
}

function profileTagline(bio: string) {
  const sentence = bio.split(/(?<=[.!?])\s+/)[0] ?? bio;
  return sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn("size-4", i < Math.round(rating) ? "fill-current" : "fill-transparent opacity-40")}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{rating.toFixed(1)}</span>
      <span className="text-sm text-slate-500 dark:text-slate-400">({count} reviews)</span>
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-slate-600 dark:text-slate-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-medium text-slate-900 dark:text-white">{value.toFixed(1)}</span>
    </div>
  );
}

export function PublicAgentProfile({ slug }: { slug: string }) {
  const { config } = usePlatformConfig();
  const [data, setData] = useState<PublicAgentData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void apiFetch<PublicAgentData | null>(`/api/v1/agents/public/${slug}`).then((res) => {
      if (res.data) setData(res.data);
      else setNotFound(true);
    });
  }, [slug]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-slate-600 dark:text-slate-300">This agent profile is not available.</p>
        <Link href="/" className="mt-4 inline-block font-medium text-emerald-700 hover:underline">
          Back to home
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

  const { profile, user, agency } = data;
  const territories = Array.isArray(data.territories) ? data.territories : [];
  const listings = Array.isArray(data.listings) ? data.listings : [];
  const ratings = Array.isArray(data.ratings) ? data.ratings : [];
  const name = user?.name ?? "HouseLink Agent";
  const averageRating = Number.isFinite(Number(profile.averageRating)) ? Number(profile.averageRating) : 0;
  const ratingCount = Number.isFinite(Number(profile.ratingCount)) ? Number(profile.ratingCount) : 0;
  const yearsExperience = Number.isFinite(Number(profile.yearsExperience)) ? Number(profile.yearsExperience) : 0;
  const completedDeals = Number.isFinite(Number(profile.completedDeals)) ? Number(profile.completedDeals) : 0;
  const level = profile.level && LEVEL_STYLES[profile.level] ? profile.level : "BRONZE";
  const biography = profile.biography || `${name} is a verified HouseLink Zimbabwe agent.`;
  const specialisations = safeStringArray(profile.specialisations, ["Residential rentals", "Property sales"]);
  const languages = safeStringArray(profile.languages, ["English"]);
  const propertyTypes = safeStringArray(profile.propertyTypes, ["house", "flat"]);
  const areasServed = safeStringArray(profile.areasServed, [user?.city ?? "Zimbabwe"]);
  const responseTime = averageRating >= 4.8 ? "Under 1 hour" : "Under 2 hours";
  const levelStyle = LEVEL_STYLES[level];
  const whatsappHref = config?.contact?.whatsappNumber
    ? getWhatsAppHref(config.contact)
    : null;
  const contactHref = `/contact?agent=${encodeURIComponent(slug)}`;

  const avgBreakdown =
    ratings.length > 0
      ? {
          professionalism:
            ratings.reduce((sum, r) => sum + r.professionalism, 0) / ratings.length,
          communication: ratings.reduce((sum, r) => sum + r.communication, 0) / ratings.length,
          knowledge: ratings.reduce((sum, r) => sum + r.knowledge, 0) / ratings.length,
          responsiveness: ratings.reduce((sum, r) => sum + r.responsiveness, 0) / ratings.length,
        }
      : null;

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
                  photoUrl={profile.photoUrl}
                  size="xl"
                  priority
                  className="-mt-2 sm:-mt-4"
                />

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      <BadgeCheck className="size-3.5" />
                      Verified agent
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                        levelStyle,
                      )}
                    >
                      <Award className="size-3.5" />
                      {level}
                    </span>
                  </div>

                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    {name}
                  </h1>

                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{profile.agentIdCode}</span>
                    {agency && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3.5 text-emerald-600" />
                        {agency.name}
                      </span>
                    )}
                    {user?.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5 text-emerald-600" />
                        {user.city}
                      </span>
                    )}
                  </p>

                  <div className="mt-3">
                    <StarRating rating={averageRating} count={ratingCount} />
                  </div>

                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                    {profileTagline(biography)}
                  </p>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52">
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
                  >
                    <MessageCircle className="mr-2 size-4" />
                    WhatsApp HouseLink
                  </a>
                )}
                <Link
                  href={contactHref}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  <Calendar className="mr-2 size-4" />
                  Enquire via HouseLink
                </Link>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Contact is routed through HouseLink to protect clients and agents.
                </p>
              </div>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Experience" value={`${yearsExperience}+ yrs`} />
              <MetricCard label="Completed deals" value={String(completedDeals)} />
              <MetricCard label="Active listings" value={String(listings.length)} />
              <MetricCard label="Response time" value={responseTime} />
            </dl>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="space-y-8">
            <section className="premium-card rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">About {name.split(" ")[0]}</h2>
              <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">{biography}</p>

              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <ChipGroup title="Specialisations" icon={<Target className="size-4 text-emerald-600" />} items={specialisations} />
                <ChipGroup title="Languages" icon={<Globe2 className="size-4 text-emerald-600" />} items={languages} />
                <ChipGroup
                  title="Property types"
                  icon={<Building2 className="size-4 text-emerald-600" />}
                  items={propertyTypes.map(formatPropertyType)}
                />
                <ChipGroup
                  title="Areas served"
                  icon={<MapPin className="size-4 text-emerald-600" />}
                  items={areasServed}
                />
              </div>
            </section>

            {listings.length > 0 && (
              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Active listings</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {listings.length} {listings.length === 1 ? "property" : "properties"} available now
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </section>
            )}

            {ratings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">What clients say</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Verified reviews from completed deals on HouseLink
                </p>

                {avgBreakdown && (
                  <div className="premium-card mt-5 space-y-3 rounded-2xl p-6">
                    <RatingBar label="Professionalism" value={avgBreakdown.professionalism} />
                    <RatingBar label="Communication" value={avgBreakdown.communication} />
                    <RatingBar label="Market knowledge" value={avgBreakdown.knowledge} />
                    <RatingBar label="Responsiveness" value={avgBreakdown.responsiveness} />
                  </div>
                )}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {ratings.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <SidebarCard title="Contact">
              <ul className="space-y-3 text-sm">
                {whatsappHref && (
                  <ContactRow
                    icon={<MessageCircle className="size-4" />}
                    href={whatsappHref}
                    label="WhatsApp HouseLink"
                    external
                  />
                )}
                <ContactRow icon={<Calendar className="size-4" />} href={contactHref} label="Send an enquiry" />
                {user?.email && (
                  <ContactRow icon={<Mail className="size-4" />} href={`mailto:${user.email}`} label={user.email} />
                )}
                {user?.city && (
                  <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                    <MapPin className="size-4 shrink-0 text-emerald-600" />
                    {user.city}, Zimbabwe
                  </li>
                )}
                <li className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                  <Clock3 className="size-4 shrink-0 text-emerald-600" />
                  Typically replies {responseTime}
                </li>
              </ul>
            </SidebarCard>

            {agency && (
              <SidebarCard title="Agency">
                <p className="font-semibold text-slate-950 dark:text-white">{agency.name}</p>
                {agency.city && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{agency.city}</p>}
                {agency.verificationStatus === "VERIFIED" && (
                  <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <BadgeCheck className="size-3.5" />
                    Verified agency
                  </p>
                )}
              </SidebarCard>
            )}

            {territories.length > 0 && (
              <SidebarCard title="Territories">
                <ul className="space-y-4">
                  {territories.map((t) => (
                    <li key={t.id}>
                      <p className="font-medium text-slate-950 dark:text-white">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.city}, {t.province}
                      </p>
                      {t.suburbs.length > 0 && (
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                          {t.suburbs.join(" · ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </SidebarCard>
            )}

            <SidebarCard title="Credentials">
              <dl className="space-y-3 text-sm">
                <CredRow label="Agent ID" value={profile.agentIdCode} />
                <CredRow label="Performance tier" value={level} />
                <CredRow
                  label="Training"
                  value={profile.trainingCompleted ? "HouseLink certified" : "In progress"}
                  highlight={profile.trainingCompleted}
                />
                <CredRow label="Total ratings" value={String(ratingCount)} />
              </dl>
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
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{value}</dd>
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="premium-card rounded-2xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ContactRow({
  icon,
  href,
  label,
  external,
}: {
  icon: ReactNode;
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex items-center gap-2.5 text-slate-700 transition hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-400"
      >
        <span className="shrink-0 text-emerald-600">{icon}</span>
        <span className="truncate">{label}</span>
      </a>
    </li>
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

function ReviewCard({ review }: { review: AgentRating }) {
  return (
    <article className="premium-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">{review.customerName}</p>
          <p className="mt-0.5 text-xs text-slate-500">Verified client</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <Star className="size-3.5 fill-amber-500 text-amber-500" />
          {review.overall.toFixed(1)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">&ldquo;{review.comment}&rdquo;</p>
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
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
