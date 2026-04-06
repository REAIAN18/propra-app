# DEALSCOPE — EXECUTIVE SUMMARY

## THE OPPORTUNITY

Commercial property acquisition teams currently use:
- **Manual spreadsheets** (error-prone, slow)
- **Generic CRE platforms** (PropStream, LoopNet) — data displays, not analysis tools
- **In-house models** — inconsistent, not validated against market

**Gap:** No tool that combines AI extraction + RICS-aligned valuations + assumption validation + learning intelligence.

## THE SOLUTION

DealScope: **AI-powered commercial property acquisition analysis** that:

1. **Extracts** listing data in <5 seconds
2. **Analyzes** with institutional-grade methodologies
3. **Validates** assumptions against market comparables
4. **Learns** from every correction and outcome
5. **Exports** professional IC Memos (PDF)

**Differentiator:** First tool that **proves its own model wrong when needed** — exposing gaps between assumptions and market reality.

## CURRENT STATE (April 2026)

**What Works:**
- ✅ URL import and AI extraction
- ✅ Database and API infrastructure
- ✅ Basic financial modeling
- ✅ Deployment pipeline

**Critical Issues:**
- ❌ IRR shows 31.3% (should be 0.1-1.8%) — mathematically impossible
- ❌ Passing rent shows £0 (should be £670k) — extraction broken
- ❌ CAPEX double-counted (£2.1m phantom cost)
- ❌ No assumption validation against comps
- ❌ Information scattered across 9 tabs

**Impact:** Product **cannot be used in production** — users cannot trust any analysis.

## THE FIX (10-Week Plan)

### **Phase 1: Critical Fixes (Week 1-2)** 🔴 BLOCKER
Fix all calculation errors:
- IRR formula (add void costs, letting fees, carry)
- Passing rent extraction
- CAPEX detection (don't add if already refurbished)
- NIY calculation
- Equity multiples

**Outcome:** Calculations are mathematically correct, users can trust analysis.

### **Phase 2: Validation Engine (Week 3-4)** 🟡 DIFFERENTIATOR
Build assumption vs reality checking:
- Pull rental comparables
- Pull yield comparables
- Flag assumptions >15% outside market
- Add confidence scoring

**Outcome:** Prevents over-optimistic underwriting, competitive moat vs PropStream.

### **Phase 3: UI Redesign (Week 5-6)** 🟢 EXPERIENCE
Clean information architecture:
- Verdict always visible (hero panel)
- 4 logical tabs (not 9 scattered)
- Property images + location map
- Multiple valuation types

**Outcome:** Time to decision: <60 seconds (down from 5+ minutes).

### **Phase 4: Learning System (Week 7-8)** 🔵 MOAT
Continuous improvement:
- Inline correction interface
- Deal outcome tracking
- Pattern learning from corrections
- User expertise weighting

**Outcome:** Accuracy improves 65% → 90% over 12 months.

### **Phase 5: IC Memo (Week 9-10)** ⭐ POLISH
Professional export:
- 12-section IC Memo template
- Print-ready PDF
- Planning, environmental, comps, risk analysis

**Outcome:** Institutional-grade deliverable, ready for Investment Committee.

## SUCCESS METRICS

| Metric | Current | Week 2 | Week 4 | Week 6 | Week 10 |
|--------|---------|--------|--------|--------|---------|
| **Calculation Accuracy** | 35% | 95% | 95% | 95% | 98% |
| **Correction Rate** | 45% | 40% | 25% | 20% | 10% |
| **Time to Decision** | 5+ min | 3 min | 2 min | <1 min | <30s |
| **User Confidence** | Low | Medium | High | High | Very High |
| **Extraction Accuracy** | 65% | 70% | 75% | 80% | 85% |

## COMPETITIVE POSITIONING

| Feature | PropStream | LoopNet | CoStar | **DealScope** |
|---------|-----------|---------|--------|---------------|
| Property Data | ✅ | ✅ | ✅ | ✅ |
| RICS Valuations | ❌ | ❌ | Limited | ✅ |
| Assumption Validation | ❌ | ❌ | ❌ | ✅ **NEW** |
| Learning Intelligence | ❌ | ❌ | ❌ | ✅ **NEW** |
| IC Memo Export | ❌ | ❌ | ❌ | ✅ **NEW** |
| Confidence Scoring | ❌ | ❌ | ❌ | ✅ **NEW** |

## RESOURCE REQUIREMENTS

**Team:** 
- 2 senior engineers (fix calculations, build validation engine)
- 1 frontend engineer (UI redesign)
- 1 ML engineer (learning system)
- 1 QA engineer (testing)

**Timeline:** 10 weeks to full launch

**Budget:** Reuse existing infrastructure (Next.js, Prisma, Vercel) — no new platform costs.

## EXPECTED OUTCOMES

**Week 2:** Ship critical fixes to staging. Test with 10 properties. Calculations accurate.

**Week 4:** Ship validation engine. Users see assumption gaps. Conversion +30%.

**Week 6:** Ship redesigned UI. Time to decision -70%. NPS +25.

**Week 10:** Full launch. Learning system live. IC Memo export. Market leader.

## THE BOTTOM LINE

DealScope has **strong foundations** (infrastructure, AI extraction, deployment) but **critical calculation errors** prevent production use.

**The Fix:** 10 weeks of focused work on:
1. Mathematical correctness
2. Assumption validation
3. Clean UX
4. Continuous learning

**The Result:** First AI-powered property analysis tool that gets smarter with every use and proves when assumptions are wrong.

**Next Step:** Begin Phase 1 (Critical Fixes) immediately.
