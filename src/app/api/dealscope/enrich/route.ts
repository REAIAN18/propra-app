import { NextRequest, NextResponse } from "next/server";
import { findComps } from "@/lib/dealscope-comps";
import { lookupEPCByAddress } from "@/lib/dealscope-epc";
import { fetchUKPlanningApplications } from "@/lib/planning-feed";
import { prisma } from "@/lib/prisma";
import { extractTextFromDocument } from "@/lib/textract";
import { parseDocument } from "@/lib/document-parser";
import { extractAddressFromDescription } from "@/lib/dealscope-text-parser";

// Extract address from URL slug — works for Savills, Rightmove, Zoopla, most auction sites
function extractAddressFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    // Get the last meaningful path segment
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    // Find segment that looks like an address (contains a UK postcode pattern)
    const postcodeRe = /[a-z]{1,2}\d{1,2}[a-z]?-\d[a-z]{2}/i;
    let addressSegment = segments.find((s) => postcodeRe.test(s));

    // If no postcode found, use the longest segment (usually the address slug)
    if (!addressSegment) {
      addressSegment = segments.reduce((a, b) => (a.length > b.length ? a : b));
    }

    // Remove trailing ID numbers (e.g. "-21943" at end)
    addressSegment = addressSegment.replace(/-\d{3,}$/, "");

    // Convert hyphens to spaces and capitalise
    const words = addressSegment.split("-").map((w) =>
      w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
    );

    const address = words.join(" ");

    // Must be reasonable length
    if (address.length < 5 || address.length > 300) return null;

    return address;
  } catch {
    return null;
  }
}

