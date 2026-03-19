import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminServiceLeadAlert } from "@/lib/email";

// POST /api/leads/book-visit
// Fires when a prospect lands on /book with personalization params (company, assets, name)
// Captures high-intent outreach link visits even if they don't click the cal.com button
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { company, name, assets, estimatedOpp, email } = body;

  // Don't capture anonymous visits with no context
  if (!company && !name && !assets) {
    return NextResponse.json({ ok: true });
  }

  const notesParts: string[] = [];
  if (assets) notesParts.push(`assets: ${assets}`);
  if (estimatedOpp) notesParts.push(`est. opp: $${Math.round(estimatedOpp / 1000)}k/yr`);
  if (name) notesParts.push(`name: ${name}`);

  const resolvedEmail = email ?? session?.user?.email ?? null;

  try {
    await prisma.serviceLead.create({
      data: {
        email: resolvedEmail,
        userId: session?.user?.id ?? null,
        serviceType: "book_visit",
        propertyAddress: company ?? null,
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
      },
    });
    await sendAdminServiceLeadAlert({
      serviceType: "book_visit",
      email: resolvedEmail ?? company ?? name ?? "anonymous",
      details: { company, name, assets, estimatedOpp },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[book-visit] lead capture failed:", error);
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
