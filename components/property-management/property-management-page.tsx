"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Headphones,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { ConsultationForm } from "@/components/property-management/consultation-form";
import { getTelHref, getWhatsAppHref } from "@/lib/settings/contact";
import {
  pmFaqs,
  pmHeroStats,
  pmHeroTrustItems,
  pmPricingPlans,
  pmProcessSteps,
  pmServices,
  pmTestimonials,
} from "@/lib/property-management/content";

function scrollToConsultation() {
  document.getElementById("consultation")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function PropertyManagementPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { config } = usePlatformConfig();
  const contact = config?.contact;

  return (
    <main className="bg-mist">
      {/* Hero */}
      <section className="relative min-h-[36rem] overflow-hidden lg:min-h-[40rem]">
        <Image
          src="/images/property-management-dusk.png"
          alt="Luxury property at dusk"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/20" />

        <div className="relative mx-auto flex min-h-[36rem] max-w-7xl flex-col px-4 py-12 sm:px-6 lg:min-h-[40rem] lg:px-8 lg:py-16">
          <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1.15fr_24rem]">
            <div className="max-w-xl text-white">
              <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                Property management that works for you
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Your Property Should Earn.{" "}
                <span className="text-emerald-400">Not Stress You.</span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-slate-200 sm:text-lg">
                We help you rent, manage and protect your property while you enjoy consistent income.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-6">
                {pmHeroTrustItems.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-emerald-300 ring-1 ring-white/20">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-medium text-slate-100">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="justify-self-center lg:justify-self-end">
              <ConsultationForm id="consultation" className="w-full max-w-[24rem]" />
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 backdrop-blur-md sm:grid-cols-4">
            {pmHeroStats.map((stat) => (
              <div key={stat.label} className="bg-ink/40 px-4 py-4 text-center sm:px-6">
                <p className="text-xl font-bold text-white sm:text-2xl">{stat.value}</p>
                <p className="mt-1 text-[11px] text-slate-300 sm:text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-ink sm:text-4xl">Everything Your Property Needs</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              End-to-end management so you can focus on what matters - while your property earns.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pmServices.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(16,32,36,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(16,32,36,0.1)]"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-ink sm:text-4xl">How It Works</h2>
          <div className="mt-12 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-[48rem] items-start justify-between gap-2 px-2">
              {pmProcessSteps.map((item, index) => (
                <div key={item.step} className="relative flex flex-1 flex-col items-center text-center">
                  <span className="flex size-11 items-center justify-center rounded-full bg-emerald-700 text-base font-bold text-white shadow-md">
                    {item.step}
                  </span>
                  <ClipboardList className="mt-3 size-5 text-emerald-600" />
                  <h3 className="mt-3 text-sm font-bold text-ink">{item.title}</h3>
                  <p className="mt-1.5 max-w-[9rem] text-xs leading-relaxed text-slate-500">{item.body}</p>
                  {index < pmProcessSteps.length - 1 && (
                    <span className="absolute left-[calc(50%+1.5rem)] top-5 hidden h-px w-[calc(100%-3rem)] border-t border-dashed border-emerald-300 lg:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-ink sm:text-4xl">Choose the Plan That Works for You</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Transparent percentage-based pricing. No setup fees. Cancel with 30 days&apos; notice.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {pmPricingPlans.map((plan) => (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-[0_4px_24px_rgba(16,32,36,0.06)] ${
                  plan.popular
                    ? "border-emerald-700 shadow-[0_8px_40px_rgba(16,32,36,0.12)] ring-2 ring-emerald-700"
                    : "border-slate-200/80"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-800 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most Popular
                  </span>
                )}
                {plan.popular ? (
                  <div className="-mx-2 -mt-2 mb-4 rounded-xl bg-emerald-800 p-4 text-white">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="mt-2 text-4xl font-bold">
                      {plan.rate}
                      <span className="text-base font-medium text-emerald-100"> of rent</span>
                    </p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                    <p className="mt-2 text-4xl font-bold text-emerald-800">
                      {plan.rate}
                      <span className="text-base font-medium text-slate-500"> of rent</span>
                    </p>
                  </>
                )}
                <p className="text-sm text-slate-600">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={scrollToConsultation}
                  className={`mt-8 h-11 w-full rounded-lg border text-sm font-semibold transition ${
                    plan.popular
                      ? "border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-900"
                      : "border-slate-200 text-ink hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  Get Started
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-emerald-700">
            Trusted by property owners across Zimbabwe
          </p>
          <div className="mt-8 flex gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pmTestimonials.map((t) => (
              <article
                key={t.id}
                className="w-[min(100%,18rem)] shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="relative size-10 overflow-hidden rounded-full">
                    <Image src={t.image} alt={t.name} fill className="object-cover" sizes="40px" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.location}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ + Contact */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold text-ink">Frequently Asked Questions</h2>
            <div className="mt-8 space-y-2">
              {pmFaqs.map((faq, index) => {
                const open = openFaq === index;
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="font-semibold text-ink">{faq.question}</span>
                      <ChevronDown
                        className={`size-5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="border-t border-slate-100 px-5 pb-4 pt-2">
                        <p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_4px_24px_rgba(16,32,36,0.06)]">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Headphones className="size-7" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-ink">Still have questions?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Our property management team is ready to help. Chat on WhatsApp or call us directly.
            </p>
            <a
              href={contact ? getWhatsAppHref(contact) : "/contact"}
              target={contact ? "_blank" : undefined}
              rel={contact ? "noopener noreferrer" : undefined}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="size-4" />
              Chat on WhatsApp
            </a>
            <a
              href={contact ? getTelHref(contact) : "/contact"}
              className="mt-3 inline-flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <Phone className="size-4" />
              {contact?.phoneLabel ?? "Call HouseLink"}
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-emerald-800 py-12 sm:py-14">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <h2 className="max-w-xl text-center text-2xl font-bold text-white sm:text-left sm:text-3xl">
            Ready to Experience Hassle-Free Property Management?
          </h2>
          <button
            type="button"
            onClick={scrollToConsultation}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-8 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
          >
            Request Free Consultation
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      {/* Logged-in full form link */}
      <section className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-slate-600">
            Already a property owner?{" "}
            <Link href="/dashboard/owner" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Access your owner dashboard
            </Link>
            {" / "}
            <Link href="/auth" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
