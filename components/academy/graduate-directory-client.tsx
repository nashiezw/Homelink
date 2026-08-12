"use client";

import { useMemo, useState } from "react";
import { Award, Search, ShieldCheck, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DirectoryProfile = {
  id: string;
  name: string;
  headline: string;
  bio: string | null;
  courses: string[];
  certificates: Array<{ number: string; course: string; href: string }>;
  spotlightStatus: string;
};

export function GraduateDirectoryClient({ profiles, courseOptions }: { profiles: DirectoryProfile[]; courseOptions: string[] }) {
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("");
  const featured = profiles.filter((profile) => profile.spotlightStatus === "APPROVED").slice(0, 3);
  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesQuery = !q || [profile.name, profile.headline, profile.bio ?? "", profile.courses.join(" ")].join(" ").toLowerCase().includes(q);
      const matchesCourse = !course || profile.courses.includes(course);
      return matchesQuery && matchesCourse;
    });
  }, [course, profiles, query]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 size-5 shrink-0" />
          <div>
            <h2 className="text-lg font-black">Directory disclaimer</h2>
            <p className="mt-2 text-sm leading-6">
              These profiles show optional HouseLink Academy training participation or completion only. They do not confirm statutory registration, professional licensing, accreditation, or regulatory approval by any public authority.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem_auto] lg:items-end">
          <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Search by name, course, or focus area
            <div className="mt-2 flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-900">
              <Search className="size-4 shrink-0 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent py-3 text-sm normal-case tracking-normal text-slate-950 outline-none dark:text-white" placeholder="Search public profiles..." />
            </div>
          </label>
          <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Course
            <select value={course} onChange={(event) => setCourse(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm normal-case tracking-normal text-slate-950 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white">
              <option value="">All courses</option>
              {courseOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          {(query || course) && (
            <Button variant="secondary" onClick={() => { setQuery(""); setCourse(""); }}><X className="size-4" /> Clear</Button>
          )}
        </div>
        <p className="mt-3 text-sm text-slate-500">{filteredProfiles.length} public profile{filteredProfiles.length === 1 ? "" : "s"} shown</p>
      </section>

      {featured.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Star className="size-5 text-emerald-700" />
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">Featured learners</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((profile) => <DirectoryCard key={profile.id} profile={profile} featured />)}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Public learner profiles</h2>
        </div>
        {filteredProfiles.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map((profile) => <DirectoryCard key={profile.id} profile={profile} />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            No public profiles match that search.
          </div>
        )}
      </section>
    </div>
  );
}

function DirectoryCard({ profile, featured = false }: { profile: DirectoryProfile; featured?: boolean }) {
  return (
    <article className="flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-lg font-black leading-tight text-slate-950 dark:text-white">{profile.name}</p>
          <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{profile.headline}</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
          <Award className="size-5" />
        </span>
      </div>
      {profile.bio && <p className="mt-4 line-clamp-5 text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.bio}</p>}
      <div className="mt-auto pt-4">
        {profile.courses.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.courses.map((course) => (
              <span key={course} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{course}</span>
            ))}
          </div>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">Academy participant</span>
        )}
        {featured && <p className="mt-4 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">Featured by Academy admin</p>}
        {profile.certificates.length > 0 && (
          <div className="mt-3 space-y-2">
            {profile.certificates.slice(0, 2).map((certificate) => (
              <a key={certificate.number} href={certificate.href} className="block rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                Verify {certificate.course}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
