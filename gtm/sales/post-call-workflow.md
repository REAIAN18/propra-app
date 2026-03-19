# Arca — Post-Call Follow-Up Workflow
*For all demo calls booked via cal.com/arca/demo*

---

## Within 1 Hour of Call Ending

1. **Send engagement letter**
   - Template: [`gtm/sales/engagement-letter.md`](engagement-letter.md)
   - Fill in: client name, company, portfolio address(es), date
   - Send via DocuSign or email as PDF
   - Subject: `Arca — Portfolio Services Agreement · [Client Name]`

2. **Log the call in the prospect pipeline**
   - Go to [`/admin/prospects`](/admin/prospects)
   - Update status: `demo_done`
   - Add notes: what they own, top pain points, key objections, sentiment
   - Record `lastContact` date

3. **Send personalized demo link** (if not already sent during call)
   - URL format: `https://propra-app-production.up.railway.app/dashboard?portfolio=[urlKey]&welcome=1&company=[ClientName]`
   - Custom portfolios are loaded from the admin tool (see PRO-157 — coming soon)
   - Until PRO-157 ships: use FL Mixed or SE Logistics demo, noting it's illustrative
   - Subject: `Your Arca portfolio view — [Client Name]`

---

## If Prospect Says "Yes"

### Immediately
- Resend engagement letter with a DocuSign link (or chased via email)
- Confirm which services they want to start with (insurance / energy / rent review)

### Portfolio data collection
Ask for the following via email:
- **Insurance:** current broker name, renewal date, annual premium, coverage schedule (PDF if available)
- **Energy:** current supplier, contract end date, annual spend, unit rate (MPANs if available)
- **Rent roll:** current passing rent per asset, lease expiry dates, ERV if known
- **Assets:** address list, asset type (industrial / retail / office), approx. sq ft

Template ask:
> *"To get your analysis ready, I just need a few numbers — nothing formal. Even a rough figure for your annual insurance premium and energy spend is enough to start. Can you share what you have?"*

### Building their portfolio dashboard
- **Now (manual):** The Founding Engineer builds a TypeScript data file matching the `Portfolio` type. Typically 2–3 hours of engineering time.
- **Soon (PRO-157):** Ian uploads a JSON file via `/admin/portfolios`. No engineering required.
- Target timeline to live dashboard: **48–72 hours** after receiving data
- Send the client their custom link once it's live

### Timeline to tell the client
> *"Once I have your numbers, I'll have your personalised analysis ready within 48–72 hours. From there, I'll start the insurance retender and energy review immediately — typical first results in 2–4 weeks."*

---

## If Prospect Says "Think About It / Follow Up Next Week"

| Timing | Action |
|---|---|
| **Day +3** | Personal follow-up call or voice note — not automated. Check in on any questions or concerns. |
| **Day +7** | Send a case study email from the nurture sequence (reference: `gtm/outreach/` sequences for relevant market). |
| **Day +14** | Final check-in: *"Happy to answer any questions or set up a follow-up call."* If no response, move to passive nurture. |

Day +3 message template:
> *"Hi [Name], just checking in after our call. Did you have a chance to think it over? Happy to answer any questions or walk through a specific scenario for your portfolio."*

Day +14 message template:
> *"Hi [Name], I'll leave this with you — no pressure at all. If the timing changes or you'd like to revisit, you know where I am. In the meantime, your demo portfolio view is still live at [link]."*

---

## If Prospect No-Shows

| Timing | Action |
|---|---|
| **30 min after scheduled start** | Send reschedule email (see below) |
| **Day +1** | "Missed you" email |
| **Day +3** | Last attempt before archiving |

**30-min reschedule email:**
> Subject: `Missed you today — [Name]`
>
> *"Hi [Name], looks like we missed each other — no worries at all. I've got a few slots open this week if you'd like to reschedule: [cal.com/arca/demo]. If the timing isn't right, just let me know and we can find something that works."*

**Day +1 "Missed you" email:**
> Subject: `Still happy to chat — Arca`
>
> *"Hi [Name], following up from yesterday. If life got in the way, completely understand. Here's the link to rebook whenever it suits: [cal.com/arca/demo]. The demo takes 20 minutes and you'll leave with a clear view of where your portfolio sits."*

**Day +3 last attempt:**
> Subject: `Last one from me — [Name]`
>
> *"Hi [Name], I'll stop chasing after this one — I don't want to be a pest. If you ever want to revisit, the door's open. In the meantime, you can explore the demo portfolio here: [propra-app-production.up.railway.app/dashboard]."*

After Day +3 with no response: update pipeline status to `archived_no_show` in `/admin/prospects`.

---

## Admin Checklist (After Every Call)

- [ ] Pipeline updated in `/admin/prospects`
- [ ] Engagement letter sent or follow-up scheduled
- [ ] Custom demo link sent (or noted as pending PRO-157)
- [ ] Next action dated and recorded
- [ ] Commission forecast updated in [`gtm/pipeline-tracker.md`](../pipeline-tracker.md) if deal is progressing
