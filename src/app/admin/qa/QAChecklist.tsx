"use client";

import { useState, useEffect } from "react";

interface CheckItem {
  id: string;
  label: string;
  how: string;
  link?: { href: string; text: string };
  critical: boolean;
}

interface CheckGroup {
  title: string;
  items: CheckItem[];
}

const GROUPS: CheckGroup[] = [
  {
    title: "Infrastructure",
    items: [
      { id: "railway-deploy", label: "Railway deployed — current commit is live", how: "Visit realhq.com — check the page loads without error.", link: { href: "https://realhq.com", text: "Open realhq.com ↗" }, critical: true },
      { id: "prisma-push", label: "Schema migrations applied (prisma db push runs automatically on deploy)", how: "railway.toml startCommand runs npx prisma db push on every deploy. Verify by checking Railway deploy logs for 'All migrations applied'.", critical: true },
      { id: "resend-domain", label: "ian@realhq.com domain verified in Resend (SPF + DKIM green)", how: "Resend → Domains → realhq.com → all checks green. Unverified domain = spam.", link: { href: "https://resend.com/domains", text: "Resend Domains ↗" }, critical: true },
      { id: "resend-webhook", label: "RESEND_WEBHOOK_SECRET added to Railway env vars", how: "Resend → Webhooks → copy signing secret → Railway → Variables → RESEND_WEBHOOK_SECRET.", link: { href: "https://resend.com/webhooks", text: "Resend Webhooks ↗" }, critical: false },
      { id: "physical-address", label: "ARCA_PHYSICAL_ADDRESS set in Railway (required for CAN-SPAM — FL emails only)", how: "CAN-SPAM (US law) requires a postal address in all commercial emails. Railway → Variables → ARCA_PHYSICAL_ADDRESS='Your address'. A PO box works. SE UK emails (B2B PECR) do not require this.", critical: true },
      { id: "cron-secret", label: "CRON_SECRET env var set in Railway (any random string)", how: "Railway → Variables → CRON_SECRET=<generate a random string e.g. openssl rand -hex 16>. Protects the email queue flush endpoint from unauthorised calls.", critical: false },
      { id: "cron-job", label: "External cron set up to flush email queue every 30 min", how: "Go to cron-job.org (free) → New cron job → URL: https://realhq.com/api/cron/send-emails?secret=<CRON_SECRET> → every 30 min. Required for auto-scheduled Touch 2 + 3 to send.", link: { href: "https://cron-job.org", text: "cron-job.org ↗" }, critical: false },
    ],
  },
  {
    title: "Brand",
    items: [
      { id: "linkedin-page", label: "LinkedIn company page is live", how: "Prospects will Google us. Page content ready in gtm/social/linkedin-company-page.md — publish at linkedin.com/company/setup/new.", link: { href: "https://www.linkedin.com/company/setup/new", text: "Create page ↗" }, critical: true },
      { id: "ian-linkedin", label: "Ian's LinkedIn headline mentions RealHQ / realhq.com", how: "Email from ian@realhq.com — prospects will check the profile. Headline and current role should reference RealHQ.", critical: true },
    ],
  },
  {
    title: "Booking Flow",
    items: [
      { id: "calcom-live", label: "cal.com/realhq/portfolio-review is live and bookable", how: "Open booking link — confirm slot grid loads, 20-min meeting shows.", link: { href: "https://cal.com/realhq/portfolio-review", text: "Test booking link ↗" }, critical: true },
      { id: "book-page", label: "/book page loads with cal.com embed", how: "Visit realhq.com/book?name=Test&company=TestCo&assets=8 — cal.com embed loads with pre-fill.", link: { href: "https://realhq.com/book?name=Test&company=TestCo&assets=8", text: "Test /book ↗" }, critical: true },
      { id: "booked-page", label: "/booked confirmation page renders correctly", how: "Visit /booked?name=Test&company=TestCo — confirm UI shows with sign-up and demo CTAs.", link: { href: "https://realhq.com/booked?name=Test&company=TestCo", text: "Test /booked ↗" }, critical: true },
      { id: "booking-email", label: "Booking confirmation email sends from ian@realhq.com", how: "Make a test booking with a real email — confirm Ian's pre-call email arrives within 2 min.", critical: true },
      { id: "admin-notif", label: "Admin gets demo_booked notification on booking", how: "Check hello@realhq.com inbox for 'DEMO BOOKED' subject line after test booking.", critical: true },
    ],
  },
  {
    title: "Cold Outreach Emails",
    items: [
      { id: "t1-fl", label: "Touch 1 FL sends correctly ($ amounts, Ian from address)", how: "Admin → Leads → Cold Outreach → FL, Touch 1 → send to ian@realhq.com. Verify $ figures.", link: { href: "/admin/leads", text: "Open mailer ↗" }, critical: true },
      { id: "t1-seuk", label: "Touch 1 SE UK sends correctly (£ amounts, MEES hook)", how: "Admin → Leads → Cold Outreach → SE UK, Touch 1 → send to ian@realhq.com. Verify £ figures.", critical: true },
      { id: "t2-fl", label: "Touch 2 FL sends correctly (rent roll + income hook)", how: "Touch 2 FL → verify rent/income angle, personalised /book link at bottom.", critical: false },
      { id: "book-link", label: "Book link in outreach emails resolves to cal.com correctly", how: "Click book link in a test Touch 1 — confirm realhq.com/book loads cal.com embed.", critical: true },
    ],
  },
  {
    title: "FL Wave-1 Prospects",
    items: [
      { id: "fl-emails-verified", label: "All 10 FL Wave-1 emails verified via Hunter.io", how: "Admin → Prospects → FL tab. Each ⚠ verify badge = unconfirmed. Use Hunter.io or add override.", link: { href: "/admin/prospects", text: "Open FL pipeline ↗" }, critical: true },
      { id: "fl-linkedin", label: "LinkedIn profiles confirmed for FL Wave-1 targets", how: "Check each named FL prospect has a LinkedIn URL in the pipeline or notes.", critical: false },
      { id: "fl-book-links", label: "FL personalised /book links open with correct name/company", how: "Expand a FL prospect → copy book link → confirm name and company pre-fill correctly.", critical: true },
    ],
  },
  {
    title: "SE UK Wave-1 Prospects",
    items: [
      { id: "seuk-emails-verified", label: "All 10 SE UK Wave-1 emails verified", how: "Admin → Prospects → SE UK tab. Check ⚠ verify badges. Canmoor, Barwood, Jaynic emails confirmed.", link: { href: "/admin/prospects", text: "Open SE UK pipeline ↗" }, critical: true },
      { id: "seuk-book-links", label: "SE UK book links contain portfolio=se-logistics param", how: "Expand an SE UK prospect → copy book link → confirm URL has portfolio=se-logistics.", critical: true },
      { id: "seuk-demo", label: "/dashboard?portfolio=se-logistics shows £ amounts correctly", how: "Visit realhq.com/dashboard?portfolio=se-logistics — confirm £ amounts and SE logistics data.", link: { href: "https://realhq.com/dashboard?portfolio=se-logistics", text: "Test SE UK demo ↗" }, critical: true },
    ],
  },
  {
    title: "Public Pages",
    items: [
      { id: "homepage", label: "realhq.com homepage loads correctly", how: "Visit realhq.com — hero copy, scan CTA, commission-only message all correct.", link: { href: "https://realhq.com", text: "Open homepage ↗" }, critical: true },
      { id: "uk-page", label: "/uk landing page loads with £ amounts and MEES copy", how: "Visit realhq.com/uk — confirm £ figures, MEES 2027, SE UK messaging.", link: { href: "https://realhq.com/uk", text: "Open /uk ↗" }, critical: true },
      { id: "fl-demo", label: "/dashboard?portfolio=fl-mixed demo loads with $ amounts", how: "Visit realhq.com/dashboard?portfolio=fl-mixed — confirm $ figures and FL asset data.", link: { href: "https://realhq.com/dashboard?portfolio=fl-mixed", text: "Test FL demo ↗" }, critical: true },
    ],
  },
];

