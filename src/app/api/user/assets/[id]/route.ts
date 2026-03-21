import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/assets/[id] — return a single UserAsset for the signed-in user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.userAsset.findUnique({
    where: { id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (asset.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ asset });
}

const PERMITTED_FIELDS = new Set([
  "name", "assetType", "location", "sqft", "grossIncome", "netIncome",
  "passingRent", "marketERV", "insurancePremium", "energyCost",
  "occupancy", "address", "postcode", "country",
]);

// PATCH /api/user/assets/[id] — update permitted fields on a user's asset
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.userAsset.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!PERMITTED_FIELDS.has(key)) {
      return NextResponse.json(
        { error: `Field '${key}' is not editable` },
        { status: 400 }
      );
    }
    update[key] = value;
  }

  const asset = await prisma.userAsset.update({
    where: { id },
    data: update,
  });

  return NextResponse.json({ asset });
}
