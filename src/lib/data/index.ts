export { flMixed } from "./fl-mixed";
export { seLogistics } from "./se-logistics";
export type { Portfolio, Asset, Lease, AdditionalIncomeOpp, ComplianceItem, HoldSellScenario, AcquisitionDeal } from "./types";

export const portfolios = {
  "fl-mixed": () => import("./fl-mixed").then((m) => m.flMixed),
  "se-logistics": () => import("./se-logistics").then((m) => m.seLogistics),
};
