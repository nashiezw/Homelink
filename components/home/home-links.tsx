"use client";

import { useRouter } from "next/navigation";
import { Building2, Home, Hotel, Map, Palmtree, Trees, UsersRound, Warehouse } from "lucide-react";
import { propertyCategories } from "@/lib/listings";

const categoryRoutes: Record<string, string> = {
  Rooms: "/search?type=room",
  Houses: "/search?type=house",
  Flats: "/search?type=flat",
  Cottages: "/search?type=cottage",
  Commercial: "/search?type=commercial",
  Land: "/search?type=land",
  "Holiday Homes": "/search?type=holiday_home",
  Roommates: "/roommates",
};

const categoryIcons = {
  Rooms: Hotel,
  Houses: Home,
  Flats: Building2,
  Cottages: Trees,
  Commercial: Warehouse,
  Land: Map,
  "Holiday Homes": Palmtree,
  Roommates: UsersRound,
};

const categoryHints: Record<string, string> = {
  Rooms: "From shared to ensuite",
  Houses: "Family homes & estates",
  Flats: "Apartments & units",
  Cottages: "Garden cottages & granny flats",
  Commercial: "Shops, offices & warehouses",
  Land: "Residential & commercial plots",
  "Holiday Homes": "Short-stay lodges & getaways",
  Roommates: "Compatible housemates",
};

export function CategoryGrid() {
  const router = useRouter();

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {propertyCategories.map((category) => {
        const Icon = categoryIcons[category as keyof typeof categoryIcons] ?? Home;

        return (
          <button
            type="button"
            key={category}
            onClick={() => router.push(categoryRoutes[category] ?? "/search")}
            className="group relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-glow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800"
          >
            <span className="relative flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-cyan-50 text-emerald-700 ring-1 ring-emerald-100/80 transition duration-300 group-hover:from-emerald-600 group-hover:to-teal-600 group-hover:text-white group-hover:ring-emerald-500/30 dark:from-emerald-950 dark:to-slate-900 dark:ring-emerald-900">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="relative">
              <span className="block text-base font-semibold tracking-tight text-slate-950 group-hover:text-emerald-800 dark:text-white">
                {category}
              </span>
              <span className="mt-1.5 block text-sm leading-5 text-slate-500 dark:text-slate-400">
                {categoryHints[category] ?? "Explore verified options"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
