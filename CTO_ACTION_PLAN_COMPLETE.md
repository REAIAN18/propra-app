# DEALSCOPE REBUILD - CTO ACTION PLAN
## ALL 30 TICKETS - CREATE AND ASSIGN NOW

**Priority:** P0 - CRITICAL  
**Created:** 2026-04-05  
**Status:** Ready for immediate execution

---

## 🎯 CTO ACTION ITEMS (DO THIS NOW)

### STEP 1: CREATE 30 PAPERCLIP ISSUES (15 minutes)

Create the following 30 issues in Paperclip, one for each ticket. Each issue should contain the ticket specification from the files below.

**Batch 1 - Phase 1 (5 issues) - MARK AS DONE**
1. PRO-XXX: TICKET-01: IRR Calculation ✅
2. PRO-XXX: TICKET-02: CAPEX Calculation ✅  
3. PRO-XXX: TICKET-03: Equity Multiple ✅
4. PRO-XXX: TICKET-04: Verdict Engine ✅
5. PRO-XXX: TICKET-05: Wire to API ✅

**Batch 2 - Phase 2 (15 issues) - ASSIGN TO AGENTS**
6. PRO-XXX: TICKET-06: Hero Panel → Assign to Frontend Engineer 1
7. PRO-XXX: TICKET-07: Tab Navigation → Assign to Frontend Engineer 2
8. PRO-XXX: TICKET-08: Gallery Grid → Assign to Frontend Engineer 3
9. PRO-XXX: TICKET-09: Building Spec Card → Assign to Frontend Engineer 1
10. PRO-XXX: TICKET-10: EPC Card → Assign to Frontend Engineer 2
11. PRO-XXX: TICKET-11: Planning Applications → Assign to Frontend Engineer 3
12. PRO-XXX: TICKET-12: Title Details → Assign to Frontend Engineer 1
13. PRO-XXX: TICKET-13: Sales History → Assign to Frontend Engineer 2
14. PRO-XXX: TICKET-14: Environmental Bars → Assign to Frontend Engineer 3
15. PRO-XXX: TICKET-15: Document List → Assign to Frontend Engineer 1
16. PRO-XXX: TICKET-16: Comparables Table → Assign to Frontend Engineer 2
17. PRO-XXX: TICKET-17: Multiple Valuations → Assign to Frontend Engineer 3
18. PRO-XXX: TICKET-18: Service Charges → Assign to Frontend Engineer 1
19. PRO-XXX: TICKET-19: Letting Scenarios → Assign to Frontend Engineer 2
20. PRO-XXX: TICKET-20: AI Summary → Assign to Frontend Engineer 3

**Batch 3 - Phase 3 (3 issues) - ASSIGN AFTER PHASE 2**
21. PRO-XXX: TICKET-21: Property Tab → Assign to Senior Engineer (requires 6,8,9,10,20 done)
22. PRO-XXX: TICKET-22: Planning Tab → Assign to Senior Engineer (requires 11 done)
23. PRO-XXX: TICKET-23: Financials Tab → Assign to Senior Engineer (requires 16,17,18,19 done)

**Batch 4 - Phase 4 (5 issues) - ASSIGN IN PARALLEL**
24. PRO-XXX: TICKET-24: IC Memo Template → Assign to Senior Engineer
25. PRO-XXX: TICKET-25: IC Memo Population → Assign to Senior Engineer
26. PRO-XXX: TICKET-26: PDF Export API → Assign to Backend Engineer
27. PRO-XXX: TICKET-27: Excel Template → Assign to Senior Engineer
28. PRO-XXX: TICKET-28: Excel Export API → Assign to Backend Engineer

**Batch 5 - Phase 5 (2 issues) - ASSIGN LAST**
29. PRO-XXX: TICKET-29: Loading States → Assign to UX Designer
30. PRO-XXX: TICKET-30: Error States → Assign to UX Designer

### STEP 2: ASSIGN AGENTS (5 minutes)

**Immediate assignments (can work in parallel):**
- Frontend Engineer 1: TICKET-06, 09, 12, 15, 18
- Frontend Engineer 2: TICKET-07, 10, 13, 16, 19
- Frontend Engineer 3: TICKET-08, 11, 14, 17, 20
- Senior Engineer: TICKET-24, 25, 27 (start now)
- Backend Engineer: TICKET-26, 28 (start now)

**Sequential assignments (after Phase 2 complete):**
- Senior Engineer: TICKET-21, 22, 23
- UX Designer: TICKET-29, 30

### STEP 3: DEPLOY PHASE 1 (2 minutes)

```bash
cd /path/to/propra-app
git checkout main
git pull
git apply dealscope-complete-fix.patch
git add .
git commit -m "fix(dealscope): Phase 1 - Fix broken calculations (IRR, CAPEX, Equity, Verdict)"
git push origin main
```

