/**
 * src/lib/dealscope/exports/select-excel-template.ts
 *
 * Wave T — chooses which sheet of CRE_Professional_Appraisal_Complete.xlsx
 * the user should see when they hit "Export Excel" on a dossier.
 *
 * Decision order (first match wins):
 *   1. Multi-Unit       — residential/multifamily/BTL/HMO with unit count > 1
 *   2. Development      — ground-up signal: no buildingSizeSqft, or
 *                          dataSources.valuations.condition === "groundup",
 *                          or signals contain "development" / "groundup"
 *   3. Refurb           — Wave F condition is "unrefurbished" or "average",
 *                          OR refurb capex line items present, OR signals
 *                          contain "mees" / "refurb" / "auction"
 *   4. Income           — default for stabilized commercial
 *
 * Returns the sheet name (matches the workbook tab) and the reason so the
 * exporter and the UI can both surface a "why this template" line.
 */

export type ExcelTemplateName = "Income Deal" | "Refurb Deal" | "Development Deal" | "Multi-Unit Deal";

export interface SelectTemplateInput {
  assetType?: string | null;
  buildingSizeSqft?: number | null;
  unitCount?: number | null;
  signals?: string[] | null;
  condition?: string | null;
  refurbCapexTotal?: number | null;
}

export interface SelectTemplateResult {
  template: ExcelTemplateName;
  reason: string;
}

export function selectExcelTemplate(input: SelectTemplateInput): SelectTemplateResult {
  const asset = (input.assetType ?? "").toLowerCase();
  const signals = (input.signals ?? []).map(s => s.toLowerCase());
  const cond = (input.condition ?? "").toLowerCase();

  // 1. Multi-Unit
  const isResi = /resid|multifam|btl|hmo|build to rent|apartment|flat/.test(asset);
  if (isResi && (input.unitCount ?? 0) > 1) {
    return {
      template: "Multi-Unit Deal",
      reason: `Residential/multifamily asset with ${input.unitCount} units → Multi-Unit appraisal.`,
    };
  }

  // 2. Development — only when the deal is *explicitly* a ground-up or
  //    development play. Missing NLA alone is not a development signal;
  //    plenty of stabilised assets come through with an unknown sqft until
  //    the brochure is parsed, and we must not misclassify those.
  const isDev = signals.some(s => s.includes("development") || s.includes("groundup") || s.includes("ground-up") || s.includes("site"))
    || cond === "groundup"
    || cond === "development"
    || /development|site|land/i.test(asset);
  if (isDev) {
    return {
      template: "Development Deal",
      reason: cond
        ? `Ground-up signal (${cond}) → Development appraisal.`
        : `Development asset type → Development appraisal.`,
    };
  }

  // 3. Refurb
  const refurbCondition = cond === "unrefurbished" || cond === "average" || cond === "fair" || cond === "poor";
  const refurbCapex = (input.refurbCapexTotal ?? 0) > 0;
  const refurbSignal = signals.some(s => s.includes("refurb") || s.includes("mees") || s.includes("auction"));
  if (refurbCondition || refurbCapex || refurbSignal) {
    const why = refurbCapex ? `refurb capex £${input.refurbCapexTotal!.toLocaleString()}`
      : refurbCondition ? `condition '${cond}'`
      : `signal: ${signals.find(s => s.includes("refurb") || s.includes("mees") || s.includes("auction"))}`;
    return {
      template: "Refurb Deal",
      reason: `Value-add path detected (${why}) → Refurb appraisal.`,
    };
  }

  // 4. Default — stabilized income
  return {
    template: "Income Deal",
    reason: `Stabilized ${asset || "commercial"} asset → Income appraisal.`,
  };
}
