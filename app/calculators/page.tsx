import type { Metadata } from "next";
import { CalculatorsPageClient } from "@/components/calculators/calculators-page-client";

export const metadata: Metadata = {
  title: "Property Calculators | HouseLink Zimbabwe",
  description:
    "Free property calculators for move-in costs, rental affordability, agent commission splits, and landlord rental income on HouseLink Zimbabwe.",
  alternates: {
    canonical: "/calculators",
  },
};

export default function CalculatorsPage() {
  return <CalculatorsPageClient />;
}
