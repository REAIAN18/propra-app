export function fmtK(v: number, sym = "$") {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  return `${sym}${Math.round(v / 1_000)}k`;
}

export function computeOpportunity(n: number, currency: "USD" | "GBP" = "USD") {
  const scale = Math.max(1, n) / 5;
  // GBP amounts are roughly 80% of USD (FX + UK market calibration)
  const fx = currency === "GBP" ? 0.8 : 1;
  const ins = Math.round(102_000 * scale * fx);
  const energy = Math.round(161_000 * scale * fx);
  const income = Math.round(243_000 * scale * fx);
  return { ins, energy, income, total: ins + energy + income };
}
