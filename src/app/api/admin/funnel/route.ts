import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function rate(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.round((a / b) * 100) / 100;
}

async function funnelCounts(since?: Date) {
  const dateFilter = since ? { createdAt: { gte: since } } : undefined;

  const [
    auditLeads,
    signupLeads,
    usersWithProperty,
    usersWithServiceLead,
    usersWithCommission,
  ] = await Promise.all([
    prisma.auditLead.count({ where: dateFilter }),
    prisma.signupLead.count({ where: dateFilter }),
    prisma.userAsset
      .findMany({ where: dateFilter, select: { userId: true }, distinct: ["userId"] })
      .then((r) => r.length),
    prisma.serviceLead
      .findMany({
        where: { ...(dateFilter ?? {}), userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),
    prisma.commission
      .findMany({ where: dateFilter, select: { userId: true }, distinct: ["userId"] })
      .then((r) => r.length),
  ]);

  const signups = auditLeads + signupLeads;

  return {
    signups,
    withProperty: usersWithProperty,
    withServiceLead: usersWithServiceLead,
    withCommission: usersWithCommission,
    conversionRates: {
      signupToProperty: rate(usersWithProperty, signups),
      propertyToLead: rate(usersWithServiceLead, usersWithProperty),
      leadToCommission: rate(usersWithCommission, usersWithServiceLead),
    },
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [allTime, last30Days] = await Promise.all([
    funnelCounts(),
    funnelCounts(thirtyDaysAgo),
  ]);

  return NextResponse.json({ ...allTime, last30Days });
}
