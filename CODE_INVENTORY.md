# RealHQ — Code Inventory

> **READ THIS BEFORE WRITING ANY CODE.**
> 23 library files, 70+ API routes, 21 UI components, 6 hooks, 32 pages, 54 database models, 30 email templates, 8 cron jobs.
> **RESTYLE. REWIRE. EXTEND. Never rebuild what already works.**

## Library Files (src/lib/) — 23 files

### Property Data & Enrichment
- enrich-asset.ts (390 lines) — enrichAsset() — Google Maps geocoding/satellite/street view — GOOGLE_MAPS_API_KEY, EPC_API_KEY
- attom.ts (95 lines) — fetchAttomComparables() — api.developer.attomdata.com — ATTOM_API_KEY
- avm.ts (463 lines) — calculateIncomeCap(), blendValuation(), calculateIRR(), calculateNPV(), getFallbackCapRate(), confidenceLabel() — model-based
- land-registry.ts (132 lines) — fetchLandRegistryComps() — landregistry.data.gov.uk
- planning-feed.ts (371 lines) — fetchUKPlanningApplications(), fetchUSPlanningApplications(), geocodePostcode() — planning.data.gov.uk, opendata.miamidade.gov
- planning-classifier.ts (117 lines) — classifyPlanningApplication() — Claude API — ANTHROPIC_API_KEY
- dev-potential.ts (259 lines) — assessDevPotential() — Claude API — ANTHROPIC_API_KEY
- prisma.ts (25 lines) — DB client — NEON_DATABASE_URL
- health.ts (22 lines) — checkHealth()

### Document Parsing & Generation
- document-parser.ts (101 lines) — parseDocument() — Claude API — ANTHROPIC_API_KEY
- textract.ts (48 lines) — extractTextFromDocument() — AWS Textract — AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
- brochure.ts (42 lines) — generateBrochurePDF()
- brochure-template.ts (392 lines) — renderBrochureHTML()
- nda-template.ts (196 lines) — renderNDAHTML()

### Action Engine
- coverforce.ts (101 lines) — getCoverForceQuotes() — api.coverforce.com — COVERFORCE_ENABLED, COVERFORCE_API_KEY
- energy-quotes.ts (289 lines) — getEnergyQuotes() — api.octopus.energy
- email.ts (2,227 lines) — 30 email functions — Resend — RESEND_API_KEY + 6 more env vars
- insurance-risk.ts (187 lines) — assessInsuranceRisk(), calculateRebuildCost()
- covenant-check.ts (142 lines) — checkCovenantUK() — Companies House — COMPANIES_HOUSE_API_KEY

### Analysis & Intelligence
- hold-sell-model.ts (325 lines) — runHoldSellScenario(), compareScenarios()
- opportunity.ts (278 lines) — identifyOpportunities(), scoreOpportunity()
- tenant-health.ts (153 lines) — scoreTenantHealth(), assessLeaseRisk()
- tenant-materialise.ts (89 lines) — materialiseTenant()

## API Routes — Full Tree (70+ endpoints)

/api/property/ — autocomplete (Google Places), lookup (ATTOM+owner), satellite (Google Maps), loopnet-listing
/api/market/ — attom-benchmarks, benchmarks, comparables
/api/scout/ — deals (scoring), pipeline (stages), loopnet-sync
/api/insurance/ — config, quotes
/api/energy/ — quotes (GET+POST via Octopus)
/api/quotes/ — insurance, energy, bind
/api/macro/ — sofr (Federal Reserve rates)
/api/dashboard/ — summary (KPIs)
/api/ask — AI assistant (45KB)

/api/user/ (28 sub-routes):
assets, portfolio, insurance-summary, insurance-risk, energy-summary, compliance-summary, compliance/renew, financing-summary, hold-sell-scenarios, income-opportunities, income-opportunities/activate, income-opportunities/activations, tenants, tenants/actions, rent-reviews, leases/materialise, lease-summary, lettings, documents, noi-bridge, monthly-financial, transactions, work-orders, contractors, planning, export, ask-context, ask, requests, acquisitions, action-queue

/api/cron/ (8 jobs): compliance-reminders, energy-rates, octopus-rates, planning-monitor, rent-review-triggers, tenant-engagement-triggers, send-emails, sofr

/api/admin/ (16 routes): assets/[id]/planning, cancel-scheduled-email, commissions, flush-email-queue, funnel, leads-export, portfolio-generator, portfolios, prospect-email, prospect-status, prospects/[key]/status, prospects/preview-email, send-cold-outreach, send-followup, send-wave, signups-by-day

Other: /api/assets, audit-leads, audit/enrich, auth/[...nextauth], commissions/summary, contact, health, portfolios/[urlKey], portfolios/create, portfolios/user, signup, tender/respond/[token], unsubscribe, user, webhooks/resend

## Key Pipelines

Property Enrichment: autocomplete (Google Places) > lookup (ATTOM+owner) > satellite (Google Maps) > enrich-asset.ts > market/benchmarks > planning-feed.ts > opportunity.ts

Document Extraction: upload > textract.ts (AWS OCR) > document-parser.ts (Claude) > If lease: leases/materialise (creates Tenant+Lease records)

