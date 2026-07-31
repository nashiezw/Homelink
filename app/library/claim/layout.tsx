import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim Library Order | HouseLink Zimbabwe",
  description: "Claim access to a HouseLink Library order purchased for your email address.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/library/claim" },
};

export default function LibraryClaimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
