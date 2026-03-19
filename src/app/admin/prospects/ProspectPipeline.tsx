"use client";

import { useState, useEffect } from "react";

// ── Static prospect data seeded from sales-materials/gtm/prospects-fl.csv ──
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
  | "referral_partner";

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string }> = {
  research_needed: { label: "Research needed", color: "#5a7a96", bg: "#1a2d45" },
  to_contact:      { label: "To contact",      color: "#F5A94A", bg: "#2a1e08" },
  contacted:       { label: "Contacted",        color: "#1647E8", bg: "#0e1a36" },
  demo_booked:     { label: "Demo booked",      color: "#8b5cf6", bg: "#1a1030" },
  in_negotiation:  { label: "Negotiating",      color: "#06b6d4", bg: "#051e26" },
  won:             { label: "Won",              color: "#0A8A4C", bg: "#0f2a1c" },
  lost:            { label: "Lost",             color: "#CC1A1A", bg: "#2a0a0a" },
  referral_partner:{ label: "Referral partner", color: "#8ba0b8", bg: "#131f2d" },
};

const PROSPECTS: Prospect[] = [
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

// ─────────────────────────────────────────────────────────────────────────────

interface ProspectState {
  status: ProspectStatus;
  notes: string;
  linkedinSent: boolean;
  emailSent: boolean;
  lastContact: string; // ISO date string or ""
}

type PipelineStore = Record<string, ProspectState>;

function defaultState(p: Prospect): ProspectState {
  return { status: p.initialStatus, notes: p.notes, linkedinSent: false, emailSent: false, lastContact: "" };
}

async function fetchStore(): Promise<PipelineStore> {
  try {
    const res = await fetch("/api/admin/prospect-status");
    if (!res.ok) return {};
    const map = await res.json();
    const store: PipelineStore = {};
    for (const [key, row] of Object.entries(map as Record<string, {
      status: string; notes?: string | null; linkedinSent: boolean; emailSent: boolean; lastContact?: string | null;
    }>)) {
      store[key] = {
        status: row.status as ProspectStatus,
        notes: row.notes ?? "",
        linkedinSent: row.linkedinSent,
        emailSent: row.emailSent,
        lastContact: row.lastContact ?? "",
      };
    }
    return store;
  } catch {
    return {};
  }
}

async function persistState(prospectKey: string, state: ProspectState): Promise<void> {
  await fetch("/api/admin/prospect-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prospectKey, ...state }),
  });
}

function getState(store: PipelineStore, p: Prospect): ProspectState {
  return store[p.id] ?? defaultState(p);
}

// ─────────────────────────────────────────────────────────────────────────────

const STATUS_ORDER: ProspectStatus[] = [
  "to_contact", "contacted", "demo_booked", "in_negotiation",
  "won", "referral_partner", "research_needed", "lost",
];

function StatusBadge({ status }: { status: ProspectStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.color, border: `1px solid ${c.color}40` }}
    >
      {c.label}
    </span>
  );
}

