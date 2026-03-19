export function fmtK(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(v / 1_000)}k`;
}

export function computeOpportunity(n: number) {
  const scale = Math.max(1, n) / 5;
  const ins = Math.round(102_000 * scale);
  const energy = Math.round(161_000 * scale);
  const income = Math.round(243_000 * scale);
  return { ins, energy, income, total: ins + energy + income };
}
