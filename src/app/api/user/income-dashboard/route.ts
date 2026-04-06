import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateOpportunities } from "@/lib/income-opportunities";

interface AssetOpportunity {
  assetId: string;
  assetName: string;
  location: string;
  type: string;
  label: string;
  annualIncome: number;
  note: string;
}


export interface IncomeCategoryBreakdown {
  category: string;
  categoryKey: string;
  assetCount: number;
  providers: string[];
  annualIncome: number;
  liveCount: number;
  pipelineCount: number;
  identifiedCount: number;
}

export interface AssetUntappedPotential {
  assetId: string;
  assetName: string;
  location: string;
  opportunityCount: number;
  opportunityTypes: string[];
  untappedIncome: number;
  activeIncome: number;
  statusSummary: string;
}

export interface TopOpportunity {
  category: string;
  assetName: string;
  description: string;
  annualIncome: number;
  confidence: number;
}

export interface LiveIncomeStream {
  id: string;
  opportunityType: string;
  opportunityLabel: string | null;
  annualIncome: number;
  contractStart: string | null;
  contractEnd: string | null;
  escalationPct: number | null;
  monthlyActuals: Array<{ month: string; amount: number }>;
  vsEstimate: number | null;
  daysToContractEnd: number | null;
  status: "LIVE" | "RENEWAL DUE";
}

export interface IncomeDashboardData {
  kpis: {
    activeIncome: number;
    activeIncomeChange: number;
    pipeline: number;
    pipelineCount: number;
    untapped: number;
    untappedCount: number;
    performance: number;
    totalOpportunities: number;
    assetCount: number;
    categoryCount: number;
  };
  topOpportunity: TopOpportunity | null;
  liveStreams: LiveIncomeStream[];
  categories: IncomeCategoryBreakdown[];
  activationPipeline: {
    identified: number;
    researching: number;
    quoting: number;
    approved: number;
    installing: number;
    live: number;
    renewing: number;
  };
  assetsByPotential: AssetUntappedPotential[];
}

const CATEGORY_LABELS: Record<string, string> = {
  "ev_charging": "EV Charging",
  "solar": "Solar",
  "5g_mast": "5G / Telecoms",
  "parking": "Parking Revenue",
  "billboard": "Billboard / Advertising",
  "vending": "Vending Machines",
  "roofspace": "Roof Space Rental",
  "coworking": "Co-Working Conversion",
  "storage": "Storage Units",
  "laundry": "Laundry / Services",
  "naming_rights": "Naming Rights",
  "shared_amenities": "Shared Amenities",
};

