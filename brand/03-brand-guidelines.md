# Brand Guidelines
**Brand:** Arca
**Version:** 1.0 — Launch | 2026-03-17
**Status:** Executable — ship from this document

---

## 1. Brand Essence

**What we are:** The operating system for commercial property portfolios.
**What we do:** Surface every gap between what a portfolio earns and what it should. Then close it.
**How we do it:** Commission-only. AI-powered. No invoice until you're ahead.
**Who we're for:** Commercial owner-operators. 3–30 assets. FL and SE UK.

One sentence: *Arca finds the money in your portfolio and puts it in your pocket.*

---

## 2. Name

**Brand name:** Arca
**Usage:** Always capitalised as "Arca" — not "ARCA," not "arca."
**Domain:** `arca.ai` (primary) | `getarca.com` (redirect)
**Product references:** "the Arca platform," "your Arca dashboard," "Ask Arca" — avoid "the Arca app" in enterprise context.
**Tagline pairing:** "Arca. Every asset earning what it should." — use in full on first brand exposure (homepage hero, pitch deck cover, OOH).

---

## 3. Logo

### Concept
The Arca mark is built from the arch — the oldest load-bearing structure in architecture. An arch distributes weight across a curve to support what sits above it. That's exactly what Arca does: distributes intelligence across a portfolio to support the owner-operator.

### Mark Description
- **Primary mark:** A clean geometric arch/arc form, proportioned as a half-circle. Thick stroke, no fill — structural, open, confident.
- **Wordmark:** "Arca" set in Instrument Serif, tracked slightly wide (+20). The serif letterforms contrast with the geometric mark, creating tension between heritage and precision.
- **Lockup:** Mark sits to the left of wordmark, vertically centred on the cap-height. Standard horizontal lockup. Stacked lockup (mark above wordmark) for square contexts.
- **Icon-only use:** The arch mark alone, used at small sizes (favicon, app icon, social avatar).

### Construction Rules
- Minimum clear space: equal to the cap-height of the wordmark on all sides
- Minimum size: wordmark no smaller than 80px wide on screen, 20mm in print
- Do not rotate, skew, outline, or add effects to the mark
- Do not place the mark on a mid-tone background where contrast drops below 4.5:1

