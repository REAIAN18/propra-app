/**
 * GET  /api/user/work-orders/:orderId/variations
 * Returns all variation orders for a work order.
 *
 * POST /api/user/work-orders/:orderId/variations
 * Adds a variation order to a work order.
 * Body: { description: string; amount: number; approved?: boolean }
 * Response: { variations: Array<...> }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { variationOrders: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const variations = (order.variationOrders as Array<{ description: string; amount: number; approved: boolean; date: string }>) || [];

  return NextResponse.json({ variations });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true, variationOrders: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    description?: string;
    amount?: number;
    approved?: boolean;
  };

  if (!body.description || body.amount === undefined) {
    return NextResponse.json({ error: "description and amount are required" }, { status: 422 });
  }

  const newVariation = {
    description: body.description,
    amount: Number(body.amount),
    approved: body.approved ?? false,
    date: new Date().toISOString(),
  };

  const existingVariations = (order.variationOrders as Array<{ description: string; amount: number; approved: boolean; date: string }>) || [];
  const updated = [...existingVariations, newVariation];

  await prisma.workOrder.update({
    where: { id: orderId },
    data: { variationOrders: updated as unknown as object },
  });

  return NextResponse.json({ variations: updated });
}
