# FL Compliance Certificate Types — Sprint 2 Supplement
**Author:** Head of Real Estate & Commercial
**Date:** 2026-03-24
**Feeds into:** `docs/wave-3-sprint-2-brief.md` Feature 1 (Compliance Certificate Tracking)

---

## The Issue

Sprint 2 Feature 1 defines expected certificate types per asset class:
> EPC, Insurance, Fire risk assessment, Gas Safe, EICR, Asbestos management, Legionella risk

These are all UK statutory requirements. For US/FL assets:
- **EPC** — does not exist in the US. No equivalent federal or FL state mandate.
- **Gas Safe** — UK registration body. No US equivalent (FL uses DBPR for gas contractor licensing, not a per-property certificate).
- **EICR** — UK electrical inspection regime (NICEIC/NAPIT). No direct US equivalent. FL uses NEC-based AHJ (Authority Having Jurisdiction) approval at build/renovation only.
- **Legionella risk assessment** — not a statutory annual requirement in the US (CDC guidance only, not law).

If the compliance page auto-creates "missing" records for UK certificate types on FL assets, it will display false compliance gaps and erode trust with FL prospects.

---

## FL Certificate Types — Expected by Asset Class

Use `asset.country === "US"` to switch expected certificate set.

### All FL commercial assets

| Type | FL identifier | Frequency | Governing body |
|------|--------------|-----------|----------------|
| Fire Safety Certificate | `fire_safety` | Annual (re-inspection) | AHJ / local fire marshal |
| Business Tax Receipt | `business_tax` | Annual | County / municipality |
| Insurance certificate | `insurance` | Annual | Owner — evidence of coverage |

### Office / Multi-tenant (FL)

| Type | FL identifier | Frequency | Notes |
|------|--------------|-----------|-------|
| Elevator Inspection Permit | `elevator_permit` | Annual | FL DBPR (Dept of Business & Professional Regulation) — statutory for any lift |
| HVAC Inspection | `hvac_inspection` | Annual | FL requires AC system maintenance certification in commercial buildings |
| Fire Suppression Inspection | `fire_suppression` | Annual | AHJ — sprinkler and suppression systems |

### Industrial / Warehouse (FL)

| Type | FL identifier | Frequency | Notes |
|------|--------------|-----------|-------|
| Phase I ESA | `phase1_esa` | 5-year review | ASTM E1527 — required for any financing/sale |
| Sprinkler Inspection | `sprinkler_inspection` | Annual | AHJ — NFPA 25 |
| Forklift/Dock Safety | `dock_safety` | Annual (if tenant uses dock equipment) | OSHA-reportable if not maintained |

### Retail (FL)

| Type | FL identifier | Frequency | Notes |
|------|--------------|-----------|-------|
| Health/Food Safety Inspection | `health_inspection` | Annual (per tenant unit) | FL DBPR for food/bev tenants — landlord should track tenant certificates |
| Elevator Inspection Permit | `elevator_permit` | Annual | As above |

### Flex (FL)

| Type | FL identifier | Frequency | Notes |
|------|--------------|-----------|-------|
| Phase I ESA | `phase1_esa` | 5-year | Especially relevant for mixed-use flex with automotive/chemical uses |
| HVAC Inspection | `hvac_inspection` | Annual | |

---

## Engineering implementation note

The `type` field on `ComplianceCertificate` is a String — no enum restriction. The fix needed is in **which records are auto-generated as "expected missing"** on asset creation. Change the expected set based on `asset.country`:

```typescript
const UK_CERT_TYPES = ["epc", "fire_risk", "gas_safe", "eicr", "asbestos", "legionella", "insurance"];

const US_FL_CERT_TYPES_BY_ASSETTYPE: Record<string, string[]> = {
  office:     ["fire_safety", "insurance", "elevator_permit", "hvac_inspection"],
  retail:     ["fire_safety", "insurance", "elevator_permit", "health_inspection"],
  industrial: ["fire_safety", "insurance", "phase1_esa", "sprinkler_inspection"],
  warehouse:  ["fire_safety", "insurance", "phase1_esa", "sprinkler_inspection"],
  flex:       ["fire_safety", "insurance", "hvac_inspection", "phase1_esa"],
  default:    ["fire_safety", "insurance"],
};

function getExpectedCertTypes(asset: { country: string; assetType: string }): string[] {
  if (asset.country === "UK") return UK_CERT_TYPES;
  return US_FL_CERT_TYPES_BY_ASSETTYPE[asset.assetType] ?? US_FL_CERT_TYPES_BY_ASSETTYPE.default;
}
```

---

## Document classification prompt — FL certType additions

The Sprint 2 brief's document extraction classification prompt (`parse-compliance/route.ts`) defines:

```
"certType": "epc" | "fire_risk" | "gas_safe" | "eicr" | "asbestos" | "legionella" | "insurance"
```

This is UK-only. For FL assets, add the FL cert types to the union. The full extended prompt addition:

