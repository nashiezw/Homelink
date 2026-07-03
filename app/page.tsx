import type { Metadata } from "next";
import { getHomepageData, getHomepageSeo } from "@/lib/homepage/data";
import { HomePageView } from "@/components/home/home-page-view";

export function generateMetadata(): Metadata {
  const seo = getHomepageSeo();
  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
  };
}

export default function HomePage() {
  const data = getHomepageData();
  return <HomePageView data={data} />;
}
