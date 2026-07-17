import { BecomeAgentLanding } from "@/components/agents/become-agent-landing";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { ListingStatus, Role } from "@prisma/client";

export const revalidate = 300;

type AgentHighlight = {
  label: string;
  value: string;
};

export default async function BecomeAgentPage() {
  return <BecomeAgentLanding highlights={await getAgentHighlights()} />;
}

async function getAgentHighlights(): Promise<AgentHighlight[]> {
  try {
    const prisma = getMainPrisma();
    const [agents, activeListings, verifiedListings, openApplications] = await Promise.all([
      prisma.user.count({
        where: {
          accountStatus: "ACTIVE",
          roles: { has: Role.AGENT },
        },
      }),
      prisma.listing.count({
        where: { status: ListingStatus.ACTIVE },
      }),
      prisma.listing.count({
        where: {
          status: ListingStatus.ACTIVE,
          verifiedAt: { not: null },
        },
      }),
      prisma.agentApplicationRecord.count({
        where: {
          status: { in: ["SUBMITTED", "PENDING_REVIEW", "INTERVIEW_SCHEDULED", "TRAINING", "VERIFICATION"] },
        },
      }),
    ]);

    return [
      { value: formatCount(agents), label: "Live agents" },
      { value: formatCount(activeListings), label: "Active listings" },
      { value: formatCount(verifiedListings), label: "Verified listings" },
      { value: formatCount(openApplications), label: "Open applications" },
    ];
  } catch {
    return [
      { value: "Live", label: "Agent onboarding" },
      { value: "Verified", label: "Profile checks" },
      { value: "Managed", label: "Listing workflow" },
      { value: "Tracked", label: "Applications" },
    ];
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
