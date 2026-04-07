import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePropertyUrl, type ListingData } from "@/lib/dealscope-url-parser";
import { lookupEPCByAddress } from "@/lib/dealscope-epc";
import {
  scoreProperty, epcSignal,
  type PropertySignal,
} from "@/lib/dealscope-scoring";

// ── Address extraction from URL slug ──
function extractAddressFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
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

// ── Geocode ──
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    if (result?.geometry?.location) {
      return { lat: result.geometry.location.lat, lng: result.geometry.location.lng };
    }
  } catch (e) {
    console.warn("[quick-assess] Geocode failed:", e);
  }
  return null;
}

function buildSatelliteUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=600x400&maptype=satellite&key=${key}`;
}

function buildStreetViewUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${key}`;
}

/**
 * Stage 1 — Quick Assessment (<5s)
 * Scrape URL (if provided), geocode, EPC lookup, preliminary score.
 * Saves ScoutDeal with status "quick_assessed".
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    let address = body.address as string | undefined;
    const url = body.url as string | undefined;
    const docId = body.docId as string | undefined;
    let sourceTag = "Manual enrichment";
    let auctionHouse: string | undefined;
    let listingData: ListingData | null = null;
    let guidePrice: number | undefined;
    let ogImage: string | undefined;

    // ── SCRAPE URL (fast — just HTML fetch + regex) ──
    if (url) {
      try {
        const parsed = await parsePropertyUrl(url);
        listingData = parsed.listing;
        if (!address && parsed.address && parsed.address !== "Unknown Address") {
          address = parsed.address;
        }
        if (parsed.price) guidePrice = parsed.price;
        ogImage = listingData?.ogImage || undefined;
      } catch (e) {
        console.warn("[quick-assess] Scrape failed:", e);
      }

      if (!address) {
        address = extractAddressFromUrl(url) || undefined;
      }

      if (!address) {
        return NextResponse.json(
          { error: "Couldn't extract an address from this URL. Try pasting the address directly." },
          { status: 400 }
        );
      }

      const domain = new URL(url).hostname.replace(/^www\./i, "");
      const rootName = domain.split(".")[0];
      if (domain.includes("savills")) { sourceTag = "Auction"; auctionHouse = "Savills"; }
      else if (domain.includes("allsop")) { sourceTag = "Auction"; auctionHouse = "Allsop"; }
      else if (domain.includes("acuitus")) { sourceTag = "Auction"; auctionHouse = "Acuitus"; }
      else if (domain.includes("eigproperty")) { sourceTag = "Auction"; auctionHouse = "EIG"; }
      else if (domain.includes("rightmove") || domain.includes("zoopla") || domain.includes("onthemarket")) { sourceTag = "Listed"; }
      else { sourceTag = "URL import"; auctionHouse = rootName.length > 2 ? rootName.charAt(0).toUpperCase() + rootName.slice(1) : undefined; }
    }

    if (!address) {
      return NextResponse.json({ error: "address or url is required" }, { status: 400 });
    }

    // ── PARALLEL: Geocode + EPC (both fast) ──
    const [geo, epcData] = await Promise.all([
      geocodeAddress(address),
      lookupEPCByAddress(address),
    ]);

    // ── SATELLITE + STREET VIEW ──
    let satelliteUrl = ogImage || null;
    let streetViewUrl: string | null = null;
    if (geo) {
      const satUrl = buildSatelliteUrl(geo.lat, geo.lng);
      if (satUrl) satelliteUrl = satUrl;
      streetViewUrl = buildStreetViewUrl(geo.lat, geo.lng);
    }

    // ── BUILD IMAGES ──
    const allImages: string[] = [];
    if (listingData?.images?.length) allImages.push(...listingData.images.slice(0, 6));
    if (satelliteUrl && !allImages.includes(satelliteUrl)) allImages.push(satelliteUrl);
    if (streetViewUrl) allImages.push(streetViewUrl);

    // ── PRELIMINARY SCORE ──
    const signals: PropertySignal[] = [];
    const epc = epcSignal(epcData?.epcRating);
    if (epc) signals.push(epc);
    if (sourceTag === "Auction") {
      signals.push({ type: "distress", name: "Listed at auction", weight: 7, confidence: 100, source: "Listing source" });
    }
    if (listingData?.legalPackUrl) {
      signals.push({ type: "distress", name: "Legal pack available", weight: 5, confidence: 85, source: "Listing page" });
    }
    const propertyScore = scoreProperty(signals);

    // ── ASSET TYPE from listing or EPC ──
    const assetType = epcData?.buildingType || "Mixed";

    // ── SAVE as quick_assessed ──
    const deal = await prisma.scoutDeal.create({
      data: {
        address,
        assetType,
        sourceTag,
        sourceUrl: url || undefined,
        guidePrice: guidePrice || undefined,
        brokerName: auctionHouse || listingData?.agentContact?.name || undefined,
        satelliteImageUrl: satelliteUrl || undefined,
        epcRating: epcData?.epcRating || undefined,
        signalCount: propertyScore.signalCount,
        status: "quick_assessed",
        enrichedAt: new Date(),
        brochureDocId: docId || undefined,
        inputMethod: url ? "api" : docId ? "upload" : "manual",
        dataSources: {
          epc: epcData || null,
          geocode: geo || null,
          images: allImages,
          listing: listingData ? {
            images: listingData.images.slice(0, 6),
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
          score: {
            total: propertyScore.totalScore,
            signalCount: propertyScore.signalCount,
            confidence: propertyScore.confidence,
            confidenceLevel: propertyScore.confidenceLevel,
            opportunity: propertyScore.opportunity,
            actionable: propertyScore.actionable,
            signals: propertyScore.signals.map((s) => ({ name: s.name, type: s.type, weight: s.weight, source: s.source })),
          },
        } as any,
        currency: "GBP",
      },
    });

    return NextResponse.json({
      id: deal.id,
      address: deal.address,
      assetType: deal.assetType,
      sourceTag,
      guidePrice: guidePrice || null,
      epcRating: epcData?.epcRating || null,
      score: propertyScore.totalScore,
      confidence: propertyScore.confidenceLevel,
      signals: propertyScore.signals.map((s) => ({ name: s.name, type: s.type })),
      images: allImages.slice(0, 4),
      satelliteUrl,
      streetViewUrl,
      geocode: geo,
      features: listingData?.features?.slice(0, 5) || [],
      auctionDate: listingData?.auctionDate || null,
      lotNumber: listingData?.lotNumber || null,
      agentName: auctionHouse || listingData?.agentContact?.name || null,
      status: "quick_assessed",
    });
  } catch (error) {
    console.error("[quick-assess] Error:", error);
    return NextResponse.json({ error: "Quick assessment failed" }, { status: 500 });
  }
}
