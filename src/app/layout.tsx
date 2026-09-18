import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "pinto — realtime claim validator",
  description: "Live fact-checking for spoken claims.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${array.variable} ${arrayWide.variable} ${bebas.variable} ${expose.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
