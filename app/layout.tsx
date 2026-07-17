import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppProvider } from "@/components/providers/app-provider";
import { PlatformConfigProvider } from "@/components/providers/platform-config-provider";
import { ChromeGate } from "@/components/layout/chrome-gate";
import { ToastBanner } from "@/components/ui/toast-banner";
import { getCanonicalSiteUrl } from "@/lib/seo/site-url";
import "./globals.css";

const siteUrl = getCanonicalSiteUrl();
const siteName = "HouseLink Zimbabwe";
const siteDescription =
  "Verified rooms, houses, flats, cottages, commercial property, land, and roommate matching across Zimbabwe.";
const ogImage = "/brand/houselink-full-lockup.png";

const inter = localFont({
  src: [
    { path: "./fonts/inter-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: "HouseLink Zimbabwe | Find Your Next Home with Confidence",
  description: siteDescription,
  keywords: [
    "HouseLink Zimbabwe",
    "Zimbabwe property",
    "houses for rent Zimbabwe",
    "rooms to rent Harare",
    "roommate matching Zimbabwe",
    "verified property listings",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/brand/houselink-icon.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/houselink-icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/houselink-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "HouseLink Zimbabwe | Find Your Next Home with Confidence",
    description: siteDescription,
    url: "/",
    siteName,
    images: [{ url: ogImage, width: 1200, height: 630, alt: siteName }],
    locale: "en_ZW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HouseLink Zimbabwe | Find Your Next Home with Confidence",
    description: siteDescription,
    images: [ogImage],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        alternateName: "HouseLink",
        url: siteUrl,
        logo: `${siteUrl}/brand/houselink-full-lockup.png`,
        image: `${siteUrl}/brand/houselink-full-lockup.png`,
        sameAs: [siteUrl],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: siteName,
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="bg-white font-sans text-ink antialiased dark:bg-slate-950 dark:text-slate-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <PlatformConfigProvider>
          <AppProvider>
            <ChromeGate>{children}</ChromeGate>
            <ToastBanner />
          </AppProvider>
        </PlatformConfigProvider>
      </body>
    </html>
  );
}
