# Wave 2 — Environment Variable Gate
**Author:** Head of Product
**Date:** 2026-03-23
**For:** CTO + CEO
**Purpose:** All API keys and env vars required for Wave 2. Obtain these BEFORE the phase that needs them, not after.

---

## Summary: What's needed and when

| Variable | Feature | Phase | Status | Action |
|----------|---------|-------|--------|--------|
| `ANTHROPIC_API_KEY` | Scout LOI, Rent Review, Tenant letters, Planning classifier | Sprint 1 | ✅ Already set (Wave 1) | None |
| `RESEND_API_KEY` | Work Order emails, Planning alerts, Tenant alerts, Rent Review | Sprint 1 | ✅ Already set (Wave 1) | None |
| `X_RapidAPI_Key` | Scout LoopNet feed | Sprint 1 | ✅ Already set — LoopNet live | None |
| `ATTOM_API_KEY` | AVM US comparables | Sprint 2 | ✅ Already set (Wave 1) | None |
| `NEON_DATABASE_URL` | All (primary DB connection) | All | ✅ Vercel Neon — set in Vercel project | None |
| `NEON_DATABASE_URL_UNPOOLED` | Prisma migrations + direct connections | All | ✅ Vercel Neon — set in Vercel project | None |
| `CRON_SECRET` | All cron endpoints (planning-monitor, tenant-engagement-triggers) | Sprint 1 | ❌ **Not set** | **HIGH PRIORITY** — generate any strong random string, set in Vercel env vars |
| `TENDER_SECRET` | Work Order contractor tender token signing | Sprint 2 | ❌ **Not set** | **HIGH PRIORITY** — generate any strong random string, set in Vercel env vars |
| `COMPANIES_HOUSE_API_KEY` | Tenant Intelligence: covenant check | Sprint 2 | ❓ Verify set | Check Vercel env vars — free, 5-min signup at developer.company-information.service.gov.uk |
| `GOOGLE_SOLAR_API_KEY` | Energy Wave 2: solar assessment | Sprint 2 | ❌ Not set | Obtain from Google Cloud Console |
| `GOCARDLESS_ACCESS_TOKEN` | Work Orders: payment on completion | Sprint 2 | ❌ Not set | Optional at Wave 2 launch — skip for initial deploy |
| `DOCUSIGN_INTEGRATION_KEY` | Rent Review: Heads of Terms signing | Sprint 3 | ❌ Not set | Obtain before Sprint 3 |
| `DOCUSIGN_ACCOUNT_ID` | Rent Review: Heads of Terms signing | Sprint 3 | ❌ Not set | Obtain before Sprint 3 |
| `DOCUSIGN_BASE_URL` | Rent Review: Heads of Terms signing | Sprint 3 | ❌ Not set | Obtain before Sprint 3 |

---

## Before Sprint 1 — Two new vars needed NOW

### `CRON_SECRET`
- **Used by:** All cron endpoints (`POST /api/cron/planning-monitor`, `POST /api/cron/tenant-engagement-triggers`). Routes check `X-Cron-Secret` header against this value.
- **If missing:** Cron endpoints return 401. No planning alerts fire. No tenant engagement triggers fire.
- **How to set:** Generate any strong random string (e.g. `openssl rand -hex 32`). Set as `CRON_SECRET` in Vercel Production + Preview. Also configure in cron scheduler (Vercel Cron or cron-job.org) as the `X-Cron-Secret` header value.

### `TENDER_SECRET`
- **Used by:** `POST /api/user/work-orders/:id/tender` → signs contractor quote-response tokens. `POST /tender/respond/:token` → verifies tokens.
- **If missing:** Tendering is disabled. No contractor quote-response links can be sent.
- **How to set:** Generate any strong random string (separate from `CRON_SECRET`). Set as `TENDER_SECRET` in Vercel Production.

**Both are required before Wave 2 launch. Neither requires a commercial agreement — just generate and set.**

---

## Sprint 1 — No other new env vars needed

All Sprint 1 work (Prisma migrations, avm.ts, Work Orders scope/tender, Scout underwriting/LOI) uses existing keys. Sprint 1 can start immediately once `CRON_SECRET` and `TENDER_SECRET` are set.

---

## Sprint 2 — 3 new keys needed before features go live

### 1. `COMPANIES_HOUSE_API_KEY`
- **Used by:** `src/lib/covenant-check.ts` → Tenant Intelligence health score (covenant component, 20% weight)
- **If missing:** Tenant covenant check is skipped; health score defaults covenant component to 60 (acceptable degraded mode — feature still works, covenant column shows "Unverified")
- **How to obtain:** Register at https://developer.company-information.service.gov.uk — free, instant approval
- **Vercel env var name:** `COMPANIES_HOUSE_API_KEY`

