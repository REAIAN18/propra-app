import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geist = localFont({
  src: "../../public/fonts/geist-variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const instrumentSerif = localFont({
  src: [
    {
      path: "../../public/fonts/instrument-serif-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/instrument-serif-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-instrument-serif",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://propra-app-production.up.railway.app";

export const metadata: Metadata = {
  title: "Arca — Every asset earning what it should.",
  description:
    "AI-powered portfolio intelligence for commercial owner-operators. Arca surfaces every gap in your portfolio and closes it. Commission-only — you pay nothing until Arca delivers.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    siteName: "Arca",
    title: "Arca — Every asset earning what it should.",
    description:
      "Arca benchmarks your entire portfolio against live market data — insurance, energy, rent, compliance, and income — then recovers every dollar you're leaving behind. Commission-only.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Arca — Every asset earning what it should.",
    description:
      "AI-powered portfolio intelligence for CRE owner-operators. Find every dollar you're leaving behind. Commission-only.",
  },
  keywords: [
    "commercial real estate",
    "property management",
    "portfolio intelligence",
    "insurance retender",
    "energy switching",
    "rent review",
    "CRE analytics",
    "property technology",
    "proptech",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${instrumentSerif.variable} min-h-screen antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
