import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/acquisition-strategy — Fetch user's active acquisition strategy
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Demo acquisition strategy for unauthenticated users
      return NextResponse.json({
        strategy: {
          id: "demo-strategy-1",
          userId: "demo-user",
          name: "Core Plus Growth Strategy",
          targetTypes: ["Office", "Industrial", "Mixed-Use"],
          targetGeography: ["Florida", "Texas", "North Carolina"],
          minYield: 0.065,
          maxYield: 0.085,
          minPrice: 5000000,
          maxPrice: 75000000,
          minSqft: 25000,
          maxSqft: 500000,
          currency: "USD",
          isActive: true,
          createdAt: "2025-06-15",
          updatedAt: "2026-03-20",
        },
      });
    }

    // Get active strategy for user
    const strategy = await prisma.acquisitionStrategy.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("Error fetching acquisition strategy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/user/acquisition-strategy — Create or update user's acquisition strategy
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      targetTypes,
      targetGeography,
      minYield,
      maxYield,
      minPrice,
      maxPrice,
      minSqft,
      maxSqft,
      currency,
    } = body;

    // Deactivate existing strategies
    await prisma.acquisitionStrategy.updateMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new strategy
    const strategy = await prisma.acquisitionStrategy.create({
      data: {
        userId: session.user.id,
        name: name || null,
        targetTypes: targetTypes || [],
        targetGeography: targetGeography || [],
        minYield: minYield ? parseFloat(minYield) : null,
        maxYield: maxYield ? parseFloat(maxYield) : null,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        minSqft: minSqft ? parseInt(minSqft) : null,
        maxSqft: maxSqft ? parseInt(maxSqft) : null,
        currency: currency || "USD",
        isActive: true,
      },
    });

    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    console.error("Error creating acquisition strategy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
