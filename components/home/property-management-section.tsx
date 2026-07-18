import { ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";

const BENEFITS = [
  "Tenant sourcing",
  "Rent collection",
  "Property inspections",
  "Maintenance coordination",
  "Financial reporting",
  "Dedicated property manager",
];

export function PropertyManagementSection() {
  return (
    <FadeIn>
      <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,184,166,0.15),transparent_45%),linear-gradient(90deg,rgba(15,23,42,0.2),rgba(15,118,110,0.12))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div className="relative min-h-[22rem] overflow-hidden rounded-2xl shadow-hero sm:min-h-[28rem] lg:order-2">
            <Image
              src="/images/property-management-dusk.webp"
              alt="Premium managed property exterior at dusk"
              fill
              className="object-cover transition duration-700 hover:scale-[1.03]"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          </div>

          <div className="lg:order-1">
            <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100">
              Property management
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.5rem]">
              Turn property ownership into passive income
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              HouseLink markets your property, finds quality tenants, manages inspections, coordinates
              maintenance, collects rent, and gives you complete visibility from one dashboard.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {BENEFITS.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/property-management#consultation"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Request property management
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/property-management"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Talk to an expert
              </Link>
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
