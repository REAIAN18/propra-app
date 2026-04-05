# RealHQ — Code Inventory

> READ THIS BEFORE WRITING ANY CODE.
> 23 lib files, 80+ API routes, 20 components, 6 hooks, 35 pages, 54 models, 30 emails, 8 crons.
> RESTYLE. REWIRE. EXTEND. Never rebuild what works.

## Lib Files (src/lib/) — 26 files

enrich-asset.ts(390) enrichAsset() Google Maps GOOGLE_MAPS_API_KEY
attom.ts(95) fetchAttomComparables() ATTOM API ATTOM_API_KEY
avm.ts(463) calculateIncomeCap() blendValuation() calculateIRR() getFallbackCapRate()
land-registry.ts(132) fetchLandRegistryComps() UK Land Registry
planning-feed.ts(371) fetchUKPlanningApplications() fetchUSPlanningApplications() postcodes.io planning.data.gov.uk miamidade.gov
planning-classifier.ts(117) classifyPlanningApplication() Claude ANTHROPIC_API_KEY
dev-potential.ts(259) assessDevPotential() Claude ANTHROPIC_API_KEY
document-parser.ts(101) parseDocument() Claude ANTHROPIC_API_KEY
textract.ts(48) extractTextFromDocument() AWS Textract AWS keys
coverforce.ts(101) getCoverForceQuotes() CoverForce COVERFORCE_API_KEY
energy-quotes.ts(289) getEnergyQuotes() Octopus Energy
email.ts(2227) 30 email functions Resend RESEND_API_KEY
insurance-risk.ts(187) assessInsuranceRisk() calculateRebuildCost()
covenant-check.ts(142) checkCovenantUK() Companies House
hold-sell-model.ts(325) runHoldSellScenario() compareScenarios()
opportunity.ts(278) identifyOpportunities() scoreOpportunity()
tenant-health.ts(153) scoreTenantHealth() assessLeaseRisk()
tenant-materialise.ts(89) materialiseTenant()
brochure.ts(42) generateBrochurePDF()
brochure-template.ts(392) renderBrochureHTML()
nda-template.ts(196) renderNDAHTML()
dealscope-comps.ts(202) findComps() scoreCompsConfidence() haversineDistance() — comparable sales from LandRegistryPricePaid
dealscope-ccod.ts(103) findOwnersByAddress() findPropertiesByCompany() getCompanyOwner() — owner identification from LandRegistryCCOD
dealscope-scoring.ts(156) scoreProperty() epcSignal() — property scoring and signal detection
csv-parser.ts(89) parseCSVData() parseCSVLine() escapeSQL() toSQLValues() — CSV parsing utilities
prisma.ts(25) DB client
health.ts(22) checkHealth()

## API Routes — 80+ endpoints

/api/property/ autocomplete(Google) lookup(ATTOM+owner) satellite(Google) loopnet-listing
/api/market/ attom-benchmarks benchmarks comparables
/api/scout/ deals pipeline loopnet-sync
/api/insurance/ config quotes
/api/energy/ quotes(GET+POST Octopus)
/api/quotes/ insurance energy bind refinance(POST) sale-lead(POST)
/api/user/ 31 sub-routes: assets portfolio insurance-summary insurance-risk energy-summary compliance-summary compliance/renew financing-summary hold-sell-scenarios income-opportunities income-opportunities/activate tenants tenants/actions rent-reviews leases/materialise lease-summary lettings documents noi-bridge monthly-financial financial-budget transactions work-orders contractors planning export ask-context ask requests acquisitions action-queue cash-flow-forecast loans me(GET — session user name/email/id)
/api/dealscope/ enrich(POST) pipeline(GET) search(GET — demo+LandRegistryPricePaid) alerts(GET/PATCH/DELETE) responses(POST) import/price-paid(POST CSV) import/ccod(POST CSV) test/import-sample(POST) properties/[id]/export/pdf(GET — IC Memo PDF via puppeteer) properties/[id]/export/excel(GET — IC Memo Excel workbook via exceljs)
/api/macro/ sofr(Federal Reserve)
/api/dashboard/ summary(KPIs)
/api/cron/ 8 jobs: compliance-reminders energy-rates octopus-rates planning-monitor rent-review-triggers tenant-engagement-triggers send-emails sofr
/api/admin/ 16 routes
/api/ ask(45KB) assets audit-leads audit/enrich auth/nextauth contact health portfolios signup tender/respond webhooks/resend

