"use client";

import { useState } from "react";
import s from "./dossier.module.css";

/* ═══════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════ */
function Row({ l, v, mono, color }: { l: string; v: string; mono?: boolean; color?: string }) {
  const c = color === "green" ? s.vGreen : color === "red" ? s.vRed : color === "amber" ? s.vAmber : "";
  return <div className={s.row}><span className={s.rowL}>{l}</span><span className={`${s.rowV} ${mono ? s.mono : ""} ${c}`}>{v}</span></div>;
}

/* ═══════════════════════════════════════════════════
   TAB: TITLE & LEGAL
   Design: 02-dossier-full.html → "Title & Legal"
   ═══════════════════════════════════════════════════ */
export function TitleTab() {
  return (
    <>
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Title details (Land Registry)</div>
          <Row l="Title number" v="K482917" mono />
          <Row l="Tenure" v="Freehold absolute" />
          <Row l="Title class" v="Absolute (highest grade)" color="green" />
          <Row l="Registered owner" v="Meridian Property Holdings Ltd" />
          <Row l="Date registered" v="22 Jun 2018" mono />
          <Row l="Price paid" v="£485,000" mono />
          <div className={s.sep} />
          <div className={s.cardTitle}>Encumbrances</div>
          <Row l="Restrictive covenants" v="Industrial/commercial use only" />
          <Row l="Easements" v="Shared access road (right of way)" />
          <Row l="Rights of way" v="None affecting property" color="green" />
          <Row l="Notices / cautions" v="None" color="green" />
          <Row l="Leases granted" v="None current" color="green" />
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Heritage & protection</div>
          <Row l="Listed building" v="Not listed" color="green" />
          <Row l="Conservation area" v="Outside" color="green" />
          <Row l="Scheduled monument" v="No" color="green" />
          <Row l="Registered park" v="No" color="green" />
          <Row l="World heritage" v="No" color="green" />
          <Row l="Heritage at risk" v="Not on register" color="green" />
          <div className={s.sep} />
          <div style={{ fontSize: 9, color: "var(--tx3)" }}>Source: Historic England · Mar 2026</div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Sales history</div>
        <div className={s.statRow}>
          <div className={s.statBox}><div className={s.statLabel}>Purchased (2018)</div><div className={s.statVal}>£485,000</div><div className={s.statSub}>£59/sqft</div></div>
          <div className={s.statBox}><div className={s.statLabel}>Est. current value</div><div className={`${s.statVal} ${s.vGreen}`}>£760,000</div><div className={s.statSubGreen}>+57% since purchase</div></div>
          <div className={s.statBox}><div className={s.statLabel}>Annual growth</div><div className={`${s.statVal} ${s.vGreen}`}>+7.3%</div><div className={s.statSub}>over 7.7 years</div></div>
        </div>
        <table className={s.tbl}>
          <thead><tr><th>Date</th><th>Price</th><th>Buyer</th><th>Type</th><th>£/sqft</th><th>Change</th></tr></thead>
          <tbody>
            <tr><td>22 Jun 2018</td><td className={s.mono}>£485,000</td><td>Meridian Property Holdings Ltd</td><td>Standard</td><td className={s.mono}>£59</td><td className={`${s.mono} ${s.vGreen}`}>+52%</td></tr>
            <tr><td>14 Mar 2011</td><td className={s.mono}>£320,000</td><td>Kent Industrial Investments Ltd</td><td>Standard</td><td className={s.mono}>£39</td><td className={`${s.mono} ${s.vGreen}`}>+49%</td></tr>
            <tr><td>8 Sep 2004</td><td className={s.mono}>£215,000</td><td>B&R Holdings (South East) Ltd</td><td>Standard</td><td className={s.mono}>£26</td><td className={`${s.mono} ${s.vGreen}`}>+51%</td></tr>
            <tr><td>1 Dec 1997</td><td className={s.mono}>£142,000</td><td>Medway Warehouse Co. Ltd</td><td>New build</td><td className={s.mono}>£17</td><td className={s.mono}>—</td></tr>
          </tbody>
        </table>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Charges register</div>
        <table className={s.tbl}>
          <thead><tr><th>Priority</th><th>Lender</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td className={s.mono}>1st</td><td>National Westminster Bank Plc</td><td className={s.mono}>£480,000</td><td>15 Jul 2018</td><td><span className={s.badge} data-type="amber">Outstanding</span></td></tr>
            <tr><td className={s.mono}>2nd</td><td>Octopus Real Estate Ltd</td><td className={s.mono}>£350,000</td><td>12 Dec 2025</td><td><span className={s.badge} data-type="red">Outstanding (bridging)</span></td></tr>
          </tbody>
        </table>
        <div className={s.warningBox}>Total secured debt: £830,000 — exceeds likely sale price at admin discount. Lender consent required.</div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: ENVIRONMENTAL
   ═══════════════════════════════════════════════════ */
export function EnvironmentalTab() {
  return (
    <>
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Flood risk (Environment Agency)</div>
          <Row l="River flooding" v="Zone 1 — very low (<0.1%)" color="green" />
          <Row l="Surface water" v="Low risk" color="green" />
          <Row l="Reservoir breach" v="Not in breach zone" color="green" />
          <Row l="Coastal / tidal" v="Not applicable (inland)" color="green" />
          <Row l="Flood defences" v="Thames barrier (5km)" />
          <Row l="Flood history" v="No recorded incidents" color="green" />
          <div className={s.sep} />
          <div style={{ fontSize: 9, color: "var(--tx3)" }}>Source: EA flood map · Mar 2026</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Ground & contamination</div>
          <Row l="Contaminated land" v="Possible — previous industrial" color="amber" />
          <Row l="Made ground" v="Likely (industrial estate)" />
          <Row l="Landfill proximity" v="None within 500m" color="green" />
          <Row l="Radon" v="Low (<1%)" color="green" />
          <Row l="Subsidence" v="Low (chalk bedrock)" color="green" />
          <Row l="Mining" v="No records" color="green" />
          <Row l="Japanese knotweed" v="Not identified" color="green" />
          <div className={s.sep} />
          <div className={s.amberBox}>Phase 1 desktop study recommended — est. £800. Moderate risk due to industrial history.</div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Risk profile</div>
        {[
          { label: "Flood (rivers)", pct: 5 }, { label: "Flood (surface)", pct: 8 },
          { label: "Contamination", pct: 35 }, { label: "Asbestos", pct: 30 },
          { label: "Ground stability", pct: 8 }, { label: "Radon", pct: 3 },
          { label: "Air quality", pct: 15 }, { label: "Noise", pct: 20 },
        ].map((r) => (
          <div key={r.label} className={s.riskRow}>
            <span className={s.riskLabel}>{r.label}</span>
            <div className={s.riskBar}><div className={s.riskFill} style={{ width: `${r.pct}%`, background: r.pct > 25 ? "var(--amb)" : "var(--grn)" }} /></div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: OWNERSHIP
   ═══════════════════════════════════════════════════ */
export function OwnershipTab() {
  return (
    <>
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Company profile (Companies House)</div>
          <Row l="Name" v="Meridian Property Holdings Ltd" />
          <Row l="Company no." v="05847291" mono />
          <Row l="Status" v="In Administration" color="red" />
          <Row l="Incorporated" v="18 Jun 2006" mono />
          <Row l="SIC code" v="68100 — Buying/selling own RE" />
          <div className={s.sep} />
          <div className={s.cardTitle}>Administration</div>
          <Row l="Administrator" v="Begbies Traynor" />
          <Row l="Appointed" v="14 Mar 2026" mono />
          <Row l="IP number" v="IP009241" mono />
          <div className={s.sep} />
          <div className={s.cardTitle}>Compliance</div>
          <Row l="Accounts" v="Overdue — last Jun 2024" color="red" />
          <Row l="Confirmation stmt" v="Overdue — last Jun 2024" color="red" />
          <Row l="CCJs" v="None" color="green" />
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Directors</div>
          <div className={s.directorCard}>
            <div className={s.dirName}>James Mitchell</div>
            <div className={s.dirStatus}>Resigned 28 Feb 2026</div>
            <Row l="Nationality" v="British" />
            <Row l="Appointed" v="18 Jun 2006" mono />
            <Row l="Other directorships" v="3 (all dormant)" mono />
            <Row l="Disqualifications" v="None" color="green" />
          </div>
          <div className={s.sep} />
          <div className={s.cardTitle}>Charges (2 registered)</div>
          <div className={s.chargeCard}>
            <Row l="1st charge" v="NatWest — £480,000" />
            <Row l="Created" v="15 Jul 2018" mono />
            <Row l="Type" v="Legal mortgage" />
          </div>
          <div className={s.chargeCard}>
            <Row l="2nd charge" v="Octopus RE — £350,000" />
            <Row l="Created" v="12 Dec 2025" mono />
            <Row l="Type" v="Bridging loan" />
          </div>
          <Row l="Total secured debt" v="£830,000" color="red" />
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>London Gazette notices</div>
        <div className={s.gazetteRow}><div className={s.gazDot} style={{ background: "var(--red)" }} /><div><div className={s.gazRef}>18 Mar 2026</div><div className={s.gazDesc}>Notice of appointment of administrator — Begbies Traynor</div></div></div>
        <div className={s.gazetteRow}><div className={s.gazDot} style={{ background: "var(--amb)" }} /><div><div className={s.gazRef}>22 Mar 2026</div><div className={s.gazDesc}>Statement of administrator&apos;s proposals — creditors&apos; meeting 15 Apr</div></div></div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Other properties (CCOD)</div>
        <table className={s.tbl}>
          <thead><tr><th>Property</th><th>Location</th><th>Type</th><th>Size</th><th>Est.</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Riverside Trade Centre, A</td><td>Strood</td><td>Industrial</td><td className={s.mono}>12,400</td><td className={s.mono}>£1.2M</td><td><span className={s.badge} data-type="red">Admin</span></td></tr>
            <tr><td>Phoenix Flex Warehouse</td><td>Gillingham</td><td>Warehouse</td><td className={s.mono}>6,800</td><td className={s.mono}>£650k</td><td><span className={s.badge} data-type="red">Admin</span></td></tr>
          </tbody>
        </table>
        <div className={s.portfolioOpp}>
          <div className={s.portfolioOppTitle}>Portfolio opportunity</div>
          <div className={s.portfolioOppText}>All 3 properties in administration. Combined est. £2.61M. Bulk approach to administrator could yield 30–40% portfolio discount.</div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: FINANCIALS
   ═══════════════════════════════════════════════════ */
export function FinancialsTab() {
  const [scenario, setScenario] = useState(0);
  const scenarios = ["Hold as-is", "MEES upgrade + let", "Refurb + sell"];

  return (
    <>
      <div className={s.grid3}>
        <div className={s.valCard}><div className={s.cardTitle}>Comparable sales</div><div className={s.valNum}>£760k</div><div className={s.valSub}>8 transactions · <span style={{ color: "var(--grn)" }}>High confidence</span></div></div>
        <div className={s.valCard}><div className={s.cardTitle}>Income capitalisation</div><div className={s.valNum}>£715k</div><div className={s.valSub}>ERV £53k · 5.5% yield</div></div>
        <div className={s.valCard}><div className={s.cardTitle}>Replacement cost</div><div className={s.valNum}>£820k</div><div className={s.valSub}>BCIS £85/sqft + land</div></div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Scenario modelling</div>
        <div className={s.scenarioTabs}>
          {scenarios.map((sc, i) => (
            <button key={sc} className={`${s.scTab} ${scenario === i ? s.scTabOn : ""}`} onClick={() => setScenario(i)}>{sc}</button>
          ))}
        </div>
        <div className={s.grid2}>
          <div>
            <div className={s.costHeader}>Acquisition</div>
            <Row l="Purchase price" v="£520,000" mono /><Row l="SDLT" v="£15,500" mono /><Row l="Solicitor" v="£3,500" mono />
            <Row l="Survey" v="£1,200" mono /><Row l="Agent fee" v="£0 (direct)" mono /><Row l="Total in" v="£543,700" mono />
            <div className={s.sep} />
            <div className={s.costHeader}>Income (annual)</div>
            <Row l="Gross rent (ERV)" v="£53,300" color="green" mono /><Row l="Void (3m)" v="−£13,325" mono />
            <Row l="Management (10%)" v="−£5,330" mono /><Row l="Insurance" v="−£2,800" mono />
            <Row l="Net income (yr 1)" v="£28,845" color="green" mono />
            <div className={s.sep} />
            <div className={s.costHeader}>Returns</div>
            <Row l="Net initial yield" v="5.3%" color="green" mono /><Row l="Yield on cost" v="9.8%" color="green" mono />
            <Row l="Total profit" v="£505,000" color="green" mono /><Row l="IRR" v="18.2%" color="green" mono />
            <Row l="Equity multiple" v="1.93×" color="green" mono /><Row l="DSCR (yr 1)" v="1.52×" color="green" mono />
          </div>
          <div>
            <div className={s.costHeader}>Adjust assumptions</div>
            {[
              { label: "Purchase price", val: "£520k" }, { label: "Rent growth (pa)", val: "2.5%" },
              { label: "Exit yield", val: "6.5%" }, { label: "LTV", val: "65%" },
              { label: "Interest rate", val: "5.5%" }, { label: "Hold period (years)", val: "5" },
              { label: "Void (months)", val: "3" },
            ].map((sl) => (
              <div key={sl.label} className={s.sliderGroup}>
                <div className={s.sliderHeader}><span>{sl.label}</span><span className={s.sliderVal}>{sl.val}</span></div>
                <input type="range" className={s.slider} />
              </div>
            ))}
            <div className={s.elevateCard}>
              <div className={s.elevateTitle}>ELEVATE INTEGRATION</div>
              <div className={s.elevateText}>Annual costs est. £11,130. Elevate can reduce by ~12% (£1,340/yr). Revised IRR: 18.8%.</div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Comparable transactions</div>
        <table className={s.tbl}>
          <thead><tr><th>Property</th><th>Type</th><th>Size</th><th>Price</th><th>£/sqft</th><th>Date</th><th>Dist.</th></tr></thead>
          <tbody>
            {[
              ["Medway Ind Pk U4", "Industrial", "8,400", "£840k", "£100", "Jan 26", "2.1mi"],
              ["Rochester Trade B", "Industrial", "9,200", "£805k", "£87", "Nov 25", "0.8mi"],
              ["Strood Logistics 2", "Industrial", "7,950", "£730k", "£92", "Sep 25", "3.2mi"],
              ["Gillingham Flex", "Industrial", "8,100", "£765k", "£94", "Aug 25", "4.5mi"],
              ["Sittingbourne Pk", "Industrial", "8,600", "£750k", "£87", "Jul 25", "6.1mi"],
            ].map(([addr, type, size, price, psf, date, dist]) => (
              <tr key={addr}><td>{addr}</td><td>{type}</td><td className={s.mono}>{size}</td><td className={s.mono}>{price}</td><td className={s.mono}>{psf}</td><td>{date}</td><td className={s.mono}>{dist}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: MARKET INTELLIGENCE
   Design: 06-market-intelligence-errors.html
   ═══════════════════════════════════════════════════ */
export function MarketTab() {
  return (
    <>
      <div className={s.ai}>
        <div className={s.aiLabel}>Market summary</div>
        <div className={s.aiText}>South East industrial is the strongest UK commercial sector. Medway corridor vacancy at 3.2% — cyclical low. Prime yields 5.0–5.5% despite rate headwinds. Admin-sale discount (25–35%) creates rare entry point into supply-constrained market. Base rate 4.50%, 2 further cuts priced for 2026.</div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Macro environment</div>
        <div className={s.grid3}>
          <div className={s.miCard}><div className={s.miVal}>4.50%</div><div className={s.miLabel}>BoE base rate</div><div className={s.miDelta} style={{ color: "var(--grn)" }}>↓ 75bp from peak</div></div>
          <div className={s.miCard}><div className={s.miVal}>4.85%</div><div className={s.miLabel}>5yr SONIA swap</div><div className={s.miDelta} style={{ color: "var(--grn)" }}>↓ 22bp (3m)</div></div>
          <div className={s.miCard}><div className={s.miVal}>2.8%</div><div className={s.miLabel}>CPI inflation</div><div className={s.miDelta} style={{ color: "var(--grn)" }}>↓ from 3.4%</div></div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Sector: SE industrial</div>
        <div className={s.grid2}>
          <div>
            <Row l="Prime yield" v="5.25%" mono /><Row l="Secondary yield" v="6.50%" mono />
            <Row l="Yield movement (12m)" v="−25bp (hardening)" color="green" />
            <Row l="Prime ERV" v="£8.50–9.00/sqft" mono /><Row l="Rental growth (12m)" v="+4.2%" color="green" mono />
          </div>
          <div>
            <Row l="Vacancy (Medway)" v="3.2% (historic low)" color="green" />
            <Row l="Take-up (12m)" v="285,000 sqft" color="green" mono />
            <Row l="New supply (12m)" v="142,000 sqft" mono />
            <Row l="Supply/demand" v="0.50× (undersupplied)" color="green" />
            <Row l="Transaction vol (12m)" v="£186M" mono />
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Rental evidence</div>
        <table className={s.tbl}>
          <thead><tr><th>Property</th><th>Size</th><th>Rent pa</th><th>£/sqft</th><th>Lease</th><th>Date</th></tr></thead>
          <tbody>
            {[
              ["Medway Ind Pk, U6", "7,800", "£60,840", "£7.80", "10yr (5yr break)", "Feb 26"],
              ["Rochester Trade, U3", "9,000", "£72,000", "£8.00", "5yr FRI", "Dec 25"],
              ["Strood Commerce, U1", "10,500", "£68,250", "£6.50", "10yr (3yr break)", "Nov 25"],
              ["Kingsnorth Ind, U12", "8,200", "£65,600", "£8.00", "15yr (5yr break)", "Oct 25"],
            ].map(([addr, size, rent, psf, lease, date]) => (
              <tr key={addr}><td>{addr}</td><td className={s.mono}>{size}</td><td className={s.mono}>{rent}</td><td className={`${s.mono} ${s.vGreen}`}>{psf}</td><td>{lease}</td><td>{date}</td></tr>
            ))}
          </tbody>
        </table>
        <div className={s.statRow} style={{ marginTop: 10 }}>
          <div className={s.statBox}><div className={s.statVal}>£7.72</div><div className={s.statSub}>Avg rent (£/sqft)</div></div>
          <div className={s.statBox}><div className={s.statVal}>£6.50–9.00</div><div className={s.statSub}>Range</div></div>
          <div className={s.statBox}><div className={`${s.statVal} ${s.vGreen}`}>£6.50</div><div className={s.statSub}>Subject ERV (conservative)</div></div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Financing environment</div>
        <div className={s.grid2}>
          <div>
            <Row l="Base rate" v="4.50%" mono /><Row l="Typical spread" v="+1.5–2.0%" mono />
            <Row l="All-in rate (65% LTV)" v="6.0–6.5%" mono />
            <Row l="ICR at 5.5%" v="1.52× (above min)" color="green" mono />
            <Row l="ICR at 6.5%" v="1.28× (just above)" color="amber" mono />
            <Row l="Break-even rate" v="7.9%" mono />
          </div>
          <div>
            <div className={s.costHeader}>Rate scenario impact</div>
            <Row l="Current (4.50%)" v="IRR 18.2%" color="green" mono />
            <Row l="Base + 50bp" v="IRR 16.8%" color="green" mono />
            <Row l="Base + 100bp" v="IRR 15.1%" mono />
            <Row l="Base − 50bp (cut)" v="IRR 19.7%" color="green" mono />
            <Row l="Base − 100bp (2 cuts)" v="IRR 21.4%" color="green" mono />
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   TAB: APPROACH
   Design: 02-dossier-full.html → "Approach"
   ═══════════════════════════════════════════════════ */
export function ApproachTab() {
  const [target, setTarget] = useState(0);
  const [tone, setTone] = useState("Formal");
  const [channel, setChannel] = useState("Post + PDF");
  const targets = [
    { label: "Administrator", desc: "Begbies Traynor — expedited disposal" },
    { label: "Lender (1st)", desc: "NatWest — receiver sale interest" },
    { label: "Former director", desc: "J. Mitchell — may have insight" },
    { label: "Bulk deal (all 3)", desc: "Portfolio offer to administrator" },
  ];

  return (
    <>
      <div className={s.grid2}>
        <div>
          <div className={s.card}>
            <div className={s.cardTitle}>Who are you approaching?</div>
            <div className={s.targetGrid}>
              {targets.map((t, i) => (
                <button key={t.label} className={`${s.targetOpt} ${target === i ? s.targetOn : ""}`} onClick={() => setTarget(i)}>
                  <div className={s.targetLabel}>{t.label}</div>
                  <div className={s.targetDesc}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className={s.card}>
            <div className={s.cardTitle}>Generated letter</div>
            <div className={s.letterView}>
              Dear Begbies Traynor,<br /><br />
              We write regarding <strong>Meridian Business Park Unit 7</strong>, Rochester ME2 4LR, within the administration of Meridian Property Holdings Ltd (05847291).<br /><br />
              We propose <strong>£480,000–£560,000</strong> for clean, unconditional completion within 60–90 days. This reflects the administration context and MEES upgrade requirements.<br /><br />
              Evidence pack available on request.<br /><br />
              Yours faithfully
            </div>
            <div className={s.chipRow}>
              <span className={s.chipRowLabel}>Tone:</span>
              {["Formal", "Direct", "Consultative"].map((t) => (
                <button key={t} className={`${s.chip} ${tone === t ? s.chipOn : ""}`} onClick={() => setTone(t)}>{t}</button>
              ))}
            </div>
            <div className={s.chipRow}>
              <span className={s.chipRowLabel}>Via:</span>
              {["Post + PDF", "Email", "Phone script"].map((c) => (
                <button key={c} className={`${s.chip} ${channel === c ? s.chipOn : ""}`} onClick={() => setChannel(c)}>{c}</button>
              ))}
            </div>
            <div className={s.letterActions}>
              <button className={s.btnP}>Send & track</button>
              <button className={s.btnS}>Edit letter</button>
              <button className={s.btnS}>Regenerate</button>
            </div>
          </div>
        </div>

        <div>
          <div className={s.card}>
            <div className={s.cardTitle}>DD checklist</div>
            {[
              { done: true, label: "Title check", sub: "Clean title, freehold absolute" },
              { done: true, label: "Charges register", sub: "NatWest £480k, Octopus £350k" },
              { done: true, label: "Tenancy status", sub: "Confirmed vacant" },
              { done: true, label: "EPC verified", sub: "Rating D, valid Aug 2033" },
              { done: true, label: "Planning history", sub: "No adverse applications" },
              { done: true, label: "Flood risk", sub: "Zone 1 — very low" },
              { done: false, label: "Environmental report", sub: "Phase 1 — est. £800" },
              { done: false, label: "Building survey", sub: "Condition — est. £1,200" },
              { done: false, label: "Local searches", sub: "LA + water — est. £300" },
              { done: false, label: "Asbestos survey", sub: "Management — est. £600" },
            ].map((item) => (
              <div key={item.label} className={s.ddRow}>
                <div className={`${s.ddBox} ${item.done ? s.ddDone : s.ddOpen}`}>{item.done ? "✓" : ""}</div>
                <div><div className={s.ddLabel} style={{ color: item.done ? "var(--tx)" : "var(--amb)" }}>{item.label}</div><div className={s.ddSub}>{item.sub}</div></div>
              </div>
            ))}
            <div className={s.sep} />
            <Row l="Completed" v="6 of 10" color="green" mono />
            <Row l="Remaining DD cost" v="£2,900" color="amber" mono />
          </div>

          <div className={s.card}>
            <div className={s.cardTitle}>Negotiation leverage</div>
            <div className={s.levBuy}>
              <div className={s.levTitle}>Favours buyer</div>
              {["Administration = speed critical", "Total debt (£830k) exceeds net proceeds", "MEES upgrade required (£35k)", "Director resigned", "Bridging loan — high pressure"].map((p) => (
                <div key={p} className={s.levItem}>{p}</div>
              ))}
            </div>
            <div className={s.levSell}>
              <div className={s.levTitle}>Favours seller</div>
              {["Industrial demand high in Medway", "Freehold — unencumbered", "Admin can still market/auction", "Clean title"].map((p) => (
                <div key={p} className={s.levItem}>{p}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
