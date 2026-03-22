import { Suspense } from "react";
import type { Metadata } from "next";
import { BookContent } from "./BookContent";
import { fmtK, computeOpportunity } from "@/lib/opportunity";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; company?: string; assets?: string; currency?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const name = params.name ?? "";
  const company = params.company ?? "";
  const assets = parseInt(params.assets ?? "0", 10);
  const currency = params.currency === "GBP" ? "GBP" : "USD";
  const sym = currency === "GBP" ? "£" : "$";
  const opp = assets > 0 ? computeOpportunity(assets, currency) : null;
  const firstName = name.split(" ")[0];

  const title = opp
    ? `RealHQ: ${firstName || company || "Your portfolio"} — ${fmtK(opp.total, sym)}/yr opportunity`
    : "RealHQ — Portfolio intelligence";

  const description = opp
    ? `${fmtK(opp.ins, sym)} insurance · ${fmtK(opp.energy, sym)} energy · ${fmtK(opp.income, sym)} income identified.`
    : "RealHQ finds every dollar you are leaving behind.";

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default function BookPage() {
  return (
    <Suspense>
      <BookContent />
    </Suspense>
  );
}
