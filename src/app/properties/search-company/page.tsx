"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  sqft: number;
  city: string;
  state: string;
}

interface CompanyResult {
  id: string;
  name: string;
  county: string;
  registeredAgent: string | null;
  activeSince: number | null;
  propertyCount: number;
  properties: Property[];
}

export default function SearchCompanyPage() {
  const router = useRouter();
  const [state, setState] = useState<"search" | "properties">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);

  // Search as user types
  useEffect(() => {
    if (searchQuery.length < 5) {
      setCompanies([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search/company?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.results || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  function selectCompany(company: CompanyResult) {
    setSelectedCompany(company);
    setSelectedPropertyIds(new Set(company.properties.map(p => p.id)));
    setState("properties");
    window.scrollTo(0, 0);
  }

  function toggleProperty(id: string) {
    setSelectedPropertyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function backToSearch() {
    setState("search");
    window.scrollTo(0, 0);
  }

  async function enrichProperties() {
    if (!selectedCompany) return;

    const selectedProps = selectedCompany.properties.filter(p => selectedPropertyIds.has(p.id));

    // TODO: Call bulk enrichment API
    // For now, redirect to dashboard with success message
    router.push(`/dashboard?enriched=${selectedProps.length}`);
  }

  const totalSqft = selectedCompany
    ? selectedCompany.properties
        .filter(p => selectedPropertyIds.has(p.id))
        .reduce((sum, p) => sum + p.sqft, 0)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-mark"><span>R</span>ealHQ</div>
        <Link href="/properties/add" className="nav-back">
          ← Back to add property
        </Link>
      </nav>

      <div className="page">
        {/* STATE 1: Search */}
        {state === "search" && (
          <div className="state-search">
            <div className="step-label a1">Add properties</div>
            <h1 className="step-h a2">Find properties by company</h1>
            <p className="step-sub a3">
              Enter a company or entity name. We'll find commercial properties linked to it from public records and ownership data.
            </p>

            <div className="search-box a3">
              <div className="search-icon">🏢</div>
              <input
                className="search-input"
                placeholder="Company name, e.g. Brickell Holdings LLC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {companies.length > 0 && (
              <div className="company-results a4">
                {companies.map(company => (
                  <div
                    key={company.id}
                    className="company-card"
                    onClick={() => selectCompany(company)}
                  >
                    <div className="company-top">
                      <div className="company-name">{company.name}</div>
                      <div className="company-badge">{company.propertyCount} {company.propertyCount === 1 ? "property" : "properties"}</div>
                    </div>
                    <div className="company-meta">
                      {company.county}
                      {company.registeredAgent && ` · Registered agent: ${company.registeredAgent}`}
                      {company.activeSince && ` · Active since ${company.activeSince}`}
                    </div>
                    <div className="company-props">
                      {company.properties.slice(0, 3).map(prop => (
                        <div key={prop.id} className="company-prop">
                          <div className="company-prop-dot" />
                          {prop.address}
                        </div>
                      ))}
                      {company.properties.length > 3 && (
                        <div className="company-prop">+{company.properties.length - 3} more</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searching && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--tx3)" }}>
                Searching...
              </div>
            )}

            <div className="hint a4">
              <div className="hint-dot" />
              We search ownership records from ATTOM and public registries. LLC names, registered agents, and associated entities are all matched.
            </div>
          </div>
        )}

        {/* STATE 2: Property selection */}
        {state === "properties" && selectedCompany && (
          <div className="state-properties">
            <div className="step-label">{selectedPropertyIds.size > 0 ? "Select" : "No"} properties</div>
            <h2 className="step-h" style={{ fontSize: "28px", marginBottom: "8px" }}>
              {selectedCompany.propertyCount} {selectedCompany.propertyCount === 1 ? "property" : "properties"} found
            </h2>
            <p className="step-sub" style={{ marginBottom: "20px" }}>
              Select the properties you want to add to your portfolio.
            </p>

            <div className="selected-header">
              <div className="selected-icon">🏢</div>
              <div className="selected-info">
                <div className="selected-name">{selectedCompany.name}</div>
                <div className="selected-meta">
                  {selectedCompany.county} · {selectedCompany.propertyCount} {selectedCompany.propertyCount === 1 ? "property" : "properties"} on record
                  {selectedCompany.registeredAgent && ` · Owner: ${selectedCompany.registeredAgent}`}
                </div>
              </div>
              <div className="selected-change" onClick={backToSearch}>
                Change ↗
              </div>
            </div>

            {selectedCompany.properties.map(prop => {
              const isChecked = selectedPropertyIds.has(prop.id);
              return (
                <div key={prop.id} className="prop-item">
                  <div
                    className={`prop-check ${isChecked ? "checked" : ""}`}
                    onClick={() => toggleProperty(prop.id)}
                  >
                    {isChecked && "✓"}
                  </div>
                  <div>
                    <div className="prop-name">{prop.name}</div>
                    <div className="prop-addr">
                      {prop.address}, {prop.city} {prop.state} · {prop.type} · {prop.sqft.toLocaleString()} sqft
                    </div>
                  </div>
                  <div className="prop-type">{prop.type}</div>
                </div>
              );
            })}

            {selectedPropertyIds.size > 0 && (
              <div className="prop-summary">
                <div className="prop-summary-l">
                  <span>{selectedPropertyIds.size}</span> {selectedPropertyIds.size === 1 ? "property" : "properties"} selected · {totalSqft.toLocaleString()} sqft total
                </div>
              </div>
            )}

            {selectedPropertyIds.size > 0 && (
              <div className="bottom-cta">
                <button className="btn-primary" onClick={enrichProperties}>
                  Enrich all {selectedPropertyIds.size} {selectedPropertyIds.size === 1 ? "property" : "properties"} →
                </button>
              </div>
            )}

            <div className="hint">
              <div className="hint-dot" />
              After enrichment, each property gets satellite imagery, market benchmarks, and initial findings — just like adding a single address.
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 52px;
          background: rgba(9,9,11,.88);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--bdr);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
        }
        .nav-mark {
          font-family: var(--serif);
          font-size: 17px;
          color: var(--tx);
        }
        .nav-mark span {
          color: var(--acc);
          font-style: italic;
        }
        .nav-back {
          font: 400 12px var(--sans);
          color: var(--tx3);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color .15s;
        }
        .nav-back:hover {
          color: var(--tx2);
        }

        .page {
          max-width: 640px;
          margin: 0 auto;
          padding: 60px 24px 120px;
        }

        .step-label {
          font: 500 9px/1 var(--mono);
          color: var(--acc);
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 20px;
        }
        .step-h {
          font-family: var(--serif);
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -.03em;
          color: var(--tx);
          margin-bottom: 8px;
        }
        .step-sub {
          font: 300 15px/1.6 var(--sans);
          color: var(--tx3);
          margin-bottom: 36px;
          max-width: 520px;
        }

        .search-box {
          position: relative;
          margin-bottom: 16px;
        }
        .search-input {
          width: 100%;
          padding: 18px 22px 18px 48px;
          background: var(--s1);
          border: 1.5px solid var(--bdr);
          border-radius: 12px;
          font: 400 16px var(--sans);
          color: var(--tx);
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .search-input::placeholder {
          color: var(--tx3);
        }
        .search-input:focus {
          border-color: var(--acc-bdr);
          box-shadow: 0 0 0 4px var(--acc-dim), 0 8px 32px rgba(0,0,0,.3);
        }
        .search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          color: var(--tx3);
          pointer-events: none;
        }

        .company-results {
          margin-top: 20px;
        }
        .company-card {
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          padding: 18px 20px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all .15s;
        }
        .company-card:hover {
          border-color: var(--acc-bdr);
          background: var(--s2);
        }
        .company-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .company-name {
          font: 600 14px var(--sans);
          color: var(--tx);
        }
        .company-badge {
          font: 500 9px/1 var(--mono);
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--s2);
          color: var(--tx3);
          border: 1px solid var(--bdr);
          letter-spacing: .3px;
        }
        .company-meta {
          font: 400 12px var(--sans);
          color: var(--tx3);
          margin-bottom: 10px;
        }
        .company-props {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .company-prop {
          font: 400 11px var(--sans);
          color: var(--tx2);
          background: var(--s2);
          border: 1px solid var(--bdr-lt);
          padding: 4px 10px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .company-prop-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--acc);
          flex-shrink: 0;
        }

        .selected-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          background: var(--acc-lt);
          border: 1px solid var(--acc-bdr);
          border-radius: 10px;
          margin-bottom: 20px;
        }
        .selected-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: var(--acc);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 14px;
          flex-shrink: 0;
        }
        .selected-info {
          flex: 1;
        }
        .selected-name {
          font: 600 13px var(--sans);
          color: var(--tx);
        }
        .selected-meta {
          font: 400 11px var(--sans);
          color: var(--tx2);
        }
        .selected-change {
          font: 400 11px var(--sans);
          color: var(--acc);
          cursor: pointer;
        }

        .prop-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 9px;
          margin-bottom: 6px;
          transition: all .12s;
        }
        .prop-item:hover {
          border-color: var(--acc-bdr);
          background: var(--s2);
        }
        .prop-check {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid var(--bdr);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .12s;
          background: var(--s1);
          flex-shrink: 0;
          font-size: 10px;
        }
        .prop-check.checked {
          background: var(--acc);
          border-color: var(--acc);
          color: #fff;
        }
        .prop-name {
          font: 500 13px var(--sans);
          color: var(--tx);
        }
        .prop-addr {
          font: 400 11px var(--sans);
          color: var(--tx3);
          margin-top: 1px;
        }
        .prop-type {
          font: 500 9px/1 var(--mono);
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--s2);
          color: var(--tx3);
          border: 1px solid var(--bdr);
          letter-spacing: .3px;
        }

        .prop-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: var(--s1);
          border: 1px solid var(--acc-bdr);
          border-radius: 9px;
          margin-top: 14px;
        }
        .prop-summary-l {
          font: 500 12px var(--sans);
          color: var(--tx);
        }
        .prop-summary-l span {
          color: var(--acc);
        }

        .bottom-cta {
          display: flex;
          gap: 10px;
          margin-top: 28px;
        }
        .btn-primary {
          flex: 1;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--acc);
          color: #fff;
          border: none;
          border-radius: 10px;
          font: 600 14px/1 var(--sans);
          cursor: pointer;
          transition: all .15s;
        }
        .btn-primary:hover {
          background: #6d5ce0;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(124,106,240,.25);
        }

        .hint {
          margin-top: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 8px;
          font: 400 12px var(--sans);
          color: var(--tx3);
        }
        .hint-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--grn);
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }

        @keyframes enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .35; }
        }

        .a1 { animation: enter .4s ease both; }
        .a2 { animation: enter .4s ease both .07s; }
        .a3 { animation: enter .4s ease both .14s; }
        .a4 { animation: enter .4s ease both .21s; }

        @media(max-width: 600px) {
          .page { padding: 40px 20px 100px; }
          .bottom-cta { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
