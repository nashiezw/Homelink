"use client";

import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Heart,
  Home,
  Key,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  defaultRoomSharePanel,
  RoomShareWizard,
  type RoomShareIntent,
  type RoomSharePanelState,
} from "@/components/roommates/match-preferences-form";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import {
  affordabilityBudgetParam,
  readRentalAffordabilityMemory,
  type RentalAffordabilityMemory,
} from "@/lib/calculators/affordability-memory";
import { featuredListings } from "@/lib/listings";
import {
  audiencePaths,
  recommendedRoommates,
  roommateSolutionPoints,
  roommateSteps,
  successStories,
} from "@/lib/roommates/content";
import { roommateMedia, heroMemberStack, heroCollage, stepPhotos, audienceImages } from "@/lib/roommates/media";
import type { Listing } from "@/lib/types";
import type { RoommateMatch, RoommateProfile } from "@/lib/store/types";
import { cn, formatPrice } from "@/lib/utils";

type RoommateCardPerson = {
  id: string;
  name: string;
  city: string;
  suburb: string;
  budgetMin: number;
  budgetMax: number;
  gender: string;
  age: number;
  occupation: string;
  lifestyle: string;
  availableFrom: string;
  verified: boolean;
  lookingFor: "room" | "roommate" | "either";
  tags: string[];
  smoking: boolean;
  pets: boolean;
  languages: string[];
  compatibility: number;
  interests: string[];
  avatarUrl?: string;
  coverPhoto?: string;
};

type PublicRoommateProfileSummary = {
  userId: string;
  name: string;
  city?: string;
  profile: RoommateProfile & Record<string, unknown>;
};

const AUDIENCE_ICONS = { search: Search, home: Home, users: Users } as const;
const STEP_ICONS = [UserPlus, Search, MessageCircle, Calendar, Key] as const;

type SuburbHighlight = {
  name: string;
  rooms: number;
  roommates: number;
  average: string;
  photo: string;
};

const suburbHighlightPhotos: Record<string, string> = {
  avondale: "/images/roommates/cover-testimonial-rudo.jpg",
  senga: "/images/gweru-room-courtyard.webp",
  hillside: "/images/bulawayo-family-house.webp",
  newtown: "/images/kwekwe-flat.webp",
};

const defaultSuburbNames = ["Avondale", "Senga", "Hillside", "Newtown"];

const matchingFilters = [
  "Recommended for you",
  "Best compatibility",
  "Recently active",
  "Verified members",
  "Students",
  "Professionals",
  "Female only",
  "Pet friendly",
  "Non-smokers",
] as const;

const trustPillars = [
  { title: "Verified members", body: "Identity, phone, and profile checks before people can build trust on HouseLink." },
  { title: "HouseLink assisted viewings", body: "Schedule viewings with better guidance so payments never happen blindly." },
  { title: "Fraud protection", body: "Report suspicious users, block bad actors, and get support before money changes hands." },
  { title: "Secure messaging", body: "Keep early conversations inside HouseLink until both sides are comfortable." },
] as const;

/* --- Hero-only (keep exactly as loved) --- */

function RmEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("rm-eyebrow text-emerald-200", className)}>{children}</p>;
}

function AvatarStack({ urls, size = 36 }: { urls: readonly string[]; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {urls.map((url, i) => (
        <Image
          key={url}
          src={url}
          alt={`HouseLink roommate member ${i + 1}`}
          width={size}
          height={size}
          className="rounded-full border-2 border-white/90 object-cover shadow-sm"
          style={{ width: size, height: size, zIndex: urls.length - i }}
        />
      ))}
    </div>
  );
}

