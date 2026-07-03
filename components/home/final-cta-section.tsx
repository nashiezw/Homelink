import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";
import type { CmsFinalCta } from "@/lib/homepage/cms-types";

type FinalCtaSectionProps = {
  content: CmsFinalCta;
  imageUrl?: string;
};

export function FinalCtaSection({ content, imageUrl = "/images/roommates/room-share-solution-photo.jpg" }: FinalCtaSectionProps) {
  return (
    <FadeIn>
      <section className="px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-ink text-white shadow-hero">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover opacity-35"
            sizes="100vw"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,78,59,0.92),rgba(15,23,42,0.88))]" />
          <div className="hero-mesh absolute inset-0 opacity-50" />

          <div className="relative px-6 py-14 text-center sm:px-10 sm:py-16 lg:px-14">
            <p className="section-eyebrow section-eyebrow-on-dark">{content.eyebrow}</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {content.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-200">{content.description}</p>

            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
              {content.actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={
                    action.primary
                      ? "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-emerald-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
                      : "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                  }
                >
                  {action.label}
                  <ArrowRight className="size-4 opacity-70" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
