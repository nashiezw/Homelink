import { Instrument_Serif, Outfit } from "next/font/google";

const libraryDisplay = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-library-display",
  display: "swap",
});

const librarySans = Outfit({
  subsets: ["latin"],
  variable: "--font-library-sans",
  display: "swap",
});

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${libraryDisplay.variable} ${librarySans.variable}`}>{children}</div>;
}
