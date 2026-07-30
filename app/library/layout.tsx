import { Fraunces, Manrope } from "next/font/google";
import type { ReactNode } from "react";

const libraryDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-library-display",
  display: "swap",
});

const librarySans = Manrope({
  subsets: ["latin"],
  variable: "--font-library-sans",
  display: "swap",
});

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return <div className={`${libraryDisplay.variable} ${librarySans.variable}`}>{children}</div>;
}
