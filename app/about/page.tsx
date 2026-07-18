import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Handshake,
  HeartHandshake,
  Home,
  HousePlus,
  KeyRound,
  MapPin,
  MessageCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "About HouseLink Zimbabwe | Built from a Real Housing Struggle",
  description:
    "Learn why HouseLink Zimbabwe was built by people who understand fake listings, unanswered calls, wasted viewings, and the need for a property platform people can trust.",
  alternates: {
    canonical: "/about",
  },
};

const storyBeats = [
  {
    title: "Calling agents who never answered.",
    body: "You see a place that looks right, make the call, send the message, and then wait with no clear answer.",
  },
  {
    title: "Arriving for viewings only to hear the place was already taken.",
    body: "Transport money, time away from work or school, and hope can disappear in one wasted trip.",
  },
  {
    title: "Seeing adverts that looked real but led nowhere.",
    body: "Old photos, copied posts, and missing details make it hard to know what is genuine.",
  },
  {
    title: "Trying to decide who could actually be trusted.",
    body: "When money, family, and safety are involved, uncertainty becomes more than an inconvenience.",
  },
];

const proofCards = [
  {
    label: "Born from experience",
    value: "We have lived it",
    body: "HouseLink began with the same unanswered calls, uncertainty, and wasted trips many Zimbabweans know too well.",
    icon: HeartHandshake,
  },
  {
    label: "Zimbabwe first",
    value: "Built for Zimbabwe",
    body: "Rooms, rentals, landlords, agents, suburbs, transport costs, and trust all matter in the Zimbabwean property journey.",
    icon: MapPin,
  },
  {
    label: "Trust comes first",
    value: "People before listings",
    body: "The goal is not only to show property. It is to help people move forward with more confidence.",
    icon: Home,
  },
];

const founders = [
  {
    name: "Tinashe Ndudzo",
    role: "Co-Founder, HouseLink",
    venture: "Founder of DreamBig",
    initials: "TN",
    image: "/images/founders/tinashe-ndudzo.jpg",
    imageAlt: "Tinashe Ndudzo, Co-Founder of HouseLink",
    objectPosition: "50% 34%",
    origin: "Masvingo to Cape Town to Kwekwe",
    body:
      "Born and raised in Masvingo, Tinashe later stayed in Cape Town, South Africa, before settling in Kwekwe. Moving between cities taught him how quickly accommodation can become stressful when information is unclear and people are hard to trust. As an entrepreneur and founder of DreamBig, he wanted HouseLink to solve a problem he had personally felt, not just create another place to browse listings.",
  },
  {
    name: "Wadzanai Tigere",
    role: "Co-Founder, HouseLink",
    venture: "Founder of Dream & Rise",
    initials: "WT",
    image: "/images/founders/wadzanai-tigere.jpeg",
    imageAlt: "Wadzanai Tigere, Co-Founder of HouseLink",
    objectPosition: "50% 24%",
    origin: "Kwekwe to South Africa to Kwekwe",
    body:
      "Born and raised in Kwekwe, Wadzanai later stayed in South Africa before returning to Kwekwe. Her own housing experiences, together with her work through Dream & Rise and other ventures, shaped a simple belief: finding a place to live should not leave people feeling exposed, confused, or alone. HouseLink is part of her commitment to a safer and more human property experience.",
  },
];

const problems = [
  { title: "Fake property listings", icon: ShieldAlert },
  { title: "Unreliable agents", icon: MessageCircle },
  { title: "Outdated adverts", icon: Clock3 },
  { title: "Wasted viewing costs", icon: WalletCards },
  { title: "Poor communication", icon: Handshake },
  { title: "Lack of trust", icon: ShieldCheck },
  { title: "Difficulty finding rooms to share", icon: UsersRound },
  { title: "Stressful property management", icon: ClipboardCheck },
];

const features = [
  { title: "Find houses and apartments to rent", icon: Home },
  { title: "Buy and sell property", icon: Building2 },
  { title: "Post a room to share", icon: HousePlus },
  { title: "Find a roommate or shared room", icon: UsersRound },
  { title: "List properties as a landlord or agent", icon: KeyRound },
  { title: "Connect with trusted agents", icon: BadgeCheck },
  { title: "Access property management support", icon: ClipboardCheck },
];

