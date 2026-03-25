# Wave 3 Sprint 4 — CEO Decision Brief
**Author:** Head of Real Estate & Commercial
**Date:** 2026-03-24
**Urgency:** Sprint 4 cannot begin until both decisions are made. FSE + FE are blocked.

---

## Decision 1: Payment Processor

**The question:** GoCardless-first, or start with Stripe?

### Recommendation: GoCardless first — approve immediately

**Why this is straightforward from a CRE perspective:**

UK commercial rent has always been paid by bank transfer (BACS/CHAPS). GoCardless is Direct Debit — the exact instrument that SE UK logistics, industrial, and office landlords already use. There is no adoption friction with UK tenants. A tenant who pays rent by standing order today switches to GoCardless Direct Debit without a second thought.

Stripe (card) is an unnecessary option for UK commercial rent. No commercial landlord charges rent to a credit card. Stripe is the right call for US commercial rent (ACH for FL tenants) but that's Sprint 5 when the FL user base grows.

**Business case for GoCardless in one line:** The first paying Tenant Portal users will be SE UK landlords. GoCardless is what their tenants already expect.

**Revenue numbers:**
- GoCardless fee: 1.15% + £0.20 per transaction
- Example: Thurrock tenant paying £12,000/month rent → £138.20/month in pass-through fees → £1,658/yr infrastructure revenue
- On a 5-asset SE UK portfolio with 12 tenants at average £8,000/month rent: ~£665k/yr total rent volume → ~£7,647/yr GoCardless pass-through revenue (pure infrastructure margin, zero effort)

**Decision needed:** ✅ Approve GoCardless for Sprint 4 (UK). Stripe for US in Sprint 5.

---

## Decision 2: Tenant Portal URL Structure

**The question:** `/portal` subdirectory on the main app, or `portal.realhq.co` separate subdomain?

### Recommendation: Subdirectory (`/portal`) for Sprint 4 — approve immediately

**Reasons (engineering + CRE combined):**

1. **Ships faster.** No DNS setup, no second Vercel project, no separate `next.config.js`. Sprint 4 is already 4 weeks — adding infra overhead for a first-test feature is waste.

2. **Demo simplicity.** When Ian shows a prospect "and your tenant gets this link" — `https://propra-app-orcin.vercel.app/portal/[token]` works in a live demo. A separate subdomain (`portal.realhq.co`) needs the custom domain to be live in Vercel. That's an additional DNS/SSL step that could delay a demo opportunity.

3. **Tenants don't judge by URL.** FL commercial tenants receiving a magic link from their landlord will not notice or care whether the URL is a subdirectory or subdomain. What matters is the UX once they click through.

4. **Can be migrated in Sprint 5.** When the first real tenants are using it and the user base grows, moving to `portal.realhq.co` is straightforward — add a Vercel rewrite rule, update the magic link URL template.

**The only argument for subdomain now:** Brand separation. If RealHQ is concerned that tenants will see the owner's app URL and draw inferences about the platform, a subdomain creates a cleaner illusion. This is not a real concern at Sprint 4 user volumes.

**Decision needed:** ✅ Approve `/portal` subdirectory for Sprint 4. Revisit subdomain in Sprint 5.

---

## Summary

| Decision | Recommendation | Rationale |
|---|---|---|
| Payment processor | **GoCardless** (Sprint 4 UK) | UK commercial standard; SE UK launch users |
| Portal URL | **`/portal` subdirectory** | Ships faster; no DNS/Vercel setup; same UX |

Both recommendations align with Head of Product's brief. No disagreement on sequencing or architecture.

**Once these are confirmed:** Engineering can begin Sprint 4 immediately. Schema migration takes ~0.5 days. First routes can be in review within 3 days.

---

## CRE Notes on Sprint 4 Demo Value

These two features have significant selling power that should be added to the demo script:

### Tenant Portal — how to pitch it on FL demo calls

> "When a tenant in your Coral Gables building needs to report a fault, where does that conversation happen today? WhatsApp. Email. Phone. RealHQ replaces that with a tenant portal — they get a link, they log in, they submit the request, you get a work order in your dashboard. If it's urgent, you get an alert immediately. If it's routine, it joins the queue. No more 'did you get my email about the AC?'"

**FL-specific angle:** FL commercial multi-tenant assets (office, retail centers) are the worst-served for tenant communication tools. A Brickell retail center with 3 tenants and a Coral Gables office with 8 tenants has the same admin burden as a residential landlord with 10 units — but none of the tenant-facing tools that residential has had for years.

**The hook for FL prospects:** FL commercial rent is typically paid by check or ACH bank transfer — the tenant portal adds the direct debit/ACH collection option, meaning the landlord knows exactly when rent is collected rather than chasing. This is the thing that FL commercial owners find genuinely tedious.

**GoCardless for UK / Stripe for US:** On FL demo calls, explain: "Direct debit mandate for UK tenants is live now. For your US/FL tenants, ACH integration is the next sprint — 6–8 weeks." Don't overclaim what's in Sprint 4.

### Legal Document Automation — how to pitch it on FL calls

Section 25 notices (LTA 1954) are UK-only — don't mention them on FL calls. For FL prospects, the pitch is:

> "When a tenant asks to assign their lease to a new occupier, what's your current process? You call your attorney, pay $800, wait a week for a draft Licence to Assign. RealHQ generates that in under 60 seconds. It's an AI draft — your attorney still reviews it and you still execute properly — but the $800 is now $200 and the week is now 60 seconds."

**FL-relevant documents in Sprint 4:**
- Licence to Assign — directly applicable in FL commercial leases
- Licence to Underlet — applicable wherever subletting clauses exist
- Deed of Variation — common in FL commercial when extending terms or adjusting rent

Section 25 notices: UK-only. On FL calls, acknowledge it's a UK legal instrument and pivot to the above.

---

*For CEO action: two approvals needed above. Once received, engineering starts Sprint 4 immediately.*
*For Ian's demo prep: Tenant Portal and Legal Docs talking points above are ready for FL prospect calls.*
