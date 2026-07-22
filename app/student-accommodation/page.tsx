import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  Bus,
  CheckCircle2,
  ClipboardList,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  UsersRound,
  Wifi,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Student Accommodation and Boarding Houses in Zimbabwe | HouseLink",
  description:
    "Find boarding houses, student rooms, and shared accommodation near universities, colleges, schools, and campus transport routes in Zimbabwe.",
  alternates: {
    canonical: "/student-accommodation",
  },
};

const trustBadges = ["Campus-first search", "Boarding houses", "Rooms and shares", "Verified support"];

const features = [
  { label: "Campus proximity", copy: "Compare places by university, college, suburb, school, or common transport route.", icon: MapPin },
  { label: "Student essentials", copy: "Check WiFi, furnished rooms, study space, bills, meals, parking, and backup water.", icon: Wifi },
  { label: "Guardian confidence", copy: "Use HouseLink requests when a parent or guardian wants details confirmed before viewing.", icon: ShieldCheck },
  { label: "Shared living", copy: "Match with student-friendly rooms and roommates when a full unit is too expensive.", icon: UsersRound },
];

const popularSearches = [
  ["Near NUST", "/boarding-houses/nust"],
  ["Near UZ", "/boarding-houses/uz"],
  ["Near MSU", "/boarding-houses/msu"],
  ["Bulawayo", "/student-accommodation/bulawayo"],
  ["Harare", "/student-accommodation/harare"],
  ["Boarding under $200", "/search?type=boarding_house&intent=rent&maxPrice=200"],
];

const paths = [
  {
    label: "Search live listings",
    copy: "Browse rooms and boarding houses already available on HouseLink.",
    href: "/search?type=boarding_house&intent=rent",
    icon: Search,
    tone: "bg-emerald-500 text-white",
  },
  {
    label: "Submit a request",
    copy: "Share campus, budget, gender policy, move-in date, and must-haves.",
    href: "/property-request?type=boarding_house",
    icon: ClipboardList,
    tone: "bg-cyan-500 text-white",
  },
  {
    label: "List accommodation",
    copy: "Landlords can add student accommodation for marketplace review.",
    href: "/dashboard/landlord/new",
    icon: Home,
    tone: "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
  },
];

const campusChecks = [
  ["Budget fit", "rent, deposit, and bills"],
  ["Route check", "campus and transport access"],
  ["Viewing ready", "rules and essentials confirmed"],
];

const comparisonRows = [
  ["Location", "Campus, transport routes, suburb safety, and walking distance."],
  ["Living rules", "Gender policy, curfew, visitor policy, capacity, and quiet hours."],
  ["Monthly cost", "Rent, deposit, utility split, meals, cleaning, and included services."],
  ["Readiness", "Furniture, WiFi, study area, security, backup water, and parking."],
];

const journey = [
  ["1", "Search by campus", "Start with a school, suburb, or route instead of a generic city-wide rental search."],
  ["2", "Compare the essentials", "Scan price, distance, rules, occupancy, and student-ready amenities in one flow."],
  ["3", "Request help", "Ask HouseLink to collect missing details before a viewing or parent handover."],
];

export default function StudentAccommodationPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative min-h-[680px] overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <Image
            src="/images/roommates/cover-student.jpg"
            alt="Student accommodation"
            fill
            priority
            fetchPriority="high"
            quality={78}
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,12,21,0.92)_0%,rgba(9,32,42,0.78)_46%,rgba(9,32,42,0.38)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-slate-950 via-slate-950/72 to-transparent" />
        </div>

        <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="min-w-0 text-white">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-300/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-emerald-50 shadow-sm backdrop-blur">
              <ShieldCheck className="size-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <span className="truncate">Student accommodation on HouseLink</span>
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-6xl lg:text-[4.15rem]">
              Campus-close rooms for{" "}
              <span className="text-gradient-emerald">study, safety, and real life.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg sm:leading-8">
              Search boarding houses, rooms, and shared accommodation by campus area, monthly budget, gender policy, WiFi, meals, transport access, and viewing readiness.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {trustBadges.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
                  <CheckCircle2 className="size-3.5 text-emerald-300" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/search?type=boarding_house&intent=rent"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-400 sm:w-auto"
              >
                Browse student listings
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/property-request?type=boarding_house"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 sm:w-auto"
              >
                Request a match
              </Link>
            </div>
          </div>

          <div className="lg:flex lg:justify-end">
            <div className="w-full max-w-xl rounded-lg border border-white/15 bg-white/10 p-3 text-white shadow-2xl backdrop-blur-xl">
              <div className="rounded-lg bg-white p-4 text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Campus finder</p>
                    <h2 className="mt-2 text-xl font-semibold leading-tight">Start with where the student needs to be.</h2>
                  </div>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    <BookOpen className="size-5" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {popularSearches.slice(0, 4).map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      className="inline-flex min-h-11 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {label}
                      <ArrowRight className="size-4 text-emerald-600" aria-hidden="true" />
                    </Link>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3 dark:border-slate-800">
                  {campusChecks.map(([value, label]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {paths.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className="rounded-lg border border-white/15 bg-white/10 p-3 transition hover:bg-white/15">
                      <span className={`flex size-9 items-center justify-center rounded-lg ${item.tone}`}>
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="mt-3 block text-sm font-semibold text-white">{item.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-200">{item.copy}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="section-eyebrow">What students compare</p>
              <h2 className="section-title">A better way to judge boarding houses.</h2>
              <p className="section-copy max-w-2xl">
                The page now gives student accommodation its own decision flow, while still feeling connected to the main HouseLink marketplace.
              </p>
            </div>
            <Link
              href="/roommates?lookingFor=student"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-emerald-200 hover:bg-emerald-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <UsersRound className="size-4" aria-hidden="true" />
              Explore student room shares
            </Link>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-4">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="gpu-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8 dark:bg-slate-900/40">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative min-h-[28rem] overflow-hidden rounded-lg bg-slate-900">
            <Image
              src="/images/roommates/photo-bedroom-senga.jpg"
              alt="Student room with bed and study space"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 42vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="max-w-sm rounded-lg border border-white/15 bg-white/12 p-4 text-white backdrop-blur-md">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <Bus className="size-4" aria-hidden="true" />
                  Route-aware searching
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-100">
                  Built for the practical questions that matter before a student moves in.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="section-eyebrow">Decision checklist</p>
            <h2 className="section-title">Make the important details visible before the viewing.</h2>
            <div className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
              {comparisonRows.map(([label, copy]) => (
                <div key={label} className="grid gap-2 p-4 sm:grid-cols-[10rem_1fr] sm:p-5">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{label}</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/search?type=boarding_house&intent=rent"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800"
              >
                Browse listings
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/landlord/new"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <BedDouble className="size-4" aria-hidden="true" />
                Add student accommodation
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.72fr]">
            <div>
              <p className="section-eyebrow">How it works</p>
              <h2 className="section-title">One student-housing flow for search, requests, and supply.</h2>
              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {journey.map(([step, label, copy]) => (
                  <article key={step} className="gpu-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                      {step}
                    </span>
                    <h3 className="mt-4 text-base font-semibold">{label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                <BookOpen className="size-4" aria-hidden="true" />
                Quick campus searches
              </div>
              <div className="mt-4 grid gap-2">
                {popularSearches.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:border-emerald-400 hover:text-emerald-800 dark:border-emerald-900 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <Link
                href="/property-request?type=boarding_house"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                <ClipboardList className="size-4" aria-hidden="true" />
                Submit a student housing request
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
