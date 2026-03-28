/**
 * /api/financials/budget
 * CRUD endpoints for FinancialBudget model
 *
 * GET    ?assetId=X&year=Y  - Get budget for asset and year
 * POST   { assetId, year, budgeted* }  - Create budget
 * PATCH  { id, ...updates }  - Update budget
 * DELETE ?id=X  - Delete budget
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");
  const year = searchParams.get("year");

  if (!assetId || !year) {
    return NextResponse.json(
      { error: "assetId and year are required" },
      { status: 400 }
    );
  }

  try {
    const budget = await prisma.financialBudget.findUnique({
      where: {
        assetId_year: {
          assetId,
          year: parseInt(year),
        },
      },
    });

    return NextResponse.json({ budget: budget || null });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      assetId,
      year,
      budgetedRevenue,
      budgetedOpEx,
      budgetedNOI,
      budgetedInsurance = 0,
      budgetedEnergy = 0,
      budgetedMaintenance = 0,
      budgetedManagement = 0,
      notes,
    } = body;

    if (!assetId || !year) {
      return NextResponse.json(
        { error: "assetId and year are required" },
        { status: 400 }
      );
    }

    // Verify asset belongs to user
    const asset = await prisma.userAsset.findFirst({
      where: { id: assetId, userId: session.user.id },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found or unauthorized" },
        { status: 404 }
      );
    }

    // Create or update budget
    const budget = await prisma.financialBudget.upsert({
      where: {
        assetId_year: {
          assetId,
          year: parseInt(year),
        },
      },
      create: {
        userId: session.user.id,
        assetId,
        year: parseInt(year),
        budgetedRevenue: parseFloat(budgetedRevenue) || 0,
        budgetedOpEx: parseFloat(budgetedOpEx) || 0,
        budgetedNOI: parseFloat(budgetedNOI) || 0,
        budgetedInsurance: parseFloat(budgetedInsurance) || 0,
        budgetedEnergy: parseFloat(budgetedEnergy) || 0,
        budgetedMaintenance: parseFloat(budgetedMaintenance) || 0,
        budgetedManagement: parseFloat(budgetedManagement) || 0,
        notes,
      },
      update: {
        budgetedRevenue: parseFloat(budgetedRevenue) || 0,
        budgetedOpEx: parseFloat(budgetedOpEx) || 0,
        budgetedNOI: parseFloat(budgetedNOI) || 0,
        budgetedInsurance: parseFloat(budgetedInsurance) || 0,
        budgetedEnergy: parseFloat(budgetedEnergy) || 0,
        budgetedMaintenance: parseFloat(budgetedMaintenance) || 0,
        budgetedManagement: parseFloat(budgetedManagement) || 0,
        notes,
      },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Error creating/updating budget:", error);
    return NextResponse.json(
      { error: "Failed to create/update budget" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Budget id is required" },
        { status: 400 }
      );
    }

    // Verify budget belongs to user
    const existingBudget = await prisma.financialBudget.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update budget
    const budget = await prisma.financialBudget.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Budget id is required" },
      { status: 400 }
    );
  }

  try {
    // Verify budget belongs to user
    const existingBudget = await prisma.financialBudget.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found or unauthorized" },
        { status: 404 }
      );
    }

    await prisma.financialBudget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
