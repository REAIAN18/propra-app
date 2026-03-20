"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Prospect {
  id: string;
  name: string;
  company: string;
  email: string;
  linkedin: string;
  portfolioSize: string;
  assetTypes: string;
  location: string;
  initialStatus: ProspectStatus;
  notes: string;
}

export type ProspectStatus =
  | "research_needed"
  | "to_contact"
  | "contacted"
  | "demo_booked"
  | "in_negotiation"
  | "won"
  | "lost"
  | "referral_partner"
  | "bounced";

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string }> = {
  research_needed: { label: "Research needed", color: "#5a7a96", bg: "#1a2d45" },
  to_contact:      { label: "To contact",      color: "#F5A94A", bg: "#2a1e08" },
  contacted:       { label: "Contacted",        color: "#1647E8", bg: "#0e1a36" },
  demo_booked:     { label: "Demo booked",      color: "#8b5cf6", bg: "#1a1030" },
  bounced:         { label: "Bounced",           color: "#f97316", bg: "#2a1200" },
  in_negotiation:  { label: "Negotiating",      color: "#06b6d4", bg: "#051e26" },
  won:             { label: "Won",              color: "#0A8A4C", bg: "#0f2a1c" },
  lost:            { label: "Lost",             color: "#CC1A1A", bg: "#2a0a0a" },
  referral_partner:{ label: "Referral partner", color: "#8ba0b8", bg: "#131f2d" },
};

// ── FL Prospect data ──────────────────────────────────────────────────────────

export const FL_PROSPECTS: Prospect[] = [
  // Wave 1 — named contacts (ready to contact)
  { id: "fl-sunbeam", name: "Steve Weeks", company: "Sunbeam Properties", email: "sweeks@sunbeam.com", linkedin: "https://www.linkedin.com/in/steve-weeks-sunbeam", portfolioSize: "3M+ sqft / 12 assets", assetTypes: "Industrial / flex multi-tenant", location: "Broward County FL", initialStatus: "to_contact", notes: "President & CEO. One of SE Florida's largest private industrial landlords. Broward industrial — Miramar, Pembroke Park, Sunrise. Insurance repriced post-Ian/Helene. Founder-controlled, makes the calls. sunbeam.com" },
  { id: "fl-easton", name: "Carlos Ghitis", company: "Easton Group Properties", email: "cghitis@eastongroup.com", linkedin: "", portfolioSize: "2M+ sqft / 10 assets", assetTypes: "Industrial / warehouse", location: "Miami-Dade FL", initialStatus: "to_contact", notes: "President & Founder. Hialeah/Medley/Doral industrial corridor. Private family ownership — highest probability of legacy insurance and pre-2022 energy contracts. No institutional board to navigate. eastongroup.com" },
  { id: "fl-butters", name: "Ron Butters", company: "Butters Construction & Development", email: "ron@buttersconstruction.com", linkedin: "https://www.linkedin.com/in/ron-butters-butters-construction", portfolioSize: "8 assets", assetTypes: "Industrial / flex", location: "SE Florida / Boca Raton FL", initialStatus: "to_contact", notes: "President & Founder. Developer-turned-owner — SE Florida flex/industrial, Boca Raton, Palm Beach, Broward fringe. Retained spec stock post-construction; insurance rarely re-tendered. buttersconstruction.com" },
  { id: "fl-continental", name: "Carlos Castellano", company: "Continental Real Estate Companies", email: "ccastellano@continental-realty.com", linkedin: "", portfolioSize: "8 assets", assetTypes: "Industrial / office / mixed-use", location: "Miami-Dade / Broward FL", initialStatus: "to_contact", notes: "CEO. Multi-generation family ownership. Fragmented insurance placement (one broker per asset) + energy contracts not re-tendered as portfolio. Day-to-day principal, no board to navigate. Email inferred (⚠️ verify via Hunter before send). continental-realty.com" },
  { id: "fl-pebb", name: "Ian Weiner", company: "Pebb Enterprises", email: "iweiner@pebbent.com", linkedin: "https://www.linkedin.com/in/ian-weiner-pebb", portfolioSize: "5M+ sqft / 10 assets", assetTypes: "Commercial / industrial / mixed-use", location: "Boca Raton FL", initialStatus: "to_contact", notes: "President & CEO. Boca Raton-based private owner. 5M+ sqft SE Florida and nationally. Actively managed, growth-oriented. Ian is approachable and known for direct communication. Email domain confirmed: @pebbent.com (not pebbenterprises.com) — verified from zfeldman@pebbent.com / askPEBB@pebbent.com on website. pebbenterprises.com" },
  { id: "fl-stiles", name: "Chris Stiles", company: "Stiles Corporation", email: "chris.stiles@stiles.com", linkedin: "https://www.linkedin.com/in/chris-stiles-stiles-corporation", portfolioSize: "10M+ sqft / 40+ buildings", assetTypes: "Industrial / office / mixed-use", location: "Fort Lauderdale FL", initialStatus: "to_contact", notes: "CEO. One of SE Florida's largest private CRE operators. 2nd generation family-controlled. Insurance almost certainly on auto-renewal with regional broker — major Lloyd's specialist placement opportunity. Email pattern confirmed [FirstName].[LastName]@stiles.com via Stiles contact page. stiles.com" },
  { id: "fl-flagler", name: "Tom Dixon", company: "Flagler Development Group", email: "tdixon@flagler.com", linkedin: "", portfolioSize: "8 assets", assetTypes: "Industrial / logistics", location: "Miami / Doral FL", initialStatus: "to_contact", notes: "President (Florida division). Miami airport industrial — Doral/Medley logistics corridor. High energy intensity + significant insurance repricing. Email inferred (⚠️ verify via Hunter — also try t.dixon@flagler.com; flagler.com was down at research time). Contact via flagler.com/contact if undeliverable." },
  { id: "fl-anderson-columbia", name: "Howard Finley", company: "Anderson Columbia Co.", email: "hfinley@andersoncolumbia.com", linkedin: "", portfolioSize: "6 assets", assetTypes: "Industrial / commercial", location: "Lake City / North Florida FL", initialStatus: "to_contact", notes: "North FL owner — outside SE FL market, so insurance/energy almost certainly with regional brokers who don't access specialist markets. Multi-generational family business with long-tenure assets. Email inferred (⚠️ verify via Hunter — andersoncolumbia.com uses contact form only; no public emails). Fall back to contact form if undeliverable." },
  // Wave 1 — slots 9 & 10 filled 2026-03-20 (PRO-178)
  { id: "fl-richland", name: "Jimmy Dunn", company: "Richland Communities", email: "jdunn@richlandcommunities.com", linkedin: "https://www.linkedin.com/in/jimmy-dunn-71b171a", portfolioSize: "4+ assets / 470k+ sqft", assetTypes: "Industrial / flex multi-tenant", location: "Orlando FL", initialStatus: "to_contact", notes: "Senior Director, Florida — day-to-day manager of Richland Investments FL industrial portfolio (private family company; CEO Matt Bray). Orlando holdings: Airport Commerce Center (319k sqft), Chancellor (48k sqft), Boggy Creek, Taft Vineland + Posner Business Center (80k sqft new). Also Jetport Commerce Park Tampa (284k sqft). Multi-decade hold strategy; not a REIT. Email inferred from published j***@richlandcommunities.com pattern (⚠️ verify via Hunter). richlandcommunities.com" },
  { id: "fl-adler", name: "Matthew Adler", company: "Adler Real Estate Partners", email: "madler@adler-partners.com", linkedin: "https://www.linkedin.com/in/mladler", portfolioSize: "3 FL assets / 677k sqft", assetTypes: "Industrial / flex multi-tenant", location: "Tampa Bay / Pinellas FL", initialStatus: "to_contact", notes: "Founder & Managing Principal. Three confirmed Pinellas County assets: 580 Corporate Center (Oldsmar, 376k sqft), Meridian Gateway Center (St Petersburg, 167k sqft), Park West at Gateway (Pinellas Park, 134k sqft — $24.5M acquisition Sep 2022). Company-wide 54 properties / 7.5M sqft; 9 FL assets total. Private family business lineage from 1955. Vertically integrated multi-tenant light industrial — exact Arca profile. Active acquirer. Email inferred from domain (⚠️ verify via Hunter). adler-partners.com" },
  { id: "levy-alan", name: "Alan Levy", company: "Levy Realty Advisors", email: "", linkedin: "https://www.linkedin.com/in/alan-levy-27767313/", portfolioSize: "4M sqft", assetTypes: "Industrial / multi-tenant", location: "Fort Lauderdale FL", initialStatus: "referral_partner", notes: "Founder 1977. 4M sqft industrial South FL. Too large as direct prospect — approach as referral partner. Manages portfolios for smaller private investors who ARE our target." },
  { id: "levy-josh", name: "Josh Levy", company: "Levy Realty Advisors", email: "", linkedin: "https://www.linkedin.com/in/josh-levy-876b7183/", portfolioSize: "4M sqft", assetTypes: "Industrial / multi-tenant", location: "Fort Lauderdale FL", initialStatus: "referral_partner", notes: "COO / son of Alan Levy. Secondary contact for referral partner relationship." },
  { id: "remington", name: "[Find via Sunbiz]", company: "Remington Properties", email: "", linkedin: "", portfolioSize: "14 properties ~$12M", assetTypes: "Medical / office / warehouse", location: "Naples + Fort Myers FL", initialStatus: "research_needed", notes: "Bought 14-property SWFL portfolio for $12M (143k sqft). Exactly our target range. ACTION: search.sunbiz.org → 'Remington Properties' → get principal name → LinkedIn." },
  { id: "lq-commercial", name: "[Find via website]", company: "LQ Commercial Real Estate", email: "", linkedin: "https://www.linkedin.com/company/lqcommercial", portfolioSize: "Brokerage", assetTypes: "Commercial PM", location: "Naples/Fort Myers/Tampa/Orlando FL", initialStatus: "referral_partner", notes: "Manages Remington Properties + other private FL portfolios. Approach for 2% referral programme. lqcre.com" },
  { id: "ipc-naples", name: "[Find on IPC site]", company: "IPC Naples", email: "", linkedin: "https://www.linkedin.com/company/investment-properties-corporation-of-naples", portfolioSize: "Brokerage", assetTypes: "Office / industrial", location: "Naples/Bonita Springs FL", initialStatus: "referral_partner", notes: "50yr+ SWFL commercial brokerage. Know every private commercial owner in SWFL. ipcnaples.com" },
  { id: "redfearn", name: "[Find via LinkedIn]", company: "Redfearn Capital", email: "", linkedin: "", portfolioSize: "est. 10–20 FL assets", assetTypes: "Industrial / commercial", location: "Delray Beach FL", initialStatus: "to_contact", notes: "Delray Beach private CRE firm. Paid $5.8M for Tampa industrial Nov 2024 + $55.6M deal. Verify size — if 3–30 assets: direct prospect. If larger: referral partner." },
  { id: "ian-black", name: "Jag Grewal", company: "Ian Black Real Estate", email: "", linkedin: "", portfolioSize: "Brokerage", assetTypes: "Commercial Sarasota", location: "Sarasota FL", initialStatus: "referral_partner", notes: "Long-established Sarasota commercial brokerage. Brokered $35M in Venice + Lakewood Ranch deals 2025. Knows all private commercial owners in SWFL." },
  { id: "sarasota-investor", name: "[Find via Sunbiz]", company: "Unknown — Israeli investor", email: "", linkedin: "", portfolioSize: "5 parcels $27M", assetTypes: "Industrial / warehouse", location: "Sarasota FL", initialStatus: "research_needed", notes: "Paid $27M for Sarasota industrial on Industrial Blvd (5 parcels, 85% occupied) Aug 2025. Verify via sc-pa.com (Sarasota County PA)." },
  { id: "hillsborough-pa", name: "[Find via PA records]", company: "Tampa Bay owners", email: "", linkedin: "", portfolioSize: "3+ assets each", assetTypes: "Industrial / commercial", location: "Tampa Bay FL", initialStatus: "research_needed", notes: "HIGH YIELD: hcpafl.org → commercial properties by owner → filter non-homesteaded → 3+ Tampa area assets. ~2hrs. Expected: 20–30 names." },
  { id: "miami-dade-pa", name: "[Find via PA records]", company: "Miami-Dade owners", email: "", linkedin: "", portfolioSize: "3+ assets each", assetTypes: "Industrial / mixed-use", location: "Miami-Dade FL", initialStatus: "research_needed", notes: "HIGH YIELD: miamidade.gov/pa → owner search → commercial → 3+ properties. ~2hrs. Expected: 20–30 names." },
  { id: "broward-pa", name: "[Find via PA records]", company: "Broward owners", email: "", linkedin: "", portfolioSize: "3+ assets each", assetTypes: "Industrial / mixed-use", location: "Broward FL", initialStatus: "research_needed", notes: "HIGH YIELD: bcpa.net → non-homesteaded commercial → 3+ same owner. ~90min. Expected: 15–20 names." },
  { id: "palm-beach-naiop", name: "[Find via NAIOP + PA]", company: "Palm Beach owners", email: "", linkedin: "", portfolioSize: "3+ assets each", assetTypes: "Commercial", location: "Palm Beach FL", initialStatus: "research_needed", notes: "naiopsfl.org → member directory + cross-ref pbcgov.com/papa. ~2hrs. Expected: 10–15 names." },
  { id: "orlando-pa", name: "[Find via PA records]", company: "Orlando owners", email: "", linkedin: "", portfolioSize: "3+ assets each", assetTypes: "Industrial / mixed-use", location: "Orlando FL", initialStatus: "research_needed", notes: "ocpafl.org → advanced search → commercial/industrial → 3+ properties same owner. Expected: 15–20 names." },
  { id: "linkedin-miami", name: "[LinkedIn batch 1]", company: "Miami FL owners", email: "", linkedin: "", portfolioSize: "est. 5–15 assets", assetTypes: "Industrial / commercial", location: "Miami FL", initialStatus: "research_needed", notes: "LINKEDIN: Title=(owner OR director OR principal) + Company=(properties OR investments OR industrial) + Location=Miami FL. Headcount 1–20. Exclude CBRE/JLL/Cushman. 2hr session → 20–30 connections." },
  { id: "linkedin-ftl", name: "[LinkedIn batch 2]", company: "Fort Lauderdale owners", email: "", linkedin: "", portfolioSize: "est. 5–15 assets", assetTypes: "Industrial / commercial", location: "Fort Lauderdale FL", initialStatus: "research_needed", notes: "Same LinkedIn filters, Location=Fort Lauderdale / Broward. Add 2nd-degree connections filter." },
  { id: "linkedin-tampa", name: "[LinkedIn batch 3]", company: "Tampa owners", email: "", linkedin: "", portfolioSize: "est. 5–15 assets", assetTypes: "Industrial / commercial", location: "Tampa FL", initialStatus: "research_needed", notes: "Same filters, Location=Tampa. Tampa Bay industrial very active — strong prospect density." },
  { id: "bizjournal-sfla", name: "[BizJournal scan]", company: "South FL deal buyers", email: "", linkedin: "", portfolioSize: "est. 5–20 assets", assetTypes: "Industrial / commercial", location: "South Florida", initialStatus: "research_needed", notes: "bizjournals.com/southflorida → 'acquires commercial' OR 'industrial portfolio' OR 'private investor' 2024–2025. Extract buyers in $3M–$25M range. Cross-ref LinkedIn + Sunbiz." },
  { id: "first-american", name: "[Find via website]", company: "First American Commercial RE", email: "", linkedin: "https://www.linkedin.com/company/first-american-commercial", portfolioSize: "Brokerage", assetTypes: "Commercial advisory", location: "South Florida", initialStatus: "referral_partner", notes: "Commercial brokerage with strong South FL presence. Transact with private owner-operators regularly. Approach for referral programme." },
  { id: "cbc-fl", name: "[Find FL agents on LinkedIn]", company: "Coldwell Banker Commercial FL", email: "", linkedin: "https://www.linkedin.com/company/coldwell-banker-commercial", portfolioSize: "Brokerage", assetTypes: "Commercial", location: "Florida statewide", initialStatus: "referral_partner", notes: "CBC has strong FL private owner-operator client base. Approach individual agents (not HQ) — find FL industrial specialists and pitch referral programme." },
  { id: "svn-fl", name: "[Find FL advisors on LinkedIn]", company: "SVN Commercial Advisory FL", email: "", linkedin: "https://www.linkedin.com/company/svn-commercial-advisory-group", portfolioSize: "Brokerage", assetTypes: "Commercial", location: "Tampa/Orlando/Jacksonville FL", initialStatus: "referral_partner", notes: "SVN works extensively with private investors. Their advisors know exactly who owns industrial/mixed-use in the 5–20 asset range. Approach individually." },
  { id: "cpa-sfla", name: "[Find via LinkedIn]", company: "CPA with CRE clients", email: "", linkedin: "", portfolioSize: "Referral source", assetTypes: "Accounting", location: "South Florida", initialStatus: "referral_partner", notes: "CPAs specialising in real estate clients. LinkedIn: 'CPA' OR 'accountant' + 'real estate' + Florida + firm size 2–20. One CPA with 10 CRE clients = 10 warm prospects." },
  { id: "cre-attorney", name: "[Find via LinkedIn]", company: "CRE attorney", email: "", linkedin: "", portfolioSize: "Referral source", assetTypes: "Legal", location: "South Florida", initialStatus: "referral_partner", notes: "Real estate attorneys handling commercial transactions/leases. LinkedIn: 'real estate attorney' OR 'commercial property lawyer' + Florida. Pitch 2% referral." },
  { id: "mortgage-broker", name: "[Find via LinkedIn]", company: "Commercial mortgage broker FL", email: "", linkedin: "", portfolioSize: "Referral source", assetTypes: "Finance", location: "Florida", initialStatus: "referral_partner", notes: "Commercial mortgage brokers see the full portfolio at loan origination. LinkedIn: 'commercial mortgage' + Florida. Excellent referral source." },
  { id: "naiop-sfla", name: "[Find via naiopsfl.org]", company: "NAIOP South FL member", email: "", linkedin: "", portfolioSize: "est. 5–20 assets", assetTypes: "Industrial / commercial", location: "South Florida", initialStatus: "research_needed", notes: "naiopsfl.org/membership → find owner-operators (not brokers/developers). Look for family names + 'Properties' or 'Holdings'. Almost always private owners." },
  { id: "boma-fl", name: "[Find via boma.org]", company: "BOMA Florida member", email: "", linkedin: "", portfolioSize: "est. 5–30 assets", assetTypes: "Commercial / office / industrial", location: "Florida statewide", initialStatus: "research_needed", notes: "BOMA = Building Owners and Managers Association. Members ARE the owners we target. boma.org → Florida chapters → member directory. ~1hr. Expected: 10–15 names." },
  { id: "shelbourne", name: "[Find via website]", company: "Shelbourne Global Solutions", email: "", linkedin: "", portfolioSize: "est. 5–15 FL assets", assetTypes: "Industrial / commercial", location: "South Florida", initialStatus: "to_contact", notes: "Active private FL commercial investor. Verify portfolio size — if right fit, direct prospect." },
];