function ProspectRow({
  prospect,
  state,
  onUpdate,
  appUrl,
}: {
  prospect: Prospect;
  state: ProspectState;
  onUpdate: (id: string, patch: Partial<ProspectState>) => void;
  appUrl: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(state.notes);
  const [copiedAudit, setCopiedAudit] = useState(false);
  const [copiedDemo, setCopiedDemo] = useState(false);
  const [copiedBook, setCopiedBook] = useState(false);

  // Generate links
  const assetCountMatch = prospect.portfolioSize.match(/\b(\d+)\b/);
  const assetCount = assetCountMatch ? parseInt(assetCountMatch[1]) : 7;
  const portfolioDesc = `I have ${assetCount} ${prospect.assetTypes.toLowerCase().split("/")[0].trim()} assets in ${prospect.location.replace(/ FL$/, "").replace(/ Florida$/, "")} Florida`;
  const auditParams = new URLSearchParams({ portfolio: portfolioDesc });
  if (prospect.email) auditParams.set("email", prospect.email);
  const auditLink = `${appUrl}/audit?${auditParams.toString()}`;

  const oppEst = assetCount * (1500 + 4333) + 80000 + Math.min(assetCount, 20) * 2200;
  const demoParams = new URLSearchParams({ welcome: "1", opp: String(Math.round(oppEst)) });
  if (prospect.company && !prospect.company.startsWith("[")) demoParams.set("company", prospect.company);
  const demoLink = `${appUrl}/dashboard?${demoParams.toString()}`;

  const bookParams = new URLSearchParams({ assets: String(assetCount) });
  if (prospect.company && !prospect.company.startsWith("[")) bookParams.set("company", prospect.company);
  const bookLink = `${appUrl}/book?${bookParams.toString()}`;

  function copyLink(link: string, which: "audit" | "demo" | "book") {
    navigator.clipboard.writeText(link);
    if (which === "audit") { setCopiedAudit(true); setTimeout(() => setCopiedAudit(false), 2000); }
    else if (which === "demo") { setCopiedDemo(true); setTimeout(() => setCopiedDemo(false), 2000); }
    else { setCopiedBook(true); setTimeout(() => setCopiedBook(false), 2000); }
  }

  const isActionable = !["referral_partner", "research_needed"].includes(state.status);

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
          <div className="text-sm font-medium truncate" style={{ color: isActionable ? "#e8eef5" : "#8ba0b8" }}>
            {prospect.name}
          </div>
          <div className="text-xs truncate mt-0.5" style={{ color: "#5a7a96" }}>{prospect.company}</div>
          <div className="text-xs mt-0.5 truncate" style={{ color: "#3d5a72" }}>{prospect.location}</div>
        </div>

        {/* Portfolio */}
        <div className="text-xs" style={{ color: "#5a7a96", paddingTop: "2px" }}>
          <div>{prospect.portfolioSize}</div>
          <div className="mt-0.5" style={{ color: "#3d5a72" }}>{prospect.assetTypes.split("/")[0].trim()}</div>
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

          {/* LinkedIn */}
          {prospect.linkedin && !prospect.linkedin.startsWith("find") && (
            <a
              href={prospect.linkedin}
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

export function ProspectPipeline() {
  const [store, setStore] = useState<PipelineStore>({});
  const [filter, setFilter] = useState<ProspectStatus | "all">("all");
  const [search, setSearch] = useState("");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://arcahq.ai");

  useEffect(() => {
    fetchStore().then(setStore);
  }, []);

  function update(id: string, patch: Partial<ProspectState>) {
    setStore((prev) => {
      const prospect = PROSPECTS.find((p) => p.id === id)!;
      const current = prev[id] ?? defaultState(prospect);
      const next: ProspectState = { ...current, ...patch };
      persistState(id, next);
      return { ...prev, [id]: next };
    });
  }

  // Stats
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = PROSPECTS.filter((p) => (store[p.id] ?? defaultState(p)).status === s).length;
    return acc;
  }, {} as Record<ProspectStatus, number>);

  const actionable = (counts.to_contact ?? 0) + (counts.contacted ?? 0) + (counts.demo_booked ?? 0) + (counts.in_negotiation ?? 0);

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

  return (
    <div className="space-y-6">
      {/* Pipeline summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Actionable", value: actionable, color: "#F5A94A" },
          { label: "Demo booked", value: counts.demo_booked ?? 0, color: "#8b5cf6" },
          { label: "Won", value: counts.won ?? 0, color: "#0A8A4C" },
          { label: "Referral partners", value: counts.referral_partner ?? 0, color: "#8ba0b8" },
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
              {s.value}
            </div>
            <div className="text-xs" style={{ color: "#5a7a96" }}>{s.label}</div>
          </div>
        ))}
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
        {(["all", ...STATUS_ORDER] as const).map((s) => (
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
      </div>

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
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "#3d5a72" }}>
              No prospects match this filter.
            </div>
          ) : (
            filtered.map((p) => (
              <ProspectRow
                key={p.id}
                prospect={p}
                state={store[p.id] ?? defaultState(p)}
                onUpdate={update}
                appUrl={appUrl}
              />
            ))
          )}
        </div>

        <div className="px-4 py-2.5" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
          <span className="text-xs" style={{ color: "#3d5a72" }}>
            {filtered.length} of {PROSPECTS.length} prospects · Status synced to database
          </span>
        </div>
      </div>
    </div>
  );
}