const STORAGE_KEY = "realhq-qa-checklist-v1";

export function QAChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setChecked(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function reset() {
    setChecked({});
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  const allItems = GROUPS.flatMap((g) => g.items);
  const criticalItems = allItems.filter((i) => i.critical);
  const totalDone = allItems.filter((i) => checked[i.id]).length;
  const criticalDone = criticalItems.filter((i) => checked[i.id]).length;
  const allCriticalDone = criticalDone === criticalItems.length;
  const allDone = totalDone === allItems.length;
  const pct = Math.round((totalDone / allItems.length) * 100);

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
              {totalDone} / {allItems.length} complete
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
              {criticalDone} / {criticalItems.length} critical items done
            </div>
          </div>
          <div className="flex items-center gap-3">
            {allCriticalDone && (
              <span className="text-sm px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: "#0a8a4c22", color: "#0A8A4C", border: "1px solid #0A8A4C40" }}>
                ✓ Ready to send wave-1
              </span>
            )}
            <button onClick={reset} className="text-xs hover:opacity-70" style={{ color: "#3d5a72" }}>
              Reset
            </button>
          </div>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "#1a2d45" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: allDone ? "#0A8A4C" : allCriticalDone ? "#F5A94A" : "#1647E8" }}
          />
        </div>
      </div>

      {/* Groups */}
      {GROUPS.map((group) => (
        <div key={group.title} className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
          <div className="px-5 py-3" style={{ backgroundColor: "#0d1825", borderBottom: "1px solid #1a2d45" }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#5a7a96" }}>
              {group.title}
            </span>
          </div>
          <div style={{ backgroundColor: "#0B1622" }}>
            {group.items.map((item, i) => {
              const isDone = !!checked[item.id];
              return (
                <div
                  key={item.id}
                  className="px-5 py-4 cursor-pointer hover:bg-[#0d1825] transition-colors"
                  style={{ borderTop: i > 0 ? "1px solid #1a2d4560" : undefined }}
                  onClick={() => toggle(item.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 shrink-0 flex items-center justify-center rounded"
                      style={{
                        width: 18, height: 18,
                        backgroundColor: isDone ? "#0A8A4C" : "transparent",
                        border: `2px solid ${isDone ? "#0A8A4C" : "#2a4060"}`,
                        transition: "all 0.1s",
                      }}
                    >
                      {isDone && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-sm font-medium"
                          style={{ color: isDone ? "#5a7a96" : "#e8eef5", textDecoration: isDone ? "line-through" : undefined }}
                        >
                          {item.label}
                        </span>
                        {item.critical && !isDone && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide" style={{ backgroundColor: "#CC1A1A22", color: "#CC1A1A" }}>
                            critical
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-1" style={{ color: isDone ? "#3d5a72" : "#5a7a96" }}>
                        {item.how}
                      </div>
                      {item.link && !isDone && (
                        <a
                          href={item.link.href}
                          target={item.link.href.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block mt-1.5 text-xs font-medium hover:opacity-70"
                          style={{ color: "#1647E8" }}
                        >
                          {item.link.text}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
