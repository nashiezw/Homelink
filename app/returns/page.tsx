import { LegalPageView } from "@/components/legal/legal-page-view";
import { getLegalPage } from "@/lib/legal-pages/persist";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const page = await getLegalPage("returns");

  return <LegalPageView page={page} fallbackTitle="Returns & Reprints" />;
}