## Pipelines

Property: autocomplete->lookup->satellite->enrich-asset->benchmarks->planning-feed->opportunity
Document: upload->textract(AWS)->document-parser(Claude)->leases/materialise
Insurance: insurance-summary->insurance-risk->coverforce->InsuranceQuote->quotes/bind->sendInsuranceBoundEmail
Scout: loopnet-sync->deals(scoring)->ScoutReaction(learning)->pipeline->ScoutUnderwriting->TransactionRoom

## Models (56)

Auth: User Account Session VerificationToken
Leads: SignupLead Unsubscribe ScheduledEmail AuditLead ProspectStatus
Properties: UserAsset PropertyComparable AssetValuation ClientPortfolio
Insurance: InsuranceQuote
Energy: EnergyQuote EnergyRead EnergyAnomaly SolarAssessment SolarQuoteRequest
Tenants: Tenant Lease TenantPayment TenantEngagement TenantEngagementAction TenantLetter RentReviewEvent RenewalCorrespondence Letting Enquiry
Scout: ScoutDeal ScoutReaction ScoutUnderwriting ScoutLOI ScoutComparable Acquisition
Transactions: TransactionRoom TransactionDocument TransactionMilestone NDASignature SellEnquiry
Financial: Commission MacroRate HoldSellScenario IncomeActivation MonthlyFinancial
Work: WorkOrder WorkOrderMilestone WorkOrderCompletion TenderQuote Contractor
Docs: Document DocumentExtract
Compliance: ComplianceCertificate
Planning: PlanningApplication
LandRegistry: LandRegistryPricePaid LandRegistryCCOD

## Components (20)

PageHero G2NComparisonCard MetricCard ActionAlert DirectCallout HoldSellRecommendation PolicyUploadWidget LeaseUploadModal PortfolioCalculator RefinanceWidget AskPanel NOIBridge BarChart LineChart RevenueChart Badge CopyLink(keep) Skeleton(keep) SectionHeader ActionQueueDrawer

## Hooks (6)

usePortfolio /api/portfolios/ 9+ pages
useHoldSellScenarios /api/user/hold-sell-scenarios/
useIncomeOpportunities /api/user/income-opportunities/
usePlanningData
useUserDocuments /api/user/documents
useLoading

## Layout

AppShell(251) RESTYLE dark. TopBar(362) RESTYLE dark. NavContext USE AS-IS.
CSS: use --bg --s1 --acc --tx. NOT --color-* or --rhq-*

## Env Vars (19)

DATABASE_URL DIRECT_URL GOOGLE_MAPS_API_KEY ATTOM_API_KEY ANTHROPIC_API_KEY AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION COVERFORCE_ENABLED COVERFORCE_API_KEY RESEND_API_KEY AUTH_EMAIL_FROM OUTREACH_EMAIL_FROM NEXT_PUBLIC_APP_URL ADMIN_EMAIL REALHQ_PHYSICAL_ADDRESS CRON_SECRET COMPANIES_HOUSE_API_KEY EPC_API_KEY

## New Pages (added)

/financials — portfolio P&L overview: KPI bar, NOI waterfall, budget vs actual, rent collection, cash flow, capex plan, debt summary
/lettings/[id] — letting detail: KPIs, enquiry list with covenant grades, HoTs action
/assets/[id]/tenants/[tenantId] — tenant detail page (from missing-pages-design)
/transactions/[roomId] — transaction detail: stage pipeline, task checklists, document room, parties, costs
/settings — profile (/api/user/me + usePortfolio), email notification toggles (localStorage), acquisition strategy (/api/user/acquisition-strategy), data export
/reports — report generator: 7-template picker (investment_memo/teaser/lender_pack/valuer_brief/brochure/insurance_submission/management_accounts), property checkboxes from usePortfolio, preview (htmlPreview in iframe) + download PDF via POST /api/user/assets/[id]/brochure, demo mode with sign-in CTA

## DO NOT: create duplicates, rebuild APIs, replace components, delete src/lib/, modify migrations, use old CSS vars, push to main
