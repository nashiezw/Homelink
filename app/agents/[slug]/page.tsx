import { PublicAgentProfile } from "@/components/agents/public-agent-profile";

type Props = { params: Promise<{ slug: string }> };

export default async function AgentPublicPage({ params }: Props) {
  const { slug } = await params;
  return <PublicAgentProfile slug={slug} />;
}
