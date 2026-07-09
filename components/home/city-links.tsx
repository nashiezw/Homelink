import { ArrowRight } from "lucide-react";
import Link from "next/link";

const CITIES = ["Harare", "Bulawayo", "Gweru", "Mutare", "Kwekwe"];

export function CityLinks() {
  return (
    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-rows-3">
      {CITIES.map((city) => (
        <Link
          key={city}
          href={`/search?city=${encodeURIComponent(city)}`}
          rel="nofollow"
          className="group flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-950 dark:text-white">{city}</p>
            <ArrowRight
              className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 text-sm text-slate-500">Browse listings in {city}</p>
        </Link>
      ))}
      <Link
        href="/search"
        className="group flex flex-col justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 sm:col-span-2 lg:col-span-1"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">All cities</p>
          <ArrowRight
            className="size-4 text-emerald-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
            aria-hidden="true"
          />
        </div>
        <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">Search nationwide</p>
      </Link>
    </div>
  );
}
