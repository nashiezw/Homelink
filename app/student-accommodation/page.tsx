import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, MapPin, ShieldCheck, UsersRound, Wifi } from "lucide-react";

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

export default function StudentAccommodationPage() {
  return (
    <main className="bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative isolate min-h-[78vh] overflow-hidden bg-slate-950">
        <Image
          src="/images/roommates/cover-student.jpg"
          alt="Student accommodation"
          fill
          priority
          className="object-cover opacity-75"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/25" />
        <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-4 pb-14 pt-28 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-normal text-emerald-200">HouseLink Zimbabwe</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl lg:text-6xl">
            Student Accommodation
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
            Find boarding houses, student rooms, and shared accommodation near campus, schools, colleges, and daily transport routes.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/search?type=boarding_house&intent=rent"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-emerald-500"
            >
              Search boarding houses
            </Link>
            <Link
              href="/property-request?type=boarding_house"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Request student accommodation
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Icon className="size-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                <h2 className="mt-4 text-base font-semibold">{item.label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.copy}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-emerald-700 dark:text-emerald-300">
              Built for schools and universities
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">How HouseLink helps students and guardians</h2>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <p>Students can search by campus area, monthly budget, WiFi, furnished rooms, shared kitchen access, and secure boarding.</p>
              <p>Guardians can submit a request once and let HouseLink match the preferred school area, budget, and must-haves with available listings.</p>
              <p>Landlords can list boarding houses as a dedicated category while still using room-style occupancy and shared-facility controls.</p>
              <p>Admins and agents can filter, review, match, and follow up on student accommodation requests from the existing admin workflow.</p>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              <BookOpen className="size-4" aria-hidden="true" />
              Popular searches
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
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              Explore student room shares
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
