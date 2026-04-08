/**
 * src/lib/dealscope/environmental.ts
 * Wave L — Environmental honest-mode aggregator.
 *
 * Combines the live data we DO have (EPC + EA flood map) into a single
 * structured snapshot, and explicitly marks the feeds we don't (radon /
 * contamination / mining) as "uncommissioned" so the UI can render them
 * with provenance rather than the bare "—" we used before. We never
 * synthesise environmental risk data — Phase 1 ESA still has to be commissioned.
 */

export type DataStatus =
  | "live"             // populated from a real API call this run
  | "uncommissioned"   // no public API; needs paid Phase 1 / desktop search
  | "missing";         // expected but not retrieved (cron failure etc.)

export interface EnvironmentalSnapshot {
  flood: {
    status: DataStatus;
    inFloodZone: boolean | null;
    riverSeaRisk: string | null;
    surfaceWaterRisk: string | null;
    reservoirRisk: string | null;
    floodZone: string | null;
    summary: string | null;
    source: string;
  };
  epc: {
    status: DataStatus;
    rating: string | null;
    expiry: string | null;
    meesRisk: boolean | null;
    meesNote: string | null;
    source: string;
  };
  contamination: { status: DataStatus; note: string };
  radon: { status: DataStatus; note: string };
  mining: { status: DataStatus; note: string };
}

interface FloodInput {
  inFloodZone?: boolean | null;
  riverFloodRisk?: string | null;
  riverSeaRisk?: string | null;
  surfaceFloodRisk?: string | null;
  reservoirRisk?: string | null;
  floodZone?: string | null;
  summary?: string | null;
}

interface EpcInput {
  epcRating?: string | null;
  expiryDate?: string | null;
  meesRisk?: boolean | null;
}

/** Build the environmental snapshot from raw enrichment data. */
export function buildEnvironmentalSnapshot(
  floodData: FloodInput | null | undefined,
  epcData: EpcInput | null | undefined,
): EnvironmentalSnapshot {
  const epcRating = epcData?.epcRating?.toUpperCase() ?? null;
  const meesRisk =
    epcRating != null
      ? epcRating === "F" || epcRating === "G"
      : null;
  const meesNote = (() => {
    if (epcRating == null) return null;
    if (meesRisk) return `EPC ${epcRating}: cannot be let after 1 Apr 2027 without exemption.`;
    if (epcRating === "E") return "EPC E: meets current MEES floor; will fall short of 2030 EPC C target.";
    if (["A", "B", "C", "D"].includes(epcRating)) return `EPC ${epcRating}: meets MEES.`;
    return null;
  })();

  return {
    flood: {
      status: floodData ? "live" : "missing",
      inFloodZone: floodData?.inFloodZone ?? null,
      riverSeaRisk: floodData?.riverFloodRisk ?? floodData?.riverSeaRisk ?? null,
      surfaceWaterRisk: floodData?.surfaceFloodRisk ?? null,
      reservoirRisk: floodData?.reservoirRisk ?? null,
      floodZone: floodData?.floodZone ?? null,
      summary: floodData?.summary ?? null,
      source: "Environment Agency flood-risk map (live API)",
    },
    epc: {
      status: epcRating ? "live" : "missing",
      rating: epcRating,
      expiry: epcData?.expiryDate ?? null,
      meesRisk,
      meesNote,
      source: "EPC opendatacommunities (live API)",
    },
    contamination: {
      status: "uncommissioned",
      note: "Phase 1 ESA / contaminated land search not commissioned. BGS GeoIndex has no free JSON API.",
    },
    radon: {
      status: "uncommissioned",
      note: "UKradon postcode search is published as PDF only — no machine-readable feed. Commission a UKradon address report.",
    },
    mining: {
      status: "uncommissioned",
      note: "Coal Authority mining hazard reports require a paid CON29M search.",
    },
  };
}