**This fixes production immediately** - Regency House will show correct metrics.

---

## 📋 TICKET FILES LOCATION

All 31 ticket files are in `/tmp/paperclip-tickets/`:
- `00-MANIFEST.md` (this overview)
- `TICKET-01-IRR.md` through `TICKET-30-ERROR-STATES.md`

**Each ticket file contains:**
1. File path to create
2. Exact HTML from design file (with line numbers)
3. Exact React code to copy-paste
4. CSS classes (DO NOT modify)
5. Screenshot requirements
6. Acceptance criteria
7. Critical rules

---

## 📐 AGENT INSTRUCTIONS (GIVE TO EVERY AGENT)

**Every agent must follow this process:**

1. **Read your ticket** - Find your assigned TICKET-XX file
2. **Copy the exact code** - DO NOT modify class names, colors, or sizes
3. **Create the file** - At the exact path specified
4. **Test locally** - Component must render
5. **Take screenshot** - Must match design pixel-perfect
6. **Submit PR** - Include screenshot in PR description
7. **Wait for approval** - CTO reviews screenshot

**CRITICAL RULES FOR AGENTS:**
- ❌ DO NOT change class names (d-top, d-hdr, etc.)
- ❌ DO NOT change colors (var(--grn), var(--s2), etc.)
- ❌ DO NOT change sizes (42px, 14px, etc.)
- ❌ DO NOT add features not in the ticket
- ✅ COPY-PASTE the code exactly as written
- ✅ If screenshot doesn't match design → TICKET FAILS

---

## 📊 PROGRESS TRACKING

### Week 1-2: Phase 2 (15 tickets)
- [ ] TICKET-06: Hero Panel
- [ ] TICKET-07: Tab Navigation
- [ ] TICKET-08: Gallery Grid
- [ ] TICKET-09: Building Spec Card
- [ ] TICKET-10: EPC Card
- [ ] TICKET-11: Planning Applications
- [ ] TICKET-12: Title Details
- [ ] TICKET-13: Sales History
- [ ] TICKET-14: Environmental Bars
- [ ] TICKET-15: Document List
- [ ] TICKET-16: Comparables Table
- [ ] TICKET-17: Multiple Valuations
- [ ] TICKET-18: Service Charges
- [ ] TICKET-19: Letting Scenarios
- [ ] TICKET-20: AI Summary

### Week 3: Phase 3 (3 tickets)
- [ ] TICKET-21: Property Tab
- [ ] TICKET-22: Planning Tab
- [ ] TICKET-23: Financials Tab

### Week 4: Phase 4 (5 tickets)
- [ ] TICKET-24: IC Memo Template
- [ ] TICKET-25: IC Memo Population
- [ ] TICKET-26: PDF Export API
- [ ] TICKET-27: Excel Template
- [ ] TICKET-28: Excel Export API

### Final: Phase 5 (2 tickets)
- [ ] TICKET-29: Loading States
- [ ] TICKET-30: Error States

---

## ✅ SUCCESS CRITERIA

**Phase 1 (Deploy immediately):**
- Regency House shows IRR 0.8% (not 31.3%)
- Regency House shows CAPEX £0 (not £2.1m)
- Regency House shows Verdict CONDITIONAL (not STRONG BUY)

**Phase 2 (Week 1-2):**
- All 15 components created
- All 15 PRs submitted with screenshots
- All 15 screenshots match design pixel-perfect

**Phase 3 (Week 3):**
- Property tab assembles 5 components
- Planning tab displays applications list
- Financials tab shows 4 sections

**Phase 4 (Week 4):**
- IC Memo PDF exports correctly
- Excel file downloads with 5 sheets

**Phase 5 (Final):**
- Loading states on all components
- Error handling on all API calls

---

## 🚨 CRITICAL REMINDERS

1. **Phase 1 MUST deploy today** - Apply patch now
2. **Screenshots are mandatory** - No screenshot = FAIL
3. **Zero interpretation** - Agents copy exact code
4. **Parallel execution** - All 15 Phase 2 tickets start together
5. **Sequential dependencies** - Phase 3 waits for Phase 2

**Timeline: 3.5 weeks total**

---

## 📦 FILES TO DOWNLOAD

1. `/tmp/paperclip-tickets/` - All 31 ticket markdown files
2. `/mnt/user-data/outputs/dealscope-complete-fix.patch` - Phase 1 patch
3. `/mnt/user-data/outputs/DEPLOYMENT_GUIDE.md` - Deploy instructions
4. `/mnt/user-data/outputs/ALL_30_TICKETS_MASTER.md` - Complete reference

**CTO: Execute Step 1-3 above NOW. Total time: 22 minutes.**
