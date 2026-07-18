import type { Metadata } from "next";
import { getHomepageData, getHomepageSeo } from "@/lib/homepage/data";
import { HomePageView } from "@/components/home/home-page-view";

export const revalidate = 300;

function normalizeHomepageSeo(seo: Awaited<ReturnType<typeof getHomepageSeo>>) {
  const title =
    seo.title.includes("HouseLink Zimbabwe") && seo.title.toLowerCase().includes("property")
      ? seo.title
      : "HouseLink Zimbabwe Property Search | Verified Homes, Rooms & Land";
  const description =
    seo.description.toLowerCase().includes("houselink zimbabwe") && seo.description.toLowerCase().includes("property")
      ? seo.description
      : "Search HouseLink Zimbabwe for verified property listings, homes, rooms, land, rentals, commercial spaces, and roommate matching across Zimbabwe.";
  return {
    ...seo,
    title,
    description,
    ogImage: seo.ogImage === "/images/houselink-hero.png" ? "/images/houselink-hero.webp" : seo.ogImage,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = normalizeHomepageSeo(await getHomepageSeo());
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
  };
}

export default async function HomePage() {
  const data = await getHomepageData();
  return <HomePageView data={data} />;
}
