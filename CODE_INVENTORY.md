# RealHQ — Code Inventory

> **CRITICAL: Read this before building anything.**
> There is significant working code in this repo. DO NOT rebuild what already exists.
> RESTYLE. REWIRE. EXTEND. Never replace working integrations.

## The Rule

Before writing ANY new file, search the codebase for existing code that does the same thing.
If it exists: import it, extend it, or restyle it.
If it doesn't exist: build it.
If you're unsure: read this file again.

---

## Library Files (src/lib/) — 23 files, ALL working integrations

### Property Data & Enrichment
| File | What it does | Rule |
|------|-------------|------|
| enrich-asset.ts | Auto-enriches property from external APIs | USE AS-IS |
| attom.ts | ATTOM property data API | USE AS-IS |
| avm.ts | Automated Valuation Model | USE AS-IS |
| land-registry.ts | UK Land Registry API | USE AS-IS |
| planning-feed.ts | Planning application data feed | USE AS-IS |
| planning-classifier.ts | Classifies planning apps by type/impact | USE AS-IS |
| dev-potential.ts | Development potential analysis | USE AS-IS |
| prisma.ts | Database client | USE AS-IS |

### Document Parsing & Generation
| File | What it does | Rule |
|------|-------------|------|
| document-parser.ts | Parses uploaded documents | USE AS-IS |
| textract.ts | AWS Textract extraction | USE AS-IS |
| brochure.ts | Generates property brochures | USE AS-IS |
| brochure-template.ts | Brochure HTML templates | USE AS-IS |
| nda-template.ts | NDA document template | USE AS-IS |

### Action Engine (live API integrations)
| File | What it does | Rule |
|------|-------------|------|
| coverforce.ts | CoverForce insurance quoting API | USE AS-IS |
| energy-quotes.ts | Energy tariff comparison | USE AS-IS |
| email.ts | Resend email integration | USE AS-IS |
| insurance-risk.ts | Insurance risk scoring | USE AS-IS |
| covenant-check.ts | Tenant covenant/credit check | USE AS-IS |

### Analysis & Intelligence
| File | What it does | Rule |
|------|-------------|------|
| hold-sell-model.ts | Hold vs Sell DCF modelling | USE AS-IS |
| opportunity.ts | Opportunity identification | USE AS-IS |
| tenant-health.ts | Tenant health scoring | USE AS-IS |
| tenant-materialise.ts | Tenant data materialisation | USE AS-IS |
| health.ts | Health check utilities | USE AS-IS |

---

## API Routes (src/app/api/) — 25 endpoints, ALL wired to real data

| Route | Purpose | Wire new UI to this |
|-------|---------|-------------------|
| /api/dashboard/summary | Dashboard KPIs and summary | Dashboard page |
| /api/assets | Property/asset CRUD | Properties list |
| /api/property | Property data + enrichment | Property detail |
| /api/portfolios | Portfolio management | Portfolio views |
| /api/insurance | Insurance analysis + quotes | Insurance page |
| /api/energy/quotes | Energy tariff quotes | Energy page |
| /api/scout | Acquisition deal scoring | Scout/Deal Finder |
| /api/documents | Document upload/management | Documents page |
| /api/market | Market data | Benchmarks |
| /api/macro/sofr | Live SOFR rate data | Financing section |
| /api/ask | AI assistant queries | Ask RealHQ |
| /api/audit/enrich | Property enrichment pipeline | Onboarding |
| /api/quotes | Quote management | Insurance/Energy |
| /api/commissions/summary | Commission tracking | Admin |
| /api/cron | Scheduled jobs | Background |
| /api/health | Health check | Monitoring |
| /api/auth/[...nextauth] | Authentication | Auth |
| /api/signup | User registration | Signup |
| /api/user | User management | Settings |
| /api/admin | Admin functions | Admin |
| /api/partners/apply | Partner applications | Partners |
| /api/tender/respond/[token] | Tender responses | Insurance |
| /api/webhooks/resend | Email webhooks | Background |
| /api/contact | Contact form | Landing |
| /api/unsubscribe | Email unsubscribe | Email |
| /api/audit-leads | Lead generation | Audit |

---

## UI Components (src/components/ui/) — 21 components

| Component | Use in new design |
|-----------|-------------------|
| PortfolioCalculator | Landing page calculator — RESTYLE to dark theme |
| PageHero | Dashboard greeting — RESTYLE to dark theme |
| G2NComparisonCard | Dashboard G2N card — RESTYLE |
| MetricCard | Dashboard KPI cells — RESTYLE |
| ActionAlert | Dashboard risk alerts + actions — RESTYLE |
| DirectCallout | Dashboard insight card — RESTYLE |
| HoldSellRecommendation | Hold vs Sell page — RESTYLE |
| NOIBridge | NOI waterfall — RESTYLE |
| BarChart | Charts throughout — RESTYLE |
| LineChart | Charts throughout — RESTYLE |
| RevenueChart | Revenue display — RESTYLE |
| PolicyUploadWidget | Insurance page — RESTYLE |
| LeaseUploadModal | Lease upload — RESTYLE |
| RefinanceWidget | Financing page — RESTYLE |
| AskPanel | Ask RealHQ — RESTYLE |
| Badge | Status badges — RESTYLE |
| CopyLink | Portal sharing — USE AS-IS |
| Skeleton | Loading states — USE AS-IS |
| SectionHeader | Section headers — RESTYLE |
| ActionQueueDrawer | Action queue — RESTYLE |
| Wave2Banner | Remove or repurpose |

---

## Hooks (src/hooks/) — 6 hooks managing real data

| Hook | What it does | Rule |
|------|-------------|------|
| usePortfolio | Fetches portfolio data | USE — dashboard needs this |
| useHoldSellScenarios | Hold vs Sell calculations | USE — hold-sell page |
| useIncomeOpportunities | Income opportunity detection | USE — income/actions |
| usePlanningData | Planning data fetching | USE — planning page |
| useUserDocuments | Document management | USE — documents page |
| useLoading | Loading state | USE — everywhere |

---

## Pages (src/app/) — 32 routes with existing data logic

Every page has working data fetching. When restyling:
- KEEP the data fetching logic (API calls that work)
- KEEP the hook usage (state management)
- RESTYLE the JSX (match new dark theme)
- DO NOT delete pages — the data logic is reusable

---

## FOR THE LANDING PAGE (PRO-682)

The current page.tsx already has:
- PortfolioCalculator component — REUSE, restyle to dark theme
- Feature grid with Link components — REUSE routing logic
- Search form with router.push — REUSE navigation

Change the JSX + CSS. Keep the logic.

## FOR THE DASHBOARD (PRO-683)

The current dashboard already calls:
- /api/dashboard/summary — KEEP this data source
- usePortfolio hook — KEEP this
- PageHero, G2NComparisonCard, MetricCard, ActionAlert — RESTYLE these

Add new sections (risk alerts, insight card, deal finder, pipeline).
Wire to existing API routes.
