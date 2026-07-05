import { ArrowRight, Home, MapPin, Search, Umbrella, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ListingStatus } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { isStrictProductionMode } from "@/lib/production/runtime";
import { latestListings } from "@/lib/listings";
import type { Listing } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Page not found | HomeLink",
  robots: { index: false, follow: true },
};

export default async function NotFoundPage() {
  const listings = await getRecommendedListings();

  return (
    <main className="min-h-screen bg-[#f6faf8] text-slate-950">
      <section className="relative isolate overflow-hidden border-b border-emerald-100 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.14),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(14,116,144,0.12),transparent_30%)]" />
        <div className="relative mx-auto grid min-h-[78vh] max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-700">HomeLink Zimbabwe</p>
            <h1 className="mt-5 text-7xl font-black tracking-normal text-slate-950 sm:text-8xl lg:text-9xl">404</h1>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-normal text-slate-900 sm:text-5xl">
              This property page has moved, expired, or never made it onto the market.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              The link may be incorrect, the listing may have been removed, or the page may now live at a new address.
              Search HomeLink and we will get you back to verified properties quickly.
            </p>

            <form action="/search" className="mt-8 flex max-w-2xl flex-col gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
              <label className="sr-only" htmlFor="not-found-search">Search for a property</label>
              <div className="flex min-h-12 flex-1 items-center gap-3 px-3">
                <Search className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <input
                  id="not-found-search"
                  name="q"
                  placeholder="Search suburb, city, or property type"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800">
                Search
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <QuickLink href="/" label="Back to Home" icon={Home} />
              <QuickLink href="/search" label="Browse Properties" icon={MapPin} />
              <QuickLink href="/roommates" label="Find a Roommate" icon={Users} />
              <QuickLink href="/search?type=holiday_home" label="Holiday Homes" icon={Umbrella} />
            </div>
          </div>

          <div className="relative min-h-[28rem] overflow-hidden rounded-2xl border border-emerald-100 bg-slate-950 shadow-2xl">
            <Image
              src="/images/homelink-hero.png"
              alt="HomeLink property search"
              fill
              priority
              className="object-cover opacity-90"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <p className="text-sm font-semibold text-emerald-100">Still searching?</p>
              <p className="mt-2 max-w-md text-2xl font-bold">Explore verified rentals, rooms, homes for sale, and holiday stays across Zimbabwe.</p>
            </div>
          </div>
        </div>
      </section>

      {listings.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Recommended</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Available properties to try instead</h2>
            </div>
            <Link href="/search" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">
              View all properties <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.slug ?? listing.id}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={listing.image} alt={listing.title} fill className="object-cover transition group-hover:scale-[1.04]" sizes="33vw" />
                </div>
                <div className="p-4">
                  <p className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="size-3.5" /> {listing.suburb}, {listing.city}
                  </p>
                  <h3 className="mt-1 font-bold text-slate-950 group-hover:text-emerald-800">{listing.title}</h3>
                  <p className="mt-2 text-sm font-bold text-emerald-700">{formatPrice(listing.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Home }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

async function getRecommendedListings(): Promise<Listing[]> {
  if (isPostgresStoreEnabled()) {
    const rows = await getMainPrisma().listing.findMany({
      where: { status: ListingStatus.ACTIVE },
      include: { media: { orderBy: { sortOrder: "asc" } }, _count: { select: { favourites: true, enquiries: true } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 3,
    }).catch(() => []);

    return rows.map((row) => {
      const images = row.media.filter((media) => media.mediaType === "image").map((media) => media.url);
      return {
        id: row.id,
        slug: listingSlug(row.id, row.title),
        title: row.title,
        city: row.city,
        suburb: row.suburb,
        price: Number(row.price),
        currency: "USD",
        intent: row.intent.toLowerCase() as Listing["intent"],
        type: row.propertyType.toLowerCase() as Listing["type"],
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        image: images[0] ?? "/images/roommates/photo-cottage-avondale.jpg",
        images,
        verified: Boolean(row.verifiedAt),
        availableFrom: row.availableFrom?.toISOString().slice(0, 10) ?? "Available now",
        amenities: [],
        description: row.description,
        landlordName: "",
        landlordVerified: false,
        phone: "",
        whatsapp: "",
        distanceToCbdKm: 0,
        nearby: [],
        views: row.views,
        saves: row._count.favourites,
        enquiries: row._count.enquiries,
        trustScore: row.verifiedAt ? 90 : 70,
        highlight: row.verifiedAt ? "Verified listing" : "Available now",
      };
    });
  }

  return isStrictProductionMode() ? [] : latestListings.slice(0, 3);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function listingSlug(id: string, title: string) {
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
  const base = slugify(title) || "listing";
  return suffix ? `${base}-${suffix}` : base;
}
