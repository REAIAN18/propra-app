/**
 * GET  /api/user/rent-reviews          — list all active rent review events for user
 * POST /api/user/rent-reviews           — manually create a review event for a lease
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import type { RentReviewEvent } from "@/generated/prisma";

type PrismaWithRentReview = {
  rentReviewEvent: {
    findMany(q: object): Promise<RentReviewEvent[]>;
    create(q: object): Promise<RentReviewEvent>;
  };
};

function urgency(daysToExpiry: number): "urgent" | "soon" | "monitor" {
  if (daysToExpiry < 90)  return "urgent";
  if (daysToExpiry < 180) return "soon";
  return "monitor";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    // Return demo rent review data for unauthenticated users
    const demoReviews = [
      {
        id: "demo-rrv-1",
        tenantName: "TechCorp Inc",
        propertyAddress: "123 Main Street, Miami, FL 33101",
        assetId: "demo-1",
        leaseId: "demo-lease-1",
        expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        daysToExpiry: 120,
        breakDate: null,
        passingRent: 45000,
        ervLive: 52000,
        gap: 7000,
        leverageScore: 72,
        leverageExplanation: "Below market by 13% — tenant has moderate leverage.",
        horizon: "active",
        status: "pending",
        urgency: "soon" as const,
        draftGeneratedAt: new Date(),
      },
      {
        id: "demo-rrv-2",
        tenantName: "Manufacturing Ltd",
        propertyAddress: "456 Industrial Ave, Miami, FL 33126",
        assetId: "demo-2",
        leaseId: "demo-lease-2",
        expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000),
        daysToExpiry: 240,
        breakDate: null,
        passingRent: 18900,
        ervLive: 22400,
        gap: 3500,
        leverageScore: 58,
        leverageExplanation: "Below market by 16% — neutral tenant position.",
        horizon: "forward",
        status: "pending",
        urgency: "monitor" as const,
        draftGeneratedAt: new Date(),
      },
    ];
    const totalGapGbp = demoReviews.reduce((sum, r) => sum + (r.gap ?? 0), 0);
    return NextResponse.json({ reviews: demoReviews, totalGapGbp });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const db = prisma as unknown as PrismaWithRentReview;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const reviews = await db.rentReviewEvent.findMany({
    where: {
      userId: user.id,
      status: statusFilter
        ? statusFilter
        : { notIn: ["dismissed", "lease_renewed", "no_action"] },
    },
    orderBy: { expiryDate: "asc" },
  } as object).catch(() => [] as RentReviewEvent[]);

  const now = new Date();

  const mapped = reviews.map((r) => {
    const daysToExpiry = Math.floor(
      (new Date(r.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      id:                 r.id,
      tenantName:         r.tenantName,
      propertyAddress:    r.propertyAddress,
      assetId:            r.assetId,
      leaseId:            r.leaseId,
      expiryDate:         r.expiryDate,
      daysToExpiry,
      breakDate:          r.breakDate,
      passingRent:        r.passingRent,
      ervLive:            r.ervLive,
      gap:                r.gap,
      leverageScore:      r.leverageScore,
      leverageExplanation: r.leverageExplanation,
      horizon:            r.horizon,
      status:             r.status,
      urgency:            urgency(daysToExpiry),
      draftGeneratedAt:   r.draftGeneratedAt,
    };
  });

  const totalGapGbp = mapped.reduce((sum, r) => sum + (r.gap ?? 0), 0);

  return NextResponse.json({ reviews: mapped, totalGapGbp });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json() as {
    leaseId: string;
    tenantName: string;
    expiryDate: string;
    passingRent: number;
    horizon: string;
    propertyAddress?: string;
    assetId?: string;
    sqft?: number;
    breakDate?: string;
  };

  if (!body.leaseId || !body.tenantName || !body.expiryDate || !body.passingRent || !body.horizon) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = prisma as unknown as PrismaWithRentReview;

  const review = await db.rentReviewEvent.create({
    data: {
      id:             `rre_${Math.random().toString(36).slice(2, 12)}`,
      userId:         user.id,
      leaseId:        body.leaseId,
      assetId:        body.assetId ?? null,
      tenantName:     body.tenantName,
      propertyAddress: body.propertyAddress ?? null,
      expiryDate:     new Date(body.expiryDate),
      breakDate:      body.breakDate ? new Date(body.breakDate) : null,
      passingRent:    body.passingRent,
      sqft:           body.sqft ?? null,
      horizon:        body.horizon,
      status:         "pending",
    },
  } as object);

  return NextResponse.json({ review });
}
