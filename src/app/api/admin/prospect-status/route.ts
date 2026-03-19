import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) return null;
  return session;
}

// GET /api/admin/prospect-status — returns all rows as { [prospectKey]: row }
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.prospectStatus.findMany();
  const map: Record<string, (typeof rows)[number]> = {};
  for (const r of rows) map[r.prospectKey] = r;
  return NextResponse.json(map);
}

// POST /api/admin/prospect-status — upsert one or many prospect states
// Body: { prospectKey, status, notes, linkedinSent, emailSent, lastContact }
//    or { updates: Array<above> }
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const updatedBy = session.user?.email ?? null;

  const items: Array<{
    prospectKey: string;
    status: string;
    notes?: string;
    linkedinSent?: boolean;
    emailSent?: boolean;
    lastContact?: string;
  }> = Array.isArray(body.updates) ? body.updates : [body];

  if (!items.length || !items[0].prospectKey) {
    return NextResponse.json({ error: "prospectKey required" }, { status: 400 });
  }

  const results = await Promise.all(
    items.map((item) =>
      prisma.prospectStatus.upsert({
        where: { prospectKey: item.prospectKey },
        create: {
          prospectKey: item.prospectKey,
          status: item.status,
          notes: item.notes ?? null,
          linkedinSent: item.linkedinSent ?? false,
          emailSent: item.emailSent ?? false,
          lastContact: item.lastContact ?? null,
          updatedBy,
        },
        update: {
          status: item.status,
          notes: item.notes ?? null,
          linkedinSent: item.linkedinSent ?? false,
          emailSent: item.emailSent ?? false,
          lastContact: item.lastContact ?? null,
          updatedBy,
        },
      })
    )
  );

  return NextResponse.json(results.length === 1 ? results[0] : results);
}
