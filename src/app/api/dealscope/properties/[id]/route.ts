import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  getMarketCapRate, getMarketERV, normaliseRegion, normaliseAssetType,
  SCOUT_FINANCING, calculateAnnualDebtService,
} from "@/lib/data/scout-benchmarks";
import { calculateDealReturns } from "@/lib/scout-returns";
import { calculateHoldScenario, defaultHoldInputs } from "@/lib/hold-sell-model";
import { getFallbackCapRate, calculateIncomeCap, blendValuation } from "@/lib/avm";
import { scoreCompsConfidence } from "@/lib/dealscope-comps";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deal = await prisma.scoutDeal.findUnique({
      where: { id },
    });

    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    let score = 50;
    const signals: string[] = [];
    if (deal.hasInsolvency) { score += 20; signals.push("insolvency"); }
    if (deal.hasPlanningApplication) { score += 15; signals.push("planning"); }
    if (deal.sourceTag === "Auction") { score += 12; signals.push("auction"); }
    if (deal.sourceTag === "Distressed") { score += 15; signals.push("distressed"); }
    if (deal.epcRating === "F" || deal.epcRating === "G") { score += 10; signals.push("mees_risk"); }
    score = Math.min(100, score);
    const temperature = score >= 80 ? "hot" : score >= 60 ? "warm" : score >= 40 ? "watch" : "cold";

    return NextResponse.json({
      ...deal,
      dealScore: score,
      temperature,
      signals,
    });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Failed to fetch property", detail: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Update ScoutDeal fields with user-provided data.
 * Recalculates valuations, returns, scenarios when size/price/rent change.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, any>;

    const existing = await prisma.scoutDeal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const ds = (existing.dataSources as any) || {};
    const userOverrides = ds.userOverrides || {};

    // ── Merge user overrides ──
    const allowedFields = [
      "buildingSizeSqft", "askingPrice", "tenure", "yearBuilt",
      "epcRating", "occupancyPct", "notes",
    ];
    const allowedDsFields = [
      "passingRent", "erv", "capRate", "noi", "serviceCharge", "groundRent",
    ];

    const topLevelUpdates: Record<string, any> = {};
    const newOverrides = { ...userOverrides };

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        topLevelUpdates[key] = body[key];
        newOverrides[key] = { value: body[key], source: "user", updatedAt: new Date().toISOString() };
      }
    }

    for (const key of allowedDsFields) {
      if (body[key] !== undefined) {
        newOverrides[key] = { value: body[key], source: "user", updatedAt: new Date().toISOString() };
      }
    }

    // ── Recalculate financials if size, price, or rent changed ──
    const needsRecalc = ["buildingSizeSqft", "askingPrice", "passingRent", "erv", "capRate"].some(
      (k) => body[k] !== undefined
    );

    let newDs = { ...ds, userOverrides: newOverrides };

    if (needsRecalc) {
      const sqft = body.buildingSizeSqft ?? existing.buildingSizeSqft ?? ds.assumptions?.sqft?.value ?? 2500;
      const askingPrice = body.askingPrice ?? existing.askingPrice ?? existing.guidePrice ?? 0;
      const assetType = normaliseAssetType(existing.assetType);
      const region = normaliseRegion(existing.region || "se_uk");
      const mktCapRate = getMarketCapRate(assetType, region);
      const mktERV = getMarketERV(assetType, region);

      // User-provided or existing rent
      const passingRent = body.passingRent ?? newOverrides.passingRent?.value ?? ds.assumptions?.passingRent?.value ?? (sqft * mktERV);
      const erv = body.erv ?? newOverrides.erv?.value ?? ds.assumptions?.erv?.value ?? (sqft * mktERV);
      const noi = erv * 0.85;
      const userCapRate = body.capRate ?? newOverrides.capRate?.value ?? mktCapRate;

      // Update assumptions
      newDs.assumptions = {
        ...ds.assumptions,
        sqft: { value: sqft, source: body.buildingSizeSqft !== undefined ? "user" : (ds.assumptions?.sqft?.source || "data") },
        erv: { value: Math.round(erv), source: body.erv !== undefined ? "user" : (ds.assumptions?.erv?.source || "estimated") },
        noi: { value: Math.round(noi), source: "estimated (ERV × 85%)" },
        passingRent: { value: Math.round(passingRent), source: body.passingRent !== undefined ? "user" : (ds.assumptions?.passingRent?.source || "estimated") },
        capRate: { value: userCapRate, source: body.capRate !== undefined ? "user" : (ds.assumptions?.capRate?.source || "market benchmark") },
      };

      // Recalculate valuations
      if (askingPrice > 0) {
        const incomeCapValue = noi / userCapRate;
        const comps = ds.comps || [];
        let psfValue: any = null;
        if (comps.length > 0) {
          const compsConf = scoreCompsConfidence(comps, sqft);
          psfValue = compsConf.valueRange;
        }
        const psfMid: number | null = typeof psfValue?.mid === "number" ? psfValue.mid * sqft : null;
        const blended = blendValuation(incomeCapValue, psfMid as any, comps.length);
        const b = blended as any;

        newDs.valuations = {
          incomeCap: { value: Math.round(incomeCapValue), method: "Income capitalisation", capRate: userCapRate, noi: Math.round(noi) },
          psf: psfValue ? { value: Math.round(psfValue.mid * sqft), method: "Price per sqft", low: psfValue.low ? Math.round(psfValue.low * sqft) : null, high: psfValue.high ? Math.round(psfValue.high * sqft) : null } : null,
          blended: b.avmValue !== undefined
            ? { value: b.avmValue ? Math.round(b.avmValue) : null, confidence: b.confidenceScore, method: b.method }
            : { value: b.value ? Math.round(b.value) : null, method: b.method || "blended" },
          askingPrice,
          discount: incomeCapValue > askingPrice ? Math.round(((incomeCapValue - askingPrice) / incomeCapValue) * 100) : null,
        };

        // Recalculate returns
        newDs.returns = null;
        try {
          const returns = calculateDealReturns({
            askingPrice,
            guidePrice: existing.guidePrice || null,
            capRate: userCapRate * 100,
            noi,
            assetType,
            currency: "GBP",
          });
          newDs.returns = {
            capRate: returns.capRate,
            noi: returns.noi ? Math.round(returns.noi) : null,
            irr5yr: returns.irr5yr,
            cashOnCash: returns.cashOnCash,
            equityMultiple: returns.equityMultiple,
            equityNeeded: returns.equityNeeded ? Math.round(returns.equityNeeded) : null,
          };
        } catch (e) { console.warn("[PATCH] Returns calc failed:", e); }

        // Recalculate scenarios
        newDs.scenarios = null;
        try {
          const baseInputs = defaultHoldInputs(askingPrice, passingRent, erv, assetType, "uk");
          const base = calculateHoldScenario(baseInputs);
          const valueAdd = calculateHoldScenario({ ...baseInputs, marketERV: erv * 1.10 });
          const downside = calculateHoldScenario({ ...baseInputs, exitYield: baseInputs.exitYield * 1.05 });
          newDs.scenarios = [
            { name: "Base case", irr: (base.irr * 100).toFixed(1), equityMultiple: base.equityMultiple.toFixed(2), cashYield: base.cashYield.toFixed(1), npv: Math.round(base.npv) },
            { name: "Value-add", irr: (valueAdd.irr * 100).toFixed(1), equityMultiple: valueAdd.equityMultiple.toFixed(2), cashYield: valueAdd.cashYield.toFixed(1), npv: Math.round(valueAdd.npv) },
            { name: "Downside", irr: (downside.irr * 100).toFixed(1), equityMultiple: downside.equityMultiple.toFixed(2), cashYield: downside.cashYield.toFixed(1), npv: Math.round(downside.npv) },
          ];
        } catch (e) { console.warn("[PATCH] Scenarios calc failed:", e); }

        // Recalculate rent gap
        const gap = erv - passingRent;
        const gapPct = passingRent > 0 ? (gap / passingRent) * 100 : 0;
        newDs.rentGap = {
          passingRent: Math.round(passingRent),
          passingRentSource: body.passingRent !== undefined ? "user" : (ds.rentGap?.passingRentSource || "estimated"),
          marketERV: Math.round(erv),
          ervSource: body.erv !== undefined ? "user" : (ds.rentGap?.ervSource || "estimated"),
          gap: Math.round(gap),
          gapPct: parseFloat(gapPct.toFixed(1)),
          direction: gap > 0 ? "under-rented" : gap < 0 ? "over-rented" : "market-rate",
        };

        // DSCR
        const annualDebtService = calculateAnnualDebtService(askingPrice);
        const dscr = annualDebtService && noi > 0 ? noi / annualDebtService : null;
        if (newDs.market) {
          newDs.market = {
            ...newDs.market,
            annualDebtService: annualDebtService ? Math.round(annualDebtService) : null,
            dscr: dscr ? parseFloat(dscr.toFixed(2)) : null,
          };
        }
      }
    }

    // ── Handle notes ──
    if (body.notes !== undefined) {
      newDs.userNotes = body.notes;
    }

    // ── Handle additional documents ──
    if (body.additionalDocId) {
      const userDocs = newDs.userDocuments || [];
      userDocs.push({ docId: body.additionalDocId, addedAt: new Date().toISOString() });
      newDs.userDocuments = userDocs;
    }

    const updated = await prisma.scoutDeal.update({
      where: { id },
      data: {
        ...topLevelUpdates,
        dataSources: newDs as any,
      },
    });

    return NextResponse.json({ success: true, id: updated.id, recalculated: needsRecalc });
  } catch (error) {
    console.error("[PATCH property] Error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}
