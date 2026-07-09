import type { AffordabilityRating } from "@/lib/calculators/formulas";

export const AFFORDABILITY_MEMORY_KEY = "homelink:rental-affordability";

export type RentalAffordabilityMemory = {
  recommendedMaxRent: number;
  remainingAfterRent: number;
  grossRentShare: number;
  rentPercent: number;
  sharingCount: number;
  rating: AffordabilityRating;
  ratingLabel: string;
  savedAt: string;
};

export function readRentalAffordabilityMemory(): RentalAffordabilityMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AFFORDABILITY_MEMORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RentalAffordabilityMemory>;
    if (!Number.isFinite(parsed.recommendedMaxRent) || Number(parsed.recommendedMaxRent) <= 0) return null;
    return {
      recommendedMaxRent: Number(parsed.recommendedMaxRent),
      remainingAfterRent: Number(parsed.remainingAfterRent) || 0,
      grossRentShare: Number(parsed.grossRentShare) || 0,
      rentPercent: Number(parsed.rentPercent) || 30,
      sharingCount: Math.max(1, Number(parsed.sharingCount) || 1),
      rating: parsed.rating ?? "healthy",
      ratingLabel: parsed.ratingLabel || "Healthy",
      savedAt: parsed.savedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeRentalAffordabilityMemory(memory: RentalAffordabilityMemory) {
  if (typeof window === "undefined" || memory.recommendedMaxRent <= 0) return;
  window.localStorage.setItem(AFFORDABILITY_MEMORY_KEY, JSON.stringify(memory));
}

export function affordabilityBudgetParam(memory: RentalAffordabilityMemory | null): string {
  if (!memory) return "";
  return String(Math.max(1, Math.round(memory.recommendedMaxRent)));
}
