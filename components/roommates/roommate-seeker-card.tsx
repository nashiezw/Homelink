import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Calendar,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { cn } from "@/lib/utils";

export type RoommateSeekerCardProps = {
  id: string;
  name: string;
  city: string;
  suburb: string;
  budgetMin: number;
  budgetMax: number;
  gender: string;
  age?: number;
  occupation?: string;
  lifestyle: string;
  availableFrom: string;
  verified: boolean;
  lookingFor?: "room" | "roommate";
  tags: readonly string[];
  compact?: boolean;
  compatibility?: number;
};

const LIFESTYLE_STYLES: Record<string, string> = {
  quiet: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800",
  professional: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
  student: "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-800",
  social: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
};

function formatLifestyle(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function lifestyleKey(lifestyle: string) {
  const lower = lifestyle.toLowerCase();
  if (lower.includes("student")) return "student";
  if (lower.includes("quiet") || lower.includes("professional")) return "professional";
  if (lower.includes("social")) return "social";
  return "professional";
}

export function RoommateSeekerCard({
  id,
  name,
  city,
  suburb,
  budgetMin,
  budgetMax,
  gender,
  age,
  occupation,
  lifestyle,
  availableFrom,
  verified,
  lookingFor = "room",
  tags,
  compact = false,
  compatibility,
}: RoommateSeekerCardProps) {
  const intent =
    lookingFor === "roommate" ? "Looking for a roommate" : "Looking for a room";
  const lifestyleClass = LIFESTYLE_STYLES[lifestyleKey(lifestyle)] ?? LIFESTYLE_STYLES.professional;

  if (compact) {
    return (
      <Link
        href={`/roommates/people/${id}`}
        className="premium-card hover-lift group flex min-w-[17rem] max-w-[19rem] shrink-0 flex-col rounded-3xl p-5 transition hover:border-emerald-200"
      >
        <AgentAvatar name={name} size="lg" verified={verified} />
        <p className="mt-4 truncate text-lg font-bold text-slate-950 dark:text-white">{name}</p>
        <p className="mt-0.5 text-sm text-slate-500">{occupation ?? intent}</p>
        <p className="mt-3 text-xl font-bold text-emerald-700">
          US${budgetMin}-{budgetMax}
          <span className="text-sm font-medium text-slate-400"> /mo</span>
        </p>
        <span className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 text-sm font-semibold text-white group-hover:bg-emerald-800">
          View profile
        </span>
      </Link>
    );
  }

  return (
    <article className="gpu-card group hover-lift rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(16,32,36,0.05)] transition-all duration-300 hover:border-emerald-200/80 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
          <AgentAvatar name={name} size="xl" verified={verified} />
          {compatibility !== undefined && (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-bold text-white shadow-md">
              {compatibility}% compatible
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-slate-950 dark:text-white">{name}</h3>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200">
                <BadgeCheck className="size-3.5" />
                Verified
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide ring-1 ring-inset", lifestyleClass)}>
              <Sparkles className="size-3" />
              {formatLifestyle(lifestyleKey(lifestyle))}
            </span>
          </div>

          {occupation && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Briefcase className="size-3.5 text-emerald-600" />
              {occupation}
            </p>
          )}

          <p className="mt-1 text-sm text-slate-500">{intent}</p>

          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="size-4 shrink-0 text-emerald-600" />
            Prefers {suburb}, {city}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-4 sm:min-w-[11rem] sm:border-l sm:border-slate-100 sm:pl-8 dark:sm:border-slate-800">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">Budget</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              US${budgetMin}-{budgetMax}
              <span className="text-sm font-medium text-slate-400">/mo</span>
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-1">
            <div>
              <dt className="text-slate-400">Gender</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{gender}</dd>
            </div>
            {age ? (
              <div>
                <dt className="text-slate-400">Age</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{age} yrs</dd>
              </div>
            ) : null}
            <div className="col-span-2 sm:col-span-1">
              <dt className="flex items-center gap-1 text-slate-400">
                <Calendar className="size-3" />
                Move-in
              </dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{availableFrom}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2">
            <Link
              href={`/roommates/people/${id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-800"
            >
              View profile
              <ArrowRight className="size-4" />
            </Link>
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-400">
              <MessageCircle className="size-3.5 text-emerald-600" />
              Secure messaging
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
