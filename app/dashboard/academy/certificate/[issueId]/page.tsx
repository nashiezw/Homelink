import { AcademyCertificatePageClient } from "@/components/academy/academy-certificate-page-client";
import { requireServerRole } from "@/lib/auth/server-session";

export default async function AcademyCertificatePage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  await requireServerRole(["PUBLIC_LEARNER", "TRAINER", "AGENT", "ADMIN", "ACADEMY_ADMIN"], {
    next: `/dashboard/academy/certificate/${issueId}`,
  });
  return <AcademyCertificatePageClient issueId={issueId} />;
}