// ── SE UK Prospect data ───────────────────────────────────────────────────────

export const SEUK_PROSPECTS: Prospect[] = [
  // Wave 1 — named contacts (ready to contact)
  { id: "seuk-canmoor", name: "Jules Benkert", company: "Canmoor Asset Management", email: "jbenkert@canmoor.com", linkedin: "https://www.linkedin.com/company/canmoor-asset-management-limited", portfolioSize: "10+ assets", assetTypes: "Industrial / warehouse", location: "Kent / Surrey / NW London SE England", initialStatus: "to_contact", notes: "Founder & MD. Active Larkfield Trading Estate, Aylesford Kent. Energy contracts likely legacy-rolled across tenanted units; MEES exposure on older stock. Founder-led, decision-maker reachable. Email pattern confirmed [initial][surname]@canmoor.com (no dot) via Canmoor contact page. canmoor.com" },
  { id: "seuk-barwood", name: "Hugh Elrington", company: "Barwood Capital", email: "h.elrington@barwoodcapital.co.uk", linkedin: "https://www.linkedin.com/in/hugh-elrington", portfolioSize: "8–12 assets", assetTypes: "Industrial / multi-let", location: "Kent SE England", initialStatus: "to_contact", notes: "MD. Kent MLI vehicle — Deacon Industrial Estate (Tunbridge Wells), Eurolink Industrial Estate (Sittingbourne). Multi-tenanted; MEES 2027 hits older units. Active on LinkedIn. barwoodcapital.co.uk" },
  { id: "seuk-caisson", name: "James Burgess", company: "Caisson iO", email: "james.burgess@caisson-io.com", linkedin: "https://www.linkedin.com/in/james-burgess-56677431", portfolioSize: "10+ assets", assetTypes: "Industrial / multi-let", location: "SE England", initialStatus: "to_contact", notes: "Director of Investment Management. JV with Barwood on Kent MLI (Deacon Industrial Estate, Tunbridge Wells). ~£880M of MLI transactions. High volume of tenanted units = insurance aggregation + energy opportunity at scale. caisson-io.com" },
  { id: "seuk-wrenbridge", name: "James Feltham", company: "Wrenbridge Land", email: "jfeltham@wrenbridge.co.uk", linkedin: "https://www.linkedin.com/in/james-feltham-12410750", portfolioSize: "8+ assets", assetTypes: "Industrial / logistics", location: "Dartford / Hemel / Crawley SE England", initialStatus: "to_contact", notes: "Director. Multiple SE England schemes — Dartford X, Waltham X, Hemel Hempstead, High Wycombe, Crawley. Developer retaining asset management on completed schemes; energy infrastructure decisions at practical completion = common overpay point. wrenbridge.co.uk" },
  { id: "seuk-tungsten", name: "Jeff Penman", company: "Tungsten Properties", email: "jeff@tungsten.uk.com", linkedin: "https://www.linkedin.com/in/jeff-penman-08043a30", portfolioSize: "8+ assets", assetTypes: "Industrial / logistics", location: "Surrey / Sussex SE England", initialStatus: "to_contact", notes: "Founder & MD. ~£250M+ active pipeline. Tungsten Park Handcross (A23/M23 corridor, West Sussex), High Wycombe. Active on LinkedIn (500+ connections). MEES angle relevant for retained older stock. Email (⚠️ unconfirmed — public contact is office@tungsten.uk.com; verify jeff@ or try jeff.penman@tungsten.uk.com via Hunter before send). tungsten.uk.com" },
  { id: "seuk-capital-industrial", name: "Roger Montaut", company: "Capital Industrial LLP", email: "r.montaut@capitalindustrial.co.uk", linkedin: "https://www.linkedin.com/in/roger-montaut-0163b17b", portfolioSize: "1,250+ units / 3.4M sqft", assetTypes: "Light industrial / multi-let", location: "Greater London fringe SE England", initialStatus: "to_contact", notes: "Managing Partner. Largest multi-unit light industrial owner inside M25 by unit count. 1,250+ tenancies = significant legacy energy footprint. Insurance aggregation on this scale is a major Lloyd's specialist placement. capitalindustrial.co.uk" },
  { id: "seuk-chancerygate", name: "Richard Bains", company: "Chancerygate", email: "rbains@chancerygate.com", linkedin: "", portfolioSize: "500+ units", assetTypes: "Urban logistics / industrial", location: "Grays Essex SE England", initialStatus: "to_contact", notes: "MD. 35-acre Grays/Thurrock site in active build/let phase — energy infrastructure decisions being made now. ~500 units nationally; insurance and energy are seven-figure cost lines. Private company = responds to direct outreach. Email pattern confirmed [initial][surname]@chancerygate.com via Chancerygate contact page. Direct mobile: 07880 727672. chancerygate.com" },
  { id: "seuk-jaynic", name: "Nic Rumsey", company: "Jaynic Property Group", email: "nic@jaynic.co.uk", linkedin: "https://www.linkedin.com/in/nic-rumsey-64633318", portfolioSize: "12 assets / £390M AUM", assetTypes: "Logistics / industrial", location: "Suffolk / Essex SE England", initialStatus: "to_contact", notes: "MD & Founder. Email confirmed publicly on website. Suffolk Park (Bury St Edmunds), Gateway 14 (Stowmarket). Energy-intensive occupiers (Evri, Skechers, Unipart). Known to respond to quality direct outreach. jaynic.co.uk" },
  { id: "seuk-firethorn", name: "Christopher Webb", company: "Firethorn Trust", email: "cwebb@firethorntrust.com", linkedin: "https://www.linkedin.com/in/christopher-webb-2763652a", portfolioSize: "8+ assets / 4M+ sqft pipeline", assetTypes: "Logistics / last-mile", location: "SE London / Belvedere SE England", initialStatus: "to_contact", notes: "Co-Founder. Belvedere/Bexley last-mile logistics site. Retained asset management mandate post-£550M portfolio sale to Cain International. Multi-occupancy insurance + energy contracts + MEES on older Belvedere industrial stock. Email pattern confirmed [initial][surname]@firethorntrust.com (no dot) via Firethorn contact page. firethorntrust.com" },
  { id: "seuk-gallagher", name: "Stephen Gallagher", company: "Gallagher Group", email: "stephen.gallagher@gallagher-group.co.uk", linkedin: "https://www.linkedin.com/in/stephen-gallagher-2356589", portfolioSize: "10+ assets", assetTypes: "Industrial / commercial", location: "Ashford Kent SE England", initialStatus: "to_contact", notes: "Director (Property Division). Carlton Road Business Park (28 units, Ashford TN23). Group also operates aggregates, concrete plants — high energy spend likely auto-renewed. 50-year Kent family business. College of Estate Management — will understand the case immediately. gallagher-group.co.uk" },
  // Referral agencies — know every private SE logistics owner
  { id: "seuk-lsh", name: "[Find SE industrial team lead]", company: "Lambert Smith Hampton", email: "", linkedin: "https://www.linkedin.com/company/lambert-smith-hampton", portfolioSize: "Agency", assetTypes: "Industrial / logistics", location: "South East England", initialStatus: "referral_partner", notes: "LSH's SE industrial team advises private owner-operators regularly. Their agents know who holds logistics estates in Kent/Surrey/Essex. Approach SE industrial director — pitch 2% referral on savings. lsh.co.uk" },
  { id: "seuk-avison", name: "[Find SE industrial partner]", company: "Avison Young UK", email: "", linkedin: "https://www.linkedin.com/company/avisonyoung", portfolioSize: "Agency", assetTypes: "Industrial / logistics", location: "South East England", initialStatus: "referral_partner", notes: "Avison Young have strong SE logistics practice. Industrial partners advise private landlords on lease renewals, disposals, and acquisitions. Pitch referral on Arca savings commissions. avisonyoung.co.uk" },
  { id: "seuk-colliers", name: "[Find SE industrial director]", company: "Colliers UK", email: "", linkedin: "https://www.linkedin.com/company/colliers-international", portfolioSize: "Agency", assetTypes: "Industrial / logistics", location: "South East England", initialStatus: "referral_partner", notes: "Colliers SE team strong in logistics. Partners know which private investors/family offices hold 5–20 SE industrial assets. Find SE industrial director on LinkedIn. Pitch referral programme." },
  { id: "seuk-geraldeve", name: "[Find logistics team partner]", company: "Gerald Eve", email: "", linkedin: "https://www.linkedin.com/company/gerald-eve", portfolioSize: "Agency", assetTypes: "Logistics / distribution", location: "London + South East", initialStatus: "referral_partner", notes: "Specialist logistics and industrial property advisors. Advise private clients on lease renewals, energy, and asset management — exact overlap with Arca services. geraldeye.co.uk" },
  { id: "seuk-knightfrank", name: "[Find SE industrial head]", company: "Knight Frank UK", email: "", linkedin: "https://www.linkedin.com/company/knight-frank", portfolioSize: "Agency", assetTypes: "Industrial / logistics", location: "South East England", initialStatus: "referral_partner", notes: "KF's SE logistics team advises several private family office portfolios. Good referral source for 5–25 asset holdings. Find head of SE industrial. knightfrank.co.uk/industrial" },
  { id: "seuk-redbrook", name: "[Find director via website]", company: "Redbrook Commercial", email: "", linkedin: "https://www.linkedin.com/company/redbrookproperty", portfolioSize: "Agency", assetTypes: "Industrial / commercial", location: "London / Surrey / Kent / Sussex", initialStatus: "referral_partner", notes: "Specialist commercial agency for industrial in London/Surrey/Kent/Sussex. Strong relationships with private owner-operators in the right size range. redbrookproperty.com" },
  // Trade associations — member directories are direct lists of owners
  { id: "seuk-ukwa", name: "[Search UKWA directory]", company: "UK Warehousing Association members", email: "", linkedin: "https://www.linkedin.com/company/uk-warehousing-association", portfolioSize: "est. 10–30 assets each", assetTypes: "Warehousing / logistics", location: "SE England", initialStatus: "research_needed", notes: "UKWA members often own their warehousing properties. ukwa.org.uk → member directory → filter SE England → identify owner-operators vs pure 3PLs. Expected: 10–20 viable prospects." },
  { id: "seuk-logisticsuk", name: "[Search Logistics UK directory]", company: "Logistics UK members", email: "", linkedin: "https://www.linkedin.com/company/logistics-uk", portfolioSize: "est. 5–20 assets each", assetTypes: "Logistics / distribution", location: "SE England", initialStatus: "research_needed", notes: "logistics.org.uk → member directory → filter 'property owner' type members in SE. Cross-ref with Companies House to confirm property holding company. Expected: 10–15 prospects." },
  // Companies House methodology — most reliable SE UK source
  { id: "seuk-ch-kent", name: "[Owner — search Companies House]", company: "Kent logistics owners (TN/ME/CT)", email: "", linkedin: "", portfolioSize: "3+ assets", assetTypes: "Industrial / logistics", location: "Kent SE England", initialStatus: "research_needed", notes: "METHOD: find-and-update.company-information.service.gov.uk → search 'properties' → filter Kent postcodes TN/ME/CT → SIC 68100 → click directors → find those directing 3+ property companies = our prospect. ~2hrs. Expected: 10–15 names." },
  { id: "seuk-ch-surrey", name: "[Owner — search Companies House]", company: "Surrey logistics owners (GU/KT/RH/CR)", email: "", linkedin: "", portfolioSize: "3+ assets", assetTypes: "Industrial / logistics / mixed-use", location: "Surrey SE England", initialStatus: "research_needed", notes: "Same CH method. Surrey postcodes: GU (Guildford/Woking), KT (Kingston/Esher), RH (Redhill/Reigate), CR (Croydon/Caterham). Strong M25 industrial corridor. Expected: 10–15 names." },
  { id: "seuk-ch-essex", name: "[Owner — search Companies House]", company: "Essex logistics owners (CM/CO/SS/RM)", email: "", linkedin: "", portfolioSize: "3+ assets", assetTypes: "Industrial / logistics", location: "Essex SE England", initialStatus: "research_needed", notes: "Essex postcodes: CM (Chelmsford), CO (Colchester), SS (Southend/Basildon), RM (Romford). Strong logistics corridor along M25/A12. Expected: 10–15 names." },
  { id: "seuk-ch-herts", name: "[Owner — search Companies House]", company: "Hertfordshire logistics owners (AL/HP/SG/WD)", email: "", linkedin: "", portfolioSize: "3+ assets", assetTypes: "Industrial / logistics", location: "Hertfordshire SE England", initialStatus: "research_needed", notes: "Herts postcodes: AL (St Albans/Hatfield), HP (Hemel/Berkhamsted), SG (Stevenage/Hitchin), WD (Watford). M1/M25 junction — major logistics belt. Expected: 8–12 names." },
  { id: "seuk-ch-bucks", name: "[Owner — search Companies House]", company: "Bucks/Berks logistics owners (HP/MK/SL/RG)", email: "", linkedin: "", portfolioSize: "3+ assets", assetTypes: "Industrial / logistics", location: "Bucks / Berks SE England", initialStatus: "research_needed", notes: "HP/MK (Aylesbury/Milton Keynes), SL (Slough), RG (Reading). Slough Trading Estate + M4 corridor = high density of private logistics landlords. Expected: 10–15 names." },
  // LinkedIn prospecting
  { id: "seuk-linkedin-1", name: "[LinkedIn batch 1]", company: "SE England logistics owners", email: "", linkedin: "", portfolioSize: "est. 3–20 assets", assetTypes: "Industrial / logistics", location: "Kent / Surrey / Essex", initialStatus: "research_needed", notes: "LinkedIn: Title=(director OR owner OR founder) + Company=(properties OR estates OR logistics) + Location=Kent OR Surrey OR Essex. Headcount 1–10. Exclude JLL/CBRE/Savills etc. 2hr session → 20–30 leads. Cross-ref Companies House to confirm holdings." },
  { id: "seuk-linkedin-2", name: "[LinkedIn batch 2]", company: "SE England logistics owners", email: "", linkedin: "", portfolioSize: "est. 3–20 assets", assetTypes: "Industrial / logistics", location: "Herts / Bucks / Berks", initialStatus: "research_needed", notes: "Same LinkedIn filters, Location=Hertfordshire OR Buckinghamshire OR Berkshire. M1/M4 corridor very active. Look for 'industrial estate' OR 'business park' in company descriptions." },
  // Property press
  { id: "seuk-insidermedia", name: "[Scan Insider Media]", company: "SE England deal buyers 2024–2025", email: "", linkedin: "", portfolioSize: "est. 3–15 assets", assetTypes: "Industrial / logistics", location: "South East England", initialStatus: "research_needed", notes: "insidermedia.com → South East → 'acquires' OR 'logistics' OR 'industrial estate' 2024–2025. Extract buyers of £2M–£20M SE assets. Cross-ref Companies House. ~2hrs. Expected: 10–15 names." },
  { id: "seuk-egipropertylink", name: "[EGi / Costar scan]", company: "SE industrial transactors", email: "", linkedin: "", portfolioSize: "est. 3–20 assets", assetTypes: "Industrial / logistics", location: "South East England", initialStatus: "research_needed", notes: "EGi (Estates Gazette data) or Costar → SE England industrial transactions 2022–2025 → buyer list → filter private/unknown company names → cross-ref Companies House. Best source for confirmed recent buyers." },
  // Named prospects from known sources
  { id: "seuk-newlands", name: "[Find directors via website]", company: "Newlands Property Group", email: "", linkedin: "https://www.linkedin.com/company/newlands-developments", portfolioSize: "JV — large", assetTypes: "Logistics / industrial development", location: "SE England + Midlands", initialStatus: "to_contact", notes: "JV by Newlands Developments + Forum Partners (March 2024). SE England logistics focus. TOO BIG as direct prospect but connected to private co-investors. Approach for referral / co-investor introductions. Website: newlandsproperty.co.uk" },
  // Professional referrals — accountants and lawyers see the whole portfolio
  { id: "seuk-cre-solicitor", name: "[Find via LinkedIn]", company: "CRE solicitor — SE England", email: "", linkedin: "", portfolioSize: "Referral source", assetTypes: "Legal", location: "South East England", initialStatus: "referral_partner", notes: "Commercial property solicitors handling SE logistics leases/acquisitions. LinkedIn: 'commercial property solicitor' OR 'real estate lawyer' + Kent OR Surrey OR Essex. Firm size 5–30. Pitch 2% referral on Arca commissions." },
  { id: "seuk-chartered-surveyor", name: "[Find via RICS directory]", company: "RICS chartered surveyor — SE industrial", email: "", linkedin: "", portfolioSize: "Referral source", assetTypes: "Surveying / PM", location: "South East England", initialStatus: "referral_partner", notes: "RICS directory → Members → Valuation/Property Management + SE England. Surveyors managing 3–30 asset logistics portfolios know exactly what's below-market. Pitch referral on Arca savings. rics.org/directory" },
];

