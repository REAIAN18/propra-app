/**
 * POST /api/user/rent-reviews/:reviewId/pdf
 * Generates a PDF of the rent review letter.
 *
 * Returns: { pdfUrl, generatedAt }
 * - pdfUrl is a base64 data URI if PDF generation succeeds
 * - pdfUrl is null if packages not installed (graceful fallback)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  renderRentReviewLetterHTML,
  type RentReviewLetterData,
} from "@/lib/rent-review-template";
import type {
  RentReviewEvent,
  RenewalCorrespondence,
} from "@/generated/prisma";

type PrismaWithRentReview = {
  rentReviewEvent: {
    findFirst(q: object): Promise<RentReviewEvent | null>;
  };
  renewalCorrespondence: {
    findFirst(q: object): Promise<RenewalCorrespondence | null>;
  };
};

async function generatePDF(html: string): Promise<Buffer | null> {
  try {
    // Dynamic import with type casting
    const chromium = await (async () => {
      try {
        return (
          await import("@sparticuz/chromium" as string)
        ).default as {
          args: string[];
          executablePath: () => Promise<string>;
          headless: boolean;
        };
      } catch {
        return null;
      }
    })();

    const puppeteer = await (async () => {
      try {
        return (
          await import("puppeteer-core" as string)
        ).default as {
          launch: (opts: object) => Promise<{
            newPage: () => Promise<{
              setContent: (h: string, opts: object) => Promise<void>;
              pdf: (opts: object) => Promise<Uint8Array>;
            }>;
            close: () => Promise<void>;
          }>;
        };
      } catch {
        return null;
      }
    })();

    if (!chromium || !puppeteer) return null;

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "25mm", bottom: "25mm", left: "25mm", right: "25mm" },
    });
    await browser.close();

    return Buffer.from(pdfBuffer);
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { reviewId } = await params;

  const db = prisma as unknown as PrismaWithRentReview;

  // Fetch rent review event
  const review = await db.rentReviewEvent.findFirst({
    where: { id: reviewId, userId: user.id },
  } as object);
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Fetch most recent correspondence (letter body)
  const correspondence = await db.renewalCorrespondence.findFirst({
    where: { reviewId: review.id },
    orderBy: { id: "desc" },
  } as object);

  if (!correspondence?.body) {
    return NextResponse.json(
      {
        error:
          "No letter draft found. Generate a draft first using POST /api/user/rent-reviews/:reviewId/draft",
      },
      { status: 404 }
    );
  }

  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const letterData: RentReviewLetterData = {
    tenantName: review.tenantName,
    propertyAddress: review.propertyAddress ?? "The Demised Premises",
    letterBody: correspondence.body,
    generatedAt,
    landlordName: user.name ?? undefined,
  };

  const html = renderRentReviewLetterHTML(letterData);

  // Attempt PDF generation
  let pdfUrl: string | null = null;
  try {
    const pdfBuffer = await generatePDF(html);
    if (pdfBuffer) {
      pdfUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    }
  } catch (err) {
    console.error("[rent-review/pdf] PDF generation failed:", err);
    // Non-fatal — return null pdfUrl
  }

  return NextResponse.json({ pdfUrl, generatedAt });
}
