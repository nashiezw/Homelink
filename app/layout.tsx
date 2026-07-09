import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppProvider } from "@/components/providers/app-provider";
import { PlatformConfigProvider } from "@/components/providers/platform-config-provider";
import { ChromeGate } from "@/components/layout/chrome-gate";
import { ToastBanner } from "@/components/ui/toast-banner";
import "./globals.css";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://homelinkzim.co.zw"),
  applicationName: "HomeLink Zimbabwe",
  title: "HomeLink Zimbabwe | Find Your Next Home with Confidence",
  description:
    "Verified rooms, houses, flats, cottages, commercial property, land, and roommate matching across Zimbabwe.",
  keywords: [
    "HomeLink Zimbabwe",
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
      { url: "/brand/homelink-icon.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/homelink-icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/homelink-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "HomeLink Zimbabwe | Find Your Next Home with Confidence",
    description:
      "Verified rooms, houses, flats, cottages, commercial property, land, and roommate matching across Zimbabwe.",
    url: "/",
    siteName: "HomeLink Zimbabwe",
    images: [{ url: "/brand/homelink-full-lockup.png", width: 1200, height: 630, alt: "HomeLink Zimbabwe" }],
    locale: "en_ZW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HomeLink Zimbabwe | Find Your Next Home with Confidence",
    description:
      "Verified rooms, houses, flats, cottages, commercial property, land, and roommate matching across Zimbabwe.",
    images: ["/brand/homelink-full-lockup.png"],
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
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="bg-white font-sans text-ink antialiased dark:bg-slate-950 dark:text-slate-100">
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
