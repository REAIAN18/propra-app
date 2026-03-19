# Arca Design System
## UI Specification & Implementation Guide

> **Status:** Ready to implement  
> **Applies to:** `arca-app-production.up.railway.app` — all 9 screens  
> **Stack:** Next.js · Tailwind CSS · Instrument Serif (already loaded)

---

## 1. Brand Tokens

```css
/* globals.css — add these CSS variables */
:root {
  --ink:        #0B1622;   /* Primary dark — hero backgrounds, sidebar */
  --ink-mid:    #0E1C30;   /* Hero gradient end */
  --ink-deep:   #080F1A;   /* Hero gradient fade */
  --green:      #0A8A4C;   /* Action green — buttons, "Arca does this" */
  --gain:       #5BF0AC;   /* Gain green — positive numbers, rec titles */
  --amber:      #F5A94A;   /* Warning amber — below benchmark, overpay */
  --amber-dark: #B85C00;   /* Amber text on white — G2N below bench */
  --blue:       #1647E8;   /* Decision blue — strategic context */
  --blue-lt:    #A8C5FF;   /* Blue light — secondary data */
  --red:        #CC1A1A;   /* Alert red — fines, expired certs */
  --red-lt:     #FF8080;   /* Red display — fine exposure amounts */
  --white:      #FFFFFF;
  --light:      #F1F5F9;   /* Card background */
  --border:     #E2E8F0;   /* Card borders */
  --mid:        #64748B;   /* Muted text */
  --body:       #1E293B;   /* Body copy */
}
```

---

## 2. Typography

Instrument Serif is already loaded. Apply it to all display numbers:

```css
/* globals.css */
.display-num {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 2.75rem;
  line-height: 1;
  letter-spacing: -0.02em;
}
.display-num-lg {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 3.5rem;
  line-height: 1;
  letter-spacing: -0.025em;
}
.display-num-sm {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 1.75rem;
  line-height: 1;
  letter-spacing: -0.015em;
}
```

**Apply `display-num` class to:**
- All `text-3xl font-bold` stat card values
- G2N percentage, NOI figures, portfolio value
- Hold vs Sell exit value, IRR/Return figures
- Hero strip values

---

## 3. Stat Card Grid

**Current Tailwind classes:** `.grid.grid-cols-2.lg:grid-cols-4 > *`

**Required changes:**
```tsx
// BEFORE
<div className="rounded-lg p-4 ...">

// AFTER  
<div className="rounded-2xl p-5 ...">
  {/* Label */}
  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">
    {label}
  </p>
  {/* Value — use display-num class */}
  <p className="display-num" style={{ color: valueColor }}>
    {value}
  </p>
  {/* Sub-label */}
  <p className="text-[9px] text-white/35 mt-1">{sub}</p>
</div>
```

**Colour rules for stat card values:**
| Stat | Colour | Reasoning |
|------|--------|-----------|
| G2N Ratio (below benchmark) | `#F5A94A` amber | Warning — action needed |
| G2N Ratio (on benchmark) | `#5BF0AC` gain | Good — no action |
| Total Opportunity | `#F5A94A` amber | Money being left |
| Gross Income | `#FFFFFF` white | Factual — no signal |
| Avg Occupancy (≥95%) | `#5BF0AC` gain | |
| Avg Occupancy (<90%) | `#F5A94A` amber | |
| Annual Overpay (insurance/energy) | `#FF8080` red | Loss |
| Market Rate | `#5BF0AC` gain | What it could be |
| Commission | `#5BF0AC` gain | |

---

## 4. Page Hero Component

Used on: Dashboard, Insurance, Energy, Compliance, Rent Clock

