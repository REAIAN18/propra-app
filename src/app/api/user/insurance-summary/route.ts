import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ hasPolicies: false, totalPremium: 0, policies: [] });
  }

  const docs = await prisma.document.findMany({
    where: { userId: session.user.id, documentType: "insurance_policy", status: "done" },
    orderBy: { createdAt: "desc" },
  });

  if (!docs.length) {
    return NextResponse.json({ hasPolicies: false, totalPremium: 0, policies: [] });
  }

  const policies = docs.map((d) => {
    const data = (d.extractedData as Record<string, unknown>) ?? {};
    return {
      id: d.id,
      insurer: (data.insurer as string) ?? "Unknown",
      premium: Number(data.premium) || 0,
      renewalDate: (data.renewalDate as string) ?? null,
      propertyAddress: (data.propertyAddress as string) ?? null,
      coverageType: (data.coverageType as string) ?? null,
      sumInsured: Number(data.sumInsured) || 0,
      filename: d.filename,
    };
  });

  const totalPremium = policies.reduce((s, p) => s + p.premium, 0);
  const earliestRenewal =
    policies
      .filter((p) => p.renewalDate)
      .sort(
        (a, b) =>
          new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime()
      )[0]?.renewalDate ?? null;

  return NextResponse.json({ hasPolicies: true, totalPremium, earliestRenewal, policies });
}
