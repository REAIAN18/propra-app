import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { InsuranceRoadmapAction } from "@/types/insurance";

type ActionStatus = "in_progress" | "done" | "skipped";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assetId: string; actionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId, actionId } = await params;
  const body = await req.json() as { status: ActionStatus };

  if (!["in_progress", "done", "skipped"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
    select: { id: true, insuranceRoadmap: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const roadmap = (asset.insuranceRoadmap as InsuranceRoadmapAction[] | null) ?? [];
  const updated = roadmap.map(action =>
    action.id === actionId ? { ...action, status: body.status } : action
  );

  if (!roadmap.some(a => a.id === actionId)) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  await prisma.userAsset.update({
    where: { id: assetId },
    data: { insuranceRoadmap: updated as object[] },
  });

  return NextResponse.json({ ok: true, actionId, status: body.status });
}
