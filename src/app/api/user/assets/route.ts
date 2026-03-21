import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert, sendPropertyAddedActivationEmail } from "@/lib/email";
import { enrichAsset } from "@/lib/enrich-asset";

// GET /api/user/assets — return the signed-in user's saved assets
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, address: true, epcRating: true, latitude: true, longitude: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ assets });
}

// POST /api/user/assets — save a new property from the /properties/add onboarding flow
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, address, lat, lng, isUK, epcRating, floorAreaSqm, floorAreaSqft } = body;

  if (!name || !address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  // Deduplicate — if this user already has an asset with this address, return it
  const existing = await prisma.userAsset.findFirst({
    where: { userId: session.user.id, address: address.trim() },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id, existing: true });
  }

  const asset = await prisma.userAsset.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      assetType: "commercial",
      location: address.trim(),
      address: address.trim(),
      country: isUK ? "UK" : "US",
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
      epcRating: epcRating ?? undefined,
      sqft: floorAreaSqft ?? undefined,
    },
  });

  // Background enrichment: geocode + EPC (fire-and-forget, never blocks response)
  enrichAsset(asset.id, asset.address ?? address.trim(), asset.country).catch(() => {});

  sendAdminServiceLeadAlert({
    serviceType: "property_added",
    email: session.user.email ?? "unknown",
    details: {
      name: name.trim(),
      address: address.trim(),
      country: isUK ? "UK" : "US",
      epcRating: epcRating ?? null,
      sqft: floorAreaSqft ?? null,
    },
  }).catch((err) => console.error("[user/assets] admin alert failed:", err));

  // Activation email — only on first property add, 1-hour delay
  const assetCount = await prisma.userAsset.count({ where: { userId: session.user.id } });
  if (assetCount === 1 && session.user.email) {
    sendPropertyAddedActivationEmail({
      email: session.user.email,
      name: session.user.name ?? "there",
      address: asset.address ?? address.trim(),
      assetType: asset.assetType ?? "commercial",
      country: asset.country ?? (isUK ? "UK" : "US"),
    }).catch((err) => console.error("[activation-email]", err));
  }

  return NextResponse.json({ id: asset.id });
}
