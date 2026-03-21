import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
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
// Body: { prospectKey, status, notes, linkedinSent, emailSent, touch1SentAt, touch2SentAt, touch3SentAt, emailOpened, emailClicked, emailBounced, lastContact, emailOverride, linkedinOverride }
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
    touch1SentAt?: string | null;
    touch2SentAt?: string | null;
    touch3SentAt?: string | null;
    emailOpened?: boolean;
    emailClicked?: boolean;
    emailBounced?: boolean;
    lastContact?: string;
    emailOverride?: string;
    linkedinOverride?: string;
    manualStatus?: string;
    manualNote?: string;
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
          touch1SentAt: item.touch1SentAt ?? null,
          touch2SentAt: item.touch2SentAt ?? null,
          touch3SentAt: item.touch3SentAt ?? null,
          emailOpened: item.emailOpened ?? false,
          emailClicked: item.emailClicked ?? false,
          emailBounced: item.emailBounced ?? false,
          lastContact: item.lastContact ?? null,
          emailOverride: item.emailOverride ?? null,
          linkedinOverride: item.linkedinOverride ?? null,
          ...(item.manualStatus !== undefined && { manualStatus: item.manualStatus || null }),
          ...(item.manualNote !== undefined && { manualNote: item.manualNote || null }),
          updatedBy,
        },
        update: {
          status: item.status,
          notes: item.notes ?? null,
          linkedinSent: item.linkedinSent ?? false,
          emailSent: item.emailSent ?? false,
          ...(item.touch1SentAt !== undefined && { touch1SentAt: item.touch1SentAt }),
          ...(item.touch2SentAt !== undefined && { touch2SentAt: item.touch2SentAt }),
          ...(item.touch3SentAt !== undefined && { touch3SentAt: item.touch3SentAt }),
          ...(item.emailOpened !== undefined && { emailOpened: item.emailOpened }),
          ...(item.emailClicked !== undefined && { emailClicked: item.emailClicked }),
          ...(item.emailBounced !== undefined && { emailBounced: item.emailBounced }),
          lastContact: item.lastContact ?? null,
          emailOverride: item.emailOverride ?? null,
          linkedinOverride: item.linkedinOverride ?? null,
          ...(item.manualStatus !== undefined && { manualStatus: item.manualStatus || null }),
          ...(item.manualNote !== undefined && { manualNote: item.manualNote || null }),
          updatedBy,
        },
      })
    )
  );

  return NextResponse.json(results.length === 1 ? results[0] : results);
}
