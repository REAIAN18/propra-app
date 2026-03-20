import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { sendAdminBounceAlert, sendAdminClickAlert } from "@/lib/email";

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

  let payload: {
    type: string;
    data: {
      to?: string[];
      tags?: { name: string; value: string }[];
      bounce?: { type?: string };
    };
  };
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(body, headers) as typeof payload;
  } catch (err) {
    console.error("[resend-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = payload;

  // Handle bounce — flag prospect and alert Ian
  if (type === "email.bounced") {
    const tags = data.tags ?? [];
    const prospectKey = tags.find((t) => t.name === "prospectKey")?.value;
    const toEmail = data.to?.[0] ?? "";
    const bounceType = data.bounce?.type;

    if (prospectKey) {
      const today = new Date().toISOString().split("T")[0];
      await prisma.prospectStatus.upsert({
        where: { prospectKey },
        update: { status: "bounced", emailBounced: true, lastContact: today },
        create: { prospectKey, status: "bounced", emailBounced: true, lastContact: today },
      }).catch((e) => console.error("[resend-webhook] bounce DB update failed:", e));

      sendAdminBounceAlert({ prospectKey, toEmail, bounceType }).catch(
        (e) => console.error("[resend-webhook] bounce alert failed:", e)
      );
      console.log(`[resend-webhook] Bounced: ${prospectKey} <${toEmail}> type=${bounceType}`);
    } else {
      console.warn("[resend-webhook] Bounce with no prospectKey tag", toEmail);
    }
    return NextResponse.json({ ok: true });
  }

  if (type !== "email.opened" && type !== "email.clicked") {
    return NextResponse.json({ ok: true });
  }

  const tags = data.tags ?? [];
  const prospectKey = tags.find((t) => t.name === "prospectKey")?.value;
  if (!prospectKey) {
    console.warn("[resend-webhook] No prospectKey tag on event", type);
    return NextResponse.json({ ok: true });
  }

  const isClicked = type === "email.clicked";
  const today = new Date().toISOString().split("T")[0];

  try {
    await prisma.prospectStatus.upsert({
      where: { prospectKey },
      update: {
        emailSent: true,
        emailOpened: true,
        ...(isClicked ? { emailClicked: true } : {}),
        lastContact: today,
      },
      create: {
        prospectKey,
        status: "contacted",
        emailSent: true,
        emailOpened: true,
        emailClicked: isClicked,
        lastContact: today,
      },
    });
    console.log(`[resend-webhook] Marked ${prospectKey} emailOpened=true${isClicked ? " emailClicked=true" : ""} (${type})`);
  } catch (err) {
    console.error("[resend-webhook] DB update failed:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Fire high-intent click alert — fire-and-forget
  if (isClicked) {
    const market = tags.find((t) => t.name === "market")?.value;
    sendAdminClickAlert({ prospectKey, market }).catch(
      (e) => console.error("[resend-webhook] click alert failed:", e)
    );
  }

  return NextResponse.json({ ok: true });
}
