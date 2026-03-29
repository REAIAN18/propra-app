# Build Failures - TypeScript Errors

**Date**: 2026-03-29
**CTO Review**: Failed branches need fixes before merge

## Failed Branches

### 1. feat/tenants-v2-phase3
**Status**: Build Error (TypeScript)
**Commit**: 966dd04 + 1 unpushed commit (39de6f0)

**Root Cause**: Schema mismatch between code and Prisma schema

**Errors in `src/lib/activity-aggregation.ts`:**
- Line 126-128: `reviewDate` field doesn't exist on RentReviewEvent
  - Schema has: `expiryDate`, not `reviewDate`
- Line 135-143: Multiple missing fields on RentReviewEvent:
  - `reviewDate` → use `expiryDate`?
  - `reviewOutcome` → not in schema
  - `reviewType` → not in schema
  - `currentRent` → schema has `passingRent`
  - `proposedRent` → not in schema

**Errors in `src/lib/activity-aggregation.ts` (WorkOrder):**
- Line 167: `completedAt` doesn't exist on WorkOrder
  - Note: `completedAt` exists on WorkOrderCompletion model
- Line 170: `title` doesn't exist on WorkOrder
  - Schema has: `jobType` and `description`
- Line 173: `priority` doesn't exist on WorkOrder

**Errors in other files:**
- `src/lib/arrears-escalation.ts:188` - Missing 'none' in EscalationStage enum
- `src/lib/payment-trend-analysis.ts:17` - TenantPayment not exported from @prisma/client

**Fix Options:**
1. **Update code** to match current schema (safer, faster)
2. **Add migration** to add missing fields to schema (if fields are intentional)

**Recommendation**: Need feature owner clarification on intent. Were these fields supposed to be added to schema, or should code use existing fields?

---

### 2. feat/pro-719-compliance-phase-4
**Status**: Build Error
**Not yet investigated** - likely similar schema issues

---

### 3. feat/pro-696-infrastructure-fixes
**Status**: Build Error
**Not yet investigated**

---

## Action Items

1. **Immediate**: Contact feature owners for feat/tenants-v2-phase3
   - Ask: Should we add these fields to schema or update code to use existing fields?

2. **For each failed branch:**
   - Document exact errors
   - Identify if it's schema mismatch, import error, or logic error
   - Fix or mark as blocked

3. **Process improvement:**
   - Ensure `npx tsc --noEmit` runs before all pushes (add to git pre-push hook?)
   - Consider Vercel build notifications to catch errors faster

---

**CTO Note**: These branches cannot merge until TypeScript errors are fixed. Production blocker (billing) is separate and higher priority.
