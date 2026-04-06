"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import s from "./search-company.module.css";

/* ── Types ── */
type Company = {
  companyNumber: string;
  companyName: string;
  propertyCount: number;
  sampleAddresses: string[];
  postcodes: string[];
  county: string | null;
};

type CcodProperty = {
  id: string;
  titleNumber: string;
  companyName: string;
  address: string;
  postcode: string;
  postcodeSector: string;
  county: string | null;
};

/* ── Main page ── */
export default function SearchCompanyPage() {
  const router = useRouter();

  // State 1: search
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searching, setSearching] = useState(false);

  // State 2: selected company + properties
  const [selected, setSelected] = useState<Company | null>(null);
  const [properties, setProperties] = useState<CcodProperty[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Search companies ── */
  useEffect(() => {
    if (query.length < 3) {
      setCompanies([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/dealscope/companies?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setCompanies(data.companies ?? []);
      } catch {
        setCompanies([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  /* ── Select company → load properties ── */
  async function selectCompany(company: Company) {
    setSelected(company);
    setCheckedIds(new Set());
    setEnriched(false);
    setLoadingProps(true);
    try {
      const res = await fetch(`/api/dealscope/companies/${encodeURIComponent(company.companyNumber)}/properties`);
      const data = await res.json();
      const props: CcodProperty[] = data.properties ?? [];
      setProperties(props);
      // Select all by default
      setCheckedIds(new Set(props.map((p) => p.id)));
    } catch {
      setProperties([]);
    } finally {
      setLoadingProps(false);
    }
  }

  function toggleProp(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── Enrich selected properties ── */
  async function enrichSelected() {
    const toEnrich = properties.filter((p) => checkedIds.has(p.id));
    if (toEnrich.length === 0) return;
    setEnriching(true);
    try {
      // Enrich each property by address+postcode via the existing enrich endpoint
      await Promise.all(
        toEnrich.map((p) =>
          fetch("/api/dealscope/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: p.address, postcode: p.postcode }),
          })
        )
      );
      setEnriched(true);
    } catch (err) {
      console.error("[search-company] enrich error", err);
    } finally {
      setEnriching(false);
    }
  }

  const selectedCount = checkedIds.size;

  /* ── Render: State 2 — property selection ── */
  if (selected) {
    return (
      <AppShell>
        <div className={s.page}>
          <div className={s.stepLabel}>Select properties</div>
          <h2 className={s.stepH} style={{ fontSize: 28, marginBottom: 8 }}>
            {loadingProps ? "Loading…" : `${properties.length} propert${properties.length === 1 ? "y" : "ies"} found`}
          </h2>
          <p className={s.stepSub} style={{ marginBottom: 20 }}>
            Select the properties you want to add to your pipeline for enrichment.
          </p>

          <div className={s.selectedHeader}>
            <div className={s.selectedIcon}>🏢</div>
            <div className={s.selectedInfo}>
              <div className={s.selectedName}>{selected.companyName}</div>
              <div className={s.selectedMeta}>
                {selected.county ?? selected.postcodes[0] ?? "UK"} ·{" "}
                {selected.propertyCount} propert{selected.propertyCount === 1 ? "y" : "ies"} on record
              </div>
            </div>
            <button className={s.selectedChange} onClick={() => { setSelected(null); setProperties([]); }}>
              Change ↗
            </button>
          </div>

          {loadingProps ? (
            <div className={s.empty}><div className={s.spinner} /></div>
          ) : properties.length === 0 ? (
            <div className={s.empty}>No properties found in ownership records.</div>
          ) : (
            <>
              {properties.map((p) => (
                <div
                  key={p.id}
                  className={`${s.propItem} ${checkedIds.has(p.id) ? s.selected : ""}`}
                  onClick={() => toggleProp(p.id)}
                >
                  <div className={`${s.propCheck} ${checkedIds.has(p.id) ? s.checked : ""}`}>✓</div>
                  <div>
                    <div className={s.propName}>{p.address}</div>
                    <div className={s.propAddr}>{p.postcode}{p.county ? ` · ${p.county}` : ""}</div>
                  </div>
                  <div className={s.propType}>CCOD</div>
                </div>
              ))}

              {selectedCount > 0 && (
                <div className={s.propSummary}>
                  <div className={s.propSummaryL}>
                    <span>{selectedCount}</span> propert{selectedCount === 1 ? "y" : "ies"} selected
                  </div>
                </div>
              )}

              {enriched ? (
                <div className={s.enrichedMsg}>
                  ✓ {selectedCount} propert{selectedCount === 1 ? "y" : "ies"} added to pipeline — enrichment running.
                </div>
              ) : (
                <div className={s.bottomCta}>
                  <button
                    className={s.btnPrimary}
                    disabled={selectedCount === 0 || enriching}
                    onClick={enrichSelected}
                  >
                    {enriching
                      ? "Enriching…"
                      : `Enrich ${selectedCount > 0 ? `all ${selectedCount} ` : ""}propert${selectedCount === 1 ? "y" : "ies"} →`}
                  </button>
                </div>
              )}
            </>
          )}

          <div className={s.hint}>
            <div className={s.hintDot} />
            After enrichment, each property gets satellite imagery, market benchmarks, and initial findings — just like adding a single address.
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Render: State 1 — company search ── */
  return (
    <AppShell>
      <div className={s.page}>
        <div className={`${s.stepLabel} ${s.anim} ${s.a1}`}>Add properties</div>
        <h1 className={`${s.stepH} ${s.anim} ${s.a2}`}>Find properties by company</h1>
        <p className={`${s.stepSub} ${s.anim} ${s.a3}`}>
          Enter a company or entity name. We'll find commercial properties linked to it from Land Registry ownership records.
        </p>

        <div className={`${s.searchBox} ${s.anim} ${s.a3}`}>
          <div className={s.searchIcon}>🏢</div>
          <input
            className={s.searchInput}
            placeholder="Company name, e.g. Harrow Capital Ltd..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {query.length >= 3 && (
          <div className={`${s.companyResults} ${s.anim} ${s.a4}`}>
            {searching ? (
              <div className={s.empty}><div className={s.spinner} /></div>
            ) : companies.length === 0 ? (
              <div className={s.empty}>No companies found matching &ldquo;{query}&rdquo;</div>
            ) : (
              companies.map((c) => (
                <div key={c.companyNumber} className={s.companyCard} onClick={() => selectCompany(c)}>
                  <div className={s.companyTop}>
                    <div className={s.companyName}>{c.companyName}</div>
                    <div className={s.companyBadge}>{c.propertyCount} propert{c.propertyCount === 1 ? "y" : "ies"}</div>
                  </div>
                  <div className={s.companyMeta}>
                    {c.county ?? c.postcodes.slice(0, 2).join(", ") ?? "UK"} · Co. No. {c.companyNumber}
                  </div>
                  <div className={s.companyProps}>
                    {c.sampleAddresses.map((addr) => (
                      <div key={addr} className={s.companyProp}>
                        <div className={s.companyPropDot} />
                        {addr.length > 40 ? addr.substring(0, 40) + "…" : addr}
                      </div>
                    ))}
                    {c.propertyCount > c.sampleAddresses.length && (
                      <div className={s.companyProp}>
                        +{c.propertyCount - c.sampleAddresses.length} more
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className={`${s.hint} ${s.anim} ${s.a4}`}>
          <div className={s.hintDot} />
          We search Land Registry CCOD ownership records. Company names, company numbers, and registered UK entities are all matched.
        </div>
      </div>
    </AppShell>
  );
}
