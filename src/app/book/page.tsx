import { Suspense } from "react";
import type { Metadata } from "next";
import { BookContent } from "./BookContent";
import { fmtK, computeOpportunity } from "@/lib/opportunity";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; company?: string; assets?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const name = params.name ?? "";
  const company = params.company ?? "";
  const assets = parseInt(params.assets ?? "0", 10);
  const opp = assets > 0 ? computeOpportunity(assets) : null;
  const firstName = name.split(" ")[0];

  const title = opp
    ? `Arca: ${firstName || company || "Your portfolio"} — ${fmtK(opp.total)}/yr opportunity`
    : "Arca — Commission-only portfolio intelligence";

  const description = opp
    ? `${fmtK(opp.ins)} insurance · ${fmtK(opp.energy)} energy · ${fmtK(opp.income)} income. Commission-only.`
    : "Arca finds every dollar you are leaving behind. Commission-only.";

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
