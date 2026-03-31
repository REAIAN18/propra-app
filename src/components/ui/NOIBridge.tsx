"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Portfolio } from "@/lib/data/types";
import type { NOIBridgeData, NOISegment } from "@/app/api/user/noi-bridge/route";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

// ── SVG Donut helpers ─────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  start: number,
  end: number
) {
  // clamp end to avoid full-circle SVG path issues
  const clampedEnd = end >= start + 360 ? start + 359.99 : end;
  const o1 = polar(cx, cy, outerR, start);
  const o2 = polar(cx, cy, outerR, clampedEnd);
  const i1 = polar(cx, cy, innerR, clampedEnd);
  const i2 = polar(cx, cy, innerR, start);
  const large = clampedEnd - start > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

// Fixed card display order per spec: rent (TL), energy (TR), insurance (BL), income (BR)
const CARD_ORDER = [
  { key: "rent",      label: "Rent uplift",  color: "var(--grn)" },
  { key: "energy",    label: "Energy",       color: "#0891B2" },
  { key: "insurance", label: "Insurance",    color: "#7c6af0" },
  { key: "income",    label: "Add. income",  color: "#fbbf24" },
] as const;

type CardKey = (typeof CARD_ORDER)[number]["key"];

interface SegmentMap {
  rent: number;
  income: number;
  energy: number;
  insurance: number;
}

// ── Donut chart (SVG) ─────────────────────────────────────────────────────────
function DonutChart({
  values,
  total,
  sym,
}: {
  values: SegmentMap;
  total: number;
  sym: string;
}) {
  const SIZE = 130;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const outerR = 54;
  const innerR = outerR * 0.7; // cutout 70%

  const segs: { key: CardKey; color: string; pct: number }[] = CARD_ORDER.map((c) => ({
    key: c.key,
    color: c.color,
    pct: total > 0 ? values[c.key] / total : 0,
  })).filter((s) => s.pct > 0);

  let angle = 0;
  const paths = segs.map((seg) => {
    const sweep = seg.pct * 360;
    const path = arcPath(cx, cy, outerR, innerR, angle, angle + sweep);
    angle += sweep;
    return { ...seg, path };
  });

  return (
    <div style={{ width: SIZE, height: SIZE, position: "relative", flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {paths.length === 0 ? (
          <circle cx={cx} cy={cy} r={outerR} fill="var(--bdr)" />
        ) : (
          paths.map((p) => (
            <path key={p.key} d={p.path} fill={p.color} />
          ))
        )}
      </svg>
      {/* Centre label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--tx)",
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
            lineHeight: 1,
          }}
        >
          {fmt(total, sym)}
        </div>
        <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 2, lineHeight: 1 }}>
          per year
        </div>
      </div>
    </div>
  );
}

// ── Shared render ─────────────────────────────────────────────────────────────
function NOIBridgeRender({
  currency,
  segments,
  impliedCapRate,
}: {
  currency: string;
  segments: NOISegment[];
  impliedCapRate: number;
}) {
  const sym = currency === "GBP" ? "£" : "$";

  // Map segments to fixed keys
  const values: SegmentMap = { rent: 0, income: 0, energy: 0, insurance: 0 };
  for (const seg of segments) {
    const lo = seg.label.toLowerCase();
    if (lo.includes("rent")) values.rent = seg.annualValue;
    else if (lo.includes("insurance")) values.insurance = seg.annualValue;
    else if (lo.includes("energy")) values.energy = seg.annualValue;
    else if (lo.includes("income") || lo.includes("add")) values.income = seg.annualValue;
  }

  const totalUpliftAnnual = segments.reduce((s, seg) => s + seg.annualValue, 0);
  const capRatePct = (impliedCapRate * 100).toFixed(1);
  const valueUplift = impliedCapRate > 0 ? Math.round(totalUpliftAnnual / impliedCapRate) : 0;

  // href lookup
  const hrefMap: Record<string, string> = {};
  for (const seg of segments) {
    const lo = seg.label.toLowerCase();
    if (lo.includes("rent")) hrefMap.rent = seg.href;
    else if (lo.includes("insurance")) hrefMap.insurance = seg.href;
    else if (lo.includes("energy")) hrefMap.energy = seg.href;
    else hrefMap.income = seg.href;
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--bdr)" }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
            NOI Optimisation Bridge
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
            {fmt(totalUpliftAnnual, sym)} unlockable across {segments.length} opportunity type
            {segments.length !== 1 ? "s" : ""}
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 hover:opacity-90"
          style={{ backgroundColor: "var(--grn)", color: "#fff" }}
        >
          Action all →
        </Link>
      </div>

      <div className="px-6 pt-5 pb-4">
        {/* Two-column layout */}
        <div className="flex gap-4 items-start">
          {/* LEFT: donut chart */}
          <DonutChart values={values} total={totalUpliftAnnual} sym={sym} />

          {/* RIGHT: 2x2 card grid */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {CARD_ORDER.map((card) => {
              const annual = values[card.key];
              if (annual === 0) return null;
              return (
                <Link
                  key={card.key}
                  href={hrefMap[card.key] ?? "/dashboard"}
                  style={{
                    backgroundColor: "var(--s2)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    textDecoration: "none",
                  }}
                >
                  {/* Top row: dot + label */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: card.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 10, color: "var(--tx2)", lineHeight: 1 }}>
                      {card.label}
                    </span>
                  </div>
                  {/* Annual value */}
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: card.color,
                      lineHeight: 1.2,
                      fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                    }}
                  >
                    {fmt(annual, sym)}
                  </div>
                  {/* per year */}
                  <div style={{ fontSize: 10, color: "var(--tx3)", lineHeight: 1 }}>
                    per year
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer: value uplift */}
        {valueUplift > 0 && (
          <>
            <div style={{ borderTop: "1px solid var(--bdr)", margin: "12px 0 10px" }} />
            <div className="flex items-center justify-between">
              <div style={{ fontSize: 11, color: "var(--tx2)" }}>
                Implied value uplift at{" "}
                <span style={{ fontWeight: 500, color: "var(--tx)" }}>{capRatePct}% cap rate</span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--grn)",
                  fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                }}
              >
                +{fmt(valueUplift, sym)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Live hook ─────────────────────────────────────────────────────────────────
function useNOIBridgeData() {
  const [data, setData] = useState<NOIBridgeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/noi-bridge")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ── Live (user portfolio) variant ─────────────────────────────────────────────
export function NOIBridgeLive() {
  const { data, loading } = useNOIBridgeData();

  if (loading) return null;
  if (!data?.hasData) return <NOIBridgeEmpty />;

  return (
    <NOIBridgeRender
      currency={data.currency}
      currentNOIAnnual={data.currentNOIAnnual}
      segments={data.segments}
      impliedCapRate={data.impliedCapRate}
    />
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function NOIBridgeEmpty() {
  return (
    <div
      className="rounded-2xl px-6 py-8 flex flex-col items-center text-center gap-3"
      style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "var(--s2)" }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="2" width="10" height="13" rx="1.5" stroke="var(--tx3)" strokeWidth="1.4" />
          <path d="M7 6h4M7 9h3" stroke="var(--tx3)" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="14" cy="14" r="3" stroke="var(--grn)" strokeWidth="1.4" />
          <path d="M12.5 14h3M14 12.5v3" stroke="var(--grn)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
          NOI Optimisation Bridge
        </div>
        <div className="text-xs mt-1 max-w-xs" style={{ color: "var(--tx2)" }}>
          Upload a rent roll, lease, or financial statement to see your real NOI and unlock income
          opportunities.
        </div>
      </div>
      <a
        href="/documents"
        className="mt-1 text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90 inline-block"
        style={{ backgroundColor: "#34d399", color: "#fff" }}
      >
        Upload documents →
      </a>
    </div>
  );
}

// ── User wrapper (live API) ───────────────────────────────────────────────────
export function NOIBridgeUserWrapper() {
  const { data, loading } = useNOIBridgeData();
  if (loading) return null;
  if (!data?.hasData) return <NOIBridgeEmpty />;
  return (
    <NOIBridgeRender
      currency={data.currency}
      currentNOIAnnual={data.currentNOIAnnual}
      segments={data.segments}
      impliedCapRate={data.impliedCapRate}
    />
  );
}

// ── Demo / portfolio variant ──────────────────────────────────────────────────
interface NOIBridgeProps {
  portfolio: Portfolio;
}

export function NOIBridge({ portfolio }: NOIBridgeProps) {
  if (portfolio.id === "user") return <NOIBridgeUserWrapper />;

  const sym = portfolio.currency === "USD" ? "$" : "£";
  const currency = portfolio.currency ?? "USD";

  const totalNOIAnnual = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);

  const rentUpliftAnnual = portfolio.assets.reduce((s, a) => {
    const gap = a.marketERV - a.passingRent;
    if (gap <= 0) return s;
    const occupiedSqft = a.sqft * (a.occupancy / 100);
    return s + gap * occupiedSqft;
  }, 0);

  const insuranceSavingAnnual = portfolio.assets.reduce(
    (s, a) => s + Math.max(0, a.insurancePremium - a.marketInsurance),
    0
  );

  const energySavingAnnual = portfolio.assets.reduce(
    (s, a) => s + Math.max(0, a.energyCost - a.marketEnergyCost),
    0
  );

  const additionalIncome = portfolio.assets.reduce((s, a) => {
    return (
      s +
      a.additionalIncomeOpportunities
        .filter((o) => o.status !== "live")
        .reduce((ss, o) => ss + Math.round((o.annualIncome * o.probability) / 100), 0)
    );
  }, 0);

  const segments: NOISegment[] = [];
  if (rentUpliftAnnual > 0)
    segments.push({
      label: "Rent Uplift",
      annualValue: rentUpliftAnnual,
      color: "var(--grn)",
      lightColor: "#E8F5EE",
      href: "/rent-clock",
    });
  if (additionalIncome > 0)
    segments.push({
      label: "Add. Income",
      annualValue: additionalIncome,
      color: "#fbbf24",
      lightColor: "#FEF3C7",
      href: "/income",
    });
  if (energySavingAnnual > 0)
    segments.push({
      label: "Energy",
      annualValue: energySavingAnnual,
      color: "#0891B2",
      lightColor: "#E0F9FF",
      href: "/energy",
    });
  if (insuranceSavingAnnual > 0)
    segments.push({
      label: "Insurance",
      annualValue: insuranceSavingAnnual,
      color: "#7c6af0",
      lightColor: "#EEF2FF",
      href: "/insurance",
    });

  if (segments.length === 0) return null;

  const totalPortfolioValue = portfolio.assets.reduce(
    (s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0),
    0
  );
  const impliedCapRate = totalPortfolioValue > 0 ? totalNOIAnnual / totalPortfolioValue : 0;

  return (
    <NOIBridgeRender
      currency={currency}
      currentNOIAnnual={totalNOIAnnual}
      segments={segments}
      impliedCapRate={impliedCapRate}
    />
  );
}
