import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendPostDemoFollowUp } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, firstName, company, assetCount, assetType, estimateTotal, callNote } = body;

    if (!email?.trim() || !firstName?.trim() || !assetCount || !estimateTotal) {
      return NextResponse.json({ error: "email, firstName, assetCount, and estimateTotal are required." }, { status: 400 });
    }

    await sendPostDemoFollowUp({
      email: email.trim().toLowerCase(),
      firstName: firstName.trim(),
      company: company?.trim() || null,
      assetCount: Number(assetCount),
      assetType: assetType?.trim() || null,
      estimateTotal: Number(estimateTotal),
      callNote: callNote?.trim() || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-followup]", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
