# RealHQ — Product Decisions

> **HIGHEST AUTHORITY.** If this conflicts with any other doc — THIS FILE WINS.
> Every agent reads this before starting any task.
> **AUTONOMY:** Agents don't wait for board approval. Tech Lead makes calls. Owner steers by updating this file.
> Last updated: 2026-03-27

---

## WHAT REALHQ IS

**One living property intelligence layer.** Not 16 modules. One Property Profile that adapts for every audience.

**Build 5 systems, not 16 pages:**
1. Property Profile — central data model
2. Document Generator — one engine, audience-specific templates
3. Portal System — permissions, view tracking, NDA gating
4. Action Engine — Resend, CoverForce, DocuSign, Claude, Google, ATTOM, Octopus, AWS Textract
5. Learning Loop — every interaction improves the next recommendation

## EXISTING INFRASTRUCTURE

23 lib files, 70+ API routes, 21 components, 6 hooks, 32 pages, 54 Prisma models, 30 email functions, 8 cron jobs. See CODE_INVENTORY.md for the complete map.

Working integrations: Google Maps/Places/Satellite, ATTOM (property+owner), CoverForce (insurance), Octopus Energy, AWS Textract (OCR), Claude (parsing+classification), UK Land Registry, Companies House, Miami-Dade open data, UK planning.data.gov.uk, Resend (email), Federal Reserve (SOFR).

## FRICTIONLESS

- Never ask questions you can infer
- Show results immediately with confidence scores
- Every number tagged: verified, estimated, or auto-fetched
- Instant or near-instant everything

## BRAND

Name: RealHQ. Tagline: Every asset earning what it should. Remove Arca and Propra everywhere.

## VOICE

Direct. Specific. Confident. No hedging, no fluff, no AI-forward language.

## MARKET ADAPTATION

Detect market from address. Regulated = no switching. Deregulated = switching + optimisation.

## PRICING

Keep as-is until owner updates. Landing: "Free to start. No credit card required." No commission language.

## DATA HONESTY

Estimates labelled with source and EST tag. Demo labelled illustrative.

## REFERENCE DOCUMENTS

See CODE_INVENTORY.md for the complete file-by-file map. Design files in docs/designs/.
