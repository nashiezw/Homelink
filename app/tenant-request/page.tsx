import type { Metadata } from "next";
import { TenantRequestPageClient } from "@/components/pages/tenant-request-page-client";

export const metadata: Metadata = {
  title: "Property Request Form | HouseLink Zimbabwe",
  description: "Send HouseLink your rental or buying requirements and get matched with suitable property listings.",
};

export default function TenantRequestPage() {
  return <TenantRequestPageClient />;
}
