import { LegalPageView } from "@/components/legal/legal-page-view";
import { getLegalPage } from "@/lib/legal-pages/persist";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Returns, Refunds & Digital Products Policy | HouseLink Zimbabwe",
  description: "HouseLink Library refund, digital-product, cancellation, defective-file, and printed-book return policy.",
  alternates: { canonical: "/returns" },
};

export default async function ReturnsPage() {
  const page = await getLegalPage("returns");

  return <LegalPageView page={page} fallbackTitle="Returns, Refunds & Digital Products Policy" />;
}
