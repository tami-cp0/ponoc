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
  ],
});

const arrayWide = localFont({
  variable: "--font-array-wide",
  src: [
    { path: "../fonts/Array-SemiboldWide.woff2", weight: "600", style: "normal" },
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
  ],
});

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ponoc: live fact-checker",
    template: "%s | ponoc",
  },
  description: "ponoc is a live fact-checker. It listens to your conversation, checks each claim against the web, and calls it true or false with the source. Try it free.",
  keywords: [
    "realtime fact-checking",
    "facts or cap",
    "fact checker",
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
    title: "ponoc: facts or cap, called live",
    description: "ponoc is a live fact-checker. It listens to your conversation, checks each claim against the web, and calls it true or false with the source. Try it free.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ponoc: facts or cap, called live",
    description: "ponoc is a live fact-checker. It listens to your conversation, checks each claim against the web, and calls it true or false with the source. Try it free.",
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
