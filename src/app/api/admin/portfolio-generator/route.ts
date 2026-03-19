import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) return null;
  return session;
}

interface AssetBrief {
  name: string;
  location: string;
  type: string;
  sqft: number;
  valuation: number;
  annualIncome: number;
  insurancePremium?: number;
  energySpend?: number;
  leaseInfo?: string;
}

const PORTFOLIO_TYPE_DEF = `
interface Asset {
  id: string;
  name: string;
  type: "office" | "retail" | "industrial" | "mixed" | "warehouse" | "flex";
  location: string;
  sqft: number;
  valuationGBP?: number;
  valuationUSD?: number;
  grossIncome: number;
  netIncome: number;
  occupancy: number; // 0-100
  passingRent: number; // per sqft per year
  marketERV: number; // estimated rental value per sqft
  insurancePremium: number; // annual
  marketInsurance: number; // benchmark - what it should cost
  energyCost: number; // annual
  marketEnergyCost: number; // benchmark
  leases: Lease[];
  additionalIncomeOpportunities: AdditionalIncomeOpp[];
  compliance: ComplianceItem[];
  currency: "USD" | "GBP";
}

interface Lease {
  id: string;
  tenant: string;
  sqft: number;
  rentPerSqft: number;
  startDate: string; // ISO date string e.g. "2021-06-01"
  expiryDate: string; // ISO date string
  breakDate?: string;
  reviewDate?: string;
  daysToExpiry: number; // integer, days from 2026-03-19
  status: "current" | "expiring_soon" | "expired" | "under_review";
}

interface AdditionalIncomeOpp {
  id: string;
  type: "5g_mast" | "ev_charging" | "solar" | "parking" | "billboard";
  label: string;
  annualIncome: number;
  status: "identified" | "in_progress" | "live";
  probability: number; // 0-100
}

interface ComplianceItem {
  id: string;
  type: string;
  certificate: string;
  expiryDate: string; // ISO date string
  daysToExpiry: number; // integer, days from 2026-03-19
  status: "valid" | "expiring_soon" | "expired";
  fineExposure: number;
}

interface Portfolio {
  id: string;
  name: string;
  shortName: string;
  currency: "USD" | "GBP";
  assets: Asset[];
  benchmarkG2N: number; // % net/gross benchmark, typically 68-75
}`;

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured. Set it in your Railway environment variables." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { brief, assets, clientName, shortName, currency } = body;

  if (!clientName || !Array.isArray(assets) || assets.length === 0) {
    return NextResponse.json({ error: "clientName and assets are required" }, { status: 400 });
  }

  const sym = currency === "GBP" ? "£" : "$";

  const assetList = (assets as AssetBrief[])
    .map((a, i) => {
      const lines = [
        `Asset ${i + 1}: ${a.name}`,
        `  Location: ${a.location}`,
        `  Type: ${a.type}`,
        `  Size: ${a.sqft.toLocaleString()} sqft`,
        `  Rough valuation: ${sym}${a.valuation.toLocaleString()}`,
        `  Rough annual income: ${sym}${a.annualIncome.toLocaleString()}`,
      ];
      if (a.insurancePremium) lines.push(`  Current insurance premium: ${sym}${a.insurancePremium.toLocaleString()}/yr`);
      if (a.energySpend) lines.push(`  Current energy spend: ${sym}${a.energySpend.toLocaleString()}/yr`);
      if (a.leaseInfo) lines.push(`  Lease info: ${a.leaseInfo}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const resolvedShortName = shortName?.trim() || clientName.split(" ").slice(0, 2).join(" ");

  const userMessage = `Client: ${clientName}
Short name: ${resolvedShortName}
Currency: ${currency || "USD"}
${brief?.trim() ? `Additional context: ${brief.trim()}\n` : ""}
Assets:
${assetList}

Generate a complete Portfolio JSON object for this client. Use realistic benchmark values based on asset type and location. Include 2-4 realistic leases per asset, 2-3 income opportunities per asset, and 3-5 compliance items per asset. Make the data compelling but realistic for a CRE advisory pitch.`;

  const systemPrompt = `You are generating demo Portfolio JSON for the Arca commercial real estate platform. The Portfolio TypeScript type is:
${PORTFOLIO_TYPE_DEF}

Rules:
- Return ONLY valid JSON — no explanation, no markdown code blocks, just the raw JSON object
- The id field should be a URL-safe slug of the portfolio name (e.g. "acme-industrial")
- Use realistic market benchmarks: insurance should be 3-5% of grossIncome; energy should be 5-8% of grossIncome; marketInsurance should be 15-25% below insurancePremium; marketEnergyCost should be 20-30% below energyCost
- marketERV should be 5-15% above passingRent
- netIncome should be 65-75% of grossIncome
- Include realistic tenant names and lease dates relative to today (2026-03-19)
- daysToExpiry MUST be an integer that correctly matches the difference between expiryDate and 2026-03-19
- For income opportunities: solar fits industrial/warehouse; EV charging fits office/retail; 5G masts fit industrial/logistics
- benchmarkG2N should be between 68 and 75
- For compliance: include Fire Safety Certificate, EICR, Asbestos Survey (industrial), and Elevator Certificate (office) as appropriate
- All IDs should be short hyphenated slugs (e.g. "asset-1-lease-1")
- Lease status "expiring_soon" means daysToExpiry < 180; "current" means 180+`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 502 });
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";

  // Strip potential markdown code fences
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let portfolio: unknown;
  try {
    portfolio = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Claude returned invalid JSON. Try again.", raw: text }, { status: 502 });
  }

  return NextResponse.json({ portfolio });
}