```tsx
// components/PageHero.tsx
interface PageHeroProps {
  greeting?: string;        // Dashboard only — "Good morning, Joe."
  title?: string;           // Other pages — "Insurance — FL Mixed Portfolio"
  subtitle?: string;        // Dashboard only — date + time
  cells: {
    label: string;
    value: string;
    valueColor?: string;    // defaults to white
    sub: string;
    subColor?: string;      // defaults to white/35
  }[];
}

export function PageHero({ greeting, title, subtitle, cells }: PageHeroProps) {
  return (
    <div
      className="rounded-2xl px-7 pt-6 pb-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(170deg, #0B1622 0%, #0E1C30 65%, #080F1A 100%)' }}
    >
      {/* Green radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 72% -10%, rgba(91,240,172,.08) 0%, transparent 68%)' }}
      />
      <div className="relative z-10">
        {/* Greeting or title */}
        {greeting ? (
          <>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, color: '#fff', lineHeight: 1.15, marginBottom: 2 }}>
              {greeting}
            </h1>
            <p className="text-[11px] text-white/30 mb-4">{subtitle}</p>
          </>
        ) : (
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22, color: '#fff', lineHeight: 1.15, marginBottom: 14, fontWeight: 400 }}>
            {title}
          </h1>
        )}

        {/* 4-cell context strip */}
        <div
          className="grid grid-cols-4 rounded-xl overflow-hidden"
          style={{ gap: 1, background: 'rgba(255,255,255,.07)' }}
        >
          {cells.map((cell, i) => (
            <div key={i} className="px-3 py-2.5" style={{ background: 'rgba(255,255,255,.04)' }}>
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-1">{cell.label}</p>
              <p
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: 18,
                  color: cell.valueColor || '#fff',
                  lineHeight: 1,
                  marginBottom: 2
                }}
              >
                {cell.value}
              </p>
              <p className="text-[9px]" style={{ color: cell.subColor || 'rgba(255,255,255,.35)' }}>{cell.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Action Alert Component

Used on: Dashboard (red — compliance/fines), Compliance page (red), Rent Clock (amber)

```tsx
// components/ActionAlert.tsx
interface ActionAlertProps {
  type: 'red' | 'amber';
  icon: string;                // emoji
  title: string;
  description: string;
  badges?: { label: string; type: 'red' | 'amber' | 'blue' }[];
  valueDisplay?: string;       // e.g. "$116k"
  valueSub?: string;           // e.g. "fine exposure"
  href?: string;               // click destination
}

