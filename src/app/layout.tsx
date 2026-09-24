import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Instrument Serif italic — the editorial accent on landing headlines, the one
// Hirael move: select words drop to a serif italic against the sans headline.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const array = localFont({
  variable: "--font-array",
  src: [
    { path: "../fonts/Array-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Array-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Array-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const arrayWide = localFont({
  variable: "--font-array-wide",
  src: [
    { path: "../fonts/Array-SemiboldWide.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Array-BoldWide.woff2", weight: "700", style: "normal" },
  ],
});

const bebas = localFont({
  variable: "--font-bebas",
  src: [{ path: "../fonts/BebasNeue-Regular.woff2", weight: "400", style: "normal" }],
});

const expose = localFont({
  variable: "--font-expose",
  src: [
    { path: "../fonts/Expose-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Expose-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Expose-Black.woff2", weight: "900", style: "normal" },
  ],
});

// Absolute base for OG/Twitter image URLs. Set NEXT_PUBLIC_SITE_URL in prod; the
// localhost fallback keeps dev previews working.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ponoc, realtime claim validator",
    template: "%s | ponoc",
  },
  description:
    "ponoc is a realtime claim validator. It listens to what you say, verifies it against the record, and rules each claim true or false, live.",
  keywords: [
    "realtime fact-checking",
    "claim validator",
    "voice fact checking",
    "live fact checker",
    "speech verification",
    "ponoc",
  ],
  applicationName: "ponoc",
  authors: [{ name: "tami" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "ponoc",
    title: "ponoc, realtime claim validator",
    description:
      "Listens to what you say, verifies it against the record, and rules each claim true or false, live.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ponoc, realtime claim validator",
    description:
      "Listens to what you say, verifies it against the record, and rules each claim true or false, live.",
    creator: "@tami_cp0",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${array.variable} ${arrayWide.variable} ${bebas.variable} ${expose.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
