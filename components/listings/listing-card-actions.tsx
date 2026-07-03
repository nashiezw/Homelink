"use client";

import { Heart } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";

type ListingCardActionsProps = {
  listingId: string;
};

export function ListingCardActions({ listingId }: ListingCardActionsProps) {
  const { isFavourite, toggleFavourite } = useApp();

  return (
    <button
      type="button"
      onClick={() => void toggleFavourite(listingId)}
      className={`absolute right-3 top-3 flex size-10 items-center justify-center rounded-md shadow-sm ${
        isFavourite(listingId)
          ? "bg-emerald-700 text-white"
          : "bg-white/90 text-slate-700"
      }`}
      aria-label={isFavourite(listingId) ? "Remove from favourites" : "Save listing"}
    >
      <Heart className="size-5" aria-hidden="true" />
    </button>
  );
}
