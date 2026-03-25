/**
 * POST /api/user/transactions/:roomId/documents
 * Upload a document to the deal room.
 * Accepts JSON body (with optional fileUrl) — S3 upload is optional.
 *
 * Body: { name, category, uploadedBy?, confidential?, fileUrl? }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ roomId: string }> };

interface DocRow {
  id: string; roomId: string; name: string; category: string;
  uploadedBy: string; fileUrl: string | null; confidential: boolean; uploadedAt: Date;
}

type PrismaWithTx = {
  transactionRoom: { findFirst: (q: object) => Promise<{ id: string } | null> };
  transactionDocument: { create: (q: object) => Promise<DocRow> };
};

function db() { return prisma as unknown as PrismaWithTx; }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const room = await db().transactionRoom.findFirst({ where: { id: roomId, userId: session.user.id } } as object);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    category?: string;
    uploadedBy?: string;
    confidential?: boolean;
    fileUrl?: string;
  };

  if (!body.name || !body.category) {
    return NextResponse.json({ error: "name and category are required" }, { status: 400 });
  }

  const VALID_CATEGORIES = ["nda", "title_register", "searches", "survey", "contracts", "enquiries", "finance", "other"];
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
  }

  const doc = await db().transactionDocument.create({
    data: {
      roomId,
      name:        body.name,
      category:    body.category,
      uploadedBy:  body.uploadedBy ?? "owner",
      confidential: body.confidential ?? false,
      fileUrl:     body.fileUrl ?? null,
    },
  } as object);

  return NextResponse.json({ document: doc }, { status: 201 });
}
