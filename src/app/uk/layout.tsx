import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio benchmarking for UK commercial property | RealHQ",
  description:
    "RealHQ identifies every pound you're leaving behind across insurance, energy, and income — then recovers it. Built for UK owner-operators with 3–30 commercial assets.",
  openGraph: {
    title: "Portfolio benchmarking for UK commercial property | RealHQ",
    description:
      "Identify and recover hidden value across your UK commercial portfolio. Insurance, energy, MEES compliance, and income — all benchmarked against live UK market data.",
    url: "https://realhq.com/uk",
    siteName: "RealHQ",
    locale: "en_GB",
    type: "website",
  },
  alternates: {
    canonical: "https://realhq.com/uk",
  },
};

export default function UKLayout({ children }: { children: React.ReactNode }) {
  return children;
}