### Logo Variants
| Variant | Background | Use |
|---|---|---|
| Primary | Dark Navy (#0B1622) | Hero sections, dark UI, pitch decks |
| Reversed | White (#FFFFFF) | Light backgrounds, print, docs |
| Mono Dark | Black | Single-colour print, legal |
| Mono Light | White | Embossed, foiled, reverse print |

---

## 4. Colour

### Primary Palette

| Name | Hex | RGB | Use |
|---|---|---|---|
| **Vault** (Dark Navy) | `#0B1622` | 11, 22, 34 | Primary background, hero sections, dark UI |
| **Gain** (Green) | `#0A8A4C` | 10, 138, 76 | Primary action, savings indicators, CTAs, positive signals |
| **Signal** (Amber) | `#F5A94A` | 245, 169, 74 | Alerts, urgency, opportunity flags, rent clock warnings |
| **Decision** (Blue) | `#1647E8` | 22, 71, 232 | Interactive elements, links, selected states, acquisitions module |

### Secondary Palette

| Name | Hex | Use |
|---|---|---|
| **Stone** | `#F2EFE9` | Light background surfaces, cards on white |
| **Slate** | `#6B7280` | Body text on light backgrounds, captions |
| **Chalk** | `#FFFFFF` | Pure white — primary text on dark, reverse logo |
| **Graphite** | `#1C2B3A` | Card backgrounds on dark UI, secondary panels |

### Colour Rules

**Never use Gain (green) for losses or problems.** Green = positive outcome only. Red is not in the palette — use Signal Amber for warnings, Slate for neutral states.

**Vault is always the primary background.** The dark-first interface establishes premium seriousness. Don't invert to white-first for the core product UI.

**Decision Blue is action, not decoration.** Use it for interactive elements, links, and the acquisitions/analytics modules. Not as a background fill.

**Signal Amber is urgency, not celebration.** Reserve for: rent clock warnings, compliance expiry, cost anomalies, overdue actions. Not for success states.

### Colour Combinations (approved)

| Foreground | Background | Use |
|---|---|---|
| Chalk | Vault | Primary UI — all hero text |
| Gain | Vault | Savings figures, positive delta indicators |
| Signal | Vault | Warning labels, urgency states |
| Vault | Gain | Primary CTA button |
| Vault | Chalk | Light-mode cards, print |
| Stone | Graphite | Secondary card surfaces |

---

## 5. Typography

### Type System

| Role | Typeface | Weight | Use |
|---|---|---|---|
| **Display** | Instrument Serif | Regular | Hero headlines, large numbers, portfolio totals |
| **Display Italic** | Instrument Serif | Italic | Pullquotes, emphasis within display, tagline |
| **UI / Body** | Geist | Regular (400) | All body copy, labels, descriptions |
| **UI Emphasis** | Geist | Medium (500) | Sub-headers, bold labels, nav items |
| **UI Strong** | Geist | SemiBold (600) | Button labels, column headers, KPI labels |
| **Data** | Geist Mono | Regular | Numbers in tables, figures, code, IDs |

### Type Scale (web)

| Token | Size | Line Height | Use |
|---|---|---|---|
| `display-xl` | 64px | 1.1 | Hero headline |
| `display-lg` | 48px | 1.15 | Section headline |
| `display-md` | 36px | 1.2 | Card headline, portfolio total |
| `heading-lg` | 24px | 1.3 | Module heading |
| `heading-md` | 20px | 1.35 | Sub-section heading |
| `body-lg` | 16px | 1.6 | Primary body copy |
| `body-md` | 14px | 1.55 | UI labels, secondary copy |
| `caption` | 12px | 1.5 | Captions, helper text |
| `data-lg` | 32px | 1.0 | Portfolio totals, KPI numbers |
| `data-md` | 20px | 1.0 | Card metrics |

### Number Treatment
Large financial figures are always set in Instrument Serif. This is the single most important typographic rule for the product — it creates the visual signal that this is a platform built around money.

- Portfolio total: `display-md` or `data-lg` in Instrument Serif, Chalk on Vault
- Savings figure: `data-md` in Instrument Serif, Gain green
- Warning figure: `data-md` in Instrument Serif, Signal amber
- Table data: `body-md` in Geist Mono

### Type Don'ts
- Do not use Instrument Serif at body size (below 20px)
- Do not use Geist for hero headlines
- Do not use all-caps in running body copy
- Do not use more than two typefaces in a single layout

---

## 6. Iconography

### Style
- Line icons, 1.5px stroke, rounded joins, no fill
- Icon grid: 24×24px (standard), 16×16px (compact), 32×32px (feature callout)
- Consistent stroke weight across all icons in a layout
- Source: Lucide Icons (matches existing tech stack) — extend only when a required icon doesn't exist

### Custom Icons (product-specific)
The following concepts should have custom-designed icons distinct from generic proptech:
- G2N Benchmarking (scales/balance with upward arrow)
- Rent Clock (clock face integrated with a lease document)
- Hold vs Sell (two-path fork with asset at the decision point)
- Arca Arch mark at icon size (for "Ask Arca" entry points)

---

## 7. Photography & Imagery

### Approach
Real assets, real detail. No stock photo people shaking hands. No aerial drone shots of generic CBDs.

**Use:**
- Close architectural detail (facades, materials, structural elements)
- Aerial or street-level shots of actual asset types in the portfolio (industrial sheds, retail, logistics)
- Night photography with lit windows — occupied, productive assets
- Abstract structural photography: arches, load-bearing elements, geometric order

**Avoid:**
- Generic business photography (meetings, handshakes, laptops)
- Residential property (flats, houses — this is commercial)
- Overly aspirational lifestyle imagery
- Stock photography with watermarks or obvious staging

### Image Treatment
- Primary treatment: Vault overlay at 60-80% opacity over photography — creates dark, consistent brand tone
- Accent: add a Gain green or Signal amber crop/border to create energy
- Never apply filters that desaturate or stylise in ways inconsistent with the palette

---

## 8. Data Visualisation

The product lives in charts, tables, and metrics. Data visualisation is a primary brand expression.

### Chart Palette

| Colour | Hex | Data use |
|---|---|---|
| Gain | `#0A8A4C` | Positive: savings, income, above-benchmark |
| Signal | `#F5A94A` | Warning: at-risk, approaching threshold |
| Decision | `#1647E8` | Selected state, active period, acquisitions |
| Slate | `#6B7280` | Baseline, benchmark, market average |
| Chalk | `#FFFFFF` | Labels on dark backgrounds |

### Chart Rules
- All charts default dark (Vault background)
- Grid lines: Graphite (#1C2B3A) — present but subtle
- No 3D charts, no pie charts with more than 3 segments
- All axes labelled; all currency figures include currency symbol and unit
- Every chart has a single-sentence insight label above it (not just a title): "Insurance is 28% above market rate" not "Insurance costs"

---

## 9. Motion & Animation

### Principles
- Motion is purposeful — it communicates change, not decoration
- Duration: 150ms for micro-interactions, 300ms for panel transitions, 500ms for hero entrances
- Easing: ease-out for entrances, ease-in-out for state transitions
- No looping animations except loading states

### Key Animations
- **Number reveal:** KPI figures count up from 0 on first load — creates the "found money" sensation
- **Savings indicator:** Green bar grows from left to right when a saving is identified
- **Warning pulse:** Signal amber subtly pulses (1×) on first display of an urgent item — then static
- **Arch entrance:** On homepage hero, the Arca arch mark draws itself (stroke-dashoffset) — 600ms, ease-out

---

## 10. Voice & Content Standards

### Headlines
- Active verb or implied verb: "Find the gap." / "Rent Clock running." / "£52k sitting in your energy bill."
- Present tense whenever possible
- No question marks in hero headlines — Arca doesn't ask, it tells

### CTAs
| Context | CTA Text |
|---|---|
| Homepage hero | "See your portfolio" |
| Demo / sales | "Get your portfolio health check" |
| Insurance | "Place direct" |
| Energy | "Switch now" |
| Acquisitions | "Run the numbers" |
| Ask Arca | "Ask Arca" |
| General action | "Fix this" |

Never use: "Learn more," "Click here," "Get started," "Sign up for free"

### Numbers and Figures
- Always use £ for UK, $ for US — never mix in a single document
- Round to nearest £1,000 in headlines; full precision in tables
- Always state the time period: "£52,000/year" not "£52,000"
- Show the source or basis where credibility matters: "vs direct market rate" / "vs ERV"

---

## 11. Application Examples

### Homepage Hero
```
[Arca arch mark]    ARCA
─────────────────────────────────────
Every asset earning what it should.

Your portfolio is leaving £412,000
on the table this year.

                    [See your portfolio →]

Most property software tells you what's wrong.
Arca fixes it.
```

### Savings Card (UI)
```
┌─────────────────────────────────┐
│ INSURANCE          ↑ SAVE £18k  │
│                                 │
│ Current premium    £47,200/yr   │
│ Market rate        £29,000/yr   │
│ Overpay            £18,200      │
│                                 │
│ Arca places direct. No broker.  │
│                    [Place now →] │
└─────────────────────────────────┘
```

### Pitch Deck Cover
```
[Full-bleed Vault background]
[Arch photography — load-bearing structure, close detail]
[60% Vault overlay]

                    arca.
    Every asset earning what it should.

    [Instrument Serif, 48px, Chalk]
```

---

## 12. Brand Don'ts

| Don't | Why |
|---|---|
| Use ARCA in all-caps | Reads as an acronym — it's a name |
| Use red anywhere | Not in palette; contradicts the "we fix it" positioning |
| Show a dashboard screenshot in the homepage hero | Leads with software, not outcomes |
| Use "smart," "seamless," or "end-to-end" | Generic proptech language |
| Lead with the AI | Buyers don't want AI, they want money |
| Apologise in copy | "We try to..." / "You may find..." — never |
| Mix currency symbols | UK content: £ throughout; US content: $ throughout |

---

## 13. Brand Assets Checklist (Pre-Launch)

- [ ] Logo files: SVG, PNG (2x, 3x), ICO — all variants
- [ ] Favicon: 32×32, 16×16 — arch mark only
- [ ] OG image: 1200×630 — hero card for social sharing
- [ ] Email signature: wordmark + domain, Geist, no tagline
- [ ] Pitch deck template: Keynote/PowerPoint — dark theme, Vault background
- [ ] One-pager PDF: portfolio health check offer
- [ ] Domain: arca.ai registered, SSL, redirects from getarca.com
- [ ] Social handles: @arcahq or @getarca (check availability on LinkedIn, X)
- [ ] Google Fonts: Instrument Serif + Geist loaded in `next/font`

---

*This document is the executable brief. Design, engineering, and content teams should work directly from this. Questions go to brand lead. No version except this one is authoritative.*
