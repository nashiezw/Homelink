import type { Metadata } from "next";
import { getHomepageData } from "@/lib/homepage/data";
import { HomePageView } from "@/components/home/home-page-view";

export const revalidate = 3600;

const homepageTitle = "HouseLink Property Search Zimbabwe";
const homepageDescription =
  "Search HouseLink Zimbabwe for verified property listings, homes, rooms, land, rentals, commercial spaces, and roommate matching.";
const homepageOgImage = "/images/houselink-hero.webp";

export const metadata: Metadata = {
  title: homepageTitle,
  description: homepageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homepageTitle,
    description: homepageDescription,
    images: [{ url: homepageOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: homepageTitle,
    description: homepageDescription,
    images: [homepageOgImage],
  },
};

export default async function HomePage() {
  const data = await getHomepageData();
  return <HomePageView data={data} />;
}