const values = [
  {
    title: "Mission",
    body:
      "To make finding, sharing, buying, selling, listing, and managing property in Zimbabwe simpler, safer, and more transparent.",
    icon: HeartHandshake,
  },
  {
    title: "Vision",
    body: "To become the property platform Zimbabwe trusts first, then carry that standard of trust into more African communities.",
    icon: Sparkles,
  },
  {
    title: "Values",
    body: "Trust, honesty, local understanding, human support, community, and reliability in the moments people need clarity most.",
    icon: CheckCircle2,
  },
];

function SectionIntro({
  eyebrow,
  title,
  copy,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      {copy ? <p className="section-copy">{copy}</p> : null}
    </div>
  );
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      rel={href.includes("?") ? "nofollow" : undefined}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-400"
    >
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

export default function AboutPage() {
  return (
    <main className="overflow-hidden bg-white text-ink dark:bg-slate-950 dark:text-slate-100">
      <section className="relative overflow-hidden bg-ink px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0">
          <Image
            src="/images/houselink-hero.png"
            alt="HouseLink Zimbabwe property search experience"
            fill
            priority
            className="scale-105 object-cover opacity-55 motion-reduce:scale-100"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,12,21,0.92)_0%,rgba(9,32,42,0.82)_45%,rgba(9,32,42,0.48)_100%)]" />
          <div className="hero-mesh absolute inset-0 opacity-80" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
        </div>
        <div className="pointer-events-none absolute -left-24 top-24 size-72 animate-hero-glow rounded-full bg-emerald-500/20 blur-3xl motion-reduce:animate-none" />
        <div className="pointer-events-none absolute right-0 top-1/3 size-96 animate-hero-drift rounded-full bg-cyan-400/10 blur-3xl motion-reduce:animate-none" />

        <div className="relative mx-auto grid min-h-[660px] max-w-7xl items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <FadeIn>
            <div>
              <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-300/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-emerald-50 shadow-sm backdrop-blur">
                <ShieldCheck className="size-4 shrink-0 text-emerald-300" aria-hidden="true" />
                About HouseLink Zimbabwe
              </p>
              <h1 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]">
                For everyone who has searched for a home and wondered <span className="text-gradient-emerald">who to trust</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-100 sm:text-lg">
                Fake listings, unanswered calls, wasted transport, dishonest agents, and confusing adverts have made property search stressful for too many Zimbabweans. HouseLink was built so finding a home, roommate, tenant, buyer, seller, or trusted agent can feel safer and clearer.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryCta href="/rent/harare">Explore Properties</PrimaryCta>
                <Link
                  href="/dashboard/landlord/new"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  List Your Property
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Verified listings", "Trusted agents", "Rooms and homes"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={120}>
            <div className="hidden lg:block">
              <div className="relative mx-auto h-[31rem] max-w-lg">
                <div className="absolute right-0 top-0 h-[26rem] w-[84%] overflow-hidden rounded-[1.65rem] border border-white/15 bg-white/8 shadow-hero">
                  <Image
                    src="/images/roommates/room-share-solution-photo.jpg"
                    alt="Zimbabwean home seekers viewing a warm living space"
                    fill
                    className="object-cover"
                    sizes="38vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 w-[66%] rounded-[1.35rem] border border-white/15 bg-white/10 p-4 shadow-hero backdrop-blur-xl">
                  <div className="relative h-44 overflow-hidden rounded-2xl">
                    <Image
                      src="/images/kwekwe-flat.png"
                      alt="A Kwekwe property listing on HouseLink"
                      fill
                      className="object-cover"
                      sizes="24vw"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Less uncertainty</p>
                      <p className="mt-1 text-lg font-black text-white">A clearer way home</p>
                    </div>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950">
                      <KeyRound className="size-5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
                <div className="absolute right-4 top-8 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-xl backdrop-blur">
                  <p className="text-2xl font-black">ZW</p>
                  <p className="mt-1 max-w-36 text-xs leading-5 text-emerald-100">Built around the way Zimbabwe really searches.</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="relative z-10 -mt-14 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {proofCards.map(({ label, value, body, icon: Icon }) => (
            <article
              key={label}
              className="hover-lift rounded-2xl border border-white/70 bg-white/95 p-5 shadow-hero backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-cyan-50 text-emerald-700 ring-1 ring-emerald-100 dark:from-emerald-950 dark:to-slate-900 dark:ring-emerald-900">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                  {label}
                </p>
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <FadeIn>
            <SectionIntro
              eyebrow="Our story"
              title="It started with a search that should have been simple."
              copy="Before HouseLink was a platform, it was a real frustration. The founders knew what it felt like to call, wait, travel, ask around, and still not know whether the listing or the person behind it could be trusted."
            />
            <div className="mt-8 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 shadow-soft dark:border-emerald-900/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-slate-950">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex -space-x-3">
                    <Image
                      src="/images/founders/tinashe-ndudzo.jpg"
                      alt="Tinashe Ndudzo"
                      width={58}
                      height={58}
                      className="size-14 rounded-2xl border-2 border-white object-cover shadow-md"
                      style={{ objectPosition: "50% 34%" }}
                    />
                    <Image
                      src="/images/founders/wadzanai-tigere.jpeg"
                      alt="Wadzanai Tigere"
                      width={58}
                      height={58}
                      className="size-14 rounded-2xl border-2 border-white object-cover shadow-md"
                      style={{ objectPosition: "50% 24%" }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                      Founder note
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      Tinashe Ndudzo and Wadzanai Tigere
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-xl font-semibold leading-8 text-emerald-950 dark:text-emerald-100">
                  "We built the platform we wished existed when we were searching for a home."
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  That experience became the reason behind every trust signal, every clearer listing, and every effort to make property decisions feel less risky.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={120}>
            <div className="relative">
              <div className="absolute bottom-5 left-5 top-5 w-px bg-gradient-to-b from-emerald-200 via-emerald-500 to-transparent dark:from-emerald-900 dark:via-emerald-600" />
              <div className="grid gap-4">
                {storyBeats.map((beat, index) => (
                  <article key={beat.title} className="premium-card hover-lift relative rounded-2xl p-5 pl-14">
                    <span className="absolute left-0 top-5 flex size-10 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white shadow-lg shadow-slate-900/20">
                      {index + 1}
                    </span>
                    <p className="text-base font-semibold text-ink dark:text-white">{beat.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{beat.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="bg-mist px-4 py-16 dark:bg-slate-900/45 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <SectionIntro
              eyebrow="Founder story"
              title="The people behind HouseLink know the problem personally."
              copy="Tinashe Ndudzo and Wadzanai Tigere did not build HouseLink from a distance. They built it after seeing how much stress, money, and trust Zimbabweans lose when the property journey is unclear."
              centered
            />
          </FadeIn>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {founders.map((founder, index) => (
              <FadeIn key={founder.name} delay={index * 120}>
                <article className="premium-card hover-lift grid h-full overflow-hidden rounded-[1.65rem] md:grid-cols-[0.92fr_1.08fr]">
                  <div className="relative min-h-[28rem] overflow-hidden bg-ink">
                    {founder.image ? (
                      <Image
                        src={founder.image}
                        alt={founder.imageAlt}
                        fill
                        className="object-cover"
                        style={{ objectPosition: founder.objectPosition }}
                        sizes="(min-width: 1024px) 24vw, 92vw"
                      />
                    ) : (
                      <div className="flex h-full min-h-[22rem] items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.38),transparent_16rem),linear-gradient(145deg,#071018,#0f2a24)] p-8 text-center">
                        <div>
                          <div className="mx-auto flex size-28 items-center justify-center rounded-[1.5rem] border border-white/15 bg-white/10 text-4xl font-black text-white shadow-xl backdrop-blur">
                            {founder.initials}
                          </div>
                          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">HouseLink Zimbabwe</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/92 via-ink/20 to-transparent" />
                    <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-100 backdrop-blur">
                      Founder
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-slate-950/68 p-4 text-white shadow-2xl backdrop-blur-md">
                      <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">{founder.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-emerald-100 drop-shadow-sm">{founder.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between p-6">
                    <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                        {founder.venture}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {founder.origin}
                      </span>
                    </div>
                    <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{founder.body}</p>
                    </div>
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Founder belief</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink dark:text-white">
                        People should not have to risk money, time, or peace of mind just to find a place they can trust.
                      </p>
                    </div>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.09),transparent_34rem)]" />
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <SectionIntro
              eyebrow="The problem we saw"
              title="Too many people had accepted stress as part of the process."
              copy="When fake posts, vague adverts, missed calls, and unreliable contacts become normal, people start moving with fear instead of confidence. HouseLink exists to change that."
              centered
            />
          </FadeIn>
          <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map(({ title, icon: Icon }, index) => (
              <FadeIn key={title} delay={index * 45}>
                <article className="premium-card hover-lift group rounded-2xl p-5 transition hover:border-emerald-200">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white dark:bg-emerald-950">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-2xl font-semibold text-emerald-100 dark:text-slate-700">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 py-16 dark:from-slate-900/50 dark:to-slate-950 sm:px-6 lg:px-8 lg:py-24">
        <div className="section-divider absolute inset-x-0 top-0" />
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <FadeIn>
            <SectionIntro
              eyebrow="What HouseLink does"
              title="So we built a clearer way to move forward."
              copy="HouseLink brings the most important parts of the property journey into one place, so renters, buyers, roommates, landlords, agents, sellers, and owners can make better decisions with less guesswork."
            />
            <div className="group relative mt-8 overflow-hidden rounded-[1.65rem] shadow-hero">
              <Image
                src="/images/bulawayo-family-house.png"
                alt="A warm Zimbabwean family home listed on HouseLink"
                width={900}
                height={640}
                className="h-auto w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-90" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">From search to settlement</p>
                <p className="mt-1 text-lg font-semibold">Clearer listings, better contact, and support when the journey gets complicated.</p>
              </div>
            </div>
          </FadeIn>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ title, icon: Icon }, index) => (
              <FadeIn key={title} delay={index * 50}>
                <article className="premium-card hover-lift flex h-full gap-4 rounded-2xl p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="pt-2 text-sm font-semibold leading-6 text-ink dark:text-white">{title}</h3>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <SectionIntro
              eyebrow="Mission, vision, values"
              title="Trust is the reason. Technology is how we serve it."
              copy="A property platform only matters if people feel safer using it. That is why HouseLink keeps coming back to transparency, local knowledge, and human support."
              centered
            />
          </FadeIn>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {values.map(({ title, body, icon: Icon }, index) => (
              <FadeIn key={title} delay={index * 100}>
                <article className="premium-card hover-lift h-full rounded-2xl p-6">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-ink text-emerald-200">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-2xl font-semibold text-ink dark:text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{body}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <FadeIn>
            <p className="section-eyebrow section-eyebrow-on-dark">Why HouseLink is different</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              We are not only organizing listings. We are helping rebuild trust.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              HouseLink is built by people who understand what it feels like to search without certainty. The work is bigger than property cards. It is about saving time, reducing wasted costs, improving communication, and helping Zimbabweans know who they are dealing with.
            </p>
          </FadeIn>
          <FadeIn delay={120}>
            <div className="grid gap-3">
              {[
                "Built from lived experience, not guesswork",
                "Local property search, room sharing, agents, and management in one place",
                "Verification, transparency, and clearer communication built into the journey",
                "A long-term Zimbabwean platform for tenants, landlords, buyers, sellers, and agents",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <p className="text-sm font-semibold leading-6 text-slate-100">{item}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <FadeIn>
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-ink text-white shadow-hero">
            <Image src="/images/property-management-dusk.png" alt="Managed HouseLink property at dusk" fill className="object-cover opacity-35" sizes="100vw" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(6,78,59,0.94),rgba(15,23,42,0.9))]" />
            <div className="hero-mesh absolute inset-0 opacity-50" />
            <div className="relative grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12 lg:py-12">
              <div className="max-w-2xl">
                <p className="section-eyebrow section-eyebrow-on-dark">Start your next move</p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  Move forward with people you can trust.
                </h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-slate-200">
                  Find a home, search for a roommate, list property, or connect with trusted people across Zimbabwe's property journey.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/rent/harare"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-emerald-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  Find a Home
                  <Search className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/roommates"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Find a Roommate
                  <UsersRound className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/dashboard/landlord/new"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  List a Property
                  <HousePlus className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </main>
  );
}
