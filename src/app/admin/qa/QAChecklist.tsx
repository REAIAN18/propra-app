"use client";

import { useState } from "react";

interface CheckItem {
  id: string;
  category: string;
  label: string;
  description: string;
  link?: { href: string; text: string };
  blocker: boolean; // if true, must be checked before wave-1 can go
}

const CHECKS: CheckItem[] = [
  // ── Infrastructure ────────────────────────────────────────────────────────
  {
    id: "railway-deployed",
    category: "Infrastructure",
    label: "Railway deploy is live",
    description: "Latest main branch is deployed. Check the Railway dashboard — deployment should show 'Success' and the app should load at arcahq.ai.",
    link: { href: "https://arcahq.ai", text: "Open arcahq.ai ↗" },
    blocker: true,
  },
  {
    id: "cal-live",
    category: "Infrastructure",
    label: "cal.com/arcahq/portfolio-review works",
    description: "Open the booking link and confirm the calendar loads and a slot can be selected. This is every email CTA — if it 404s, the whole outreach fails.",
    link: { href: "https://cal.com/arcahq/portfolio-review", text: "Test booking link ↗" },
    blocker: true,
  },
  {
    id: "book-page",
    category: "Infrastructure",
    label: "/book page works end-to-end",
    description: "Visit arcahq.ai/book — confirm the page loads, the cal.com embed shows, and a test booking completes.",
    link: { href: "https://arcahq.ai/book", text: "Open /book ↗" },
    blocker: true,
  },
  {
    id: "admin-email",
    category: "Infrastructure",
    label: "Admin notification email received",
    description: "Book a test slot on /book and confirm an admin notification lands in ian@arcahq.ai within 2 minutes.",
    blocker: true,
  },
  {
    id: "resend-webhook",
    category: "Infrastructure",
    label: "RESEND_WEBHOOK_SECRET set in Railway",
    description: "Go to Resend → Webhooks → copy the signing secret → paste into Railway env vars as RESEND_WEBHOOK_SECRET. Without this, email opens and clicks won't be tracked.",
    link: { href: "https://resend.com/webhooks", text: "Resend Webhooks ↗" },
    blocker: false,
  },
  {
    id: "sentry",
    category: "Infrastructure",
    label: "Sentry error tracking live (optional)",
    description: "Add NEXT_PUBLIC_SENTRY_DSN and SENTRY_AUTH_TOKEN to Railway. Non-blocking for wave-1 but good to have before real users hit the app.",
    blocker: false,
  },

  // ── Brand / Presence ──────────────────────────────────────────────────────
  {
    id: "linkedin-page",
    category: "Brand",
    label: "LinkedIn company page is live",
    description: "Prospects will look us up after receiving the email. Page content is ready in gtm/social/linkedin-company-page.md — just needs publishing at linkedin.com/company/setup/new.",
    link: { href: "https://www.linkedin.com/company/setup/new", text: "Create page ↗" },
    blocker: true,
  },
  {
    id: "ian-linkedin",
    category: "Brand",
    label: "Ian's LinkedIn mentions Arca / arcahq.ai",
    description: "Prospects receiving email from ian@arcahq.ai will check the LinkedIn profile. Headline and current role should reference Arca.",
    link: { href: "https://www.linkedin.com/in/ianbaron", text: "Review profile ↗" },
    blocker: true,
  },

  // ── Email Verification ────────────────────────────────────────────────────
  {
    id: "fl-emails-verified",
    category: "Email Verification",
    label: "FL wave-1: all 10 emails verified via Hunter.io",
    description: "Open admin/prospects (FL tab) — check which prospects have the ⚠ verify badge. Verify each at hunter.io or via email finder before sending. Log confirmed emails in the email override field.",
    link: { href: "/admin/prospects", text: "Open FL pipeline ↗" },
    blocker: true,
  },
  {
    id: "seuk-emails-verified",
    category: "Email Verification",
    label: "SE UK wave-1: all 10 emails verified",
    description: "Same as FL — check Hunter.io for any prospects with ⚠ verify notes. SE UK has confirmed patterns on most but Tungsten needs verification.",
    link: { href: "/admin/prospects", text: "Open SE UK pipeline ↗" },
    blocker: true,
  },

  // ── Outreach Content ──────────────────────────────────────────────────────
  {
    id: "fl-touch1-preview",
    category: "Outreach Content",
    label: "FL Touch 1 email previewed for one prospect",
    description: "Send a Touch 1 test to yourself using the FL pipeline for Steve Weeks (Sunbeam, 12 assets, Broward County). Confirm: personalised numbers look right, book link works, from name is Ian Baron.",
    link: { href: "/admin/prospects", text: "Open FL pipeline ↗" },
    blocker: true,
  },
  {
    id: "seuk-touch1-preview",
    category: "Outreach Content",
    label: "SE UK Touch 1 email previewed for one prospect",
    description: "Same for SE UK — test Jules Benkert (Canmoor, 10 assets, Kent). Confirm £ amounts, MEES hook, book link uses portfolio=se-logistics.",
    link: { href: "/admin/prospects", text: "Open SE UK pipeline ↗" },
    blocker: true,
  },
  {
    id: "from-email",
    category: "Outreach Content",
    label: "ian@arcahq.ai domain is sending-verified in Resend",
    description: "Go to Resend → Domains → confirm arcahq.ai shows 'Verified' status. Emails from unverified domains go to spam.",
    link: { href: "https://resend.com/domains", text: "Resend Domains ↗" },
    blocker: true,
  },

  // ── Send Readiness ────────────────────────────────────────────────────────
  {
    id: "fl-wave1-ready",
    category: "Send Readiness",
    label: "FL wave-1 prospects all in 'To contact' status",
    description: "10 prospects in FL pipeline should be in 'To contact' status with no T1 sent. Confirm none have been accidentally contacted.",
    link: { href: "/admin/prospects", text: "Open FL pipeline ↗" },
    blocker: false,
  },
  {
    id: "seuk-wave1-ready",
    category: "Send Readiness",
    label: "SE UK wave-1 prospects all in 'To contact' status",
    description: "Same for SE UK — 10 prospects ready.",
    link: { href: "/admin/prospects", text: "Open SE UK pipeline ↗" },
    blocker: false,
  },
  {
    id: "email-queue-clear",
    category: "Send Readiness",
    label: "Email queue has no stuck/overdue items",
    description: "Check admin/email-queue for any items stuck in pending. Clear anything stale before firing wave-1.",
    link: { href: "/admin/email-queue", text: "Open email queue ↗" },
    blocker: false,
  },
];

