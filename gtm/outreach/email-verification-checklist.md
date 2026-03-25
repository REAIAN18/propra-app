# Email Verification Checklist — Pre-Launch
**Prepared:** 2026-03-22
**Status:** Pattern research complete. Hunter.io / NeverBounce pass required on all before any Touch 1 sends.
**Scope:** FL Wave 1 (10) + FL Wave 2 (10) + SE UK Wave 1 (10) = 30 addresses

---

## How to run verification

**Option A — Hunter.io bulk verify**
1. Go to hunter.io → Email Verifier → Bulk
2. Paste the CSV block below
3. Export results — use only `valid` or `accept_all` addresses for outreach
4. For `unknown` or `invalid`: fall back to LinkedIn DM or company contact form

**Option B — NeverBounce batch**
1. Upload CSV at app.neverbounce.com → Single Verification or Bulk Upload
2. Use `valid` results only; flag `catch-all` for manual review

**Minimum bar before send:** No address should go out as `invalid`. `catch-all`/`accept_all` domains are acceptable risk for cold outreach.

---

## FL Wave 1 — Priority (send first)

| # | Name | Company | Email | Risk | Notes |
|---|---|---|---|---|---|
| 1 | Steve Weeks | Sunbeam Properties | sweeks@sunbeam.com | ⚠️ Inferred | [initial][surname]@ pattern |
| 2 | Carlos Ghitis | Easton Group | cghitis@eastongroup.com | ⚠️ Inferred | [initial][surname]@ pattern |
| 3 | Ron Butters | Butters Construction | ron@buttersconstruction.com | ⚠️ Inferred | Founder first-name@ format |
| 4 | Carlos Castellano | Continental Real Estate | ccastellano@continental-realty.com | 🔴 High risk | Site timeout; fallback: continental-realty.com/contact |
| 5 | Ian Weiner | Pebb Enterprises | iweiner@pebbent.com | ⚠️ Domain confirmed | @pebbent.com confirmed (not @pebbenterprises.com) |
| 6 | Chris Stiles | Stiles Corporation | chris.stiles@stiles.com | ⚠️ Pattern confirmed | [FirstName].[LastName]@stiles.com confirmed via site |
| 7 | Tom Dixon | Flagler Development | tdixon@flagler.com | 🔴 High risk | Also try t.dixon@flagler.com; site ECONNREFUSED |
| 8 | Howard Finley | Anderson Columbia | hfinley@andersoncolumbia.com | 🔴 High risk | Contact form only — use form if Hunter fails |
| 9 | Jimmy Dunn | Richland Communities | jdunn@richlandcommunities.com | ⚠️ Inferred | Pattern from ZoomInfo partial |
| 10 | Matthew Adler | Adler Real Estate Partners | madler@adler-partners.com | ⚠️ Inferred | Domain confirmed adler-partners.com |

**Fallback sequence for high-risk addresses:**
1. Hunter.io verify → if invalid, try alternate pattern
2. Try alternate pattern (see Notes above)
3. If still invalid: LinkedIn DM (Touch 2 format, Day 0) + company contact form

---

## FL Wave 2 — Secondary (send ~2 weeks after Wave 1 launch)

| # | Name | Company | Email | Risk | Notes |
|---|---|---|---|---|---|
| 1 | Scott McCraney | McCraney Property Co. | smccraney@mccraneyco.com | ⚠️ Inferred | Standard [initial][surname]@ |
| 2 | Jake Baldinger | JBL Asset Management | jbaldinger@jblassetmanagement.com | ⚠️ Inferred | Also try jbaldinger@jblam.com |
| 3 | Jeff Mack | Stonemar Properties | jmack@stonemar.com | ⚠️ Inferred | Short domain |
| 4 | Ana-Marie Codina Barlick | Codina Partners | acodina@codinapartners.com | ⚠️ Inferred | Also try ana-marie@codinapartners.com |
| 5 | Heather Boujoulian | Midland Atlantic | hboujoulian@midlantatl.com | ⚠️ Inferred | — |
| 6 | Jeff Burns | Royal Palm Companies | jburns@royalpalmcos.com | ⚠️ Inferred | Also try jeff@royalpalmcos.com |
| 7 | Alberto Ferre | Interamerican Capital | aferre@interamericancapital.com | ⚠️ Inferred | — |
| 8 | Dev Motwani | Merrimac Ventures | dmotwani@merrimacventures.com | ⚠️ Inferred | Active on LinkedIn — DM fallback strong |
| 9 | Eduardo Avila | Carpe Real Estate | eavila@carperealestate.com | ⚠️ Inferred | — |
| 10 | Bob Julien | Kolter Commercial | bjulien@koltergroup.com | ⚠️ Inferred | Also try bjulien@koltercommercial.com |

---

## SE UK Wave 1 — Concurrent with FL Wave 1

