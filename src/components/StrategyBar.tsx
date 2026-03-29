"use client";

type AcquisitionStrategy = {
  id: string;
  name: string | null;
  targetTypes: string[];
  targetGeography: string[];
  minYield: number | null;
  maxYield: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minSqft: number | null;
  maxSqft: number | null;
  currency: string;
};

type StrategyBarProps = {
  strategy: AcquisitionStrategy | null;
  onEdit: () => void;
};

// Format price with currency
function fmtPrice(price: number, currency: string): string {
  const sym = currency === "GBP" ? "£" : "$";
  if (price >= 1_000_000) return `${sym}${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${sym}${(price / 1_000).toFixed(0)}k`;
  return `${sym}${price.toLocaleString()}`;
}

// Format sqft with commas
function fmtSqft(sqft: number): string {
  return sqft.toLocaleString();
}

export function StrategyBar({ strategy, onEdit }: StrategyBarProps) {
  if (!strategy) {
    return (
      <div
        className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[var(--r)] p-4 mb-5 flex items-center justify-between"
      >
        <div className="text-[13px] text-[var(--tx3)]">
          No acquisition strategy defined. Set your criteria to filter and score deals.
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-[var(--acc)] text-white border-none rounded-lg text-[12px] font-medium hover:bg-[#6d5ce0] transition-all"
        >
          Define strategy →
        </button>
      </div>
    );
  }

  const chips: { label: string; active: boolean }[] = [];

  // Add asset types
  if (strategy.targetTypes.length > 0) {
    strategy.targetTypes.forEach((type) => {
      chips.push({
        label: type.charAt(0).toUpperCase() + type.slice(1),
        active: true,
      });
    });
  }

  // Add geography
  if (strategy.targetGeography.length > 0) {
    const geoLabel = strategy.targetGeography.join(" + ");
    chips.push({ label: geoLabel, active: true });
  }

  // Add yield range
  if (strategy.minYield || strategy.maxYield) {
    const yieldLabel =
      strategy.minYield && strategy.maxYield
        ? `${strategy.minYield}–${strategy.maxYield}% yield`
        : strategy.minYield
        ? `${strategy.minYield}%+ yield`
        : `up to ${strategy.maxYield}% yield`;
    chips.push({ label: yieldLabel, active: true });
  }

  // Add price range
  if (strategy.minPrice || strategy.maxPrice) {
    const priceLabel =
      strategy.minPrice && strategy.maxPrice
        ? `${fmtPrice(strategy.minPrice, strategy.currency)}–${fmtPrice(strategy.maxPrice, strategy.currency)}`
        : strategy.minPrice
        ? `${fmtPrice(strategy.minPrice, strategy.currency)}+`
        : strategy.maxPrice
        ? `up to ${fmtPrice(strategy.maxPrice, strategy.currency)}`
        : "";
    if (priceLabel) chips.push({ label: priceLabel, active: true });
  }

  // Add sqft range
  if (strategy.minSqft || strategy.maxSqft) {
    const sqftLabel =
      strategy.minSqft && strategy.maxSqft
        ? `${fmtSqft(strategy.minSqft)}–${fmtSqft(strategy.maxSqft)} sqft`
        : strategy.minSqft
        ? `${fmtSqft(strategy.minSqft)}+ sqft`
        : strategy.maxSqft
        ? `up to ${fmtSqft(strategy.maxSqft)} sqft`
        : "";
    if (sqftLabel) chips.push({ label: sqftLabel, active: true });
  }

  return (
    <div
      className="bg-[var(--s1)] border border-[var(--bdr)] rounded-[var(--r)] p-4 mb-5 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 flex-wrap flex-1">
        <span className="text-[9px] font-medium font-mono text-[var(--tx3)] uppercase tracking-wider">
          Strategy:
        </span>
        <div className="flex gap-2 flex-wrap">
          {chips.map((chip, idx) => (
            <span
              key={idx}
              className={`px-3 py-1 rounded-full text-[10px] font-medium ${
                chip.active
                  ? "bg-[var(--acc-lt)] border border-[var(--acc-bdr)] text-[var(--acc)]"
                  : "bg-[var(--s2)] border border-[var(--bdr)] text-[var(--tx2)]"
              }`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="px-4 py-2 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[12px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-all flex-shrink-0"
      >
        Edit →
      </button>
    </div>
  );
}
