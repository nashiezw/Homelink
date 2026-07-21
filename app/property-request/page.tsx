import type { Metadata } from "next";
import { TenantRequestPageClient } from "@/components/pages/tenant-request-page-client";

export const metadata: Metadata = {
  title: "Property Request Form | HouseLink Zimbabwe",
  description: "Tell HouseLink what you want to rent or buy and get matched with suitable property listings.",
};

export default function PropertyRequestPage() {
  return <TenantRequestPageClient />;
}
