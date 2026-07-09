import type { Metadata } from "next";
import { getHomepageData, getHomepageSeo } from "@/lib/homepage/data";
import { HomePageView } from "@/components/home/home-page-view";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getHomepageSeo();
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
  };
}

export default async function HomePage() {
  const data = await getHomepageData();
  return <HomePageView data={data} />;
}
