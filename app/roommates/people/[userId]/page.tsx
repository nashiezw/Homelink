import type { Metadata } from "next";
import { RoommatePublicProfile } from "@/components/roommates/roommate-public-profile";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: "Roommate profile - HouseLink",
    description: `View roommate seeker profile on HouseLink Zimbabwe - ${userId}`,
  };
}

export default async function RoommatePersonPage({ params }: PageProps) {
  const { userId } = await params;
  return <RoommatePublicProfile userId={userId} />;
}