// ─────────────────────────────────────────────────────────────────────────────

interface ProspectState {
  status: ProspectStatus;
  notes: string;
  linkedinSent: boolean;
  emailSent: boolean;
  touch1SentAt: string; // ISO date or ""
  touch2SentAt: string;
  touch3SentAt: string;
  emailOpened: boolean;
  emailClicked: boolean;
  emailBounced: boolean;
  lastContact: string; // ISO date string or ""
  emailOverride: string;     // discovered email — overrides static data
  linkedinOverride: string;  // discovered LinkedIn URL — overrides static data
}

type PipelineStore = Record<string, ProspectState>;

function defaultState(p: Prospect): ProspectState {
  return { status: p.initialStatus, notes: p.notes, linkedinSent: false, emailSent: false, touch1SentAt: "", touch2SentAt: "", touch3SentAt: "", emailOpened: false, emailClicked: false, emailBounced: false, lastContact: "", emailOverride: "", linkedinOverride: "" };
}

async function fetchStore(market: string): Promise<PipelineStore> {
  try {
    const res = await fetch(`/api/admin/prospect-status?market=${market}`);
    if (!res.ok) return {};
    const map = await res.json();
    const store: PipelineStore = {};
    for (const [key, row] of Object.entries(map as Record<string, {
      status: string; notes?: string | null; linkedinSent: boolean; emailSent: boolean;
      touch1SentAt?: string | null; touch2SentAt?: string | null; touch3SentAt?: string | null;
      emailOpened?: boolean | null; emailClicked?: boolean | null; emailBounced?: boolean | null;
      lastContact?: string | null; emailOverride?: string | null; linkedinOverride?: string | null;
    }>)) {
      store[key] = {
        status: row.status as ProspectStatus,
        notes: row.notes ?? "",
        linkedinSent: row.linkedinSent,
        emailSent: row.emailSent,
        touch1SentAt: row.touch1SentAt ?? "",
        touch2SentAt: row.touch2SentAt ?? "",
        touch3SentAt: row.touch3SentAt ?? "",
        emailOpened: row.emailOpened ?? false,
        emailClicked: row.emailClicked ?? false,
        emailBounced: row.emailBounced ?? false,
        lastContact: row.lastContact ?? "",
        emailOverride: row.emailOverride ?? "",
        linkedinOverride: row.linkedinOverride ?? "",
      };
    }
    return store;
  } catch {
    return {};
  }
}

