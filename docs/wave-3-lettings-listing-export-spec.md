# Lettings — Listing Export Spec (FL + UK)
**Wave 3 Sprint 2 RE Commercial Supplement**
**Author:** Head of Real Estate & Commercial
**Date:** 2026-03-24
**Feeds into:** `docs/wave-3-sprint-1-brief.md` Feature 2 (Lettings Workflow) — listing export deferred to Sprint 2

---

## The gap

Sprint 1 Lettings workflow takes a vacant unit through enquiry → HoT. But before enquiries come in, the property needs to be marketed. Sprint 1 deferral note: "Rightmove Commercial / CoStar listing export — Wave 3 Sprint 2 (needs platform decisions on listing format)."

This spec provides the RE commercial brief for that decision.

---

## Platform decision: UK vs FL

### UK — Rightmove Commercial

The dominant UK commercial property listing portal. All SE UK logistics prospects (Roger Montaut, Nic Rumsey) will expect to find listings on Rightmove Commercial.

**Rightmove Commercial listing fields (required):**
| Field | Notes |
|-------|-------|
| Address (full) | Used for map pin — must include postcode |
| Property type | Warehouse / Industrial / Office / Retail / Flex |
| Tenure | Leasehold (most common in UK commercial) |
| Floor area | sq ft (primary) and sq m (also required by Rightmove) |
| Asking rent | £ per annum, NNN or gross stated |
| Lease term | Target term in years |
| Available from | Date or "immediately" |
| EPC rating | Mandatory for UK commercial under MEES |
| Description | 500–1000 words — property summary |
| Key features | Bullet list (≤10 items) |
| Images | Min. 3 required; satellite image acceptable as one of them |
| Brochure PDF | Optional but strongly recommended |
| Contact | Agent name + phone + email |

**Rightmove Commercial API:** Requires Rightmove Commercial partner API access (application required). MVP: generate a structured listing export card that can be manually copy-pasted into the Rightmove Commercial portal. Full API integration is post-MVP.

### FL — CoStar / LoopNet

**Rightmove Commercial is UK-only.** It does not list US properties. For FL commercial vacancies:

- **CoStar** is the institutional-grade platform used by brokers, REITs, and sophisticated investors (Roger Montaut / Capital Industrial tier)
- **LoopNet** (CoStar-owned, public-facing) is the consumer-facing platform for smaller FL deals
- **CREXi** is a growing alternative for FL commercial listings, especially for sale vs lease

For the FL demo portfolio (fl-001 to fl-005), CoStar / LoopNet is the correct platform.

**CoStar / LoopNet listing fields (FL commercial):**
| Field | Notes |
|-------|-------|
| Address | Full US address including ZIP |
| Property type | Office / Retail / Industrial / Flex/R&D / Warehouse |
| Space available | Total sqft available (multi-let: per-suite breakdown) |
| Asking rent | Annual NNN rate ($/sqft/yr) + NNN estimated $/sqft/yr |
| Lease type | NNN / Modified Gross / Gross (FL defaults NNN) |
| Min/Max divisible | For multi-let assets |
| Available date | Immediate / Date |
| Building class | Class A / B / C |
| Year built | |
| Clear height | For industrial/warehouse (FL industrial: 24–36 ft standard) |
| Loading docks / drive-in | For industrial (number of docks, OH doors) |
| Parking ratio | Cars per 1,000 sqft (office: 4/1,000 standard; industrial: varies) |
| HVAC | Type (FL: critical — central vs split, age) |
| Zoning | FL zoning code (I-1, I-2 for industrial; B-2, B-3 for retail; O-1 for office) |
| Description | 300–500 words |
| Photos | Min. 5 recommended |
| Broker contact | Required for CoStar. For self-listing on LoopNet, owner contact |

**CoStar API:** Enterprise API access, requires CoStar Certified Listing Partner relationship. MVP: same as Rightmove — generate a structured listing export card for manual upload.

---

## MVP approach — Listing Export Card

For Sprint 2 MVP, rather than building API integrations to either platform, generate a structured **Listing Export Card** from the existing letting record. This gives Ian something to copy-paste into CoStar, LoopNet, or Rightmove Commercial immediately.

### Generated output format

When a `Letting` record is created and asking rent is set, the `/api/user/lettings/:id/listing-export` endpoint returns:

```typescript
// GET /api/user/lettings/:id/listing-export
// Response
{
  platform: "costar" | "rightmove_commercial"; // based on asset.country
  listingCard: {
    headline: string;     // e.g. "28,000 sqft Industrial/Warehouse — Tampa, FL — $14/sqft NNN"
    propertyType: string; // CoStar/Rightmove category
    address: string;
    sqft: number;
    askingRent: number;
    leaseType: string;    // "NNN" | "FRI Lease" (UK) | "Modified Gross"
    keyFeatures: string[]; // ≤8 bullets pulled from asset data
    description: string;  // AI-generated, 300-400 words (reuses brochure narrative pattern)
    requiredFields: {
      [fieldName: string]: string | number | null; // all platform-required fields
    };
    exportText: string;   // full plaintext version, ready to paste into portal
  }
}
```