### 2. `GOOGLE_SOLAR_API_KEY`
- **Used by:** `POST /api/user/assets/:id/solar/assess` → Energy Wave 2 solar card
- **If missing:** Solar assess endpoint returns `{ available: false, reason: "api_key_not_configured" }` — solar card hidden from UI gracefully
- **How to obtain:** Google Cloud Console → enable Solar API → create API key with Solar API scope restricted
- **Vercel env var name:** `GOOGLE_SOLAR_API_KEY`
- **Cost note:** $5 per 1,000 `buildingInsights` calls. One call per asset, called once and cached in `SolarAssessment` table. ~$0.005 per asset lifetime.

### 3. `GOCARDLESS_ACCESS_TOKEN`
- **Used by:** `POST /api/user/work-orders/:id/complete` → payment on work order completion
- **If missing:** Completion flow still works (Commission record created), payment step skipped gracefully. Manual invoice sent instead.
- **How to obtain:** Sign up at gocardless.com → create a restricted access token (Payments: write, Mandates: read) in sandbox first, then production
- **Vercel env var names:** `GOCARDLESS_ACCESS_TOKEN`, `GOCARDLESS_ENVIRONMENT` (values: `sandbox` | `live`)

---

## Sprint 3 — DocuSign for Rent Review HoT

### 4. DocuSign (3 vars)
- **Used by:** `POST /api/user/rent-reviews/:id/hot` → Heads of Terms embedded signing
- **If missing:** HoT endpoint returns `{ signingUrl: null, fallback: "pdf" }` — owner gets a downloadable PDF instead of DocuSign workflow. Revenue pathway still works (manual sign).
- **How to obtain:**
  1. Sign up at DocuSign Developer Center (free developer account)
  2. Create Integration Key (JWT grant for server-side signing)
  3. Note: Production DocuSign requires plan subscription (~$25/mo for API access)
- **Vercel env var names:**
  - `DOCUSIGN_INTEGRATION_KEY` — from Apps & Keys page
  - `DOCUSIGN_ACCOUNT_ID` — from user profile (also called API Account ID)
  - `DOCUSIGN_BASE_URL` — `https://demo.docusign.net/restapi` (sandbox) | `https://na4.docusign.net/restapi` (production)
  - `DOCUSIGN_PRIVATE_KEY` — RSA private key (PEM format, newlines as `\n`)
  - `DOCUSIGN_USER_ID` — impersonation user GUID

**Note:** DocuSign requires a production plan upgrade before the first real client Heads of Terms. Start with sandbox. Production upgrade is a board-level budget decision (~$300/yr).

---

## Degraded mode summary

The platform is designed to degrade gracefully when keys are missing:

| Missing key | Impact | Degraded behaviour |
|-------------|--------|-------------------|
| `CRON_SECRET` | All crons | **401 on all cron calls — planning alerts and tenant triggers do not fire** |
| `TENDER_SECRET` | Work order tendering | **Tendering disabled — no contractor quote links can be sent** |
| `COMPANIES_HOUSE_API_KEY` | Tenant covenant check | Defaults to 60/100 covenant score; shows "Unverified" badge |
| `GOOGLE_SOLAR_API_KEY` | Solar assessment | Solar card hidden; no error shown to user |
| `GOCARDLESS_ACCESS_TOKEN` | Work order payment | Commission recorded, manual invoice email sent instead |
| `DOCUSIGN_*` | Rent review HoT | PDF fallback; owner downloads and signs manually |

None of these missing keys break the commission revenue pathway. All commission records are created correctly regardless of whether the payment/signing integrations are live.

---

## Action for CTO

**Immediate (before Sprint 1 launch):**
0. Generate and set `CRON_SECRET` in Vercel — `openssl rand -hex 32`, ~5 minutes
0b. Generate and set `TENDER_SECRET` in Vercel — separate value, ~5 minutes
0c. Configure both cron endpoints on cron-job.org or Vercel Cron with `X-Cron-Secret: {CRON_SECRET}` header

Before Sprint 2 starts:
1. Verify `COMPANIES_HOUSE_API_KEY` is set in Vercel (may already exist from Wave 1 planning fetch)
2. Obtain `GOOGLE_SOLAR_API_KEY` from Google Cloud Console — ~15 minutes
3. `GOCARDLESS_ACCESS_TOKEN` — skip for Wave 2 initial launch (GoCardless payment is optional; commission still records)
4. Set items 1 and 2 in Vercel Production environment before Sprint 2 features deploy

Before Sprint 3 starts:
5. Obtain DocuSign developer account + Integration Key + set up JWT grant
6. Confirm CEO budget approval for DocuSign production plan if first real HoT is expected within 90 days
