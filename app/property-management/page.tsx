import type { Metadata } from "next";
import { PropertyManagementPage } from "@/components/property-management/property-management-page";

export const metadata: Metadata = {
  title: "Property Management in Zimbabwe | HouseLink",
  description:
    "HouseLink property management helps Zimbabwe owners with tenant sourcing, inspections, maintenance coordination, rent tracking, agreements, and verified owner workflows.",
  alternates: {
    canonical: "/property-management",
  },
  openGraph: {
    title: "HouseLink Property Management",
    description: "Managed property operations for Zimbabwe landlords and owners.",
    url: "/property-management",
    type: "website",
  },
};

export default function PropertyManagementRoute() {
  return <PropertyManagementPage />;
}