### AI-generated listing description

Claude Haiku prompt (same model as brochure narrative):

```
Write a 300-400 word commercial property listing description for a {leaseType} vacancy on {platform}.
Be factual and professional. Lead with the space size and key use-case fit.

Property: {assetName}, {assetType}, {location}
Space available: {sqft} sqft
Asking rent: {sym}{askingRent}/yr ({leaseType})
Building features: {keyFeatures}
Target tenant: {useClass or "flexible use"}
Available: immediately

For {platform}:
- CoStar/LoopNet: lead with industrial/logistics spec (clear height, dock doors, power supply, HVAC). Mention NNN pass-through estimate.
- Rightmove Commercial: lead with EPC rating and MEES compliance. Mention rateable value bracket.
```

### Key features — auto-generated from asset data

Pull from `UserAsset` fields to populate the key features list:

| Asset data | Key feature string |
|---|---|
| `sqft` | "X,XXX sq ft (NIA)" or "X,XXX sqft GIA" |
| `occupancy === 100` on other units | "Multi-let building — active anchor tenants in occupation" |
| `occupancy === 0` | "Entire building available — single or multi-occupancy" |
| `additionalIncomeOpportunities` with EV | "EV charging infrastructure opportunity" |
| `additionalIncomeOpportunities` with solar | "Rooftop solar suitability assessed" |
| industrial: `type === "industrial"` | "Warehouse specification — loading dock access" |
| industrial, FL | "Floor-level and dock-high loading" |
| office, FL | "Ample parking — X/1,000 sqft ratio" |
| flex | "Open-plan — suitable for office, showroom, or light industrial" |
| compliance `fire_safety valid` | "Fire safety certificate current" |
| leaseType = NNN | "NNN lease structure — estimated NNN pass-throughs included in rental quote" |

---

## FL listing demo talking point

When demonstrating Lettings to FL prospects:

> "When Broward Medical Supplies vacates — 7,000 sqft flex in Fort Lauderdale — you activate the vacant unit in RealHQ, set your asking rent, and the platform generates a CoStar listing card: headline, property spec, description, all pre-populated from your existing data. You copy that into CoStar or LoopNet in two minutes rather than writing it from scratch. Direct platform submission — CoStar Partner API — is on the roadmap once you have a few listings to justify the integration."

**Commission hook:**
> "We earn 10% of the first year's contracted rent on any new letting that goes through a RealHQ-generated HoT. The listing card is included — no separate charge."

---

## UK listing demo talking point

> "For a vacant warehouse in your SE UK portfolio — say a tenant departs from one of the Thurrock units — the platform generates a Rightmove Commercial-ready listing card with the EPC rating, floor area in sq ft and sq m, the asking rent, and a 400-word description. You paste it into Rightmove Commercial in two minutes. Rightmove Commercial partner API integration — so it publishes directly from the platform — is Sprint 3 roadmap."

---

## Rightmove Commercial vs CoStar — key structural difference for FL

This matters for demo calls:

| Factor | UK (Rightmove Commercial) | FL (CoStar / LoopNet) |
|---|---|---|
| EPC rating field | **Required** — MEES obligation | Not applicable |
| Tenure | Leasehold (FRI) | NNN pass-through disclosure |
| Clear height | Not a standard field | **Critical** for industrial |
| Parking ratio | Not standard | **Required** for office/flex |
| Floor area | Sq ft + sq m | Sq ft only |
| Asking rent | £ per annum | $/sqft/yr NNN (not annual total) |
| Rateable value | Common in UK listings | Not applicable |
| ADA compliance | Not required in listing | Commonly noted for office |

**Engineering note:** The listing export card must branch on `asset.country === "UK"` to produce the correct field set and formatting. FL listings show $/sqft/yr NNN; UK listings show £/yr. Field labels differ.

---

## Scope and sequencing

For Sprint 2:

| Item | Estimate | Who |
|------|----------|-----|
| `GET /api/user/lettings/:id/listing-export` route | 0.5 days | FSE |
| Key features auto-generation from asset data | 0.5 days | FSE |
| Claude Haiku listing description (reuse brochure pattern) | 0.5 days | FSE |
| FE: "Export listing →" button on Lettings management panel | 0.5 days | FE |
| FE: Listing card preview with copy button | 0.5 days | FE |
| **Total** | **~2.5 days** | FSE + FE |

CoStar / Rightmove Partner API integration is post-MVP and requires separate platform partner applications.

---

*Supplement to `docs/wave-3-sprint-1-brief.md` and `docs/wave-3-sprint-2-brief.md` | March 2026 | For CTO and FSE attention*
