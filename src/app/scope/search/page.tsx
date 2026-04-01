"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import s from "./search.module.css";

/* ── STATIC DATA ── */
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

const DEMO_RESULTS = [
  { id: "1", address: "Meridian Business Park, Unit 7", location: "Rochester, Kent", type: "Industrial", sqft: 8200, price: 520000, epc: "D", signals: ["admin", "mees"], score: 7.2, source: "admin", days: "2h ago" },
  { id: "2", address: "Maidstone Enterprise Zone, Plot B3", location: "Maidstone, Kent", type: "Industrial", sqft: 9400, price: 580000, epc: "E", signals: ["auction"], score: 7.4, source: "auction", days: "5h ago" },
  { id: "3", address: "Redfield Manor", location: "Reigate, Surrey", type: "Industrial", sqft: 6200, price: 722000, epc: "C", signals: ["price_drop"], score: 6.8, source: "price_drop", days: "1d ago" },
  { id: "4", address: "Ashworth Close, Unit 2", location: "Crawley, West Sussex", type: "Industrial", sqft: 4800, price: 480000, epc: "E", signals: ["auction"], score: 6.9, source: "auction", days: "2d ago" },
  { id: "5", address: "Kingfield Industrial Estate", location: "Woking, Surrey", type: "Industrial", sqft: 12400, price: 920000, epc: "D", signals: ["admin", "mees"], score: 7.1, source: "admin", days: "3d ago" },
  { id: "6", address: "Gravesend Industrial Estate, Block C", location: "Gravesend, Kent", type: "Warehouse", sqft: 7600, price: 440000, epc: "F", signals: ["mees", "absent"], score: 5.6, source: "mees", days: "4d ago" },
  { id: "7", address: "Beckenham Flex Space", location: "London BR3", type: "Flex", sqft: 3800, price: 680000, epc: "C", signals: ["auction"], score: 5.1, source: "auction", days: "5d ago" },
  { id: "8", address: "Vale Trading Estate", location: "Billericay, Essex", type: "Industrial", sqft: 5600, price: 340000, epc: "F", signals: ["mees"], score: 5.4, source: "mees", days: "6d ago" },
];

/* ── HELPERS ── */
function toggle(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  return `£${Math.round(n / 1000)}k`;
}

function scoreColor(sc: number) {
  if (sc >= 7) return "green";
  if (sc >= 5) return "amber";
  return "red";
}

/* ── COMPONENT ── */
export default function SearchPage() {
  const params = useSearchParams();
  const [sources, setSources] = useState<string[]>(() => {
    const src = params.get("source");
    return src ? [src] : [];
  });
  const [assets, setAssets] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [sort, setSort] = useState("Relevance");
  const [results] = useState(DEMO_RESULTS);

  const filtered = results.filter((r) => {
    if (sources.length > 0 && !sources.some((src) => r.signals.includes(src) || r.source === src)) return false;
    if (assets.length > 0 && !assets.includes(r.type)) return false;
    return true;
  });

  return (
    <AppShell>
      <div className={s.page}>
        {/* ═══ SOURCE HERO BAR ═══ */}
        <div className={`${s.sourceBar} ${s.anim}`}>
          <div className={s.sourceBarInner}>
            {SOURCES.map((src) => (
              <button
                key={src.key}
                className={`${s.sourceChip} ${sources.includes(src.key) ? s.sourceChipOn : ""}`}
                onClick={() => setSources(toggle(sources, src.key))}
              >
                <span className={s.sourceChipLabel}>{src.label}</span>
                <span className={s.sourceChipCount}>{src.count}</span>
              </button>
            ))}
          </div>
          {sources.length > 0 && (
            <button className={s.sourceClear} onClick={() => setSources([])}>
              Clear
            </button>
          )}
        </div>

        {/* ═══ MAIN LAYOUT ═══ */}
        <div className={s.layout}>
          {/* FILTER SIDEBAR */}
          <aside className={`${s.sidebar} ${s.anim} ${s.a1}`}>
            <div className={s.filterSection}>
              <div className={s.filterTitle}>Asset class</div>
              <div className={s.chipWrap}>
                {ASSET_CLASSES.map((ac) => (
                  <button
                    key={ac}
                    className={`${s.chip} ${assets.includes(ac) ? s.chipOn : ""}`}
                    onClick={() => setAssets(toggle(assets, ac))}
                  >
                    {ac}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.filterSection}>
              <div className={s.filterTitle}>Location</div>
              <div className={s.chipWrap}>
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    className={`${s.chip} ${locations.includes(loc) ? s.chipOn : ""}`}
                    onClick={() => setLocations(toggle(locations, loc))}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.filterSection}>
              <div className={s.filterTitle}>Price range</div>
              <div className={s.rangeRow}>
                <input type="text" placeholder="Min £" className={s.rangeInput} />
                <span className={s.rangeSep}>—</span>
                <input type="text" placeholder="Max £" className={s.rangeInput} />
              </div>
            </div>

            <div className={s.filterSection}>
              <div className={s.filterTitle}>Size (sqft)</div>
              <div className={s.rangeRow}>
                <input type="text" placeholder="Min" className={s.rangeInput} />
                <span className={s.rangeSep}>—</span>
                <input type="text" placeholder="Max" className={s.rangeInput} />
              </div>
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

          {/* RESULTS */}
          <main className={`${s.main} ${s.anim} ${s.a2}`}>
            <div className={s.resultsHeader}>
              <div className={s.resultsCount}>
                <span className={s.resultsNum}>{filtered.length}</span> properties
              </div>
              <div className={s.sortRow}>
                {SORTS.map((st) => (
                  <button
                    key={st}
                    className={`${s.sortChip} ${sort === st ? s.sortChipOn : ""}`}
                    onClick={() => setSort(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 && (
              <div className={s.empty}>
                <div className={s.emptyIcon}>⊘</div>
                <div className={s.emptyTitle}>No properties match</div>
                <div className={s.emptyDesc}>
                  Try broadening your filters or selecting different sources.
                </div>
              </div>
            )}

            {filtered.map((r, i) => (
              <Link
                key={r.id}
                href={`/scope/property/${r.id}`}
                className={s.result}
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <div className={s.resultImg}>Satellite</div>
                <div className={s.resultBody}>
                  <div className={s.resultAddr}>{r.address}</div>
                  <div className={s.resultLoc}>
                    {r.type} · {r.sqft?.toLocaleString()} sqft · {r.location} · EPC {r.epc}
                  </div>
                  <div className={s.resultSignals}>
                    {r.signals.map((sig) => (
                      <span key={sig} className={s.badge} data-type={sig}>
                        {sig === "admin" ? "Admin" : sig === "auction" ? "Auction" : sig === "mees" ? "MEES" : sig === "price_drop" ? "Price drop" : sig === "absent" ? "Absent" : sig}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={s.resultRight}>
                  <div className={s.resultPrice}>{fmt(r.price)}</div>
                  <div className={`${s.scoreRing} ${s[scoreColor(r.score)]}`}>{r.score}</div>
                  <div className={s.resultTime}>{r.days}</div>
                </div>
              </Link>
            ))}
          </main>
        </div>
      </div>
    </AppShell>
  );
}