// Extract address from HTML title/meta tags
function extractAddressFromHtml(html: string): { address?: string; price?: number; ogImage?: string } {
  const result: { address?: string; price?: number; ogImage?: string } = {};

  // Try og:title first
  const ogMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  if (ogMatch) {
    const cleaned = ogMatch[1]
      .replace(/\|.*$/, "")
      .replace(/- Rightmove.*$/i, "")
      .replace(/- Zoopla.*$/i, "")
      .replace(/Savills.*?\|/i, "")
      .trim();
    if (cleaned.length > 5 && cleaned.length < 200) {
      result.address = cleaned;
    }
  }

  // Try <title> as fallback
  if (!result.address) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const cleaned = titleMatch[1]
        .replace(/\|.*$/, "")
        .replace(/- Rightmove.*$/i, "")
        .replace(/- Zoopla.*$/i, "")
        .replace(/Savills.*?\|/i, "")
        .trim();
      if (cleaned.length > 5 && cleaned.length < 200) {
        result.address = cleaned;
      }
    }
  }

  // Extract price — first £ amount on page
  const priceMatch = html.match(/£\s*([\d,]+(?:\.\d{2})?)/);
  if (priceMatch) {
    const price = parseFloat(priceMatch[1].replace(/,/g, ""));
    if (!isNaN(price) && price > 1000) {
      result.price = price;
    }
  }

  // Extract og:image for satellite/listing image
  const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  if (ogImageMatch) {
    result.ogImage = ogImageMatch[1];
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let address: string | undefined;
    let url: string | undefined;
    let guidePrice: number | undefined;
    let price: number | undefined;
    let sourceTag = "Manual enrichment";
    let auctionHouse: string | undefined;
    let documentId: string | undefined;

    // Handle multipart form data (for PDF uploads)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      address = formData.get("address") as string | undefined;
      url = formData.get("url") as string | undefined;
      const priceVal = formData.get("price");
      if (priceVal) price = Number(priceVal);
      const pdfFile = formData.get("pdf") as File | undefined;

      if (pdfFile) {
        try {
          const buffer = Buffer.from(await pdfFile.arrayBuffer());
          // Extract text using server-safe Textract
          const extractedText = await extractTextFromDocument(buffer);

          if (extractedText) {
            // Parse document to get structured data
            const parsed = await parseDocument(extractedText, null, "other");

            // Extract address from parsed text
            const extractedAddressData = await extractAddressFromDescription(extractedText);
            if (extractedAddressData?.address && !address) {
              address = extractedAddressData.address;
            }

            // Create Document record for storage
            const document = await prisma.document.create({
              data: {
                filename: pdfFile.name,
                fileSize: buffer.length,
                mimeType: pdfFile.type || "application/pdf",
                documentType: parsed?.documentType || "other",
                summary: parsed?.summary || null,
                extractedData: (parsed?.keyData as any) || undefined,
                extractedJson: extractedText,
                status: "processed",
              },
            });
            documentId = document.id;
            sourceTag = "PDF upload";
          }
        } catch (e) {
          console.warn("[scope-enrich] Failed to extract from PDF:", e);
        }
      }
    } else {
      // Handle JSON body
      const body = (await req.json()) as Record<string, unknown>;
      address = body.address as string | undefined;
      url = body.url as string | undefined;
      price = body.price as number | undefined;
    }

    if (!address && !url) {
      return NextResponse.json({ error: "address, url, or pdf is required" }, { status: 400 });
    }

    // If URL provided, extract address from it
    let ogImage: string | undefined;
    if (url && !address) {
      // Try URL slug first (fast, no fetch needed)
      address = extractAddressFromUrl(url) || undefined;

      // If slug extraction failed, fetch the page and parse HTML
      if (!address) {
        try {
          const pageRes = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            signal: AbortSignal.timeout(10000),
          });
          if (pageRes.ok) {
            const html = await pageRes.text();
            const extracted = extractAddressFromHtml(html);
            address = extracted.address;
            guidePrice = extracted.price;
            ogImage = extracted.ogImage;
          }
        } catch (e) {
          console.warn("[scope-enrich] Failed to fetch URL:", e);
        }
      }

      if (!address) {
        return NextResponse.json(
          { error: "Couldn't extract an address from this URL. Try pasting the address directly." },
          { status: 400 }
        );
      }

      // Detect source from domain
      const domain = new URL(url).hostname;
      if (domain.includes("savills")) { sourceTag = "Auction"; auctionHouse = "Savills"; }
      else if (domain.includes("eigproperty") || domain.includes("allsop") || domain.includes("acuitus")) { sourceTag = "Auction"; auctionHouse = domain.split(".")[0]; }
      else if (domain.includes("rightmove") || domain.includes("zoopla") || domain.includes("onthemarket")) { sourceTag = "Listed"; }
      else { sourceTag = "URL import"; }
    }

    // Run enrichment in parallel
    const results = await Promise.allSettled([
      lookupEPCByAddress(address!),
      findComps(address!, "Mixed", undefined, 24),
      fetchUKPlanningApplications(address!),
    ]);

    const epcData = results[0].status === "fulfilled" ? results[0].value : null;
    const comparableSales = results[1].status === "fulfilled" ? results[1].value : [];
    const planningApps = results[2].status === "fulfilled" ? results[2].value : [];

    // Use og:image from URL if available, otherwise no satellite image
    const satelliteUrl = ogImage || null;

    // Save to ScoutDeal
    const deal = await prisma.scoutDeal.create({
      data: {
        address: address!,
        assetType: "Mixed",
        region: "uk",
        sourceTag,
        sourceUrl: url || undefined,
        askingPrice: guidePrice || price || undefined,
        guidePrice: guidePrice || undefined,
        brokerName: auctionHouse || undefined,
        satelliteImageUrl: satelliteUrl || undefined,
        epcRating: epcData?.epcRating || undefined,
        buildingSizeSqft: epcData?.floorAreaSqft || undefined,
        signalCount: Math.min(5,
          (planningApps.length > 0 ? 1 : 0) +
          (epcData?.meesRisk ? 1 : 0)
        ),
        enrichedAt: new Date(),
        brochureDocId: documentId || undefined,
        dataSources: {
          epc: epcData || null,
          comps: comparableSales.slice(0, 5),
          planning: planningApps.slice(0, 5),
          images: satelliteUrl ? [satelliteUrl] : [],
        } as any,
        currency: "GBP",
      },
    });

    return NextResponse.json({
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      enrichment: {
        epc: epcData,
        comps: comparableSales.slice(0, 5),
        planning: planningApps.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Enrich error:", error);
    return NextResponse.json({ error: "Failed to enrich property" }, { status: 500 });
  }
}