const CATEGORY_PROVIDERS: Record<string, string[]> = {
  "ev_charging": ["ChargePoint", "Blink"],
  "solar": ["SunRun", "Tesla"],
  "5g_mast": ["T-Mobile", "Verizon"],
  "parking": ["SpotHero", "ParkWhiz"],
  "billboard": ["Clear Channel", "Lamar"],
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    // Demo data for unauthenticated users
    return NextResponse.json({
      kpis: {
        activeIncome: 54720,
        activeIncomeChange: 12,
        pipeline: 0,
        pipelineCount: 0,
        untapped: 138120,
        untappedCount: 4,
        performance: 94,
        totalOpportunities: 5,
        assetCount: 1,
        categoryCount: 4,
      },
      topOpportunity: {
        category: "Solar",
        assetName: "FL Mixed Portfolio",
        description: "70kW system — roof-mounted PV array",
        annualIncome: 42000,
        confidence: 89,
      },
      liveStreams: [
        {
          id: "demo-stream-1",
          opportunityType: "ev_charging",
          opportunityLabel: "EV Charging Stations",
          annualIncome: 54720,
          contractStart: "2025-03-01",
          contractEnd: "2027-03-01",
          escalationPct: 2.5,
          monthlyActuals: [
            { month: "2026-01", amount: 4560 },
            { month: "2026-02", amount: 4560 },
            { month: "2026-03", amount: 4560 },
          ],
          vsEstimate: 2.1,
          daysToContractEnd: 706,
          status: "LIVE",
        },
      ],
      categories: [
        {
          category: "EV Charging",
          categoryKey: "ev_charging",
          assetCount: 1,
          providers: ["ChargePoint", "Blink"],
          annualIncome: 54720,
          liveCount: 1,
          pipelineCount: 0,
          identifiedCount: 0,
        },
        {
          category: "Solar",
          categoryKey: "solar",
          assetCount: 1,
          providers: ["SunRun", "Tesla"],
          annualIncome: 0,
          liveCount: 0,
          pipelineCount: 0,
          identifiedCount: 1,
        },
        {
          category: "5G / Telecoms",
          categoryKey: "5g_mast",
          assetCount: 1,
          providers: ["T-Mobile", "Verizon"],
          annualIncome: 0,
          liveCount: 0,
          pipelineCount: 0,
          identifiedCount: 1,
        },
        {
          category: "Parking Revenue",
          categoryKey: "parking",
          assetCount: 1,
          providers: ["SpotHero", "ParkWhiz"],
          annualIncome: 0,
          liveCount: 0,
          pipelineCount: 0,
          identifiedCount: 1,
        },
      ],
      activationPipeline: {
        identified: 4,
        researching: 0,
        quoting: 0,
        approved: 0,
        installing: 0,
        live: 1,
        renewing: 0,
      },
      assetsByPotential: [
        {
          assetId: "demo-1",
          assetName: "FL Mixed Portfolio",
          location: "Miami, FL",
          opportunityCount: 4,
          opportunityTypes: ["Solar", "5G / Telecoms", "Parking Revenue", "Billboard / Advertising"],
          untappedIncome: 83400,
          activeIncome: 54720,
          statusSummary: "1 LIVE",
        },
      ],
    });
  }

  // Fetch all user assets (include region + sqft for opportunity generation)
  const userAssets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      assetType: true,
      location: true,
      address: true,
      region: true,
      sqft: true,
    },
  });

  // Fetch all income activations
  const activations = await prisma.incomeActivation.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      assetId: true,
      opportunityType: true,
      opportunityLabel: true,
      annualIncome: true,
      status: true,
      requestedAt: true,
      contractStart: true,
      contractEnd: true,
      escalationPct: true,
      monthlyActuals: true,
      renewalAlertSent: true,
    },
  });

  // Generate opportunities directly — no internal HTTP fetch (fixes serverless timeout/503)
  const allOpportunities: AssetOpportunity[] = userAssets.flatMap((asset) => {
    const opps = generateOpportunities(asset);
    return opps.map((opp) => ({
      assetId: asset.id,
      assetName: asset.name,
      location: asset.location ?? asset.address ?? "",
      type: opp.type,
      label: opp.label,
      annualIncome: opp.annualIncome,
      note: opp.note,
    }));
  });

  // Calculate active income (live activations)
  const liveActivations = activations.filter(a => a.status === "live");
  const activeIncome = liveActivations.reduce((sum, a) => sum + (a.annualIncome || 0), 0);

  // For demo purposes, show growth (in real app, compare to previous period)
  const activeIncomeChange = 12;

  // Calculate pipeline (requested + in_progress)
  const pipelineActivations = activations.filter(a => a.status === "requested" || a.status === "in_progress");
  const pipeline = pipelineActivations.reduce((sum, a) => sum + (a.annualIncome || 0), 0);
  const pipelineCount = pipelineActivations.length;

  // Calculate untapped (identified opportunities not yet requested)
  const activatedTypes = new Set(activations.map(a => `${a.assetId}-${a.opportunityType}`));
  const untappedOpportunities = allOpportunities.filter((opp) =>
    !activatedTypes.has(`${opp.assetId}-${opp.type}`)
  );
  const untapped = untappedOpportunities.reduce((sum, o) => sum + o.annualIncome, 0);
  const untappedCount = untappedOpportunities.length;

  // Performance (for now, static 94% - in real app, compare actual vs estimate)
  const performance = 94;

  // Total opportunities
  const totalOpportunities = activations.length + untappedCount;

  // Category breakdown
  const categoriesMap = new Map<string, IncomeCategoryBreakdown>();

  // Add live + pipeline activations to categories
  activations.forEach(a => {
    if (!a.opportunityType || a.opportunityType === "scan") return;

    const key = a.opportunityType;
    if (!categoriesMap.has(key)) {
      categoriesMap.set(key, {
        category: CATEGORY_LABELS[key] || key,
        categoryKey: key,
        assetCount: 0,
        providers: CATEGORY_PROVIDERS[key] || [],
        annualIncome: 0,
        liveCount: 0,
        pipelineCount: 0,
        identifiedCount: 0,
      });
    }

    const cat = categoriesMap.get(key)!;
    cat.annualIncome += a.annualIncome || 0;
    if (a.status === "live") cat.liveCount++;
    if (a.status === "requested" || a.status === "in_progress") cat.pipelineCount++;
  });

  // Add untapped opportunities to categories
  untappedOpportunities.forEach((opp) => {
    const key = opp.type;
    if (!categoriesMap.has(key)) {
      categoriesMap.set(key, {
        category: CATEGORY_LABELS[key] || key,
        categoryKey: key,
        assetCount: 0,
        providers: CATEGORY_PROVIDERS[key] || [],
        annualIncome: 0,
        liveCount: 0,
        pipelineCount: 0,
        identifiedCount: 0,
      });
    }

    const cat = categoriesMap.get(key)!;
    cat.identifiedCount++;
  });

  // Count unique assets per category
  categoriesMap.forEach((cat, key) => {
    const assetIds = new Set([
      ...activations.filter(a => a.opportunityType === key).map(a => a.assetId),
      ...untappedOpportunities.filter((o) => o.type === key).map((o) => o.assetId),
    ]);
    cat.assetCount = assetIds.size;
  });

  const categories = Array.from(categoriesMap.values());

  // Top opportunity (highest income untapped)
  const topUntapped = untappedOpportunities.sort((a, b) => b.annualIncome - a.annualIncome)[0];
  const topOpportunity: TopOpportunity | null = topUntapped ? {
    category: CATEGORY_LABELS[topUntapped.type] || topUntapped.type,
    assetName: topUntapped.assetName,
    description: topUntapped.note,
    annualIncome: topUntapped.annualIncome,
    confidence: 89, // Static for demo
  } : null;

  // Activation pipeline (for Phase 1, use simplified status mapping)
  const activationPipeline = {
    identified: untappedCount,
    researching: 0, // Phase 2
    quoting: pipelineActivations.filter(a => a.status === "requested").length,
    approved: 0, // Phase 2
    installing: pipelineActivations.filter(a => a.status === "in_progress").length,
    live: liveActivations.length,
    renewing: 0, // Phase 2
  };

  // Assets by untapped potential
  const assetPotentialMap = new Map<string, AssetUntappedPotential>();

  userAssets.forEach(asset => {
    const assetActivations = activations.filter(a => a.assetId === asset.id);
    const assetUntapped = untappedOpportunities.filter((o) => o.assetId === asset.id);

    const activeIncomeForAsset = assetActivations
      .filter(a => a.status === "live")
      .reduce((sum, a) => sum + (a.annualIncome || 0), 0);

    const untappedIncomeForAsset = assetUntapped.reduce((sum, o) => sum + o.annualIncome, 0);

    if (assetUntapped.length > 0 || assetActivations.length > 0) {
      let statusSummary = "UNTAPPED";
      const inProgressCount = assetActivations.filter(a => a.status === "in_progress" || a.status === "requested").length;
      const liveCount = assetActivations.filter(a => a.status === "live").length;

      if (liveCount > 0) {
        statusSummary = `${liveCount} LIVE`;
      } else if (inProgressCount > 0) {
        statusSummary = `${inProgressCount} IN PROGRESS`;
      }

      assetPotentialMap.set(asset.id, {
        assetId: asset.id,
        assetName: asset.name,
        location: asset.location || asset.address || "",
        opportunityCount: assetUntapped.length,
        opportunityTypes: [...new Set(assetUntapped.map((o) => CATEGORY_LABELS[o.type] || o.type))],
        untappedIncome: untappedIncomeForAsset,
        activeIncome: activeIncomeForAsset,
        statusSummary,
      });
    }
  });

  const assetsByPotential = Array.from(assetPotentialMap.values())
    .sort((a, b) => b.untappedIncome - a.untappedIncome);

  // Build live streams data (Phase 3 feature)
  const today = new Date();
  const liveStreams: LiveIncomeStream[] = liveActivations.map(activation => {
    const monthlyActuals = (activation.monthlyActuals as Array<{ month: string; amount: number }>) ?? [];

    // Calculate vs estimate
    const totalActual = monthlyActuals.reduce((sum, item) => sum + item.amount, 0);
    const monthCount = monthlyActuals.length;
    const avgMonthly = monthCount > 0 ? totalActual / monthCount : 0;
    const annualizedActual = avgMonthly * 12;
    const vsEstimate =
      activation.annualIncome && activation.annualIncome > 0
        ? ((annualizedActual - activation.annualIncome) / activation.annualIncome) * 100
        : null;

    // Calculate days to contract end
    const daysToContractEnd = activation.contractEnd
      ? Math.floor((activation.contractEnd.getTime() - today.getTime()) / 86_400_000)
      : null;

    // Determine status
    const status: "LIVE" | "RENEWAL DUE" =
      daysToContractEnd !== null && daysToContractEnd > 0 && daysToContractEnd <= 90
        ? "RENEWAL DUE"
        : "LIVE";

    return {
      id: activation.id,
      opportunityType: activation.opportunityType,
      opportunityLabel: activation.opportunityLabel,
      annualIncome: activation.annualIncome || 0,
      contractStart: activation.contractStart?.toISOString().split("T")[0] ?? null,
      contractEnd: activation.contractEnd?.toISOString().split("T")[0] ?? null,
      escalationPct: activation.escalationPct,
      monthlyActuals,
      vsEstimate: vsEstimate !== null ? Math.round(vsEstimate * 10) / 10 : null,
      daysToContractEnd,
      status,
    };
  });

  const data: IncomeDashboardData = {
    kpis: {
      activeIncome,
      activeIncomeChange,
      pipeline,
      pipelineCount,
      untapped,
      untappedCount,
      performance,
      totalOpportunities,
      assetCount: userAssets.length,
      categoryCount: categoriesMap.size,
    },
    topOpportunity,
    liveStreams,
    categories,
    activationPipeline,
    assetsByPotential,
  };

  return NextResponse.json(data);
}
