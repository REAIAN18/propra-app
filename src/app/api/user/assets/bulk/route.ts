import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPropertyAddedActivationEmail } from "@/lib/email";
import { enrichAsset } from "@/lib/enrich-asset";
import { enqueuePropertyOnboard } from "@/lib/jobs/property-onboard";

interface BulkPropertyInput {
  address: string;
  confidence?: "high" | "medium" | "low";
  additionalInfo?: Record<string, unknown>;
}

// POST /api/user/assets/bulk — create multiple properties from upload
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { properties } = body as { properties: BulkPropertyInput[] };

  if (!Array.isArray(properties) || properties.length === 0) {
    return NextResponse.json(
      { error: "properties array required" },
      { status: 400 }
    );
  }

  const results = [];
  const errors = [];

  // Check asset count before bulk creation to determine if activation email should be sent
  const assetCountBefore = await prisma.userAsset.count({
    where: { userId: session.user.id },
  });

  for (const prop of properties) {
    if (!prop.address?.trim()) {
      errors.push({ address: prop.address, error: "Address is required" });
      continue;
    }

    try {
      // Deduplicate — skip if already exists
      const existing = await prisma.userAsset.findFirst({
        where: {
          userId: session.user.id,
          address: prop.address.trim(),
        },
      });

      if (existing) {
        results.push({
          id: existing.id,
          address: prop.address,
          existing: true,
        });
        continue;
      }

      // Create new asset
      const asset = await prisma.userAsset.create({
        data: {
          userId: session.user.id,
          name: prop.address.trim(), // Use address as name for bulk imports
          assetType: "commercial", // Default, can be enhanced later
          location: prop.address.trim(),
          address: prop.address.trim(),
          country: "UK", // Default, can be enhanced with geo-detection
        },
      });

      // Enqueue background enrichment
      enqueuePropertyOnboard(
        asset.id,
        asset.address ?? prop.address.trim(),
        asset.country
      )
        .then((enqueued) => {
          if (!enqueued) {
            enrichAsset(
              asset.id,
              asset.address ?? prop.address.trim(),
              asset.country
            ).catch(() => {});
          }
        })
        .catch(() => {
          enrichAsset(
            asset.id,
            asset.address ?? prop.address.trim(),
            asset.country
          ).catch(() => {});
        });

      results.push({
        id: asset.id,
        address: prop.address,
        existing: false,
      });
    } catch (error) {
      errors.push({
        address: prop.address,
        error: error instanceof Error ? error.message : "Failed to create",
      });
    }
  }

  // Send activation email only if this was the user's first batch of properties
  if (assetCountBefore === 0 && results.length > 0 && session.user.email) {
    const firstAsset = results[0];
    sendPropertyAddedActivationEmail({
      email: session.user.email,
      name: session.user.name ?? "there",
      address: firstAsset.address,
      country: "UK",
    }).catch((err) => console.error("[activation-email]", err));
  }

  return NextResponse.json({
    created: results.filter((r) => !r.existing).length,
    skipped: results.filter((r) => r.existing).length,
    errorCount: errors.length,
    results,
    errors,
  });
}