Insurance Quoting: insurance-summary > insurance-risk.ts > coverforce.ts (CoverForce API) > InsuranceQuote records > quotes/bind > sendInsuranceBoundEmail()

Energy Quoting: energy-summary > energy-quotes.ts (Octopus) > EnergyQuote records > quotes/bind > sendEnergySwitchedEmail()

Scout Deals: loopnet-sync > scout/deals (scoring) > ScoutReaction (learning) > scout/pipeline > ScoutUnderwriting > TransactionRoom

## Database Models (54)

Auth: User, Account, Session, VerificationToken
Leads: SignupLead, Unsubscribe, ScheduledEmail, AuditLead, ProspectStatus
Properties: UserAsset, PropertyComparable, AssetValuation, ClientPortfolio
Insurance: InsuranceQuote
Energy: EnergyQuote, EnergyRead, EnergyAnomaly, SolarAssessment, SolarQuoteRequest
Tenants: Tenant, Lease, TenantPayment, TenantEngagement, TenantEngagementAction, TenantLetter, RentReviewEvent, RenewalCorrespondence, Letting, Enquiry
Scout: ScoutDeal, ScoutReaction, ScoutUnderwriting, ScoutLOI, ScoutComparable, Acquisition
Transactions: TransactionRoom, TransactionDocument, TransactionMilestone, NDASignature, SellEnquiry
Financial: Commission, MacroRate, HoldSellScenario, IncomeActivation, MonthlyFinancial
Work Orders: WorkOrder, WorkOrderMilestone, WorkOrderCompletion, TenderQuote, Contractor
Documents: Document, DocumentExtract
Compliance: ComplianceCertificate
Planning: PlanningApplication

## UI Components (21) — ALL need RESTYLE to dark theme

PageHero (103), G2NComparisonCard (189), MetricCard (67), ActionAlert (84), DirectCallout (52), HoldSellRecommendation (156), PolicyUploadWidget (134), LeaseUploadModal (178), PortfolioCalculator (298), RefinanceWidget (112), AskPanel (245), NOIBridge (167), BarChart (89), LineChart (94), RevenueChart (76), Badge (34), SectionHeader (38), ActionQueueDrawer (198), Wave2Banner (56). USE AS-IS: CopyLink (45), Skeleton (28).

## Hooks (6)

usePortfolio (39) — /api/portfolios/ — used by 9+ pages
useHoldSellScenarios (67) — /api/user/hold-sell-scenarios/
useIncomeOpportunities (54) — /api/user/income-opportunities/
usePlanningData (48) — planning page
useUserDocuments (41) — /api/user/documents
useLoading (12) — generic loading

## Layout: RESTYLE (don't replace)

AppShell (251 lines) — main layout with sidebar. Restyle to dark theme.
TopBar (362 lines) — nav with breadcrumbs. Restyle to dark theme.
NavContext — USE AS-IS.

## CSS: THREE systems exist — USE ONLY the new dark theme

DEPRECATED: --color-navy etc (legacy dark). DEPRECATED: --rhq-navy etc (light).
ADD: --bg:#09090b --s1:#111116 --s2:#18181f --s3:#1f1f28 --bdr:#252533 --tx:#e4e4ec --tx2:#8888a0 --tx3:#555568 --acc:#7c6af0 --grn:#34d399 --red:#f87171 --amb:#fbbf24

## Env Vars (19)

NEON_DATABASE_URL, DATABASE_URL, GOOGLE_MAPS_API_KEY, ATTOM_API_KEY, ANTHROPIC_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, COVERFORCE_ENABLED, COVERFORCE_API_KEY, RESEND_API_KEY, AUTH_EMAIL_FROM, OUTREACH_EMAIL_FROM, NEXT_PUBLIC_APP_URL, ADMIN_EMAIL, REALHQ_PHYSICAL_ADDRESS, CRON_SECRET, COMPANIES_HOUSE_API_KEY, EPC_API_KEY

## Design File > Page > Code Mapping

landing-design.html > / > PortfolioCalculator, router.push, Links
dashboard-design.html > /dashboard > usePortfolio, /api/dashboard/summary, PageHero, G2NComparisonCard, MetricCard, ActionAlert
onboarding-design.html > /onboarding > /api/property/autocomplete, lookup, satellite, enrich-asset.ts
upload-schedule-design.html > /onboarding (alt) > document-parser.ts, textract.ts
search-company-design.html > /onboarding (alt) > attom.ts, /api/property/lookup
document-progress-design.html > /documents > textract.ts, document-parser.ts, /api/user/leases/materialise
property-detail-design.html > /assets/[id] > usePortfolio, all module APIs
signup-design.html > /signup > /api/auth/[...nextauth]
signin-design.html > /signin > /api/auth/[...nextauth]
insurance-design.html > /insurance > coverforce.ts, insurance-risk.ts, /api/user/insurance-summary, /api/quotes/bind
insurance-flows-design.html > /insurance (sub-flows) > /api/quotes/bind, sendInsuranceBoundEmail()

## DO NOT
- Create a new file if one exists here
- Rebuild an API route — wire new UI to it
- Replace a component — restyle it
- Delete any file in src/lib/
- Use --color-* or --rhq-* CSS vars
- Push directly to main
