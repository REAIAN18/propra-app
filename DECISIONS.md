# RealHQ — Product Decisions

> **HIGHEST AUTHORITY.** If this conflicts with any other doc — THIS FILE WINS.
> Every agent reads this before starting any task.
>
> **AUTONOMY:** Agents don't wait for board approval. Tech Lead makes calls. Owner steers by updating this file.
>
> Last updated: 2026-03-25

---

## WHAT REALHQ IS

**One living property intelligence layer.** Not 16 modules. One Property Profile that gets richer with every interaction, and shows the right face to the right audience.

**Build 5 systems, not 16 pages:**
1. **Property Profile** — central data model, everything reads/writes to this
2. **Document Generator** — one engine, audience-specific templates (PDF + portal)
3. **Portal System** — permissions, view tracking, NDA gating, sharing
4. **Action Engine** — Resend, CoverForce, DocuSign, Claude
5. **Learning Loop** — every interaction improves the next recommendation

## FRICTIONLESS

- Never ask questions you can infer from the portfolio
- Show results immediately with confidence score
- Every number tagged: verified, estimated, or auto-fetched
- Instant or near-instant everything

## BRAND

**Name:** RealHQ. **Tagline:** Every asset earning what it should.
Remove Arca and Propra everywhere.

## VOICE

Direct. Specific. Confident. No hedging, no fluff, no AI-forward language.

## MARKET ADAPTATION

Detect market from address. Regulated states = no switching. Deregulated = switching + optimisation. UK = switching + optimisation.

## PRICING

Keep current pricing page as-is until owner updates this section.

## DATA HONESTY

Estimates labelled with source and EST tag. Demo labelled illustrative.

## INFRASTRUCTURE

Vercel hosting. Vercel Postgres (Neon). Delete railway.toml + Dockerfile.
