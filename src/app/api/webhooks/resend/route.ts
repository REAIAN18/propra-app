import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let payload: { type: string; data: { tags?: { name: string; value: string }[] } };
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(body, headers) as typeof payload;
  } catch (err) {
    console.error("[resend-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = payload;
  if (type !== "email.opened" && type !== "email.clicked") {
    return NextResponse.json({ ok: true });
  }

  const tags = data.tags ?? [];
  const prospectKey = tags.find((t) => t.name === "prospectKey")?.value;
  if (!prospectKey) {
    console.warn("[resend-webhook] No prospectKey tag on event", type);
    return NextResponse.json({ ok: true });
  }

  try {
    await prisma.prospectStatus.upsert({
      where: { prospectKey },
      update: {
        emailSent: true,
        lastContact: new Date().toISOString().split("T")[0],
      },
      create: {
        prospectKey,
        status: "contacted",
        emailSent: true,
        lastContact: new Date().toISOString().split("T")[0],
      },
    });
    console.log(`[resend-webhook] Marked ${prospectKey} as emailSent (${type})`);
  } catch (err) {
    console.error("[resend-webhook] DB update failed:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