async function persistState(prospectKey: string, state: ProspectState, market: string): Promise<void> {
  await fetch("/api/admin/prospect-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prospectKey, market, ...state }),
  });
}

const STATUS_ORDER: ProspectStatus[] = [
  "to_contact", "contacted", "demo_booked", "in_negotiation",
  "won", "referral_partner", "research_needed", "lost", "bounced",
];

export function estimateCommission(prospect: Prospect, market: "fl" | "seuk"): number {
  const match = prospect.portfolioSize.match(/\b(\d+)\b/);
  const n = match ? parseInt(match[1]) : 7;
  if (market === "seuk") {
    const isLogistics = /logistics|industrial|warehouse/i.test(prospect.assetTypes);
    return n * (isLogistics ? 18000 : 14000);
  }
  const isIndustrial = /industrial|logistics|warehouse|flex/i.test(prospect.assetTypes);
  return n * (isIndustrial ? 32000 : 28000);
}

function ProspectRow({
  prospect,
  state,
  onUpdate,
  appUrl,
  market,
}: {
  prospect: Prospect;
  state: ProspectState;
  onUpdate: (id: string, patch: Partial<ProspectState>) => void;
  appUrl: string;
  market: "fl" | "seuk";
}) {
  const [expanded, setExpanded] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(state.notes);
  const [inlineNotesEdit, setInlineNotesEdit] = useState(false);
  const [copiedAudit, setCopiedAudit] = useState(false);
  const [copiedDemo, setCopiedDemo] = useState(false);
  const [copiedBook, setCopiedBook] = useState(false);
  const [copiedLiDM, setCopiedLiDM] = useState(false);
  const [copiedLiConnect, setCopiedLiConnect] = useState(false);
  const [copiedT1, setCopiedT1] = useState(false);
  const [copiedT2, setCopiedT2] = useState(false);
  const [copiedT3, setCopiedT3] = useState(false);
  const [copiedReferralPitch, setCopiedReferralPitch] = useState(false);
  const [sendingTouch, setSendingTouch] = useState<null | 1 | 2 | 3>(null);
  const [sentTouch, setSentTouch] = useState<null | 1 | 2 | 3>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const isSeuk = market === "seuk";

  // Generate links
  const assetCountMatch = prospect.portfolioSize.match(/\b(\d+)\b/);
  const assetCount = assetCountMatch ? parseInt(assetCountMatch[1]) : 7;

  const locationLabel = isSeuk
    ? prospect.location.replace(/ SE England$/, "").replace(/ England$/, "").replace(/ UK$/, "")
    : prospect.location.replace(/ FL$/, "").replace(/ Florida$/, "");
  const countryContext = isSeuk ? "SE England" : "Florida";

  const portfolioDesc = `I have ${assetCount} ${prospect.assetTypes.toLowerCase().split("/")[0].trim()} assets in ${locationLabel} ${countryContext}`;
  const auditParams = new URLSearchParams({ portfolio: portfolioDesc });
  if (prospect.email) auditParams.set("email", prospect.email);
  const auditLink = `${appUrl}/audit?${auditParams.toString()}`;

  // Opportunity estimate (rough)
  const oppEst = isSeuk
    ? Math.round(assetCount * 12000 + 60000) // GBP-based rough estimate
    : Math.round(assetCount * (1500 + 4333) + 80000 + Math.min(assetCount, 20) * 2200);
  const demoPortfolio = isSeuk ? "se-logistics" : "fl-mixed";
  const demoParams = new URLSearchParams({ portfolio: demoPortfolio, welcome: "1", opp: String(oppEst) });
  if (prospect.company && !prospect.company.startsWith("[")) demoParams.set("company", prospect.company);
  const demoLink = `${appUrl}/dashboard?${demoParams.toString()}`;

  const bookParams = new URLSearchParams({ assets: String(assetCount) });
  if (prospect.company && !prospect.company.startsWith("[")) bookParams.set("company", prospect.company);
  if (isSeuk) bookParams.set("portfolio", "se-logistics");
  const bookLink = `${appUrl}/book?${bookParams.toString()}`;

  function buildLinkedInDM(): string {
    const firstName = prospect.name.split(" ")[0];
    if (isSeuk) {
      const insLow = Math.round(assetCount * 6_000 * 0.8);
      const insHigh = Math.round(assetCount * 12_000 * 0.8);
      const insRange = insLow >= 1_000_000
        ? `£${(insLow / 1_000_000).toFixed(1)}M–£${(insHigh / 1_000_000).toFixed(1)}M`
        : `£${Math.round(insLow / 1_000)}k–£${Math.round(insHigh / 1_000)}k`;
      return `Hi ${firstName} — sent you a note on the insurance side a couple of days ago.\n\nOne thing worth flagging: most SE industrial owners on auto-renewed policies are 20–28% above where a fresh market placement lands today. On a portfolio like yours that's typically ${insRange} a year sitting on the table.\n\nI can show you a live market comparison in 20 minutes. No obligation.\n\nStill the right person on property decisions?`;
    } else {
      const combLow = Math.round(assetCount * 3_300);
      const combHigh = Math.round(assetCount * 7_000);
      const combRange = combLow >= 1_000_000
        ? `$${(combLow / 1_000_000).toFixed(1)}M–$${(combHigh / 1_000_000).toFixed(1)}M`
        : `$${Math.round(combLow / 1_000)}k–$${Math.round(combHigh / 1_000)}k`;
      return `Hi ${firstName} — sent you a note a couple days ago on insurance and energy.\n\nMost FL commercial owners I speak to are paying 20–30% above market on insurance right now — premiums have repriced hard since 2022. Energy contracts are similar. On ${assetCount} assets, the combined gap is typically ${combRange} a year.\n\nWorth a 20-minute look? I'll run your numbers first.\n\nIan`;
    }
  }

  function copyLinkedInDM() {
    navigator.clipboard.writeText(buildLinkedInDM());
    setCopiedLiDM(true);
    setTimeout(() => setCopiedLiDM(false), 2500);
  }

  function buildLinkedInConnect(): string {
    if (isSeuk) {
      return `Hi ${prospect.name.split(" ")[0]} — I work with SE commercial property owners to identify savings and income they're missing: insurance, energy contracts, 5G/EV/solar income. Commission-only on results. Would value connecting.`;
    }
    return `Hi ${prospect.name.split(" ")[0]} — I work with FL commercial property owners to find savings and income left on the table: insurance retenders, energy contracts, EV/solar/5G income. Commission-only, no fees. Would value connecting.`;
  }

  function copyLinkedInConnect() {
    navigator.clipboard.writeText(buildLinkedInConnect());
    setCopiedLiConnect(true);
    setTimeout(() => setCopiedLiConnect(false), 2500);
  }

  function buildReferralPitch(): string {
    const firstName = prospect.name.split(" ")[0];
    if (isSeuk) {
      return `Hi ${firstName} — I run Arca, which works with SE commercial property owners to surface savings and income they're missing: insurance retenders, energy contract benchmarking, and new income from 5G masts, EV chargers, and solar.\n\nWe operate entirely on commission — no fees to the client unless we deliver results. For agents and advisors like yourself, we pay a referral fee on any engagement that comes through.\n\nGiven you work with commercial property owners in the region, I thought it might be worth a brief call to see if there's a fit. Happy to explain the model.\n\nWould that be useful?`;
    }
    return `Hi ${firstName} — I run Arca, which works with FL commercial property owners to find cost savings and new income they're leaving on the table: insurance retenders, energy contract benchmarking, and income from EV chargers, 5G rooftop leases, and solar.\n\nWe work on a commission-only basis — no upfront cost to clients. For advisors and CPAs like yourself, we pay a referral fee on any client engagement.\n\nGiven your client base likely includes FL commercial property owners, I thought it was worth a quick note. Happy to walk you through the model in 15 minutes.\n\nWould that be useful?`;
  }

  function copyReferralPitch() {
    navigator.clipboard.writeText(buildReferralPitch());
    setCopiedReferralPitch(true);
    setTimeout(() => setCopiedReferralPitch(false), 2500);
  }

  function buildTouchEmail(touch: 1 | 2 | 3): string {
    const firstName = prospect.name.split(" ")[0];
    const n = assetCount;
    const sym = isSeuk ? "£" : "$";
    function fmtK(v: number) {
      if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
      return `${sym}${Math.round(v / 1_000)}k`;
    }
    const bookParams = new URLSearchParams();
    if (prospect.name) bookParams.set("name", prospect.name);
    if (prospect.company && !prospect.company.startsWith("[")) bookParams.set("company", prospect.company);
    bookParams.set("assets", String(n));
    if (isSeuk) bookParams.set("portfolio", "se-logistics");
    const emailForLink = state.emailOverride || prospect.email;
    if (emailForLink) bookParams.set("email", emailForLink);
    const bookUrl = `https://arcahq.ai/book?${bookParams.toString()}`;

    if (touch === 1) {
      if (!isSeuk) {
        const insLow = fmtK(Math.round(n * 1_800));
        const insHigh = fmtK(Math.round(n * 4_000));
        const subject = `Your insurance bill, ${locationLabel} industrial`;
        const body = `${firstName},\n\nQuick question — when did you last retender your commercial insurance across the portfolio?\n\nMost owner-operators I talk to in Florida are sitting on 25–35% overpay vs what's actually available in market right now. On a ${n}-asset portfolio that's typically ${insLow}–${insHigh} a year just sitting on the table.\n\nI run Arca. We audit your insurance, energy, and rent roll against live market benchmarks, then go execute the savings. Commission-only — we earn a percentage of what we save you, nothing if we don't deliver.\n\nWorth a 20-minute look at the numbers? I'll pull your portfolio data before the call so we're not wasting time.\n\nIan`;
        return `SUBJECT: ${subject}\n\n${body}`;
      } else {
        const insLow = fmtK(Math.round(n * 6_000 * 0.8));
        const insHigh = fmtK(Math.round(n * 12_000 * 0.8));
        const subject = `Energy contracts and MEES — ${locationLabel} industrial`;
        const body = `${firstName},\n\nOne thing I see consistently with SE logistics owners right now: energy contracts that haven't been retendered since before the Ofgem price reset — and premises that are sitting at EPC D or below with the MEES 2027 deadline coming.\n\nOn a ${n}-unit industrial portfolio, the combination is typically ${insLow}–${insHigh} a year in avoidable cost. Energy alone, most SE operators I speak to are 15–20% above what a fresh commercial tender returns today.\n\nI run Arca. We audit your portfolio against live market benchmarks — insurance, energy, rent roll, ancillary income — and then go and fix what we find. Commission-only, no upfront fees. We earn on what we deliver.\n\nWorth 20 minutes to see where your portfolio sits? I'll pull your premises data before the call.\n\nIan`;
        return `SUBJECT: ${subject}\n\n${body}`;
      }
    } else if (touch === 2) {
      if (!isSeuk) {
        const rentLow = fmtK(Math.round(n * 2_500));
        const rentHigh = fmtK(Math.round(n * 5_500));
        const incomeLow = fmtK(Math.round(n * 2_000));
        const incomeHigh = fmtK(Math.round(n * 4_000));
        const subject = `Rent roll and income gaps — ${locationLabel} industrial`;
        const body = `${firstName},\n\nSeparate thought — beyond insurance, the other place I consistently see money left on the table in Florida industrials is rent roll and ancillary income.\n\nMost owner-operators I speak to have leases that haven't been reviewed against ERV in 2–3 years. On a ${n}-asset portfolio that's typically ${rentLow}–${rentHigh}/yr in missed uplift. Add EV charging, 5G site rental, and solar — assets that qualify are sitting on another ${incomeLow}–${incomeHigh}/yr uncaptured.\n\nArca audits all of it and then goes and fixes it. Commission-only — we earn on what we deliver, nothing if we don't.\n\nIf you want to see the numbers on your specific portfolio:\n\n${bookUrl}\n\nIan`;
        return `SUBJECT: ${subject}\n\n${body}`;
      } else {
        const rentLow = fmtK(Math.round(n * 3_000 * 0.8));
        const rentHigh = fmtK(Math.round(n * 7_000 * 0.8));
        const incomeLow = fmtK(Math.round(n * 2_000 * 0.8));
        const incomeHigh = fmtK(Math.round(n * 4_500 * 0.8));
        const subject = `Rent reviews and income — ${locationLabel} industrial`;
        const body = `${firstName},\n\nOne more angle worth flagging alongside the energy side — rent reviews and ancillary income.\n\nMost SE logistics owners I speak to have leases running 10–15% below current ERV, with reviews due that haven't been pushed. On a ${n}-unit portfolio that's typically ${rentLow}–${rentHigh}/yr in missed uplift. Then there's the income side — 5G mast sites, EV charging, and solar. SE industrial is well-positioned for all three; most owners haven't had time to run the analysis, which on a ${n}-unit portfolio is another ${incomeLow}–${incomeHigh}/yr sitting uncaptured.\n\nArca audits the full picture — insurance, energy, rent, income — and then goes and executes. Commission-only, no upfront fees.\n\nWorth a look at where your portfolio sits?\n\n${bookUrl}\n\nIan`;
        return `SUBJECT: ${subject}\n\n${body}`;
      }
    } else {
      if (!isSeuk) {
        const caseIns = 22_000;
        const caseEnergy = 11_000;
        const caseIncome = 8_000;
        const caseTotal = caseIns + caseEnergy + caseIncome;
        const subject = `Re: Your insurance bill, ${locationLabel} industrial`;
        const body = `${firstName},\n\nLast one from me.\n\nWe recently ran a portfolio health check for a Florida mixed-use operator — 8 assets, similar profile to yours. Found:\n\n- ${fmtK(caseIns)}/yr insurance overpay (placed with two new carriers, saved 28%)\n- ${fmtK(caseEnergy)}/yr energy savings (switched commercial tariff, live in 3 weeks)\n- Two missed income streams (EV charging + subletting opportunity on one asset)\n\nTotal year-1 uplift: ~${fmtK(caseTotal)}. Our commission: a fraction of that. Their net: the rest.\n\nIf the timing's wrong, no problem. But if you want to see what that looks like for your portfolio specifically:\n\n${bookUrl}\n\nIan Baron\nArca`;
        return `SUBJECT: ${subject}\n\n${body}`;
      } else {
        const caseIns = Math.round(68_000 * 0.8);
        const caseEnergy = Math.round(97_000 * 0.8);
        const caseMast = Math.round(22_000 * 0.8);
        const caseTotal = caseIns + caseEnergy + caseMast;
        const subject = `Re: Energy contracts and MEES — ${locationLabel} industrial`;
        const body = `${firstName},\n\nLast one from me.\n\nWe ran a portfolio health check for an SE England logistics owner last quarter — 12 units, similar profile to yours. Found:\n\n- ${fmtK(caseIns)}/yr insurance overpay (specialist Lloyd's placement, saved 24%)\n- ${fmtK(caseEnergy)}/yr energy savings (retendered commercial tariff, live in 4 weeks)\n- ${fmtK(caseMast)}/yr new mast income (two units with suitable roof access)\n\nTotal year-1 uplift: ~${fmtK(caseTotal)}. Our commission: a fraction of that. Their net: the rest.\n\nIf the timing's wrong, no problem. But if you want to see what that looks like for your portfolio:\n\n${bookUrl}\n\nIan Baron\nArca`;
        return `SUBJECT: ${subject}\n\n${body}`;
      }
    }
  }

  function copyTouchEmail(touch: 1 | 2 | 3) {
    navigator.clipboard.writeText(buildTouchEmail(touch));
    if (touch === 1) { setCopiedT1(true); setTimeout(() => setCopiedT1(false), 2500); }
    else if (touch === 2) { setCopiedT2(true); setTimeout(() => setCopiedT2(false), 2500); }
    else { setCopiedT3(true); setTimeout(() => setCopiedT3(false), 2500); }
  }

  function copyLink(link: string, which: "audit" | "demo" | "book") {
    navigator.clipboard.writeText(link);
    if (which === "audit") { setCopiedAudit(true); setTimeout(() => setCopiedAudit(false), 2000); }
    else if (which === "demo") { setCopiedDemo(true); setTimeout(() => setCopiedDemo(false), 2000); }
    else { setCopiedBook(true); setTimeout(() => setCopiedBook(false), 2000); }
  }

  async function sendOutreach(touch: 1 | 2 | 3) {
    setSendingTouch(touch);
    setSentTouch(null);
    setSendError(null);
    try {
      const res = await fetch("/api/admin/send-cold-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.emailOverride || prospect.email,
          firstName: prospect.name.split(" ")[0],
          company: prospect.company.startsWith("[") ? null : prospect.company,
          assetCount,
          area: locationLabel,
          touch,
          market,
          prospectKey: prospect.id,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed");
      }
      setSentTouch(touch);
      const today = new Date().toISOString().split("T")[0];
      const touchPatch: Partial<ProspectState> = {
        emailSent: true,
        lastContact: today,
        ...(touch === 1 && { touch1SentAt: today, status: state.status === "to_contact" ? "contacted" : state.status }),
        ...(touch === 2 && { touch2SentAt: today }),
        ...(touch === 3 && { touch3SentAt: today }),
      };
      onUpdate(prospect.id, touchPatch);
      setTimeout(() => setSentTouch(null), 3000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSendingTouch(null);
    }
  }

  const isActionable = !["referral_partner", "research_needed"].includes(state.status);

  // Email verification warning: notes contain ⚠️/verify and no emailOverride set
  const emailUnverified =
    prospect.email &&
    !state.emailOverride &&
    /⚠️|verify/i.test(prospect.notes);

  // Sequence progress: which touches have been sent
  const seqDots = [
    { t: 1, sent: !!state.touch1SentAt, date: state.touch1SentAt },
    { t: 2, sent: !!state.touch2SentAt, date: state.touch2SentAt },
    { t: 3, sent: !!state.touch3SentAt, date: state.touch3SentAt },
  ];

  // Follow-up due badge: smart per-touch tracking
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const t1Age = state.touch1SentAt ? now - new Date(state.touch1SentAt).getTime() : null;
  const t2Age = state.touch2SentAt ? now - new Date(state.touch2SentAt).getTime() : null;
  const followUpLabel =
    state.touch2SentAt && !state.touch3SentAt && t2Age !== null && t2Age > 4 * DAY ? "T3 due" :
    state.touch1SentAt && !state.touch2SentAt && t1Age !== null && t1Age > 4 * DAY ? "T2 due" :
    // Fallback for legacy emailSent without per-touch data
    !state.touch1SentAt && state.status === "contacted" && state.lastContact &&
      (now - new Date(state.lastContact).getTime()) > 5 * DAY ? "Follow up" : null;

  return (
    <div
      className="border-b transition-colors"
      style={{ borderColor: "#1a2d45", backgroundColor: expanded ? "#0d1825" : "transparent" }}
    >
      {/* Main row */}
      <div
        className="grid items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#0d1825] transition-colors"
        style={{ gridTemplateColumns: "1fr 160px 140px auto" }}
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Name / company */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium truncate" style={{ color: isActionable ? "#e8eef5" : "#8ba0b8" }}>
              {prospect.name}
            </div>
            {followUpLabel && (
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: "#F5A94A22", color: "#F5A94A", border: "1px solid #F5A94A40" }}>
                {followUpLabel}
              </span>
            )}
            {emailUnverified && (
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: "#cc1a1a22", color: "#CC1A1A", border: "1px solid #CC1A1A40" }} title="Email is inferred — verify via Hunter.io before sending">
                ⚠ Verify email
              </span>
            )}
            {state.emailOpened && (
              <span title="Email opened" className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: "#2a1e08", color: "#F5A94A", border: "1px solid #F5A94A40" }}>
                👁
              </span>
            )}
            {state.emailClicked && (
              <span title="Clicked a link" className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: "#0e1a36", color: "#1647E8", border: "1px solid #1647E840" }}>
                🔗
              </span>
            )}
            {state.emailBounced && (
              <span title="Email bounced — address may be invalid" className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: "#2d0a0a", color: "#ef4444", border: "1px solid #ef444440" }}>
                ✕ bounced
              </span>
            )}
            {emailUnverified && (
              <span title="Email unverified — check Hunter.io before sending" className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: "#CC1A1A22", color: "#CC1A1A", border: "1px solid #CC1A1A40" }}>
                ⚠ verify
              </span>
            )}
          </div>
          <div className="text-xs truncate mt-0.5" style={{ color: "#5a7a96" }}>{prospect.company}</div>
          {/* Inline notes quick-edit */}
          <div
            className="mt-1"
            onClick={(e) => { e.stopPropagation(); setInlineNotesEdit(true); setNotesVal(state.notes); }}
          >
            {inlineNotesEdit ? (
              <textarea
                autoFocus
                value={notesVal}
                onChange={(e) => setNotesVal(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => { onUpdate(prospect.id, { notes: notesVal }); setInlineNotesEdit(false); }}
                rows={2}
                className="w-full rounded px-2 py-1 text-xs resize-none outline-none"
                style={{ backgroundColor: "#0B1622", border: "1px solid #0A8A4C40", color: "#e8eef5" }}
              />
            ) : (
              <span
                className="text-xs cursor-text"
                style={{ color: state.notes ? "#3d5a72" : "#2a3d52", fontStyle: state.notes ? "normal" : "italic" }}
              >
                {state.notes
                  ? state.notes.slice(0, 80) + (state.notes.length > 80 ? "…" : "")
                  : "+ add note"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {seqDots.map(({ t, sent, date }) => (
              <span key={t} title={sent ? `T${t} sent ${date}` : `T${t} not sent`} className="text-[10px] px-1 rounded" style={{ backgroundColor: sent ? "#0A8A4C22" : "#1a2d45", color: sent ? "#0A8A4C" : "#3d5a72", border: `1px solid ${sent ? "#0A8A4C40" : "#1a2d4580"}` }}>T{t}</span>
            ))}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: "#3d5a72" }}>{prospect.location}</div>
        </div>

        {/* Portfolio */}
        <div className="text-xs" style={{ color: "#5a7a96", paddingTop: "2px" }}>
          <div>{prospect.portfolioSize}</div>
          <div className="mt-0.5" style={{ color: "#3d5a72" }}>{prospect.assetTypes.split("/")[0].trim()}</div>
          {!["referral_partner", "research_needed"].includes(state.status) && (
            <div className="mt-0.5 font-semibold" style={{ color: "#3d5a72" }}>
              ~{market === "seuk" ? "£" : "$"}{Math.round(estimateCommission(prospect, market) / 1000)}k/yr
            </div>
          )}
        </div>

        {/* Status */}
        <div onClick={(e) => e.stopPropagation()}>
          <select
            value={state.status}
            onChange={(e) => onUpdate(prospect.id, { status: e.target.value as ProspectStatus })}
            className="text-xs rounded-lg px-2 py-1.5 outline-none w-full"
            style={{
              backgroundColor: STATUS_CONFIG[state.status].bg,
              color: STATUS_CONFIG[state.status].color,
              border: `1px solid ${STATUS_CONFIG[state.status].color}40`,
            }}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s} style={{ backgroundColor: "#0B1622", color: STATUS_CONFIG[s].color }}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </div>

        {/* Expand chevron */}
        <div className="pt-1.5 shrink-0" style={{ color: "#3d5a72" }}>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
          >
            <path d="M2 5L7 9L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Touch tracking */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.linkedinSent}
                onChange={(e) => onUpdate(prospect.id, { linkedinSent: e.target.checked })}
                className="rounded"
                style={{ accentColor: "#0A8A4C" }}
              />
              <span className="text-xs" style={{ color: "#5a7a96" }}>LinkedIn connected</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.emailSent}
                onChange={(e) => onUpdate(prospect.id, { emailSent: e.target.checked })}
                className="rounded"
                style={{ accentColor: "#0A8A4C" }}
              />
              <span className="text-xs" style={{ color: "#5a7a96" }}>Email / DM sent</span>
              {state.emailOpened && (
                <span
                  title="Email opened"
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "#2a1e08", color: "#F5A94A", border: "1px solid #F5A94A44" }}
                >
                  👁 Opened
                </span>
              )}
              {state.emailClicked && (
                <span
                  title="Clicked book link"
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C44" }}
                >
                  🔗 Clicked
                </span>
              )}
              {state.emailBounced && (
                <span title="Email bounced — address may be invalid" className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: "#2d0a0a", color: "#ef4444", border: "1px solid #ef444440" }}>
                  ✕ bounced
                </span>
              )}
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs" style={{ color: "#5a7a96" }}>Last contact:</span>
              <input
                type="date"
                value={state.lastContact}
                onChange={(e) => onUpdate(prospect.id, { lastContact: e.target.value })}
                className="text-xs rounded-lg px-2 py-1 outline-none"
                style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#8ba0b8" }}
              />
            </div>
          </div>

          {/* Send email buttons — only for direct prospects, not referral partners */}
          {state.status !== "referral_partner" && (
            <div className="flex flex-wrap items-center gap-2">
              {([1, 2, 3] as const).map((touch) => {
                const isSending = sendingTouch === touch;
                const wasSent = sentTouch === touch;
                const copied = touch === 1 ? copiedT1 : touch === 2 ? copiedT2 : copiedT3;
                const sentAt = touch === 1 ? state.touch1SentAt : touch === 2 ? state.touch2SentAt : state.touch3SentAt;
                const alreadySent = !!sentAt;
                return (
                  <div key={touch} className="flex items-center gap-1.5">
                    <button
                      onClick={() => sendOutreach(touch)}
                      disabled={!!sendingTouch || !prospect.email}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-40"
                      style={{
                        backgroundColor: wasSent ? "#0a8a4c22" : alreadySent ? "#1a2d45" : "#111e2e",
                        color: wasSent ? "#0A8A4C" : alreadySent ? "#5a7a96" : "#e8eef5",
                        border: `1px solid ${wasSent ? "#0A8A4C" : alreadySent ? "#2a4060" : "#1a2d45"}`,
                      }}
                      title={!prospect.email ? "No email address — add before sending" : emailUnverified ? "Email unverified — add confirmed address in email override before sending" : alreadySent ? `Sent ${sentAt} — click to resend` : undefined}
                    >
                      {isSending ? "Sending…" : wasSent ? `Touch ${touch} sent ✓` : alreadySent ? `T${touch} ✓ ${sentAt}` : `Send Touch ${touch}`}
                    </button>
                    <button
                      onClick={() => copyTouchEmail(touch)}
                      className="text-xs px-2 py-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{
                        backgroundColor: copied ? "#0a8a4c22" : "#0B1622",
                        color: copied ? "#0A8A4C" : "#3d5a72",
                        border: `1px solid ${copied ? "#0A8A4C40" : "#1a2d45"}`,
                      }}
                      title="Copy email text to clipboard"
                    >
                      {copied ? "Copied ✓" : "Copy email"}
                    </button>
                  </div>
                );
              })}
              {sendError && (
                <span className="text-xs" style={{ color: "#CC1A1A" }}>{sendError}</span>
              )}
              {!prospect.email && (
                <span className="text-xs" style={{ color: "#3d5a72" }}>No email on record</span>
              )}
            </div>
          )}

          {/* LinkedIn */}
          <div className="flex flex-wrap items-center gap-3">
            {(state.linkedinOverride || (prospect.linkedin && !prospect.linkedin.startsWith("find"))) && (
              <a
                href={state.linkedinOverride || prospect.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs hover:opacity-80"
                style={{ color: "#1647E8" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn →
              </a>
            )}
            <button
              onClick={copyLinkedInDM}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: copiedLiDM ? "#1647e822" : "#111e2e",
                color: copiedLiDM ? "#1647E8" : "#5a7a96",
                border: `1px solid ${copiedLiDM ? "#1647E840" : "#1a2d45"}`,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              {copiedLiDM ? "Copied ✓" : "Copy Touch 2 DM"}
            </button>
            <button
              onClick={copyLinkedInConnect}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: copiedLiConnect ? "#1647e822" : "#111e2e",
                color: copiedLiConnect ? "#1647E8" : "#3d5a72",
                border: `1px solid ${copiedLiConnect ? "#1647E840" : "#1a2d45"}`,
              }}
            >
              {copiedLiConnect ? "Copied ✓" : "Copy connect note"}
            </button>
            {state.status === "referral_partner" && (
              <button
                onClick={copyReferralPitch}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: copiedReferralPitch ? "#8b5cf622" : "#111e2e",
                  color: copiedReferralPitch ? "#8b5cf6" : "#8b5cf6",
                  border: `1px solid ${copiedReferralPitch ? "#8b5cf640" : "#2a1a45"}`,
                }}
              >
                {copiedReferralPitch ? "Copied ✓" : "Copy referral pitch"}
              </button>
            )}
          </div>

          {/* Contact overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>Email override</label>
              <input
                type="email"
                value={state.emailOverride}
                onChange={(e) => onUpdate(prospect.id, { emailOverride: e.target.value })}
                placeholder={prospect.email || "Enter discovered email…"}
                className="w-full rounded-lg px-3 py-1.5 text-xs outline-none font-mono"
                style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "#5a7a96" }}>LinkedIn override</label>
              <input
                type="text"
                value={state.linkedinOverride}
                onChange={(e) => onUpdate(prospect.id, { linkedinOverride: e.target.value })}
                placeholder={prospect.linkedin || "Enter LinkedIn URL…"}
                className="w-full rounded-lg px-3 py-1.5 text-xs outline-none font-mono"
                style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: "#5a7a96" }}>Notes</span>
              {!editNotes && (
                <button
                  onClick={() => { setNotesVal(state.notes); setEditNotes(true); }}
                  className="text-xs hover:opacity-70"
                  style={{ color: "#3d5a72" }}
                >
                  Edit
                </button>
              )}
            </div>
            {editNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-xs resize-none outline-none"
                  style={{ backgroundColor: "#0B1622", border: "1px solid #0A8A4C", color: "#e8eef5" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { onUpdate(prospect.id, { notes: notesVal }); setEditNotes(false); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditNotes(false)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: "#111e2e", color: "#5a7a96", border: "1px solid #1a2d45" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: "#8ba0b8" }}>
                {state.notes || <span style={{ color: "#3d5a72" }}>No notes yet.</span>}
              </p>
            )}
          </div>

          {/* Outreach links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <span className="text-xs flex-1 truncate font-mono" style={{ color: "#3d5a72" }}>
                {auditLink.replace(/^https?:\/\/[^/]+/, "")}
              </span>
              <button
                onClick={() => copyLink(auditLink, "audit")}
                className="text-xs font-medium shrink-0 hover:opacity-80"
                style={{ color: copiedAudit ? "#0A8A4C" : "#5a7a96" }}
              >
                {copiedAudit ? "Copied ✓" : "Audit link"}
              </button>
            </div>
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <span className="text-xs flex-1 truncate font-mono" style={{ color: "#3d5a72" }}>
                {bookLink.replace(/^https?:\/\/[^/]+/, "")}
              </span>
              <button
                onClick={() => copyLink(bookLink, "book")}
                className="text-xs font-medium shrink-0 hover:opacity-80"
                style={{ color: copiedBook ? "#0A8A4C" : "#5a7a96" }}
              >
                {copiedBook ? "Copied ✓" : "Book link"}
              </button>
            </div>
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <span className="text-xs flex-1 truncate font-mono" style={{ color: "#3d5a72" }}>
                {demoLink.replace(/^https?:\/\/[^/]+/, "")}
              </span>
              <button
                onClick={() => copyLink(demoLink, "demo")}
                className="text-xs font-medium shrink-0 hover:opacity-80"
                style={{ color: copiedDemo ? "#0A8A4C" : "#5a7a96" }}
              >
                {copiedDemo ? "Copied ✓" : "Demo link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type WaveResult = { name: string; company: string; ok: boolean; error?: string };

export function ProspectPipeline({ market }: { market: "fl" | "seuk" }) {
  const PROSPECTS = market === "seuk" ? SEUK_PROSPECTS : FL_PROSPECTS;

  const [store, setStore] = useState<PipelineStore>({});
  const [filter, setFilter] = useState<ProspectStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showIncomplete, setShowIncomplete] = useState(false);

  // Batch wave-1 sender
  const [waveConfirm, setWaveConfirm] = useState(false);
  const [waveSending, setWaveSending] = useState(false);
  const [waveProgress, setWaveProgress] = useState<{ done: number; total: number } | null>(null);
  const [waveResults, setWaveResults] = useState<WaveResult[] | null>(null);
  const [autoScheduleFollowUps, setAutoScheduleFollowUps] = useState(true);

  // Batch Touch 2 sender
  const [touch2Confirm, setTouch2Confirm] = useState(false);
  const [touch2Sending, setTouch2Sending] = useState(false);
  const [touch2Progress, setTouch2Progress] = useState<{ done: number; total: number } | null>(null);
  const [touch2Results, setTouch2Results] = useState<WaveResult[] | null>(null);

  // Batch Touch 3 sender
  const [touch3Confirm, setTouch3Confirm] = useState(false);
  const [touch3Sending, setTouch3Sending] = useState(false);
  const [touch3Progress, setTouch3Progress] = useState<{ done: number; total: number } | null>(null);
  const [touch3Results, setTouch3Results] = useState<WaveResult[] | null>(null);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://arcahq.ai");

  useEffect(() => {
    setStore({});
    fetchStore(market).then(setStore);
  }, [market]);

  function update(id: string, patch: Partial<ProspectState>) {
    setStore((prev) => {
      const prospect = PROSPECTS.find((p) => p.id === id)!;
      const current = prev[id] ?? defaultState(prospect);
      const next: ProspectState = { ...current, ...patch };
      persistState(id, next, market);
      return { ...prev, [id]: next };
    });
  }

  // Generic batch sender
  async function fireBatch(
    touch: 1 | 2 | 3,
    targets: Prospect[],
    setSending: (v: boolean) => void,
    setProgress: (v: { done: number; total: number } | null) => void,
    setResults: (v: WaveResult[] | null) => void,
    setConfirm: (v: boolean) => void,
  ) {
    if (!targets.length) return;
    setSending(true);
    setProgress({ done: 0, total: targets.length });
    setResults(null);
    const results: WaveResult[] = [];
    const today = new Date().toISOString().split("T")[0];
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      const s = store[p.id] ?? defaultState(p);
      const email = s.emailOverride || p.email;
      const assetCountMatch = p.portfolioSize.match(/\b(\d+)\b/);
      const assetCount = assetCountMatch ? parseInt(assetCountMatch[1]) : 7;
      const locationLabel = market === "seuk"
        ? p.location.replace(/ SE England$/, "").replace(/ England$/, "").replace(/ UK$/, "")
        : p.location.replace(/ FL$/, "").replace(/ Florida$/, "");
      try {
        const res = await fetch("/api/admin/send-cold-outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            firstName: p.name.split(" ")[0],
            company: p.company.startsWith("[") ? null : p.company,
            assetCount,
            area: locationLabel,
            touch,
            market,
            prospectKey: p.id,
            ...(touch === 1 && { autoSchedule: autoScheduleFollowUps }),
          }),
        });
        const ok = res.ok;
        results.push({ name: p.name, company: p.company, ok, error: ok ? undefined : (await res.json().catch(() => ({}))).error });
        if (ok) {
          update(p.id, {
            emailSent: true,
            lastContact: today,
            ...(touch === 1 && { touch1SentAt: today, status: s.status === "to_contact" ? "contacted" : s.status }),
            ...(touch === 2 && { touch2SentAt: today }),
            ...(touch === 3 && { touch3SentAt: today }),
          });
        }
      } catch (e) {
        results.push({ name: p.name, company: p.company, ok: false, error: String(e) });
      }
      setProgress({ done: i + 1, total: targets.length });
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 400));
    }
    setSending(false);
    setResults(results);
    setConfirm(false);
  }

  function fireWave1() {
    return fireBatch(1, wave1Ready, setWaveSending, setWaveProgress, setWaveResults, setWaveConfirm);
  }

  // Prospects ready for wave-1 (to_contact, have email, T1 not yet sent)
  const wave1Ready = PROSPECTS.filter((p) => {
    const s = store[p.id] ?? defaultState(p);
    const email = s.emailOverride || p.email;
    return s.status === "to_contact" && email && !s.touch1SentAt;
  });

  // Prospects ready for Touch 2 (T1 sent + age >= 4 days, T2 not sent, have email)
  const DAY = 24 * 60 * 60 * 1000;
  const touch2Ready = PROSPECTS.filter((p) => {
    const s = store[p.id] ?? defaultState(p);
    if (!s.touch1SentAt || s.touch2SentAt) return false;
    if (!s.emailOverride && !p.email) return false;
    return Date.now() - new Date(s.touch1SentAt).getTime() >= 4 * DAY;
  });

  // Prospects ready for Touch 3 (T2 sent + age >= 4 days, T3 not sent, have email)
  const touch3Ready = PROSPECTS.filter((p) => {
    const s = store[p.id] ?? defaultState(p);
    if (!s.touch2SentAt || s.touch3SentAt) return false;
    if (!s.emailOverride && !p.email) return false;
    return Date.now() - new Date(s.touch2SentAt).getTime() >= 4 * DAY;
  });

  // Stats
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = PROSPECTS.filter((p) => (store[p.id] ?? defaultState(p)).status === s).length;
    return acc;
  }, {} as Record<ProspectStatus, number>);

  const actionable = (counts.to_contact ?? 0) + (counts.contacted ?? 0) + (counts.demo_booked ?? 0) + (counts.in_negotiation ?? 0);

  const sym = market === "seuk" ? "£" : "$";
  const pipelineValue = PROSPECTS
    .filter((p) => !["lost", "research_needed"].includes((store[p.id] ?? defaultState(p)).status))
    .reduce((sum, p) => sum + estimateCommission(p, market), 0);
  const pipelineStr = pipelineValue >= 1_000_000
    ? `~${sym}${(pipelineValue / 1_000_000).toFixed(1)}M`
    : `~${sym}${Math.round(pipelineValue / 1_000)}k`;

  const openedCount = PROSPECTS.filter((p) => (store[p.id] ?? defaultState(p)).emailOpened).length;
  const clickedCount = PROSPECTS.filter((p) => (store[p.id] ?? defaultState(p)).emailClicked).length;
  const estCommFmt = (v: number) => v >= 1_000_000 ? `${sym}${(v / 1_000_000).toFixed(1)}M` : `${sym}${Math.round(v / 1_000)}k`;

  function isIncomplete(p: Prospect) {
    return p.name.startsWith("[") || !p.email;
  }

  const filtered = PROSPECTS.filter((p) => {
    const s = (store[p.id] ?? defaultState(p)).status;
    if (filter !== "all" && s !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.assetTypes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const visibleProspects = search ? filtered : filtered.filter((p) => showIncomplete || !isIncomplete(p));
  const hiddenCount = search ? 0 : filtered.filter(isIncomplete).length;

  return (
    <div className="space-y-6">
      {/* Pipeline summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Actionable", display: String(actionable), color: "#F5A94A" },
          { label: "Demo booked", display: String(counts.demo_booked ?? 0), color: "#8b5cf6" },
          { label: "Won", display: String(counts.won ?? 0), color: "#0A8A4C" },
          { label: "Referral partners", display: String(counts.referral_partner ?? 0), color: "#8ba0b8" },
          { label: "Pipeline value", display: pipelineStr, color: "#1647E8" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div
              className="text-2xl font-bold mb-0.5"
              style={{
                color: s.color,
                fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
              }}
            >
              {s.display}
            </div>
            <div className="text-xs" style={{ color: "#5a7a96" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Summary line */}
      <div className="text-xs px-1" style={{ color: "#5a7a96" }}>
        <span style={{ color: "#F5A94A" }}>{counts.to_contact ?? 0} to contact</span>
        {" · "}
        <span>
          {counts.contacted ?? 0} contacted
          {(openedCount > 0 || clickedCount > 0) && (
            <span style={{ color: "#3d5a72" }}> ({openedCount} opened, {clickedCount} clicked)</span>
          )}
        </span>
        {" · "}
        <span style={{ color: "#8b5cf6" }}>{counts.demo_booked ?? 0} demo booked</span>
        {" · "}
        <span>Est. commission: <span style={{ color: "#0A8A4C" }}>{estCommFmt(pipelineValue)}</span></span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prospects…"
          className="rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{
            backgroundColor: "#0d1825",
            border: "1px solid #1a2d45",
            color: "#e8eef5",
            minWidth: "180px",
          }}
        />
        {(["all", "to_contact", "contacted", "demo_booked", "won"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              backgroundColor: filter === s ? (s === "all" ? "#1a2d45" : STATUS_CONFIG[s].bg) : "transparent",
              color: filter === s ? (s === "all" ? "#e8eef5" : STATUS_CONFIG[s].color) : "#5a7a96",
              border: `1px solid ${filter === s ? (s === "all" ? "#1a2d45" : STATUS_CONFIG[s].color + "60") : "#1a2d45"}`,
            }}
          >
            {s === "all" ? `All (${PROSPECTS.length})` : `${STATUS_CONFIG[s].label} (${counts[s] ?? 0})`}
          </button>
        ))}
        {wave1Ready.length > 0 && !waveResults && (
          <button
            onClick={() => setWaveConfirm(true)}
            disabled={waveSending}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#0A8A4C", color: "#fff", border: "1px solid #0A8A4C" }}
          >
            {waveSending && waveProgress
              ? `Sending… ${waveProgress.done}/${waveProgress.total}`
              : `Fire Wave 1 — Touch 1 (${wave1Ready.length})`}
          </button>
        )}
        {touch2Ready.length > 0 && !touch2Results && (
          <button
            onClick={() => setTouch2Confirm(true)}
            disabled={touch2Sending}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#1647E8", color: "#fff", border: "1px solid #1647E8" }}
          >
            {touch2Sending && touch2Progress
              ? `Sending… ${touch2Progress.done}/${touch2Progress.total}`
              : `Fire Touch 2 (${touch2Ready.length})`}
          </button>
        )}
        {touch3Ready.length > 0 && !touch3Results && (
          <button
            onClick={() => setTouch3Confirm(true)}
            disabled={touch3Sending}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#8b5cf6", color: "#fff", border: "1px solid #8b5cf6" }}
          >
            {touch3Sending && touch3Progress
              ? `Sending… ${touch3Progress.done}/${touch3Progress.total}`
              : `Fire Touch 3 (${touch3Ready.length})`}
          </button>
        )}
      </div>

      {/* Wave-1 confirmation modal */}
      {waveConfirm && !waveSending && (
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: "#111e2e", border: "1px solid #F5A94A40" }}>
          <div>
            <div className="text-sm font-semibold mb-1" style={{ color: "#F5A94A" }}>
              Fire Wave 1 — Touch 1 ({wave1Ready.length} prospects)
            </div>
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              This will send Touch 1 emails to all <strong style={{ color: "#e8eef5" }}>{wave1Ready.length}</strong> prospects currently in &quot;To contact&quot; status who have an email address and haven&apos;t received Touch 1 yet. They will be automatically moved to &quot;Contacted&quot;.
            </div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {wave1Ready.map((p) => {
              const s = store[p.id] ?? defaultState(p);
              const email = s.emailOverride || p.email;
              const unverified = !s.emailOverride && /⚠️|verify/i.test(p.notes);
              return (
                <div key={p.id} className="flex items-center gap-2 text-xs py-1 border-b" style={{ borderColor: "#1a2d45" }}>
                  <span style={{ color: "#e8eef5" }}>{p.name}</span>
                  <span style={{ color: "#5a7a96" }}>·</span>
                  <span style={{ color: "#5a7a96" }}>{p.company}</span>
                  <span className="font-mono ml-auto shrink-0" style={{ color: unverified ? "#F5A94A" : "#3d5a72" }}>
                    {unverified && "⚠ "}{email}
                  </span>
                </div>
              );
            })}
          </div>
          {wave1Ready.some((p) => { const s = store[p.id] ?? defaultState(p); return !s.emailOverride && /⚠️|verify/i.test(p.notes); }) && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#F5A94A11", color: "#F5A94A", border: "1px solid #F5A94A30" }}>
              ⚠ Some emails are marked unverified. Verify via Hunter.io before sending.
            </div>
          )}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScheduleFollowUps}
              onChange={(e) => setAutoScheduleFollowUps(e.target.checked)}
              className="rounded"
              style={{ accentColor: "#0A8A4C", width: "14px", height: "14px" }}
            />
            <span className="text-xs" style={{ color: "#8ba0b8" }}>
              Auto-schedule Touch 2 (+4 days) and Touch 3 (+8 days) via email queue
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={fireWave1}
              className="text-xs px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Confirm — Send {wave1Ready.length} emails{autoScheduleFollowUps ? " + schedule T2/T3" : ""}
            </button>
            <button
              onClick={() => setWaveConfirm(false)}
              className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: "transparent", color: "#5a7a96", border: "1px solid #1a2d45" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Wave-1 progress bar */}
      {waveSending && waveProgress && (
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
          <div className="flex items-center justify-between text-xs" style={{ color: "#8ba0b8" }}>
            <span>Sending Touch 1 emails…</span>
            <span>{waveProgress.done} / {waveProgress.total}</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "#1a2d45" }}>
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(waveProgress.done / waveProgress.total) * 100}%`, backgroundColor: "#0A8A4C" }}
            />
          </div>
        </div>
      )}

      {/* Wave-1 results */}
      {waveResults && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>
              Wave 1 sent — {waveResults.filter((r) => r.ok).length}/{waveResults.length} delivered
              {autoScheduleFollowUps && waveResults.some((r) => r.ok) && (
                <span className="ml-2 text-xs font-normal" style={{ color: "#5a7a96" }}>· T2/T3 queued in email scheduler</span>
              )}
            </div>
            <button onClick={() => setWaveResults(null)} className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>Dismiss</button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {waveResults.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span style={{ color: r.ok ? "#0A8A4C" : "#CC1A1A" }}>{r.ok ? "✓" : "✗"}</span>
                <span style={{ color: "#e8eef5" }}>{r.name}</span>
                <span style={{ color: "#5a7a96" }}>· {r.company}</span>
                {!r.ok && <span className="ml-auto" style={{ color: "#CC1A1A" }}>{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prospect list */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
        {/* Header */}
        <div
          className="hidden sm:grid px-4 py-2.5 text-xs font-medium"
          style={{
            gridTemplateColumns: "1fr 160px 140px auto",
            color: "#5a7a96",
            backgroundColor: "#0d1825",
            borderBottom: "1px solid #1a2d45",
          }}
        >
          <span>Prospect</span>
          <span>Portfolio</span>
          <span>Status</span>
          <span />
        </div>

        <div style={{ backgroundColor: "#111e2e" }}>
          {visibleProspects.length === 0 && hiddenCount === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "#3d5a72" }}>
              No prospects match this filter.
            </div>
          ) : (
            visibleProspects.map((p) => (
              <ProspectRow
                key={p.id}
                prospect={p}
                state={store[p.id] ?? defaultState(p)}
                onUpdate={update}
                appUrl={appUrl}
                market={market}
              />
            ))
          )}
          {!showIncomplete && hiddenCount > 0 && (
            <button
              onClick={() => setShowIncomplete(true)}
              className="w-full px-4 py-3 text-xs text-left transition-colors hover:bg-[#0d1825]"
              style={{ color: "#3d5a72", borderTop: visibleProspects.length > 0 ? "1px solid #1a2d45" : undefined }}
            >
              + {hiddenCount} more (needs research)
            </button>
          )}
          {showIncomplete && hiddenCount > 0 && (
            <button
              onClick={() => setShowIncomplete(false)}
              className="w-full px-4 py-3 text-xs text-left transition-colors hover:bg-[#0d1825]"
              style={{ color: "#3d5a72", borderTop: "1px solid #1a2d45" }}
            >
              Hide {hiddenCount} research-needed rows ↑
            </button>
          )}
        </div>

        <div className="px-4 py-2.5" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
          <span className="text-xs" style={{ color: "#3d5a72" }}>
            {visibleProspects.length} of {PROSPECTS.length} prospects · Status synced to database
          </span>
        </div>
      </div>
    </div>
  );
}