const CATEGORIES = Array.from(new Set(CHECKS.map((c) => c.category)));

export function QAChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const blockers = CHECKS.filter((c) => c.blocker);
  const blockersComplete = blockers.every((c) => checked[c.id]);
  const totalComplete = CHECKS.filter((c) => checked[c.id]).length;
  const allComplete = totalComplete === CHECKS.length;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div
        className="rounded-xl px-5 py-4 flex items-center justify-between gap-4"
        style={{
          backgroundColor: allComplete ? "#0f2a1c" : blockersComplete ? "#1a2a0e" : "#1a1200",
          border: `1px solid ${allComplete ? "#0A8A4C" : blockersComplete ? "#4a7a1a" : "#CC1A1A44"}`,
        }}
      >
        <div>
          <div
            className="text-sm font-semibold"
            style={{ color: allComplete ? "#0A8A4C" : blockersComplete ? "#8bc34a" : "#f97316" }}
          >
            {allComplete
              ? "All clear — ready to send wave-1"
              : blockersComplete
              ? "Blockers cleared — non-critical items remain"
              : "Not ready — critical blockers outstanding"}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
            {totalComplete} / {CHECKS.length} checks complete ·{" "}
            {blockers.filter((c) => checked[c.id]).length} / {blockers.length} critical
          </div>
        </div>
        <div
          className="text-2xl font-bold shrink-0"
          style={{
            color: allComplete ? "#0A8A4C" : blockersComplete ? "#8bc34a" : "#f97316",
            fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
          }}
        >
          {Math.round((totalComplete / CHECKS.length) * 100)}%
        </div>
      </div>

      {/* Checklist by category */}
      {CATEGORIES.map((cat) => {
        const items = CHECKS.filter((c) => c.category === cat);
        const catDone = items.filter((c) => checked[c.id]).length;
        return (
          <div key={cat} className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
            {/* Category header */}
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{ backgroundColor: "#0d1825", borderBottom: "1px solid #1a2d45" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8ba0b8" }}>
                {cat}
              </span>
              <span className="text-xs" style={{ color: catDone === items.length ? "#0A8A4C" : "#5a7a96" }}>
                {catDone}/{items.length}
              </span>
            </div>

            {/* Items */}
            <div style={{ backgroundColor: "#111e2e" }}>
              {items.map((item, idx) => {
                const done = !!checked[item.id];
                return (
                  <div
                    key={item.id}
                    className="px-4 py-3 cursor-pointer hover:bg-[#0d1825] transition-colors"
                    style={{ borderBottom: idx < items.length - 1 ? "1px solid #1a2d4580" : undefined }}
                    onClick={() => toggle(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className="mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center"
                        style={{
                          backgroundColor: done ? "#0A8A4C" : "transparent",
                          border: `1.5px solid ${done ? "#0A8A4C" : "#2a4060"}`,
                        }}
                      >
                        {done && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-medium"
                            style={{
                              color: done ? "#5a7a96" : "#e8eef5",
                              textDecoration: done ? "line-through" : "none",
                            }}
                          >
                            {item.label}
                          </span>
                          {item.blocker && !done && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                              style={{ backgroundColor: "#CC1A1A22", color: "#CC1A1A", border: "1px solid #CC1A1A40" }}
                            >
                              Blocker
                            </span>
                          )}
                          {item.blocker && done && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                              style={{ backgroundColor: "#0a8a4c22", color: "#0A8A4C", border: "1px solid #0A8A4C40" }}
                            >
                              ✓ Cleared
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: done ? "#3d5a72" : "#5a7a96" }}>
                          {item.description}
                        </p>
                        {item.link && !done && (
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
        );
      })}

      {/* Reset */}
      <div className="flex justify-end">
        <button
          onClick={() => setChecked({})}
          className="text-xs px-3 py-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: "#3d5a72", border: "1px solid #1a2d45" }}
        >
          Reset checklist
        </button>
      </div>
    </div>
  );
}
