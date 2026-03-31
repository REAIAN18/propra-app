import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPropertyAddedActivationEmail } from "@/lib/email";
import { enrichAsset } from "@/lib/enrich-asset";
import { enqueuePropertyOnboard } from "@/lib/jobs/property-onboard";

// GET /api/user/assets — return the signed-in user's saved assets
export async function GET() {
  const session = await auth();

  // Return demo assets when not authenticated (demo mode must work without signin)
  if (!session?.user?.id) {
    const demoAssets = [
      {
        id: "demo-1",
        name: "FL Mixed Portfolio",
        address: "123 Main Street, Miami, FL 33101",
        postcode: "33101",
        country: "US",
        epcRating: null,
        epcExpiry: null,
        latitude: 25.7617,
        longitude: -80.1918,
        satelliteUrl: "https://maps.googleapis.com/maps/api/staticmap?center=25.7617,-80.1918&zoom=15&size=600x400&key=demo",
        createdAt: new Date("2024-01-15"),
      },
      {
        id: "demo-2",
        name: "UK Industrial Portfolio",
        address: "Industrial Estate, Manchester, UK M4 4AB",
        postcode: "M4 4AB",
        country: "GB",
        epcRating: "D",
        epcExpiry: new Date("2032-01-15"),
        latitude: 53.4808,
        longitude: -2.2426,
        satelliteUrl: "https://maps.googleapis.com/maps/api/staticmap?center=53.4808,-2.2426&zoom=15&size=600x400&key=demo",
        createdAt: new Date("2023-06-20"),
      },
    ];
    return NextResponse.json({ assets: demoAssets });
  }

  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, address: true, postcode: true, country: true, epcRating: true, epcExpiry: true, latitude: true, longitude: true, satelliteUrl: true, createdAt: true },
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
  const { name, address, lat, lng, isUK, epcRating, floorAreaSqm: _floorAreaSqm, floorAreaSqft, propertyType } = body;

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
      assetType: propertyType ? (propertyType as string).toLowerCase().replace(/\s+/g, "-") : "commercial",
      location: address.trim(),
      address: address.trim(),
      country: isUK ? "UK" : "US",
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
      epcRating: epcRating ?? undefined,
      sqft: floorAreaSqft ?? undefined,
    },
  });

  // Background enrichment: enqueue via BullMQ if Redis is available, else run directly
  enqueuePropertyOnboard(asset.id, asset.address ?? address.trim(), asset.country).then((enqueued) => {
    if (!enqueued) {
      enrichAsset(asset.id, asset.address ?? address.trim(), asset.country).catch(() => {});
    }
  }).catch(() => {
    enrichAsset(asset.id, asset.address ?? address.trim(), asset.country).catch(() => {});
  });

  // Activation email — only on first property add, 1-hour delay
  const assetCount = await prisma.userAsset.count({ where: { userId: session.user.id } });
  if (assetCount === 1 && session.user.email) {
    sendPropertyAddedActivationEmail({
      email: session.user.email,
      name: session.user.name ?? "there",
      address: asset.address ?? address.trim(),
      country: asset.country ?? (isUK ? "UK" : "US"),
    }).catch((err) => console.error("[activation-email]", err));
  }

  return NextResponse.json({ id: asset.id });
}
