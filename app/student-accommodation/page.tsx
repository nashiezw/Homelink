import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, BookOpen, ClipboardList, Home, MapPin, Search, ShieldCheck, UsersRound, Wifi } from "lucide-react";

export const metadata: Metadata = {
  title: "Student Accommodation and Boarding Houses in Zimbabwe | HouseLink",
  description:
    "Find boarding houses, student rooms, and shared accommodation near universities, colleges, schools, and campus transport routes in Zimbabwe.",
  alternates: {
    canonical: "/student-accommodation",
  },
};

const features = [
  { label: "Near campus", copy: "Search by university, college, suburb, city, or nearby transport route.", icon: MapPin },
  { label: "Student essentials", copy: "Filter for WiFi, furnished rooms, shared kitchens, parking, and bills included.", icon: Wifi },
  { label: "Verified support", copy: "HouseLink consultants can confirm details before students arrange a viewing.", icon: ShieldCheck },
  { label: "Shared living", copy: "Students can also use roommate matching when they prefer a room share.", icon: UsersRound },
];

const popularSearches = [
  ["Near NUST", "/boarding-houses/nust"],
  ["Near UZ", "/boarding-houses/uz"],
  ["Near MSU", "/boarding-houses/msu"],
  ["Boarding under $200", "/search?type=boarding_house&intent=rent&maxPrice=200"],
];

const paths = [
  {
    label: "Search live listings",
    copy: "Browse boarding houses and rooms that are already on HouseLink.",
    href: "/search?type=boarding_house&intent=rent",
    icon: Search,
  },
  {
    label: "Submit a request",
    copy: "Tell HouseLink the campus, budget, gender policy, and must-haves.",
    href: "/property-request?type=boarding_house",
    icon: ClipboardList,
  },
  {
    label: "List accommodation",
    copy: "Landlords can add verified student accommodation for review.",
    href: "/dashboard/landlord/new",
    icon: Home,
  },
];

export default function StudentAccommodationPage() {
  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div className="min-w-0">
            <p className="section-eyebrow">Student accommodation</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-ink sm:text-4xl lg:text-5xl dark:text-white">
              Boarding houses and student rooms near campus.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Search verified student accommodation by campus area, monthly budget, room capacity, gender policy, WiFi, meals, bills, transport access, and house rules.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {paths.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="gpu-card group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800"
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-slate-950 group-hover:text-emerald-800 dark:text-white">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.copy}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {popularSearches.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="surface-panel overflow-hidden rounded-lg p-3">
            <div className="relative min-h-[20rem] overflow-hidden rounded-lg bg-slate-900">
              <Image
                src="/images/roommates/cover-student.jpg"
                alt="Student accommodation"
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 420px, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="rounded-lg border border-white/15 bg-white/12 p-4 text-white backdrop-blur-md">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-100">
                    <MapPin className="size-4" aria-hidden="true" />
                    Campus-focused search
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-100">
                    Built for students, guardians, school administrators, and landlords managing boarding-house supply.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="section-eyebrow">What to compare</p>
              <h2 className="section-title">Student-ready listing details</h2>
              <p className="section-copy max-w-2xl">
                The page stays close to the main HouseLink marketplace experience while surfacing the details parents and students ask about first.
              </p>
            </div>
            <Link
              href="/search?type=boarding_house&intent=rent"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 sm:w-auto"
            >
              Browse listings
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="gpu-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
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

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div>
            <p className="section-eyebrow">How it works</p>
            <h2 className="section-title">One flow for students, guardians, landlords, and admin.</h2>
            <div className="mt-6 grid gap-3">
              {[
                ["Students and guardians", "Search live boarding-house listings or submit a request with area, budget, campus, and must-haves."],
                ["Landlords", "List boarding houses with room capacity, campus access, gender policy, WiFi, meals, security, curfew, and house rules."],
                ["HouseLink admin", "Review student requests, match listings, export demand, and send WhatsApp-ready follow-ups."],
              ].map(([label, copy]) => (
                <div key={label} className="surface-panel rounded-lg p-4">
                  <p className="text-sm font-semibold text-ink dark:text-white">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="surface-panel rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
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
              href="/roommates?lookingFor=student"
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              <UsersRound className="size-4" aria-hidden="true" />
              Explore student room shares
            </Link>
            <Link
              href="/dashboard/landlord/new"
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <BedDouble className="size-4" aria-hidden="true" />
              Add a student accommodation listing
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
