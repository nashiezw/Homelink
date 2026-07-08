import type { Metadata } from "next";
import { CalculatorsPageClient } from "@/components/calculators/calculators-page-client";

export const metadata: Metadata = {
  title: "Property Calculators | HomeLink Zimbabwe",
  description:
    "Free property calculators for move-in costs, rental affordability, agent commission splits, and landlord rental income on HomeLink Zimbabwe.",
};

export default function CalculatorsPage() {
  return <CalculatorsPageClient />;
}