export function ActionAlert({ type, icon, title, description, badges, valueDisplay, valueSub, href }: ActionAlertProps) {
  const borderColor = type === 'red' ? 'rgba(204,26,26,.22)' : 'rgba(245,169,74,.25)';
  const bgColor = type === 'red' ? 'rgba(204,26,26,.06)' : 'rgba(245,169,74,.06)';
  const valueColor = type === 'red' ? '#FF8080' : '#F5A94A';

  return (
    <div
      className="rounded-2xl px-5 py-3.5 flex items-center gap-3.5 cursor-pointer transition-all"
      style={{ background: bgColor, border: `1.5px solid ${borderColor}` }}
      onClick={() => href && (window.location.href = href)}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="text-[15px] font-bold text-white mb-0.5">{title}</p>
        <p className="text-[11px] text-white/45 mb-2">{description}</p>
        {badges && (
          <div className="flex gap-1.5 flex-wrap">
            {badges.map((b, i) => (
              <span
                key={i}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: b.type === 'red' ? 'rgba(204,26,26,.2)' : b.type === 'amber' ? 'rgba(245,169,74,.15)' : 'rgba(22,71,232,.2)',
                  color: b.type === 'red' ? '#FF8080' : b.type === 'amber' ? '#F5A94A' : '#A8C5FF'
                }}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {valueDisplay && (
        <div className="flex-shrink-0 text-right">
          <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 26, color: valueColor, lineHeight: 1 }}>
            {valueDisplay}
          </p>
          {valueSub && <p className="text-[10px] text-white/35 mt-0.5">{valueSub}</p>}
        </div>
      )}
    </div>
  );
}
```

---

## 6. G2N Comparison Card (replaces Dashboard chart)

Replaces the "G2N Performance" line chart on the dashboard:

```tsx
// components/G2NComparisonCard.tsx
interface G2NCardProps {
  className?: string;
  g2nPct: number;           // e.g. 67
  benchLow: number;         // e.g. 72
  benchHigh: number;        // e.g. 78
  grossIncome: string;      // e.g. "$3.2M"
  totalOpex: string;        // e.g. "-$1.0M"
  opexVsBench: string;      // e.g. "↓ $183k above benchmark"
  noi: string;              // e.g. "$2.2M"
  benchLabel: string;       // e.g. "bench 72–78%"
  calloutText: string;      // e.g. "Recovering this gap adds $183k/yr NOI..."
  onCalloutClick?: () => void;
}

export function G2NComparisonCard({ className, g2nPct, benchLow, benchHigh, grossIncome, totalOpex, opexVsBench, noi, benchLabel, calloutText, onCalloutClick }: G2NCardProps) {
  const isBelow = g2nPct < benchLow;

  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: '#fff', border: '1.5px solid rgba(245,169,74,.3)' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gross to Net — Portfolio</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Benchmark {benchLow}–{benchHigh}% · Click to fix →</p>
        </div>
        <div className="text-right">
          <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, color: '#B85C00', lineHeight: 1 }}>
            {g2nPct}%
          </p>
          <p className="text-[10px] font-bold text-amber-700">{isBelow ? '↓ Below benchmark' : '✓ On benchmark'}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden relative mb-3">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${g2nPct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-black/15" style={{ left: `${benchLow}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-black/15" style={{ left: `${benchHigh}%` }} />
      </div>

      {/* 3-cell breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Gross Income', value: grossIncome, color: '#0B1622', sub: 'rental income/yr' },
          { label: 'Total Opex', value: totalOpex, color: '#CC1A1A', sub: opexVsBench, subColor: '#B85C00' },
          { label: 'NOI (Net)', value: noi, color: '#B85C00', sub: benchLabel },
        ].map((cell, i) => (
          <div key={i} className="bg-slate-100 rounded-xl p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500 mb-1">{cell.label}</p>
            <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 17, color: cell.color, lineHeight: 1, marginBottom: 2 }}>
              {cell.value}
            </p>
            <p className="text-[9px]" style={{ color: cell.subColor || '#94A3B8' }}>{cell.sub}</p>
          </div>
        ))}
      </div>

      {/* Callout */}
      <div
        className="mt-2.5 px-3 py-2.5 rounded-xl text-[11px] cursor-pointer"
        style={{ background: 'rgba(245,169,74,.06)', border: '1px solid rgba(245,169,74,.18)', color: '#B85C00' }}
        onClick={onCalloutClick}
        dangerouslySetInnerHTML={{ __html: calloutText }}
      />
    </div>
  );
}
```

---

## 7. "Arca Does This" Callout

Used on Insurance and Energy — green left-border callout explaining Arca's execution:

```tsx
// components/ArcaDirectCallout.tsx
export function ArcaDirectCallout({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="py-3 px-4.5 rounded-r-2xl"
      style={{ background: 'rgba(91,240,172,.04)', border: '1px solid rgba(91,240,172,.18)', borderLeft: '3px solid #0A8A4C' }}
    >
      <p className="text-[13px] font-bold mb-0.5" style={{ color: '#5BF0AC' }}>{title}</p>
      <p className="text-[11px] text-white/50">{body}</p>
    </div>
  );
}
```

**Usage:**

```tsx
// Insurance page
<ArcaDirectCallout
  title="Arca places this direct — no broker, no markup"
  body="Portfolio consolidation across 5 assets unlocks London & New York market rates. Typical saving 22–30% vs incumbent. Arca manages the entire retender end to end."
/>

// Energy page
<ArcaDirectCallout
  title="Arca switches the supplier contract — no action needed from you"
  body="Portfolio volume unlocks commercial tariffs. Saving 22–28% vs incumbent. Arca handles usage audit, supplier negotiation and contract placement."
/>
```

---

## 8. Hold vs Sell — Recommendation Card

Replaces the missing recommendation section above Per-Asset Analysis:

```tsx
// components/HoldSellRecommendation.tsx
interface HVSRecProps {
  portfolioName: string;
  title: string;             // "Hold & Optimise for 3 years"
  subtitle: string;          // plain English rationale
  exitValue: string;         // "$27.9M"
  comparisonValue: string;   // "vs $18.4M selling today"
  onOptimise?: () => void;
  onTestMarket?: () => void;
}

export function HoldSellRecommendation({ portfolioName, title, subtitle, exitValue, comparisonValue, onOptimise, onTestMarket }: HVSRecProps) {
  return (
    <div
      className="rounded-2xl px-6 py-5 flex items-center justify-between gap-5"
      style={{ background: 'linear-gradient(135deg, #071510 0%, #040D09 100%)', border: '1px solid rgba(91,240,172,.18)' }}
    >
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(91,240,172,.4)' }}>
          Recommendation — {portfolioName}
        </p>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 23, color: '#5BF0AC', lineHeight: 1.2, marginBottom: 5 }}>
          {title}
        </p>
        <p className="text-[11px] text-white/40 mb-3">{subtitle}</p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white"
            style={{ background: '#0A8A4C', border: 'none' }}
            onClick={onOptimise}
          >
            Start optimising →
          </button>
          <button
            className="px-4 py-2 rounded-lg text-[12px] text-white/55"
            style={{ background: 'rgba(255,255,255,.08)', border: 'none' }}
            onClick={onTestMarket}
          >
            Test the market
          </button>
        </div>
      </div>
      <div className="flex-shrink-0 text-right min-w-[140px]">
        <p className="text-[10px] text-white/35 mb-1">Est. exit value</p>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 30, color: '#fff', lineHeight: 1 }}>
          {exitValue}
        </p>
        <p className="text-[10px] mt-1" style={{ color: 'rgba(91,240,172,.5)' }}>{comparisonValue}</p>
      </div>
    </div>
  );
}
```

**IRR label rename — find and replace in `hold-sell/page.tsx`:**

| Old label | New label |
|-----------|-----------|
| `Hold IRR` | `Hold Return` |
| `Sell IRR` | `Exit Return` |
| `IRR Delta` | `Gain from selling` |
| `Portfolio Hold IRR` | `Portfolio Hold Return` |

---

## 9. Sidebar — Urgency Badges

In `components/Sidebar.tsx` (or wherever nav renders), add badge counts to these items:

```tsx
// In your nav item render
const NAV_BADGES: Record<string, { count: string; type: 'red' | 'amber' }> = {
  '/insurance':  { count: '!', type: 'amber' },
  '/compliance': { count: '6', type: 'red'   },
  '/rent-clock': { count: '3', type: 'amber' },
};

// In your nav link JSX
{NAV_BADGES[item.href] && (
  <span
    className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
    style={{
      color:      NAV_BADGES[item.href].type === 'red' ? '#FF8080' : '#F5A94A',
      background: NAV_BADGES[item.href].type === 'red' ? 'rgba(204,26,26,.2)' : 'rgba(245,169,74,.15)',
    }}
  >
    {NAV_BADGES[item.href].count}
  </span>
)}
```

> **Note:** These should eventually come from live data — compliance cert counts, lease expiry counts, insurance review triggers.

---

## 10. Per-Page Implementation Checklist

### Dashboard `/dashboard`
- [ ] Add `<PageHero>` with greeting + 4 cells (Properties, Portfolio Value, G2N Ratio, Passing Rent/sf)
- [ ] Add `<ActionAlert type="red">` before stat grid (11 items, $116k, Compliance/Lease/Insurance badges)
- [ ] Add `border-l-[3px] border-amber-400` to G2N stat card
- [ ] Change Gross Income value colour from `text-[#1647E8]` → `text-white`
- [ ] Replace G2N line chart with `<G2NComparisonCard>`
- [ ] Add context lines to Opportunity Buckets: "above market rate · Arca retenders direct" etc.
- [ ] Hide `<h1>Dashboard</h1>` (hero replaces it)

### Insurance `/insurance`
- [ ] Add `<PageHero>` (Current Premium, Market Rate, Annual Overpay, Commission)
- [ ] Add `<ArcaDirectCallout>` before chart
- [ ] Annual Overpay stat value: `text-[#FF8080]` not amber

### Energy `/energy`
- [ ] Add `<PageHero>` (Annual Spend, Market Rate, Overspend, Anomalies)
- [ ] Add `<ArcaDirectCallout>` before chart
- [ ] Energy overpay progress bars: `bg-[#F5A94A]` not `bg-[#1647E8]` (overpay = amber, not blue)

### Compliance `/compliance`
- [ ] Add `<PageHero>` (Fine Exposure, Expired, Due <30 days, Compliant)
- [ ] Add `<ActionAlert type="red">` ($116k fine exposure, "Act now")
- [ ] Expired items: `border-l-4 border-[#CC1A1A]`
- [ ] Upcoming items: `border-l-4 border-[#F5A94A]`

### Rent Clock `/rent-clock`
- [ ] Add `<PageHero>` (WAULT, Rent at Risk, ERV Gap, Value at WAULT target)
- [ ] Add `<ActionAlert type="amber">` (Alpha Logistics 32-day expiry warning)
- [ ] Days remaining colour coding: `<30d` red, `<90d` amber, `>90d` green

### Hold vs Sell `/hold-sell`
- [ ] Add `<HoldSellRecommendation>` above Per-Asset Analysis
- [ ] Rename all IRR labels (see table above)
- [ ] Portfolio Hold Return and Exit Return stat card labels updated

### AI Scout `/scout`
- [ ] Add "Day 1 after completion" callout to each deal card:
  ```tsx
  <div className="mt-2.5 px-3 py-2.5 rounded-xl text-[11px]"
       style={{ background: 'rgba(91,240,172,.05)', border: '1px solid rgba(91,240,172,.14)', color: 'rgba(255,255,255,.6)' }}>
    <strong style={{ color: '#5BF0AC' }}>Day 1 after completion:</strong>{' '}
    Arca runs insurance retender + utility audit — typical $18k–$52k/yr saving identified within 48 hours
  </div>
  ```

### Ask Arca `/ask`
- [ ] Enlarge prompt cards: `py-5 px-5`
- [ ] Hide description `<p>` tags inside prompt cards (keep title only)
- [ ] Add 4 new prompt buttons:
  - "What should I do first this week?"
  - "Show me my rent review strategy"
  - "Where am I losing the most money?"
  - "Which asset should I consider selling?"

---

## 11. Colour Quick-Reference

| Use case | Hex | Tailwind equiv |
|----------|-----|----------------|
| Display numbers (neutral) | `#FFFFFF` | `text-white` |
| Gains / positive numbers | `#5BF0AC` | `text-[#5BF0AC]` |
| Warnings / below benchmark | `#F5A94A` | `text-[#F5A94A]` |
| Warning text on white bg | `#B85C00` | `text-[#B85C00]` |
| Losses / overpay amounts | `#FF8080` | `text-[#FF8080]` |
| Critical / fine exposure | `#CC1A1A` | `text-[#CC1A1A]` |
| Market rate / benchmark | `#5BF0AC` | `text-[#5BF0AC]` |
| Commission (Arca fee) | `#5BF0AC` | `text-[#5BF0AC]` |
| Decisions / strategy | `#1647E8` | `text-[#1647E8]` |
| Muted text | `#64748B` | `text-slate-500` |
| Hero backgrounds | `#0B1622` | `bg-[#0B1622]` |

---

## 12. Key Design Principles

1. **See it → Understand it → Do it.** Every screen answers: what's the issue, what does it cost, what does Arca do about it.

2. **Instrument Serif for display numbers only.** Body text, labels, table data stay in the system font. The contrast between serif numbers and sans-serif labels is intentional.

3. **Colour signals action, not decoration.** Amber = watch. Red = act now. Green = good or "Arca handles this". Blue = strategic/decision. White = neutral fact.

4. **Arca's commercial model on every action screen.** Insurance, Energy, and Scout screens should all communicate "Arca does this for you — and earns only when it saves you money." Not just data. Execution.

5. **Numbers over charts.** The target user (owner-operator, attention-deficit real estate professional) reads numbers instantly. They don't read charts. Replace line charts with direct comparison cells wherever possible.

6. **Dark hero, white content.** Dark gradient hero section for context and orientation. White content cards for data and actions. This creates a visual hierarchy that makes the most important number (portfolio value, G2N gap, fine exposure) immediately visible.
