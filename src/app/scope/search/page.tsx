"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import s from "./search.module.css";

const SOURCES = [
  { key: "auction", label: "Auctions", count: 47 },
  { key: "admin", label: "Administration", count: 23 },
  { key: "mees", label: "MEES risk", count: 34 },
  { key: "absent", label: "Absent owner", count: 89 },
  { key: "probate", label: "Probate", count: 12 },
  { key: "dissolved", label: "Dissolved", count: 6 },
  { key: "price_drop", label: "Price drops", count: 8 },
  { key: "planning", label: "Planning", count: 15 },
];

const ASSET_CLASSES = ["Industrial", "Warehouse", "Office", "Retail", "Mixed", "Residential"];
const LOCATIONS = ["South East", "London", "Midlands", "North West", "South West", "East", "Scotland", "Wales"];
const SORTS = ["Relevance", "Score", "Price ↑", "Price ↓", "Newest"];

type SearchResult = {
  id: string;
  address: string;
  location: string;
  type: string;
  sqft: number | null;
  price: number;
  epc: string | null;
  signals: string[];
  score: number | null;
  source: string;
  days: string;
};

function toggle(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  return `£${Math.round(n / 1000)}k`;
}

function scoreColor(sc: number | null) {
  if (sc === null) return "amber";
  if (sc >= 7) return "green";
  if (sc >= 5) return "amber";
  return "red";
}

function SearchContent() {
  const params = useSearchParams();
  const [sources, setSources] = useState<string[]>(() => {
    const src = params.get("source");
    return src ? [src] : [];
  });
  const [assets, setAssets] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [sort, setSort] = useState("Relevance");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    fetch("/api/dealscope/search")
      .then(r => r.json())
      .then(data => {
        const items = (data.results ?? []).map((r: any) => ({
          ...r,
          days: r.daysLabel ?? r.days ?? "—",
          score: r.score ?? null,
          sqft: r.sqft ?? null,
          epc: r.epc ?? null,
          signals: r.signals ?? [],
        }));
        setResults(items);
      })
      .catch(() => setResults([]));
  }, []);

  const filtered = results.filter((r) => {
    if (sources.length > 0 && !sources.some((src) => r.signals.includes(src) || r.source === src)) return false;
    if (assets.length > 0 && !assets.includes(r.type)) return false;
    return true;
  });

  return (
    <div className={s.page}>
      <div className={`${s.sourceBar} ${s.anim}`}>
        <div className={s.sourceBarInner}>
          {SOURCES.map((src) => (
            <button key={src.key} className={`${s.sourceChip} ${sources.includes(src.key) ? s.sourceChipOn : ""}`} onClick={() => setSources(toggle(sources, src.key))}>
              <span className={s.sourceChipLabel}>{src.label}</span>
              <span className={s.sourceChipCount}>{src.count}</span>
            </button>
          ))}
        </div>
        {sources.length > 0 && <button className={s.sourceClear} onClick={() => setSources([])}>Clear</button>}
      </div>

      <div className={s.layout}>
        <aside className={`${s.sidebar} ${s.anim} ${s.a1}`}>
          <div className={s.filterSection}>
            <div className={s.filterTitle}>Asset class</div>
            <div className={s.chipWrap}>
              {ASSET_CLASSES.map((ac) => (
                <button key={ac} className={`${s.chip} ${assets.includes(ac) ? s.chipOn : ""}`} onClick={() => setAssets(toggle(assets, ac))}>{ac}</button>
              ))}
            </div>
          </div>
          <div className={s.filterSection}>
            <div className={s.filterTitle}>Location</div>
            <div className={s.chipWrap}>
              {LOCATIONS.map((loc) => (
                <button key={loc} className={`${s.chip} ${locations.includes(loc) ? s.chipOn : ""}`} onClick={() => setLocations(toggle(locations, loc))}>{loc}</button>
              ))}
            </div>
          </div>
          <div className={s.filterSection}>
            <div className={s.filterTitle}>Price range</div>
            <div className={s.rangeRow}><input type="text" placeholder="Min £" className={s.rangeInput} /><span className={s.rangeSep}>—</span><input type="text" placeholder="Max £" className={s.rangeInput} /></div>
          </div>
          <div className={s.filterSection}>
            <div className={s.filterTitle}>Size (sqft)</div>
            <div className={s.rangeRow}><input type="text" placeholder="Min" className={s.rangeInput} /><span className={s.rangeSep}>—</span><input type="text" placeholder="Max" className={s.rangeInput} /></div>
          </div>
          <div className={s.filterSection}>
            <div className={s.filterTitle}>Min. score</div>
            <input type="range" min={0} max={10} step={0.5} defaultValue={5} className={s.slider} />
            <div className={s.sliderLabel}>5.0+</div>
          </div>
          <div className={s.filterSection}>
            <div className={s.filterTitle}>EPC filter</div>
            <div className={s.chipWrap}>
              <button className={s.chip}>A–C</button>
              <button className={s.chip}>D–E</button>
              <button className={`${s.chip} ${s.chipDanger}`}>F–G</button>
            </div>
          </div>
          <button className={s.saveMandate}>Save as mandate</button>
        </aside>

        <main className={`${s.main} ${s.anim} ${s.a2}`}>
          <div className={s.resultsHeader}>
            <div className={s.resultsCount}><span className={s.resultsNum}>{filtered.length}</span> properties</div>
            <div className={s.sortRow}>
              {SORTS.map((st) => (
                <button key={st} className={`${s.sortChip} ${sort === st ? s.sortChipOn : ""}`} onClick={() => setSort(st)}>{st}</button>
              ))}
            </div>
          </div>
          {filtered.length === 0 && (
            <div className={s.empty}><div className={s.emptyIcon}>⊘</div><div className={s.emptyTitle}>No properties match</div><div className={s.emptyDesc}>Try broadening your filters or selecting different sources.</div></div>
          )}
          {filtered.map((r, i) => (
            <Link key={r.id} href={`/scope/property/${r.id}`} className={s.result} style={{ animationDelay: `${0.04 * i}s` }}>
              <div className={s.resultImg}>Satellite</div>
              <div className={s.resultBody}>
                <div className={s.resultAddr}>{r.address}</div>
                <div className={s.resultLoc}>{r.type} · {r.sqft?.toLocaleString()} sqft · {r.location} · EPC {r.epc}</div>
                <div className={s.resultSignals}>
                  {r.signals.map((sig) => (
                    <span key={sig} className={s.badge} data-type={sig}>{sig === "admin" ? "Admin" : sig === "auction" ? "Auction" : sig === "mees" ? "MEES" : sig === "price_drop" ? "Price drop" : sig === "absent" ? "Absent" : sig}</span>
                  ))}
                </div>
              </div>
              <div className={s.resultRight}>
                <div className={s.resultPrice}>{fmt(r.price)}</div>
                <div className={`${s.scoreRing} ${s[scoreColor(r.score)]}`}>{r.score ?? "—"}</div>
                <div className={s.resultTime}>{r.days}</div>
              </div>
            </Link>
          ))}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--tx3)" }}>Loading search...</div>}>
        <SearchContent />
      </Suspense>
    </AppShell>
  );
}