function HeroPhotoCollage({ roomCount, profileCount }: { roomCount: number; profileCount: number }) {
  return (
    <div className="rm-photo-stack relative mx-auto h-[22rem] w-full max-w-md lg:mx-0 lg:h-[26rem] lg:max-w-none">
      <div className="rm-glow-orb absolute -right-8 top-8 size-48 bg-emerald-400/40" />
      <div className="rm-glow-orb absolute -left-6 bottom-12 size-36 bg-teal-300/30" style={{ animationDelay: "2s" }} />
      {heroCollage.map((src, i) => (
        <div
          key={src}
          className={cn(
            "absolute overflow-hidden rounded-2xl border-4 border-white/90 shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
            i === 0 && "rm-photo-tilt-left left-0 top-6 z-10 h-[14rem] w-[58%]",
            i === 1 && "rm-photo-tilt-right right-0 top-0 z-20 h-[16rem] w-[62%]",
            i === 2 && "absolute left-[18%] bottom-0 z-30 h-[13rem] w-[55%] rotate-1",
          )}
        >
          <Image src={src} alt={`Shared room and roommate lifestyle photo ${i + 1}`} fill className="object-cover" sizes="30vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      ))}
      <div className="absolute -bottom-2 left-1/2 z-40 -translate-x-1/2 rounded-2xl rm-glass-dark px-5 py-3 shadow-xl">
        <p className="text-center text-xs font-bold uppercase tracking-wider text-emerald-200">Live now</p>
        <p className="text-center text-lg font-black text-white">{roomCount} rooms · {profileCount} profiles</p>
      </div>
    </div>
  );
}

function LocationMarquee({ highlights }: { highlights: SuburbHighlight[] }) {
  const items = [...highlights, ...highlights];
  return (
    <section className="overflow-hidden border-y border-emerald-900/20 bg-[#071018] py-6 lg:py-7">
      <div className="rm-shell mb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/90">Top areas</p>
            <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">Browse by suburb</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/60">Explore pockets with real room supply, active roommate demand, and realistic monthly pricing.</p>
        </div>
      </div>
      <div className="rm-marquee-track gap-4 px-4">
        {items.map((loc, i) => (
          <Link
            key={`${loc.name}-${i}`}
            href={`/rooms/${encodeURIComponent(loc.name.toLowerCase().replace(/\s+/g, "-"))}`}
            className="group relative flex w-[calc(100vw-2rem)] max-w-[21.75rem] shrink-0 gap-3 overflow-hidden rounded-[1.35rem] border border-white/12 bg-white/[0.06] p-3 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-white/10 sm:w-[22.5rem] sm:max-w-none sm:gap-4 sm:p-4"
          >
            <div className="relative h-24 w-[6.5rem] shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 sm:w-28">
              <Image src={loc.photo} alt={loc.name} fill className="object-cover transition duration-500 group-hover:scale-110" sizes="(min-width: 640px) 112px, 104px" />
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="break-words text-[16px] font-extrabold leading-5 text-white sm:text-[17px]">{loc.name}</p>
              <div className="mt-3 grid grid-cols-[minmax(2.8rem,1fr)_minmax(2.8rem,1fr)_minmax(4.8rem,auto)] gap-2 text-center">
                <span className="min-w-0 rounded-lg bg-white/8 px-1.5 py-1">
                  <b className="block text-sm text-white">{loc.rooms}</b>
                  <span className="text-[10px] text-white/50">rooms</span>
                </span>
                <span className="min-w-0 rounded-lg bg-white/8 px-1.5 py-1">
                  <b className="block text-sm text-white">{loc.roommates}</b>
                  <span className="text-[10px] text-white/50">people</span>
                </span>
                <span className="min-w-[4.8rem] rounded-lg bg-emerald-400/15 px-1.5 py-1">
                  <b className="block whitespace-nowrap text-[13px] leading-5 text-emerald-200">{loc.average}</b>
                  <span className="text-[10px] text-emerald-100/60">avg</span>
                </span>
              </div>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-300">Browse suburb <ArrowRight className="size-3" /></p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* --- Light page system (everything after hero) --- */

function LightEyebrow({ children }: { children: ReactNode }) {
  return <p className="rm-light-eyebrow">{children}</p>;
}

function LightSectionHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  action,
  centered,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  subtitle?: string;
  action?: ReactNode;
  centered?: boolean;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-6", centered && "flex-col items-center text-center")}>
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        <LightEyebrow>{eyebrow}</LightEyebrow>
        <h2 className="mt-4 text-[clamp(1.85rem,3.5vw,2.85rem)] font-black leading-tight tracking-tight text-ink">
          {title}
          {accent ? <> <span className="rm-accent-text">{accent}</span></> : null}
        </h2>
        {subtitle ? <p className={cn("mt-3 text-base leading-relaxed text-slate-600 lg:text-lg", centered && "mx-auto")}>{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

function JourneyPathCard({
  path,
  image,
  index,
}: {
  path: (typeof audiencePaths)[number];
  image: string;
  index: number;
}) {
  const Icon = AUDIENCE_ICONS[path.icon];
  return (
    <Link
      href={path.href}
      className={cn(
        "group relative col-span-12 overflow-hidden rounded-[1.65rem] bg-white shadow-[0_18px_60px_rgba(16,32,36,0.08)] ring-1 ring-slate-200/80 transition duration-500 hover:-translate-y-2 hover:shadow-[0_32px_80px_rgba(16,185,129,0.16)] hover:ring-emerald-300/70 md:col-span-4 rm-rise",
        index === 1 && "rm-rise-delay-1",
        index === 2 && "rm-rise-delay-2",
      )}
    >
      <div className="relative aspect-[16/11] overflow-hidden">
        <Image src={image} alt={path.title} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <span className="absolute left-5 top-5 flex size-16 items-center justify-center rounded-[1.25rem] bg-white text-emerald-700 shadow-xl transition group-hover:scale-105">
          <Icon className="size-8" />
        </span>
        <span className="absolute bottom-5 left-5 rounded-full bg-emerald-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-950">
          Journey {index + 1}
        </span>
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-black tracking-tight text-ink">{path.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{path.body}</p>
        <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-black text-emerald-800 transition group-hover:bg-emerald-700 group-hover:text-white">
          {path.cta} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function RoomListingCard({
  listing,
  size = "standard",
}: {
  listing: Listing;
  size?: "spotlight" | "stacked" | "compact" | "standard";
}) {
  const [saved, setSaved] = useState(false);
  const listingHref = `/listings/${listing.slug ?? listing.id}`;
  const imageHeights = {
    spotlight: "h-64 sm:h-72 lg:h-80",
    stacked: "h-44 sm:h-48 lg:h-40",
    compact: "h-44",
    standard: "h-60",
  } as const;

  if (size === "spotlight") {
    return (
      <article className="group relative col-span-12 min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-emerald-200/80 bg-slate-950 shadow-[0_20px_60px_rgba(16,185,129,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(16,185,129,0.18)] sm:min-h-[30rem] lg:col-span-7 lg:h-full lg:min-h-[31rem]">
        <Link href={listingHref} className="absolute inset-0">
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
            sizes="55vw"
          />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          {listing.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-emerald-800 shadow-sm">
              <BadgeCheck className="size-3" /> Verified
            </span>
          )}
          <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white shadow-sm">
            {listing.trustScore}% trust
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          className={cn(
            "absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/95 shadow-sm transition hover:scale-105",
            saved && "border-rose-200 text-rose-500",
          )}
          aria-label="Save room"
        >
          <Heart className={cn("size-4", saved && "fill-current")} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-100/90">
            <MapPin className="size-4" />
            {listing.suburb}, {listing.city}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <Link href={listingHref} className="max-w-xl">
              <h3 className="text-2xl font-black leading-tight transition group-hover:text-emerald-200">
                {listing.title}
              </h3>
            </Link>
            <p className="rounded-2xl bg-white px-4 py-2 text-xl font-black text-emerald-800 shadow-lg">
              {formatPrice(listing.price)}<span className="text-sm font-semibold text-emerald-600">/mo</span>
            </p>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/78">{listing.highlight || listing.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {listing.amenities.slice(0, 4).map((amenity) => (
              <span key={amenity} className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                {amenity}
              </span>
            ))}
            <Link
              href={listingHref}
              className="ml-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-emerald-900 transition hover:bg-emerald-50"
            >
              View {listing.suburb} room details
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "gpu-card group flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(16,32,36,0.06)] transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_16px_40px_rgba(16,185,129,0.12)]",
        size === "stacked" && "lg:h-auto",
        size === "compact" && "w-[17rem] shrink-0 sm:w-[19rem]",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden rounded-t-2xl", imageHeights[size])}>
        <Link href={listingHref} className="block size-full">
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="30vw"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {listing.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-emerald-800 shadow-sm">
              <BadgeCheck className="size-3" /> Verified
            </span>
          )}
          <span className="rounded-full bg-emerald-800 px-3 py-1 text-xs font-black text-white shadow-sm">
            {listing.trustScore}% trust
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          className={cn(
            "absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 shadow-sm transition hover:scale-105",
            saved && "border-rose-200 text-rose-500",
          )}
          aria-label="Save room"
        >
          <Heart className={cn("size-3.5", saved && "fill-current")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1 text-xs font-medium text-slate-500 sm:text-sm">
            <MapPin className="size-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{listing.suburb}, {listing.city}</span>
          </p>
          <p className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-base font-black text-emerald-700">
            {formatPrice(listing.price)}<span className="text-xs font-medium text-emerald-600">/mo</span>
          </p>
        </div>

        <Link href={listingHref} className="mt-2 block">
          <h3 className={cn(
            "font-semibold leading-snug text-ink transition group-hover:text-emerald-800",
            "text-base",
          )}>
            {listing.title}
          </h3>
        </Link>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {listing.highlight || listing.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {listing.amenities.slice(0, 4).map((amenity) => (
            <span key={amenity} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {amenity}
            </span>
          ))}
        </div>

        <Link
          href={listingHref}
          className="mt-4 inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-ink transition hover:border-emerald-200 hover:bg-emerald-50"
        >
          View {listing.suburb} room details
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function RoomScrollRail({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) return null;
  return (
    <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:thin]">
      <div className="flex w-max gap-4">
        {listings.map((l) => (
          <RoomListingCard key={l.id} listing={l} size="compact" />
        ))}
      </div>
    </div>
  );
}

function SeekerChip({
  person,
  onChat,
}: {
  person: RoommateCardPerson;
  onChat: () => void;
}) {
  const avatarUrl = "avatarUrl" in person ? person.avatarUrl : undefined;
  return (
    <Link
      href={`/roommates/people/${person.id}`}
      className="group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:ring-emerald-300"
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl ring-2 ring-emerald-100">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={person.name} fill className="object-cover" sizes="56px" />
        ) : (
          <div className="flex size-full items-center justify-center bg-emerald-100 text-sm font-bold text-emerald-800">{person.name.slice(0, 2)}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{person.name}</p>
        <p className="truncate text-xs text-slate-500">{person.occupation} · US${person.budgetMin}–{person.budgetMax}</p>
        <p className="text-xs font-semibold text-emerald-700">{person.compatibility}% match</p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onChat(); }}
        className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
      >
        Intro
      </button>
    </Link>
  );
}

function TestimonialCard({ story }: { story: (typeof successStories)[number] }) {
  return (
    <blockquote className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_16px_50px_rgba(16,32,36,0.08)] ring-1 ring-slate-200/80 transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(16,185,129,0.12)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={story.coverPhoto} alt={`${story.name} roommate success story`} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-center gap-3">
          <Image src={story.avatarUrl} alt={story.name} width={48} height={48} className="size-12 rounded-full object-cover ring-2 ring-white" />
          <div className="text-white">
            <cite className="font-bold not-italic">{story.name}</cite>
            <p className="text-xs text-white/80">{story.role} · {story.city}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-0.5 text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}</div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
            <BadgeCheck className="size-3" /> Verified story
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <span className="rounded-xl bg-slate-50 p-3 text-slate-600"><b className="block text-ink">{story.city}</b>Location</span>
          <span className="rounded-xl bg-slate-50 p-3 text-slate-600"><b className="block text-ink">{story.outcome}</b>Result</span>
        </div>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">&ldquo;{story.quote}&rdquo;</p>
        <p className="mt-4 text-sm font-bold text-emerald-700">Safe match completed through HouseLink</p>
      </div>
    </blockquote>
  );
}

export function RoommatesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, showToast } = useApp();
  const [matches, setMatches] = useState<RoommateMatch[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [postgresRooms, setPostgresRooms] = useState<Listing[]>([]);
  const [postgresSeekers, setPostgresSeekers] = useState<RoommateCardPerson[]>([]);
  const [shareIntent, setShareIntent] = useState<RoomShareIntent>("seeking");
  const [sharePanel, setSharePanel] = useState<RoomSharePanelState>(defaultRoomSharePanel);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [calculatorBudget, setCalculatorBudget] = useState<RentalAffordabilityMemory | null>(null);
  const [calculatorBudgetApplied, setCalculatorBudgetApplied] = useState(false);

  function scrollToRoomShareWizard(intent?: RoomShareIntent) {
    if (intent) setShareIntent(intent);
    document.getElementById("room-share-wizard")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  useEffect(() => {
    if (!user) return;
    void apiFetch<{ profile: RoommateProfile | null }>("/api/v1/roommates/profile").then((r) => {
      if (r.data?.profile && matches.length === 0) {
        void apiFetch<{ matches: RoommateMatch[] }>("/api/v1/roommates/matches", {
          method: "POST",
          body: JSON.stringify({ lookingFor: r.data.profile!.lookingFor }),
        }).then((res) => {
          if (res.data?.matches) setMatches(res.data.matches.slice(0, 3));
        });
      }
    });
  }, [user, matches.length]);

  useEffect(() => {
    void apiFetch<Listing[]>("/api/v1/listings?intent=rent").then((result) => {
      if (Array.isArray(result.data) && result.data.length) {
        setPostgresRooms(result.data.filter((listing) => ["room", "flat", "cottage"].includes(listing.type)));
      }
    });
    void apiFetch<{ profiles: PublicRoommateProfileSummary[] }>("/api/v1/roommates/profiles?limit=8").then((result) => {
      const people = result.data?.profiles?.map(toRoommateCardPerson).filter(Boolean) as RoommateCardPerson[] | undefined;
      if (people?.length) setPostgresSeekers(people);
    });
  }, []);

  useEffect(() => {
    if (calculatorBudgetApplied) return;
    const memory = readRentalAffordabilityMemory();
    const budgetFromUrl = searchParams.get("budgetMax");
    const maxBudget = budgetFromUrl || affordabilityBudgetParam(memory);
    if (memory) setCalculatorBudget(memory);
    if (!maxBudget) {
      setCalculatorBudgetApplied(true);
      return;
    }

    setShareIntent("seeking");
    setSharePanel((current) => ({
      ...current,
      budgetMax: maxBudget,
      budgetMin: current.budgetMin || "80",
    }));
    setCalculatorBudgetApplied(true);
    if (searchParams.get("source") === "calculator") {
      setTimeout(() => scrollToRoomShareWizard("seeking"), 150);
    }
  }, [calculatorBudgetApplied, searchParams]);

  const fallbackRooms = featuredListings
    .filter((l) => l.intent === "rent" && ["room", "flat", "cottage"].includes(l.type))
    .sort((a, b) => b.trustScore - a.trustScore);
  const rooms = (postgresRooms.length ? postgresRooms : fallbackRooms).sort((a, b) => b.trustScore - a.trustScore);

  const [spotlight, ...restRooms] = rooms;
  const sideRooms = restRooms.slice(0, 2);
  const scrollRooms = restRooms.slice(2, 8);
  const fallbackSeekers = recommendedRoommates.map((person) => ({
    ...person,
    tags: [...person.tags],
    languages: [...person.languages],
    interests: [...person.interests],
    lookingFor: person.lookingFor as RoommateCardPerson["lookingFor"],
  }));
  const topSeekers = (postgresSeekers.length ? postgresSeekers : fallbackSeekers).slice(0, 6);
  const featuredSeeker = topSeekers[0];
  const otherSeekers = topSeekers.slice(1, 4);
  const moreSeekers = topSeekers.slice(4);
  const liveRoomCount = postgresRooms.length;
  const liveProfileCount = postgresSeekers.length;
  const liveRoommateStats = [
    { value: formatCompactCount(liveRoomCount), label: liveRoomCount === 1 ? "room" : "rooms" },
    { value: formatCompactCount(liveProfileCount), label: liveProfileCount === 1 ? "profile" : "profiles" },
  ];
  const suburbHighlights = buildSuburbHighlights(postgresRooms, postgresSeekers);
  const activeCities = Array.from(new Set(postgresSeekers.map((person) => person.city).filter(Boolean))).slice(0, 3);
  const heroLocationLine = activeCities.length ? activeCities.join(" · ") : "Zimbabwe";

  function runRoomShareSubmit() {
    if (shareIntent === "seeking") {
      const params = new URLSearchParams();
      if (sharePanel.location.trim()) {
        params.set("location", sharePanel.location.trim());
        const parts = sharePanel.location.split(",").map((p) => p.trim());
        if (parts[0]) params.set("city", parts[0]);
        if (parts[1]) params.set("suburb", parts[1]);
      }
      params.set("intent", "rent");
      params.set("type", sharePanel.roomType);
      if (sharePanel.budgetMin) params.set("minPrice", sharePanel.budgetMin);
      if (sharePanel.budgetMax) params.set("maxPrice", sharePanel.budgetMax);
      if (sharePanel.genderPreference !== "any") params.set("gender", sharePanel.genderPreference);
      if (sharePanel.moveIn) params.set("moveIn", sharePanel.moveIn);
      if (sharePanel.lifestyle === "student") params.set("maxPrice", sharePanel.budgetMax || "200");
      amenities.forEach((a) => params.append("amenities", a));
      if (sharePanel.furnished || amenities.includes("Furnished")) params.append("amenities", "Furnished");
      router.push(`/search?${params.toString()}`);
      return;
    }

    if (!user) {
      showToast("Sign in to post your room.", "info");
      router.push("/auth?next=/dashboard/landlord/new");
      return;
    }
    setShareSubmitting(true);
    router.push("/dashboard/landlord/new");
    setShareSubmitting(false);
  }

  function requireAuth(path: string) {
    if (!user) {
      showToast("Sign in to continue.", "info");
      router.push(`/auth?next=${encodeURIComponent(path)}`);
      return;
    }
    router.push(path);
  }

  function openRoommateIntroduction(personId: string) {
    requireAuth(`/roommates/people/${personId}`);
  }

  return (
    <main className="rm-page overflow-x-hidden">
      {/* ═══ HERO — unchanged, user loves this ═══ */}
      <section className="relative bg-[#0a1419]">
        <div className="relative min-h-[38rem] lg:min-h-[42rem]">
          <Image
            src={roommateMedia.hero}
            alt="Young people sharing a bright modern home in Zimbabwe"
            fill
            priority
            className="object-cover object-center scale-105"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071018]/95 via-[#0a1419]/75 to-[#0a1419]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1419] via-transparent to-black/40" />
          <div className="rm-grain absolute inset-0 opacity-40" />
          <div className="rm-glow-orb absolute left-1/4 top-1/3 size-72 bg-emerald-500/20" />

          <div className="rm-shell relative flex min-h-[38rem] flex-col justify-center py-16 lg:min-h-[42rem] lg:py-20">
            <div className="rm-grid items-center gap-y-12">
              <div className="col-span-12 lg:col-span-6 rm-rise">
                <RmEyebrow>
                  <Users className="size-4 text-emerald-300" /> Room sharing in Zimbabwe
                </RmEyebrow>
                <h1 className="rm-text-shadow mt-6 text-[clamp(2.75rem,6.5vw,5rem)] font-black leading-[0.98] tracking-tight text-white">
                  Your next room
                  <span className="mt-2 block bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                    or your next roommate.
                  </span>
                </h1>
                <p className="rm-text-shadow mt-5 max-w-xl text-lg leading-8 text-white/90 lg:text-xl">
                  Zimbabwe&apos;s most trusted room-sharing platform — real photos, verified profiles, and matches that actually fit your lifestyle.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <AvatarStack urls={heroMemberStack} />
                  <div>
                    <p className="text-base font-bold text-white">
                      {liveProfileCount} active {liveProfileCount === 1 ? "profile" : "profiles"}
                    </p>
                    <p className="text-sm text-white/65">{heroLocationLine}</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button type="button" onClick={() => scrollToRoomShareWizard("seeking")} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 text-base font-bold text-emerald-900 shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition hover:-translate-y-0.5 hover:bg-emerald-50">
                    <Search className="size-4" /> Find a room
                  </button>
                  <button type="button" onClick={() => scrollToRoomShareWizard("posting")} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 text-base font-bold text-white shadow-[0_12px_40px_rgba(16,185,129,0.45)] transition hover:-translate-y-0.5">
                    <Home className="size-4" /> Post a room
                  </button>
                  <Link href={user ? "/roommates/profile" : "/auth"} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/15">
                    <Users className="size-4" /> Find a roommate
                  </Link>
                </div>
              </div>
              <div className="col-span-12 hidden sm:block lg:col-span-6 rm-rise rm-rise-delay-2">
                <HeroPhotoCollage roomCount={liveRoomCount} profileCount={liveProfileCount} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search console */}
      <section className="relative z-20 bg-[#0a1419] pb-8 pt-2 lg:pb-10">
        <div className="rm-shell">
          <div className="mx-auto max-w-[58rem]">
            <RoomShareWizard
              variant="band"
              intent={shareIntent}
              onIntentChange={setShareIntent}
              panel={sharePanel}
              onChange={setSharePanel}
              amenities={amenities}
              onToggleAmenity={(l) => setAmenities((c) => (c.includes(l) ? c.filter((x) => x !== l) : [...c, l]))}
              onSubmit={runRoomShareSubmit}
              submitting={shareSubmitting}
              liveStats={liveRoommateStats}
            />
            {calculatorBudget && shareIntent === "seeking" && (
              <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                Using your calculator budget: US${Math.round(calculatorBudget.recommendedMaxRent)}/month · {calculatorBudget.ratingLabel}
              </p>
            )}
          </div>
        </div>
      </section>

      <LocationMarquee highlights={suburbHighlights} />

      {/* ═══ Light editorial body — one cohesive story ═══ */}
      <div className="rm-light-surface">
        {/* Paths */}
        <section className="py-14 lg:py-20">
          <div className="rm-shell">
            <LightSectionHeader
              eyebrow="Choose your path"
              title="Which one are you?"
              subtitle="Three journeys. One trusted platform for room sharing in Zimbabwe."
            />
            <div className="rm-grid mt-8">
              {audiencePaths.map((path, i) => (
                <JourneyPathCard key={path.id} path={path} image={audienceImages[i]} index={i} />
              ))}
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 border-t border-slate-200/80 pt-6">
              {roommateSolutionPoints.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm text-slate-600">
                  <BadgeCheck className="size-4 shrink-0 text-emerald-600" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Featured rooms — editorial magazine */}
        <section id="rooms" className="bg-white py-12 lg:py-16">
          <div className="rm-shell">
            <div className="rounded-[1.75rem] bg-[#f8faf9] p-4 ring-1 ring-slate-200/80 sm:p-6 lg:p-7">
              <LightSectionHeader
                eyebrow="Featured rooms"
                title="Rooms available"
                accent="now"
                subtitle="Hand-picked verified listings with real photos, cleaner pricing, and room details that are easy to scan."
                action={(
                  <Link href="/rooms/avondale" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-700">
                    View all rooms <ArrowRight className="size-4" />
                  </Link>
                )}
              />
              {spotlight && (
                <div className="rm-grid mt-7 items-stretch">
                  <RoomListingCard listing={spotlight} size="spotlight" />
                  <div className="col-span-12 grid gap-4 self-stretch lg:col-span-5">
                    {sideRooms.map((l) => (
                      <RoomListingCard key={l.id} listing={l} size="stacked" />
                    ))}
                  </div>
                </div>
              )}
              {scrollRooms.length > 0 && (
                <>
                  <p className="mt-6 text-sm font-semibold text-slate-500">More rooms to explore</p>
                  <RoomScrollRail listings={scrollRooms} />
                </>
              )}
            </div>
          </div>
        </section>

        {/* Roommate discovery — warm editorial */}
        <section id="roommates" className="py-12 lg:py-16">
          <div className="rm-shell">
            <LightSectionHeader
              eyebrow="Smart matching"
              title="Find people who fit"
              accent="your life"
              subtitle="HouseLink combines roommate preferences, budget, lifestyle and location signals so matching feels closer to a trusted introduction than a cold listing."
            />
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {matchingFilters.map((filter, i) => (
                <button
                  key={filter}
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5",
                    i === 0 ? "border-emerald-700 bg-emerald-700 text-white shadow-md" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-800",
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_70px_rgba(16,32,36,0.08)] ring-1 ring-slate-200/80">
              <div className="rm-grid">
                <div className="relative col-span-12 min-h-[20rem] lg:col-span-5">
                  <Image src={roommateMedia.heroAccent} alt="Compatible roommates relaxing together in a shared home" fill className="object-cover" sizes="40vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-900/35 to-black/10" />
                  <div className="absolute left-5 top-5 rounded-2xl bg-white/95 px-4 py-3 shadow-xl">
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-700">AI-style matching</p>
                    <p className="mt-1 text-lg font-black text-ink">94% top fit</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                    <p className="rm-eyebrow text-emerald-200">Find your perfect match</p>
                    <h2 className="mt-4 text-2xl font-black lg:text-3xl">
                      People looking for a <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">roommate</span>
                    </h2>
                  </div>
                </div>
                <div className="col-span-12 flex flex-col gap-4 p-5 sm:p-6 lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">Lifestyle, budget, language, move-in date, and compatibility — matched for you.</p>
                    <Link href="/roommates/profile" className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
                      Create profile <ArrowRight className="size-4" />
                    </Link>
                  </div>
                  {featuredSeeker && (
                    <SocialSeekerCard
                      person={featuredSeeker}
                      featured
                      onChat={() => openRoommateIntroduction(featuredSeeker.id)}
                      onInvite={() => openRoommateIntroduction(featuredSeeker.id)}
                    />
                  )}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {otherSeekers.map((person) => (
                      <SeekerChip key={person.id} person={person} onChat={() => openRoommateIntroduction(person.id)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {moreSeekers.length > 0 && (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {moreSeekers.map((person) => (
                  <SocialSeekerCard
                    key={person.id}
                    person={person}
                    onChat={() => openRoommateIntroduction(person.id)}
                    onInvite={() => openRoommateIntroduction(person.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white py-12 lg:py-16">
          <div className="rm-shell">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[#f8faf9] shadow-[0_18px_60px_rgba(16,32,36,0.06)]">
              <div className="rm-grid items-stretch">
                <div className="relative col-span-12 min-h-[21rem] overflow-hidden lg:col-span-5">
                <Image src={stepPhotos[0]} alt="Roommates preparing a move into shared accommodation" fill className="object-cover" sizes="40vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                    <p className="text-sm font-bold uppercase tracking-wider text-emerald-200">How it works</p>
                    <p className="mt-2 text-3xl font-black leading-tight">From search to move-in, safely.</p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {[
                        ["5", "steps"],
                        ["Verified", "checks"],
                        ["Secure", "chat"],
                      ].map(([value, label]) => (
                        <span key={label} className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
                          <b className="block text-xl">{value}</b>
                          <span className="text-xs text-white/70">{label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-span-12 p-5 sm:p-6 lg:col-span-7">
                  <ol className="grid gap-3 sm:grid-cols-2">
                  {roommateSteps.map((step, i) => {
                    const Icon = STEP_ICONS[i] ?? Sparkles;
                    return (
                        <li key={step.step} className={cn(
                          "relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md",
                          i === 4 && "sm:col-span-2",
                        )}>
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{String(step.step).padStart(2, "0")}</p>
                            <h3 className="mt-0.5 text-base font-black text-ink">{step.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust and safety */}
        <section className="bg-[#071018] py-14 text-white lg:py-20">
          <div className="rm-shell">
            <div className="rm-grid items-center gap-8">
              <div className="col-span-12 lg:col-span-5">
                <RmEyebrow>
                  <ShieldCheck className="size-4 text-emerald-300" /> Trust & safety
                </RmEyebrow>
                <h2 className="mt-5 text-[clamp(2rem,4vw,3.25rem)] font-black leading-tight">
                  Built for safer shared living.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/70">
                  Room sharing needs more than pretty listings. HouseLink puts verification, assisted viewings, secure messaging and support around the full journey.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    [formatCompactCount(liveRoomCount), liveRoomCount === 1 ? "live room" : "live rooms"],
                    [formatCompactCount(liveProfileCount), liveProfileCount === 1 ? "visible profile" : "visible profiles"],
                    ["Verified", "safety checks"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-2xl font-black text-emerald-300">{value}</p>
                      <p className="mt-1 text-xs text-white/55">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-12 grid gap-4 sm:grid-cols-2 lg:col-span-7">
                {trustPillars.map((item) => (
                  <div key={item.title} className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-5 transition hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-white/[0.09]">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                      <ShieldCheck className="size-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-black">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-14 lg:py-20">
          <div className="rm-shell">
            <LightSectionHeader
              eyebrow="Real stories"
              title="What our members"
              accent="say"
              subtitle="Room seekers and landlords across Zimbabwe."
              centered
            />
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {successStories.map((s) => (
                <TestimonialCard key={s.name} story={s} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-20 pt-0 lg:pb-24">
          <div className="rm-shell">
            <div className="relative min-h-[22rem] overflow-hidden rounded-[1.75rem] shadow-2xl">
              <Image src={roommateMedia.cta} alt="Roommates moving into a shared home" fill className="object-cover" sizes="90vw" />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/80 to-emerald-800/70" />
              <div className="relative flex min-h-[22rem] flex-col items-center justify-center px-8 py-14 text-center">
                <div className="mb-5 flex items-center gap-3 rounded-full rm-glass-dark px-4 py-2">
                  <AvatarStack urls={heroMemberStack.slice(0, 4)} size={32} />
                  <span className="text-sm font-semibold text-white">
                    Join {liveProfileCount} active {liveProfileCount === 1 ? "profile" : "profiles"}
                  </span>
                </div>
                <h2 className="max-w-2xl text-[clamp(2rem,4vw,3rem)] font-black leading-tight text-white">
                  Find your perfect <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">roommate today.</span>
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-50/90">
                  Verified Zimbabweans are finding trusted roommates and quality accommodation through HouseLink.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => scrollToRoomShareWizard("seeking")} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 text-base font-bold text-emerald-900 shadow-lg transition hover:-translate-y-0.5">
                    <Search className="size-4" /> Find a room
                  </button>
                  <button type="button" onClick={() => scrollToRoomShareWizard("posting")} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5">
                    <Home className="size-4" /> Post a room
                  </button>
                  <Link href={user ? "/roommates/profile" : "/auth"} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/15">
                    <Users className="size-4" /> Find a roommate
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

function SocialSeekerCard({
  person,
  featured,
  onChat,
  onInvite,
}: {
  person: RoommateCardPerson;
  featured?: boolean;
  onChat: () => void;
  onInvite: () => void;
}) {
  const avatarUrl = "avatarUrl" in person ? person.avatarUrl : undefined;
  const coverPhoto = person.coverPhoto || roommateMedia.shared;

  return (
    <article className={cn(
      "group overflow-hidden rounded-2xl bg-[#fafaf9] ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg",
      featured ? "flex flex-col lg:flex-row" : "flex flex-col sm:grid sm:grid-cols-[12rem_minmax(0,1fr)]",
    )}>
      <div className={cn("relative overflow-hidden", featured ? "aspect-[16/10] lg:aspect-auto lg:min-h-[14rem] lg:w-1/2" : "min-h-[12rem] sm:min-h-[14rem]")}>
        <Image src={coverPhoto} alt={`${person.name} lifestyle`} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">{person.compatibility}% match</span>
        {person.verified && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-emerald-800">
            <BadgeCheck className="size-3" /> Verified
          </span>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-xl ring-2 ring-white">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={person.name} fill className="object-cover" sizes="40px" />
            ) : (
              <div className="flex size-full items-center justify-center bg-emerald-700 text-sm font-bold text-white">{person.name.slice(0, 2)}</div>
            )}
          </div>
          <div className="min-w-0 text-white">
            <h3 className="truncate text-sm font-bold">{person.name}</h3>
            <p className="truncate text-[11px] text-white/85">{person.occupation} · {person.suburb}</p>
          </div>
        </div>
      </div>
      <div className={cn("flex flex-col p-4 sm:p-5", featured && "flex-1 lg:justify-center lg:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">{person.lifestyle} lifestyle</p>
            <p className={cn("mt-1 font-black text-emerald-800", featured ? "text-2xl" : "text-xl")}>
              US${person.budgetMin}–{person.budgetMax}
              <span className="text-sm font-medium text-slate-400">/mo</span>
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            {person.age} yrs
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
          Looking around {person.suburb}, {person.city}. Speaks {person.languages.join(", ")} and prefers a {person.tags.slice(0, 2).join(", ").toLowerCase()} household.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Tag>{person.smoking ? "Smoker" : "Non-smoker"}</Tag>
          <Tag>{person.pets ? "Pets ok" : "No pets"}</Tag>
          <Tag><Calendar className="mr-1 inline size-3" />{person.availableFrom}</Tag>
          {featured && person.interests.slice(0, 2).map((interest) => <Tag key={interest}>{interest}</Tag>)}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
          <Link href={`/roommates/people/${person.id}`} className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-ink hover:border-emerald-300">
            Profile
          </Link>
          <button type="button" onClick={onInvite} className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
            <UserPlus className="size-3.5" /> Intro
          </button>
          <button type="button" onClick={onChat} className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
            <MessageCircle className="size-3.5" /> HouseLink
          </button>
          <button type="button" className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-rose-200 hover:text-rose-600">
            <Heart className="size-3.5" /> Save
          </button>
        </div>
      </div>
    </article>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{children}</span>;
}

function toRoommateCardPerson(summary: PublicRoommateProfileSummary): RoommateCardPerson | null {
  const profile = summary.profile;
  if (!profile?.active) return null;
  const preferredLocations = Array.isArray(profile.preferredLocations) ? profile.preferredLocations.map(String) : [];
  const [suburb, cityFromLocation] = splitLocation(preferredLocations[0]);
  const name = summary.name || stringValue(profile.name) || "HouseLink member";
  const occupation = stringValue(profile.occupation) || "HouseLink member";
  const lifestyle = stringValue(profile.lifestyle) || "compatible";
  const languages = stringArray(profile.languages, ["English"]);
  const tags = stringArray(profile.tags, [
    profile.smoking ? "Smoker" : "Non-smoker",
    profile.pets ? "Pets ok" : "No pets",
    lifestyle,
  ]).slice(0, 5);
  return {
    id: summary.userId,
    name,
    city: summary.city || cityFromLocation || "Zimbabwe",
    suburb: suburb || cityFromLocation || "Zimbabwe",
    budgetMin: Number(profile.budgetMin) || 100,
    budgetMax: Number(profile.budgetMax) || 300,
    gender: stringValue(profile.gender) || stringValue(profile.genderPreference) || "Any",
    age: Number(profile.age) || 25,
    occupation,
    lifestyle,
    availableFrom: stringValue(profile.availableFrom) || "Available now",
    verified: true,
    lookingFor: normalizeLookingFor(profile.lookingFor),
    tags,
    smoking: Boolean(profile.smoking),
    pets: Boolean(profile.pets),
    languages,
    compatibility: Number(profile.compatibility) || 90,
    interests: stringArray(profile.interests, tags).slice(0, 4),
    avatarUrl: stringValue(profile.avatarUrl),
    coverPhoto: stringValue(profile.coverPhoto) || roommateMedia.shared,
  };
}

function normalizeLookingFor(value: unknown): RoommateCardPerson["lookingFor"] {
  return value === "roommate" || value === "either" || value === "room" ? value : "room";
}

function formatCompactCount(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function splitLocation(location?: string) {
  if (!location) return ["", ""] as const;
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts.at(-1) ?? ""] as const;
  return [parts[0] ?? "", ""] as const;
}

function buildSuburbHighlights(rooms: Listing[], seekers: RoommateCardPerson[]): SuburbHighlight[] {
  const rows = new Map<string, { name: string; rooms: Listing[]; roommates: number }>();

  function ensure(name: string) {
    const key = name.trim().toLowerCase();
    if (!rows.has(key)) rows.set(key, { name: name.trim(), rooms: [], roommates: 0 });
    return rows.get(key)!;
  }

  defaultSuburbNames.forEach((name) => ensure(name));
  rooms.forEach((room) => {
    const name = room.suburb || room.city;
    if (!name) return;
    ensure(name).rooms.push(room);
  });
  seekers.forEach((person) => {
    const name = person.suburb || person.city;
    if (!name) return;
    ensure(name).roommates += 1;
  });

  return Array.from(rows.values())
    .sort((a, b) => (b.rooms.length + b.roommates) - (a.rooms.length + a.roommates))
    .slice(0, 4)
    .map((row) => {
      const average = row.rooms.length
        ? `US$${Math.round(row.rooms.reduce((sum, room) => sum + room.price, 0) / row.rooms.length)}`
        : "New";
      const photoKey = row.name.toLowerCase();
      return {
        name: row.name,
        rooms: row.rooms.length,
        roommates: row.roommates,
        average,
        photo: suburbHighlightPhotos[photoKey] ?? row.rooms[0]?.image ?? "/images/roommates/cover-testimonial-rudo.jpg",
      };
    });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.length ? value.map(String).filter(Boolean) : fallback;
}
