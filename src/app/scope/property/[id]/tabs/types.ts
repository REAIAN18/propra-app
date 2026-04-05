/**
 * Shared types for DealScope property dossier tabs.
 */

export type RawDeal = {
  id: string;
  address: string;
  assetType: string;
  sqft?: number;
  buildingSizeSqft?: number;
  askingPrice?: number;
  guidePrice?: number;
  yearBuilt?: number;
  epcRating?: string;
  tenure?: string;
  occupancyPct?: number;
  ownerName?: string;
  hasInsolvency?: boolean;
  hasLisPendens?: boolean;
  hasPlanningApplication?: boolean;
  inFloodZone?: boolean;
  sourceTag?: string;
  brokerName?: string;
  daysOnMarket?: number;
  signals?: string[];
  dataSources?: Record<string, unknown>;
};
