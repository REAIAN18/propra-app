import { NextRequest, NextResponse } from "next/server";
import { findComps } from "@/lib/dealscope-comps";
import { lookupEPCByAddress } from "@/lib/dealscope-epc";
import { fetchUKPlanningApplications } from "@/lib/planning-feed";
import { prisma } from "@/lib/prisma";
import { extractTextFromDocument } from "@/lib/textract";
import { parseDocument } from "@/lib/document-parser";
import { extractAddressFromDescription } from "@/lib/dealscope-text-parser";
import { parsePropertyUrl, type ListingData } from "@/lib/dealscope-url-parser";

// Extract address from URL slug — works for Savills, Rightmove, Zoopla, most auction sites
function extractAddressFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const postcodeRe = /[a-z]{1,2}\d{1,2}[a-z]?-\d[a-z]{2}/i;
    let addressSegment = segments.find((s) => postcodeRe.test(s));

    if (!addressSegment) {
      addressSegment = segments.reduce((a, b) => (a.length > b.length ? a : b));
    }

    addressSegment = addressSegment.replace(/-\d{3,}$/, "");

    const words = addressSegment.split("-").map((w) =>
      w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
    );

    const address = words.join(" ");

    if (address.length < 5 || address.length > 300) return null;

    return address;
  } catch {
    return null;
  }
}

// Geocode an address using Google Maps API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return null;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    if (result?.geometry?.location) {
      return { lat: result.geometry.location.lat, lng: result.geometry.location.lng };
    }
  } catch (e) {
    console.warn("[scope-enrich] Geocode failed:", e);
  }
  return null;
}

// Build Google Static Maps satellite URL
function buildSatelliteUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=600x400&maptype=satellite&key=${key}`;
}

// Build Google Street View URL
function buildStreetViewUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${key}`;
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
    let listingData: ListingData | null = null;

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
          const extractedText = await extractTextFromDocument(buffer);

          if (extractedText) {
            const parsed = await parseDocument(extractedText, null, "other");

            const extractedAddressData = await extractAddressFromDescription(extractedText);
            if (extractedAddressData?.address && !address) {
              address = extractedAddressData.address;
            }

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

    // If URL provided, do deep scrape with enhanced parser
    let ogImage: string | undefined;
    if (url) {
      // Deep scrape the listing page
      try {
        const parsed = await parsePropertyUrl(url);
        listingData = parsed.listing;

        // Use parsed address if we don't have one yet
        if (!address && parsed.address && parsed.address !== "Unknown Address") {
          address = parsed.address;
        }

        // Use parsed price if we don't have one
        if (!price && !guidePrice && parsed.price) {
          guidePrice = parsed.price;
        }

        // Use og:image
        ogImage = listingData?.ogImage || undefined;
      } catch (e) {
        console.warn("[scope-enrich] Deep scrape failed, falling back to URL extraction:", e);
      }

      // Fallback: extract address from URL slug if deep scrape didn't produce one
      if (!address) {
        address = extractAddressFromUrl(url) || undefined;
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

    // Geocode the address for satellite + street view
    const geo = await geocodeAddress(address!);
    let satelliteUrl = ogImage || null;
    let streetViewUrl: string | null = null;

    if (geo) {
      // Generate Google Maps satellite image
      const satUrl = buildSatelliteUrl(geo.lat, geo.lng);
      if (satUrl) satelliteUrl = satUrl;

      // Generate Google Street View image
      streetViewUrl = buildStreetViewUrl(geo.lat, geo.lng);
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

    // Build images array — listing images first, then satellite + streetview
    const allImages: string[] = [];
    if (listingData?.images?.length) {
      allImages.push(...listingData.images.slice(0, 20)); // Cap at 20 listing images
    }
    if (satelliteUrl && !allImages.includes(satelliteUrl)) {
      allImages.push(satelliteUrl);
    }
    if (streetViewUrl) {
      allImages.push(streetViewUrl);
    }

    // Extract tenure from listing or EPC data
    const tenure = listingData?.tenure || undefined;

    // Extract auction date from listing data
    let auctionDate: Date | undefined;
    if (listingData?.auctionDate) {
      const d = new Date(listingData.auctionDate);
      if (!isNaN(d.getTime())) auctionDate = d;
    }

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
        brokerName: auctionHouse || listingData?.agentContact?.name || undefined,
        satelliteImageUrl: satelliteUrl || undefined,
        epcRating: epcData?.epcRating || undefined,
        buildingSizeSqft: epcData?.floorAreaSqft || undefined,
        tenure,
        auctionDate,
        signalCount: Math.min(5,
          (planningApps.length > 0 ? 1 : 0) +
          (epcData?.meesRisk ? 1 : 0) +
          (listingData?.legalPackUrl ? 1 : 0) +
          (auctionDate ? 1 : 0)
        ),
        enrichedAt: new Date(),
        brochureDocId: documentId || undefined,
        dataSources: {
          epc: epcData || null,
          comps: comparableSales.slice(0, 5),
          planning: planningApps.slice(0, 5),
          images: allImages,
          geocode: geo || null,
          listing: listingData ? {
            images: listingData.images.slice(0, 20),
            floorplans: listingData.floorplans,
            features: listingData.features,
            description: listingData.description,
            tenure: listingData.tenure,
            accommodation: listingData.accommodation,
            lotNumber: listingData.lotNumber,
            auctionDate: listingData.auctionDate,
            agentContact: listingData.agentContact,
            legalPackUrl: listingData.legalPackUrl,
            streetView: streetViewUrl,
          } : null,
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
        listing: listingData,
        geocode: geo,
      },
    });
  } catch (error) {
    console.error("Enrich error:", error);
    return NextResponse.json({ error: "Failed to enrich property" }, { status: 500 });
  }
}
