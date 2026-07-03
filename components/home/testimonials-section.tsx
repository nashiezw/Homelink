import { Calendar, MapPin, Star } from "lucide-react";
import Image from "next/image";
import { FadeIn } from "@/components/ui/fade-in";
import type { HomeTestimonial } from "@/lib/homepage/types";

type TestimonialsSectionProps = {
  testimonials: HomeTestimonial[];
};

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <FadeIn>
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="section-eyebrow">Customer stories</p>
              <h2 className="section-title">Trusted by renters, buyers, and owners</h2>
            </div>
            <div className="flex gap-1 text-amber-400" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-5 fill-current" />
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <blockquote
                key={item.id}
                className="premium-card hover-lift flex flex-col rounded-2xl p-6 transition hover:border-emerald-200"
              >
                <div className="flex items-center gap-3">
                  {item.photoUrl ? (
                    <Image
                      src={item.photoUrl}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                      {item.photoInitial}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{item.name}</p>
                    <div className="mt-0.5 flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3 ${i < item.rating ? "fill-current" : "fill-transparent"}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mt-4 flex-1 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  &ldquo;{item.quote}&rdquo;
                </p>

                <footer className="mt-5 space-y-2 border-t border-slate-200/80 pt-4 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">{item.propertyTitle}</p>
                  <p className="flex items-center gap-1 text-slate-500">
                    <MapPin className="size-3" aria-hidden="true" />
                    {item.location}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-slate-500">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {item.transactionType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" aria-hidden="true" />
                      {item.date}
                    </span>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
