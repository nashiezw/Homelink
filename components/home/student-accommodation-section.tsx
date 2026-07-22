import { ArrowRight, BookOpen, Bus, ShieldCheck, Wifi } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";

const highlights = [
  { label: "Near campus search", icon: BookOpen },
  { label: "WiFi and study space", icon: Wifi },
  { label: "Transport access", icon: Bus },
  { label: "Safer verified options", icon: ShieldCheck },
];

const campusLinks = [
  ["NUST", "/boarding-houses/nust"],
  ["UZ", "/boarding-houses/uz"],
  ["MSU", "/boarding-houses/msu"],
  ["Bulawayo", "/student-accommodation/bulawayo"],
];

export function StudentAccommodationSection() {
  return (
    <FadeIn>
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative min-h-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm dark:border-slate-800">
            <Image
              src="/images/roommates/cover-student.jpg"
              alt="Student accommodation"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 44vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <p className="text-sm font-semibold text-emerald-200">Student accommodation</p>
              <h2 className="mt-2 max-w-xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
                Boarding houses and student rooms near school.
              </h2>
            </div>
          </div>

          <div>
            <p className="section-eyebrow">Campus search</p>
            <h2 className="section-title">Student accommodation near campus</h2>
            <p className="section-copy mt-3 max-w-2xl">
              HouseLink helps students, parents, and schools compare boarding-house listings by location, budget, room capacity, gender policy, WiFi, meals, bills, transport, and verification status.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {highlights.map(({ label, icon: Icon }) => (
                <div key={label} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {campusLinks.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/student-accommodation"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800"
              >
                Browse student accommodation
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/landlord/new"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                List student accommodation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
