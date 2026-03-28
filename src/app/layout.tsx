import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const dmSerifDisplay = localFont({
  src: "../../public/fonts/dm-serif-display.woff2",
  variable: "--font-dm-serif",
  weight: "400",
  display: "swap",
});

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

const dmSans = localFont({
  src: "../../public/fonts/dm-sans-variable.woff2",
  variable: "--font-dm-sans",
  weight: "300 700",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../../public/fonts/jetbrains-mono-variable.woff2",
  variable: "--font-jetbrains-mono",
  weight: "400 500",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://realhq.com";

export const metadata: Metadata = {
  title: "RealHQ — Every asset earning what it should.",
  description:
    "The property value engine for every commercial asset owner. Always finding. Always delivering.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    siteName: "RealHQ",
    title: "RealHQ — Every asset earning what it should.",
    description:
      "The property value engine for every commercial asset owner. Always finding. Always delivering.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "RealHQ — Every asset earning what it should.",
    description:
      "The property value engine for every commercial asset owner. Always finding. Always delivering.",
  },
  keywords: [
    "commercial real estate",
    "property management",
    "portfolio intelligence",
    "insurance retender",
    "energy optimisation",
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
      <body className={`${geist.variable} ${instrumentSerif.variable} ${dmSerifDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable} min-h-screen antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
