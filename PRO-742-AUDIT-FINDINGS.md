# PRO-742 Part 4: Page Audit Findings

## Status: Partial Audit Complete (Dashboard blocked by PRO-727)

### Parts 1-3: ✅ COMPLETE
- Deleted 4 stale design files (dashboard-design.html, landing-design.html, connected-system-design.html, scout-transactions-design.html)
- Verified required files already in docs/designs/ (dashboard-revised.html, landingv3.html, missing-pages-design.html)
- Confirmed CLAUDE.md has correct references (no changes needed)

### Part 4: Audit Results

---

## ✅ LANDING PAGE (/) — landingv3.html
**Status: MATCHES DESIGN**

**Verified sections:**
- Hero section with "There's *money* hiding in your real estate."
- Property intelligence eyebrow
- Free to start, no credit card CTA
- Proof stats: $180k avg rent uplift, $93k avg insurance saving, 12 mins avg time to insight
- "THE PROBLEM" section: 11-15% gross income leakage
- "HOW IT WORKS" section: Type an address, we do the rest
- Step 01: Add your portfolio
- Step 03: You approve, RealHQ executes
- "THE OPERATING MODEL" section

**Gaps: NONE FOUND**

All colors match design (--bg:#09090b, --acc:#7c6af0, --tx:#e4e4ec)
Typography matches (Instrument Serif for display, DM Sans for body)

---

## ⚠️ SIGNIN PAGE (/signin) — signin-design.html
**Status: MAJOR DISCREPANCY**

**What's implemented:**
- ✅ Welcome back heading
- ✅ Sign in to your portfolio subtitle
- ✅ Continue with Google button
- ✅ Continue with Microsoft button
- ✅ "or sign in with email" divider
- ✅ Email input field
- ✅ Sign in → button (purple accent)
- ✅ Don't have an account? Start free → link

**GAPS:**
1. ❌ **Missing: Password field** — Design shows password input with label
2. ❌ **Missing: "Forgot password?" link** — Should appear next to Password label
3. ❌ **Missing: Email label** — Design shows "Email" label above input
4. ❌ **Wrong auth flow** — Live uses passwordless ("We'll email you a secure sign-in link — no password needed") but design shows traditional password auth

**Decision needed:**
- Is passwordless intentional? If so, design file needs update
- If password auth is required, implementation needs password field added

---

## 🚫 DASHBOARD (/dashboard) — dashboard-revised.html
**Status: BLOCKED - Cannot audit**

**Blocker:** Page shows "Loading dashboard..." indefinitely
**Root cause:** PRO-727 Prisma adapter fix merged to main but not deployed to Vercel yet
**Action required:** Manual Vercel deployment trigger (see PRO-745)

**Impact:** Most authenticated pages cannot be audited until API routes work:
- /properties
- /properties/[id]
- /income
- /financials
- /financing
- /hold-sell
- /transactions
- /tenants
- /work-orders
- /planning
- /compliance
- /rent-clock
- /insurance
- /energy
- /scout
- /documents

---

## Remaining Pages - Status

### Cannot audit (require working dashboard/auth):
- [ ] Dashboard (/dashboard) — **BLOCKED by PRO-727**
- [ ] Properties (/properties) — Requires auth
- [ ] Property Detail (/properties/[id]) — Requires auth + data
- [ ] Income (/income) — Requires auth
- [ ] Financials (/financials) — Requires auth
- [ ] Financing (/financing) — Requires auth
- [ ] Hold/Sell (/hold-sell) — Requires auth
- [ ] Transactions (/transactions) — Requires auth
- [ ] Tenants (/tenants) — Requires auth
- [ ] Work Orders (/work-orders) — Requires auth
- [ ] Planning (/planning) — Requires auth
- [ ] Compliance (/compliance) — Requires auth
- [ ] Rent Clock (/rent-clock) — Requires auth
- [ ] Insurance (/insurance) — Requires auth
- [ ] Energy (/energy) — Requires auth
- [ ] Scout (/scout) — Requires auth

### Can audit (public pages):
- [ ] Signup (/signup) — Public
- [ ] Onboarding (/onboarding) — Needs test
- [ ] Search (/search) — Needs test
- [ ] Upload (/upload) — Needs test
- [ ] Documents (/documents) — May require auth
- [ ] Ask (/ask) — May require auth
- [ ] Portal (/portal) — May require auth

---

## Recommendations

1. **URGENT:** Deploy PRO-727 fix to unblock dashboard and all authenticated page audits
2. **Clarify auth strategy:** Update signin-design.html if passwordless is intentional, or implement password field if design is correct
3. **Complete public page audits:** signup, onboarding, search, upload
4. **Resume full audit:** After PRO-727 deploys, systematically audit all 25+ authenticated pages

---

## Files Changed (Parts 1-3)
- ✅ Deleted: docs/designs/dashboard-design.html
- ✅ Deleted: docs/designs/landing-design.html
- ✅ Deleted: docs/designs/connected-system-design.html
- ✅ Deleted: docs/designs/scout-transactions-design.html
- ✅ Verified: CLAUDE.md references correct
- ✅ Branch: chore/pro-742-design-cleanup (pushed to origin)

Commit: 19179c7 "chore(designs): remove 4 superseded design files (PRO-742 Part 1)"
