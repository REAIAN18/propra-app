import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI-powered cost benchmarking for UK commercial property | Arca",
  description:
    "Arca identifies every pound you're leaving behind across insurance, energy, and income — then recovers it. Built for UK owner-operators with 3–30 commercial assets. Commission-only.",
  openGraph: {
    title: "AI-powered cost benchmarking for UK commercial property | Arca",
    description:
      "Identify and recover hidden value across your UK commercial portfolio. Insurance, energy, MEES compliance, and income — all benchmarked against live UK market data.",
    url: "https://arcahq.ai/uk",
    siteName: "Arca",
    locale: "en_GB",
    type: "website",
  },
  alternates: {
    canonical: "https://arcahq.ai/uk",
  },
};

export default function UKLayout({ children }: { children: React.ReactNode }) {
  return children;
}
