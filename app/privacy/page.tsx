import { LegalPageView } from "@/components/legal/legal-page-view";
import { getLegalPage } from "@/lib/legal-pages/persist";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const page = await getLegalPage("privacy");

  return <LegalPageView page={page} fallbackTitle="Privacy Policy" />;
}