| # | Name | Company | Email | Risk | Notes |
|---|---|---|---|---|---|
| 1 | Jules Benkert | Canmoor Asset Management | jbenkert@canmoor.com | ⚠️ Inferred | [initial][surname]@ pattern |
| 2 | Hugh Elrington | Barwood Capital | helrington@barwoodcapital.co.uk | ⚠️ Inferred | UK [initial][surname]@ pattern |
| 3 | James Burgess | Caisson iO | jburgess@caission.com | ⚠️ Inferred | Verify domain spelling — also try caisson.co.uk |
| 4 | James Feltham | Wrenbridge Land | jfeltham@wrenbridge.co.uk | ⚠️ Inferred | [initial][surname]@ pattern |
| 5 | Jeff Penman | Tungsten Properties | jpenman@tungstenproperties.co.uk | ⚠️ Inferred | — |
| 6 | Roger Montaut | Capital Industrial LLP | rmontaut@capitalindustrial.co.uk | ⚠️ Inferred | — |
| 7 | Richard Bains | Chancerygate | rbains@chancerygate.com | ⚠️ Inferred | Major developer — also check chancerygate.com/team |
| 8 | Nic Rumsey | Jaynic Property Group | nrumsey@jaynic.co.uk | ⚠️ Inferred | — |
| 9 | Christopher Webb | Firethorn Trust | cwebb@firethorne.co.uk | ⚠️ Inferred | Verify domain — also try firethorntrust.co.uk |
| 10 | Stephen Gallagher | Gallagher Group | sgallagher@gallaghergroup.co.uk | ⚠️ Inferred | Common surname — confirm correct person on LinkedIn first |

---

## Referral Partners — Run Hunter pass before referral outreach

| # | Name | Firm | Email | Market |
|---|---|---|---|---|
| FL-1 | Joel Schechter | Goldstein Schechter Koch | jschechter@gsk.cpa | SE FL |
| FL-2 | Andrew Duff | Berkowitz Pollack Brant | aduff@bpbcpa.com | SE FL |
| FL-3 | Gary Margolis | Kaufman Rossin | gmargolis@kaufmanrossin.com | Miami-Dade |
| FL-4 | David Templeton | Templeton & Company | dtempleton@templetoncpa.com | Broward |
| FL-5 | Craig Veil | CDL CPAs | cveil@cdlcpa.com | Palm Beach |
| SEUK-1 | Tom Papworth | Caxtons | tpapworth@caxtons.com | Kent |
| SEUK-2 | Simon Oscroft | Fenn Wright | simon.oscroft@fennwright.co.uk | Essex |
| SEUK-3 | Phil Dalling | Glenny | pdalling@glenny.co.uk | Essex/Thurrock |
| SEUK-4 | Philip Brown | Aitchison Raffety | pbrown@aitchisonraffety.co.uk | Hertfordshire |
| SEUK-5 | James Bainbridge | Bidwells | james.bainbridge@bidwells.co.uk | Beds/Herts |

---

## CSV paste block (for Hunter bulk upload)

```
sweeks@sunbeam.com
cghitis@eastongroup.com
ron@buttersconstruction.com
ccastellano@continental-realty.com
iweiner@pebbent.com
chris.stiles@stiles.com
tdixon@flagler.com
hfinley@andersoncolumbia.com
jdunn@richlandcommunities.com
madler@adler-partners.com
smccraney@mccraneyco.com
jbaldinger@jblassetmanagement.com
jmack@stonemar.com
acodina@codinapartners.com
hboujoulian@midlantatl.com
jburns@royalpalmcos.com
aferre@interamericancapital.com
dmotwani@merrimacventures.com
eavila@carperealestate.com
bjulien@koltergroup.com
jbenkert@canmoor.com
helrington@barwoodcapital.co.uk
jburgess@caission.com
jfeltham@wrenbridge.co.uk
jpenman@tungstenproperties.co.uk
rmontaut@capitalindustrial.co.uk
rbains@chancerygate.com
nrumsey@jaynic.co.uk
cwebb@firethorne.co.uk
sgallagher@gallaghergroup.co.uk
```

---

## After verification — update these files

| File | What to update |
|---|---|
| `gtm/outreach/fl-wave-1-prospects.md` | Email status column → `✓ Verified` or `🔴 Invalid` + fallback action |
| `gtm/outreach/fl-wave-2-prospects.md` | Same |
| `gtm/outreach/seuk-logistics-wave-1-prospects.md` | Same |
| `gtm/outreach/referral-partners-wave-1.md` | Same |

Mark the verification checklist items as complete in each prospect file once Hunter results are in.

---

## Launch gate

**DO NOT send Touch 1 until:**
- [ ] Hunter/NeverBounce pass complete on all FL Wave 1 addresses
- [ ] `invalid` addresses resolved (alternate pattern or LinkedIn fallback confirmed)
- [ ] `/admin/prospects` pipeline populated with all 10 FL Wave 1 contacts
- [ ] Railway deploy confirmed live + prisma db push complete (PRO-367 fix deployed)