```
Also determine if this document is a compliance certificate. If so, return:
{
  "isComplianceCert": true,
  "certType": "epc" | "fire_risk" | "gas_safe" | "eicr" | "asbestos" | "legionella" | "insurance"
           | "fire_safety" | "hvac_inspection" | "elevator_permit" | "phase1_esa"
           | "sprinkler_inspection" | "health_inspection" | "business_tax" | "dock_safety",
  "expiryDate": "YYYY-MM-DD" (if found),
  "issuedDate": "YYYY-MM-DD" (if found),
  "issuedBy": string (if found),
  "referenceNo": string (if found)
}
If not a compliance certificate, return { "isComplianceCert": false }
```

**FL document classification cues for Claude:**
- "HVAC Inspection Certificate" / "Air Conditioning Inspection" → `hvac_inspection`
- "Elevator Annual Inspection" / "DBPR" / "Elevator Permit" → `elevator_permit`
- "Phase I Environmental Site Assessment" / "ASTM E1527" / "Phase I ESA" → `phase1_esa`
- "Annual Fire Inspection" / "Fire Marshal" / "AHJ" + no "UK" → `fire_safety`
- "NFPA 25" / "Sprinkler Inspection" / "Fire Suppression" → `sprinkler_inspection`
- "Health Inspection" / "DBPR Food Safety" / "Annual Food Safety" → `health_inspection`

**FL issuing bodies for `issuedBy` field:**
| Certificate | Typical issuer |
|---|---|
| `fire_safety` | Local fire marshal / AHJ (Authority Having Jurisdiction) |
| `elevator_permit` | FL DBPR (Dept. of Business & Professional Regulation) |
| `hvac_inspection` | Licensed HVAC contractor + AHJ sign-off |
| `phase1_esa` | Licensed environmental professional (LEP) — ASTM-credentialed |
| `sprinkler_inspection` | NICET-certified fire protection contractor |
| `health_inspection` | FL DBPR — Division of Hotels & Restaurants |

---

## FL compliance display labels

For the compliance page UI, the human-readable label for FL certificate types:

| Type string | Display label | Info tooltip |
|---|---|---|
| `fire_safety` | Fire Safety Certificate | "Annual AHJ inspection required for all commercial occupancy" |
| `insurance` | Insurance Certificate | "Evidence of current property & liability coverage" |
| `elevator_permit` | Elevator Inspection Permit | "Florida DBPR annual inspection — any passenger lift" |
| `hvac_inspection` | HVAC Inspection Certificate | "Annual AC system inspection — statutory for commercial FL buildings" |
| `phase1_esa` | Phase I Environmental Assessment | "ASTM E1527 — required for financing and property transfer" |
| `sprinkler_inspection` | Sprinkler Inspection | "NFPA 25 annual — AHJ requirement" |
| `health_inspection` | Health & Food Safety Inspection | "FL DBPR — per tenant unit, applicable to food/bev occupiers" |
| `business_tax` | Business Tax Receipt | "Annual county/municipal BTR — verify tenant compliance" |
| `dock_safety` | Dock Safety Certificate | "OSHA dock equipment maintenance record" |

---

## Fine exposure figures for FL compliance cards

For each FL certificate type, use these fine/penalty estimates for the compliance urgency display (equivalent to the UK `fineExposure` field):

| Type | Fine / risk exposure | Basis |
|---|---|---|
| `fire_safety` | $25,000 | FL Fire Prevention Code — civil penalty per occurrence |
| `elevator_permit` | $15,000 | FL DBPR civil penalty for unlicensed elevator operation |
| `hvac_inspection` | $6,000 | FL statute 553.14 — per violation |
| `phase1_esa` | $50,000 | CERCLA lender liability exposure (estimated) |
| `sprinkler_inspection` | $0 | Insurance void risk — no statutory fine but critical |
| `health_inspection` | $8,000 | DBPR Food Safety — per tenant unit failure |
| `insurance` | $0 | Contract/mortgage covenant breach — not a statutory fine |
| `business_tax` | $2,500 | County BTR fine + penalties |

---

## Alignment with demo data

The fl-mixed.ts compliance items already use FL-appropriate certificate types:
- fl-001 (Office): Fire Safety Certificate, EICR → should be `eicr` → **update to `hvac_inspection` or `fire_safety`** (EICR is UK — for FL office use `hvac_inspection`)
- fl-002 (Retail): Fire Safety Certificate, Food Safety (Health Inspection) ✓
- fl-003 (Industrial): Environmental (Phase I ESA), Sprinkler Inspection ✓
- fl-004 (Office): Electrical (EICR) → **should be `hvac_inspection`**, Elevator Permit ✓
- fl-005 (Flex): Fire Safety Certificate, HVAC Inspection ✓

**Recommendation:** Update fl-001 and fl-004 demo data to replace `type: "Electrical"` / `certificate: "EICR"` with `type: "HVAC"` / `certificate: "HVAC Inspection"`. EICR on an FL asset in a demo would be flagged by any FL CRE professional as inaccurate.

---

*Supplement to `docs/wave-3-sprint-2-brief.md` | March 2026 | For CTO and FSE attention*
*Also: update `src/lib/data/fl-mixed.ts` compliance items per recommendation above*
