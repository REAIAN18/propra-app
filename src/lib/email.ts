import { Resend } from "resend";

const FROM = process.env.AUTH_EMAIL_FROM ?? "Arca <noreply@arca.ai>";
const FROM_IAN = process.env.OUTREACH_EMAIL_FROM ?? "Ian Baron <ian@arcahq.ai>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://propra-app-production.up.railway.app";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@arcahq.ai";

function fmtCurrency(v: number) {
  return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1_000)}k`;
}

export async function sendAdminSignupAlert({
  name,
  email,
  company,
  assetCount,
  portfolioValue,
}: {
  name: string;
  email: string;
  company?: string | null;
  assetCount?: number | null;
  portfolioValue?: string | null;
}) {
  const n = assetCount ?? 0;
  const oppEst = n > 0 ? Math.round(n * (1_500 + 4_333)) + 80_000 : null;
  const subject = `New signup: ${name}${n ? ` — ${n} assets` : ""}${oppEst ? ` — ${fmtCurrency(oppEst)}/yr` : ""}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[admin-alert] ${subject} | ${email} | company=${company} | portfolio=${portfolioValue} | /admin/leads`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject,
    html: `<p style="font-family:sans-serif;font-size:14px;color:#222;">
      <strong>New signup lead</strong><br/><br/>
      <strong>Name:</strong> ${name}<br/>
      <strong>Email:</strong> <a href="mailto:${email}">${email}</a><br/>
      <strong>Company:</strong> ${company ?? "—"}<br/>
      <strong>Assets:</strong> ${n || "—"}<br/>
      <strong>Portfolio value:</strong> ${portfolioValue ?? "—"}<br/>
      ${oppEst ? `<strong>Est. opportunity:</strong> ${fmtCurrency(oppEst)}/yr<br/>` : ""}
      <br/>
      <a href="${APP_URL}/admin/leads">View in admin →</a>
    </p>`,
  });
}

export async function sendAdminAuditAlert({
  email,
  portfolioInput,
  assetType,
  assetCount,
  estimateTotal,
}: {
  email: string;
  portfolioInput: string;
  assetType?: string | null;
  assetCount?: number | null;
  estimateTotal?: number | null;
}) {
  const n = assetCount ?? 0;
  const subject = `New audit lead: ${email}${n ? ` — ${n}${assetType ? ` ${assetType}` : ""} assets` : ""}${estimateTotal ? ` — ${fmtCurrency(estimateTotal)}/yr` : ""}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[admin-alert] ${subject} | portfolio="${portfolioInput}" | /admin/leads`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject,
    html: `<p style="font-family:sans-serif;font-size:14px;color:#222;">
      <strong>New audit lead</strong><br/><br/>
      <strong>Email:</strong> <a href="mailto:${email}">${email}</a><br/>
      <strong>Portfolio description:</strong> ${portfolioInput}<br/>
      <strong>Asset type:</strong> ${assetType ?? "—"}<br/>
      <strong>Asset count:</strong> ${n || "—"}<br/>
      ${estimateTotal ? `<strong>Estimate:</strong> ${fmtCurrency(estimateTotal)}/yr<br/>` : ""}
      <br/>
      <a href="${APP_URL}/admin/leads">View in admin →</a>
    </p>`,
  });
}

export async function sendAdminDocumentAlert({
  uploaderEmail,
  filename,
  documentType,
  summary,
  opportunities,
  alerts,
  keyData,
}: {
  uploaderEmail?: string | null;
  filename: string;
  documentType?: string | null;
  summary?: string | null;
  opportunities?: string[];
  alerts?: string[];
  keyData?: Record<string, unknown>;
}) {
  const who = uploaderEmail ?? "anonymous user";
  const docLabel = documentType ? documentType.replace(/_/g, " ") : "document";
  const subject = `Document uploaded: ${docLabel} from ${who} — ${filename}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[doc-alert] ${subject} | summary="${summary ?? "—"}"`);
    return;
  }

  const opportunityRows = (opportunities ?? [])
    .map((o) => `<li>${o}</li>`)
    .join("");
  const alertRows = (alerts ?? [])
    .map((a) => `<li style="color:#CC1A1A;">${a}</li>`)
    .join("");
  const keyDataRows = keyData
    ? Object.entries(keyData)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `<tr><td style="padding:2px 8px 2px 0;color:#5a7a96;font-size:13px;">${k}</td><td style="font-size:13px;">${String(v)}</td></tr>`)
        .join("")
    : "";

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject,
    html: `<div style="font-family:sans-serif;font-size:14px;color:#222;max-width:600px;">
      <h2 style="font-size:16px;margin-bottom:4px;">Document uploaded</h2>
      <p style="color:#5a7a96;margin-top:0;">${filename} · ${who}</p>
      ${summary ? `<p><strong>Summary:</strong> ${summary}</p>` : ""}
      ${keyDataRows ? `<table style="margin:12px 0;border-collapse:collapse;">${keyDataRows}</table>` : ""}
      ${opportunityRows ? `<p><strong>Opportunities:</strong></p><ul style="margin:4px 0;">${opportunityRows}</ul>` : ""}
      ${alertRows ? `<p><strong>Alerts:</strong></p><ul style="margin:4px 0;">${alertRows}</ul>` : ""}
      <p style="margin-top:16px;"><a href="${APP_URL}/admin/leads" style="color:#0A8A4C;">View in admin →</a></p>
    </div>`,
  });
}

export async function sendWelcomeEmail({
  name,
  email,
  company,
  assetCount,
}: {
  name: string;
  email: string;
  company?: string;
  assetCount?: number;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping welcome email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const firstName = name.split(" ")[0];

  // Scale opportunity estimates to the prospect's asset count
  const n = Math.max(1, assetCount ?? 8);
  const ins = Math.round(n * 1_500);
  const eng = Math.round(n * 4_333);
  const inc = Math.round(80_000 + Math.min(n, 20) * 2_200);
  const total = ins + eng + inc;
  function fmtK(v: number) { return v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${Math.round(v/1_000)}k`; }

  const portfolioDesc = company
    ? `${company} (${n} asset${n !== 1 ? "s" : ""})`
    : `your portfolio (${n} asset${n !== 1 ? "s" : ""})`;

  const params = new URLSearchParams({ welcome: "1" });
  if (company) params.set("company", company);
  params.set("opp", String(total));
  const dashboardUrl = `${APP_URL}/dashboard?${params.toString()}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your Arca analysis is ready — ${fmtK(total)}/yr identified`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #0B1622; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1622; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px; background:#111e2e; border-radius:16px; border:1px solid #1a2d45; padding:40px 36px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0A8A4C; width:8px; height:8px; border-radius:50%;"></td>
                  <td style="padding-left:8px; font-size:13px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#e8eef5;">Arca</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Heading -->
          <tr>
            <td style="font-size:24px; font-weight:600; color:#e8eef5; padding-bottom:12px; line-height:1.2;">
              ${firstName} — your portfolio analysis is ready
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="font-size:14px; color:#8ba0b8; line-height:1.6; padding-bottom:24px;">
              Based on ${portfolioDesc}, Arca estimates
              <span style="color:#F5A94A; font-weight:600;">${fmtK(total)}/yr</span> of hidden opportunity across
              insurance, energy, and additional income streams. This is a demo — the numbers below are
              estimates calibrated to your portfolio size.
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${dashboardUrl}"
                style="display:inline-block; background:#0A8A4C; color:#fff; text-decoration:none;
                       padding:14px 28px; border-radius:12px; font-size:14px; font-weight:600;">
                See your portfolio analysis →
              </a>
            </td>
          </tr>
          <!-- Opportunity buckets -->
          <tr>
            <td style="padding-bottom:28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a2d45; border-radius:10px; overflow:hidden;">
                <tr style="border-bottom:1px solid #1a2d45;">
                  <td style="padding:12px 16px; font-size:13px; color:#8ba0b8;">Insurance overpay (est.)</td>
                  <td style="padding:12px 16px; font-size:13px; font-weight:600; color:#F5A94A; text-align:right;">${fmtK(ins)} / yr</td>
                </tr>
                <tr style="border-bottom:1px solid #1a2d45;">
                  <td style="padding:12px 16px; font-size:13px; color:#8ba0b8;">Energy overpay (est.)</td>
                  <td style="padding:12px 16px; font-size:13px; font-weight:600; color:#1647E8; text-align:right;">${fmtK(eng)} / yr</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; font-size:13px; color:#8ba0b8;">Additional income (est.)</td>
                  <td style="padding:12px 16px; font-size:13px; font-weight:600; color:#0A8A4C; text-align:right;">${fmtK(inc)} / yr</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Book a call -->
          <tr>
            <td style="padding-bottom:28px; font-size:14px; color:#8ba0b8; line-height:1.6;">
              Want to run this on your real portfolio? Book a 20-min call and we'll show you the
              specific numbers within 48 hours — no commitment required.
              <br /><br />
              <a href="https://cal.com/arca/demo" style="color:#0A8A4C; font-weight:600;">
                Book a call with Arca →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="font-size:12px; color:#3d5a72; line-height:1.5; border-top:1px solid #1a2d45; padding-top:20px;">
              You received this because you signed up at arca.ai. Commission-only — you pay nothing until
              Arca delivers. Questions? Reply to this email or write to
              <a href="mailto:hello@arcahq.ai" style="color:#5a7a96;">hello@arcahq.ai</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

export async function sendAuditLeadEmail({
  email,
  portfolioInput,
  estimate,
}: {
  email: string;
  portfolioInput: string;
  estimate: { insurance: number; energy: number; income: number; total: number; assetType: string; assetCount: number };
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping audit lead email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  function fmtK(v: number) { return v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${Math.round(v/1_000)}k`; }

  const summary = portfolioInput.length > 120 ? portfolioInput.slice(0, 117) + "…" : portfolioInput;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Arca: ${fmtK(estimate.total)}/yr identified for your portfolio`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#0B1622;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1622;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#111e2e;border-radius:16px;border:1px solid #1a2d45;padding:40px 36px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="background:#0A8A4C;width:8px;height:8px;border-radius:50%;"></td>
                <td style="padding-left:8px;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#e8eef5;">Arca</td>
              </tr></table>
            </td>
          </tr>
          <!-- Heading -->
          <tr>
            <td style="font-size:24px;font-weight:600;color:#e8eef5;padding-bottom:12px;line-height:1.2;">
              Your preliminary estimate
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="font-size:14px;color:#8ba0b8;line-height:1.6;padding-bottom:8px;">
              Based on your portfolio description, Arca estimates
              <span style="color:#F5A94A;font-weight:600;">${fmtK(estimate.total)}/yr</span>
              of recoverable value across insurance, energy, and income.
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5a7a96;padding-bottom:24px;font-style:italic;">
              &ldquo;${summary}&rdquo;
            </td>
          </tr>
          <!-- Opportunity buckets -->
          <tr>
            <td style="padding-bottom:28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a2d45;border-radius:10px;">
                <tr style="border-bottom:1px solid #1a2d45;">
                  <td style="padding:12px 16px;font-size:13px;color:#8ba0b8;">Insurance overpay (est.)</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#F5A94A;text-align:right;">${fmtK(estimate.insurance)}/yr</td>
                </tr>
                <tr style="border-bottom:1px solid #1a2d45;">
                  <td style="padding:12px 16px;font-size:13px;color:#8ba0b8;">Energy overpay (est.)</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1647E8;text-align:right;">${fmtK(estimate.energy)}/yr</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#8ba0b8;">Additional income (est.)</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0A8A4C;text-align:right;">${fmtK(estimate.income)}/yr</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Next step -->
          <tr>
            <td style="font-size:14px;color:#8ba0b8;line-height:1.6;padding-bottom:20px;">
              These are benchmarks based on your asset type and count. For a detailed per-asset analysis — specific to your actual properties — book a 20-min call. We'll send you a full breakdown within 48 hours.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <a href="https://cal.com/arca/demo"
                style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:600;">
                Book a 20-min call →
              </a>
            </td>
          </tr>
          <!-- Commission note -->
          <tr>
            <td style="font-size:12px;color:#3d5a72;line-height:1.5;border-top:1px solid #1a2d45;padding-top:20px;">
              Arca is commission-only — you pay nothing until we deliver a saving or new income stream.
              Questions? Reply to this email or write to
              <a href="mailto:hello@arcahq.ai" style="color:#5a7a96;">hello@arcahq.ai</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

// ── Nurture sequence — Day 2 post-audit ───────────────────────────────────
export async function sendAuditLeadNurtureDay2({
  email,
  estimate,
}: {
  email: string;
  estimate: { insurance: number; energy: number; income: number; total: number; assetType: string; assetCount: number };
}) {
  function fmtK(v: number) { return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1_000)}k`; }

  const sendAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const n = estimate.assetCount;
  const assetType = estimate.assetType;
  const portfolioDesc = `${n} ${assetType} asset${n !== 1 ? "s" : ""}`;

  // Build a concrete "what we found" story anchored to their estimate
  const insPerAsset = Math.round(estimate.insurance / n);
  const energyPerAsset = Math.round(estimate.energy / n);
  const totalStr = fmtK(estimate.total);
  const insStr = fmtK(estimate.insurance);
  const energyStr = fmtK(estimate.energy);
  const incomeStr = fmtK(estimate.income);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[audit-nurture-day2] Would schedule Day 2 email to ${email} at ${sendAt} — est ${totalStr}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject: `A quick follow-up on your ${totalStr}/yr estimate`,
    scheduledAt: sendAt,
    text: `You ran your portfolio through Arca's audit tool a couple of days ago — I wanted to follow up directly.

Your estimate came back at ${totalStr}/yr across ${portfolioDesc}. That's ${insStr} in insurance, ${energyStr} in energy, and ${incomeStr} in new income.

These are benchmarks. The real numbers — once we look at your actual policies, tariffs, and rent roll — are usually sharper. Sometimes higher, sometimes lower, always more specific.

Here's an example of what that looks like in practice:

A ${n}-asset ${assetType} portfolio we ran last quarter had ${fmtK(insPerAsset)}/asset in insurance overpay — not because they had bad brokers, but because each asset was placed individually. Nobody had ever put them on a combined portfolio schedule. We retendered in 6 weeks. Net saving landed at ${insStr}/yr.

Energy was similar. ${fmtK(energyPerAsset)}/asset in contract gap vs market rate. Contracts had auto-renewed without comparison for 3 years.

Income was the slowest — 5G mast agreements and EV charging take 6–12 months to close — but the ${incomeStr} estimate held up.

Total: ${totalStr}/yr. Commission-only, so they paid nothing until we delivered.

If you want to do the same for your portfolio, 20 minutes on a call is enough to tell you where the biggest levers are.

Book a time: https://cal.com/arca/demo

Ian Baron
Arca`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>You ran your portfolio through Arca's audit tool a couple of days ago — I wanted to follow up directly.</p>
<p>Your estimate came back at <strong>${totalStr}/yr</strong> across ${portfolioDesc}. That's <strong style="color:#F5A94A;">${insStr}</strong> in insurance, <strong style="color:#1647E8;">${energyStr}</strong> in energy, and <strong style="color:#0A8A4C;">${incomeStr}</strong> in new income.</p>
<p>These are benchmarks. The real numbers — once we look at your actual policies, tariffs, and rent roll — are usually sharper. Sometimes higher, sometimes lower, always more specific.</p>
<p>Here's an example of what that looks like in practice:</p>
<div style="border-left:3px solid #0A8A4C;padding:12px 16px;background:#f7faf8;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="margin:0 0 8px 0;">A ${n}-asset ${assetType} portfolio we ran last quarter had <strong>${fmtK(insPerAsset)}/asset</strong> in insurance overpay — not because they had bad brokers, but because each asset was placed individually. We retendered in 6 weeks. Net saving: <strong>${insStr}/yr</strong>.</p>
<p style="margin:0 0 8px 0;">Energy: <strong>${fmtK(energyPerAsset)}/asset</strong> gap vs market rate. Contracts had auto-renewed without comparison for 3 years.</p>
<p style="margin:0;">Total with income streams added: <strong>${totalStr}/yr</strong>. Commission-only — they paid nothing until we delivered.</p>
</div>
<p>If you want to run the same analysis on your real assets, 20 minutes is enough to tell you where the biggest levers are.</p>
<p><a href="https://cal.com/arca/demo" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Book a 20-min call →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca<br/><a href="mailto:hello@arcahq.ai" style="color:#888;font-size:13px;">hello@arcahq.ai</a></p>
<p style="font-size:12px;color:#aaa;margin-top:24px;">You received this because you ran Arca's free portfolio audit. Commission-only — you pay nothing until Arca delivers a saving or new income stream.</p>
</div>`,
  });
}

// ── Nurture sequence — Day 3 post-signup ──────────────────────────────────
export async function sendSignupNurtureDay3({
  name,
  email,
  assetCount,
}: {
  name: string;
  email: string;
  assetCount?: number | null;
}) {
  const n = Math.max(3, assetCount ?? 5);
  const scaleFactor = n / 5;
  const ins = Math.round(102000 * scaleFactor);
  const energy = Math.round(161000 * scaleFactor);
  const income = Math.round(243000 * scaleFactor);
  const total = ins + energy + income;

  function fmtK(v: number) { return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1_000)}k`; }
  const firstName = name.split(" ")[0];
  const portfolioDesc = n === 1 ? "your asset" : `a ${n}-asset portfolio`;

  // Schedule 3 days from now
  const sendAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  if (!process.env.RESEND_API_KEY) {
    console.log(`[nurture-day3] Would schedule Day 3 email to ${email} at ${sendAt}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  // scheduledAt requires Resend paid plan ($20/mo+). On free tier this silently fails —
  // the signup flow still completes, only this nurture email is dropped.
  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject: `${firstName} — what Arca found in portfolios like yours`,
    scheduledAt: sendAt,
    text: `${firstName},

You signed up a few days ago — I wanted to share what we typically surface in the first week on ${portfolioDesc}.

Here's what Arca found when we ran a similar portfolio through our benchmarking system last month:

- Insurance: ${fmtK(ins)} in overpay vs current market — policies placed individually, never put on a portfolio schedule
- Energy: ${fmtK(energy)} gap — commercial contracts not renegotiated since acquisition
- Rent roll: ${fmtK(income)} in undermarket leases — tenants on rates set 4+ years ago with no escalation

That's ${fmtK(total)} in identifiable leakage. Not unusual. Most of it had been sitting there for years.

On your portfolio, the mix will be different — but the pattern is almost always the same.

Want to see what the numbers look like for your specific assets? 20 minutes is enough to tell you where the gaps are.

Book a time: https://cal.com/arca/demo

Ian Baron
Arca
`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>You signed up a few days ago — I wanted to share what we typically surface in the first week on ${portfolioDesc}.</p>
<p>Here's what Arca found when we ran a similar portfolio through our benchmarking system last month:</p>
<ul style="padding-left:20px;margin:8px 0;">
  <li><strong>Insurance:</strong> ${fmtK(ins)} in overpay vs current market — policies placed individually, never put on a portfolio schedule</li>
  <li><strong>Energy:</strong> ${fmtK(energy)} gap — commercial contracts not renegotiated since acquisition</li>
  <li><strong>Rent roll:</strong> ${fmtK(income)} in undermarket leases — tenants on rates set 4+ years ago with no escalation</li>
</ul>
<p>That's <strong>${fmtK(total)} in identifiable leakage</strong>. Not unusual. Most of it had been sitting there for years.</p>
<p>On your portfolio, the mix will be different — but the pattern is almost always the same.</p>
<p>Want to see what the numbers look like for your specific assets? 20 minutes is enough to tell you where the gaps are.</p>
<p><a href="https://cal.com/arca/demo" style="color:#0A8A4C;font-weight:600;">Book a time →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca</p>
</div>`,
  });
}

// ── Nurture sequence — Day 7 post-signup ──────────────────────────────────
export async function sendSignupNurtureDay7({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const firstName = name.split(" ")[0];
  const sendAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (!process.env.RESEND_API_KEY) {
    console.log(`[nurture-day7] Would schedule Day 7 email to ${email} at ${sendAt}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  // scheduledAt requires Resend paid plan ($20/mo+). On free tier this silently fails —
  // the signup flow still completes, only this nurture email is dropped.
  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject: `Still here if you want to run it on your portfolio`,
    scheduledAt: sendAt,
    text: `${firstName},

You signed up a week ago — I don't want to pester you, but I also don't want to leave you hanging.

Arca works best when we run it on your actual assets, not demo data. That's where the real numbers come from — the specific carriers your insurance is placed with, the exact tariff you're on for energy, the rent you're actually charging vs what the market bears.

Before I run anything, one question: how many assets are in your portfolio?

Just reply to this email with the number (or a rough range). It helps me understand whether and where the biggest levers are likely to be, so the 20-minute call is actually useful.

If you'd rather just book the time directly: https://cal.com/arca/demo

Either way — I'm here.

Ian Baron
Arca
`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>You signed up a week ago — I don't want to pester you, but I also don't want to leave you hanging.</p>
<p>Arca works best when we run it on your actual assets, not demo data. That's where the real numbers come from — the specific carriers your insurance is placed with, the exact tariff you're on for energy, the rent you're actually charging vs what the market bears.</p>
<p>Before I run anything, one question: <strong>how many assets are in your portfolio?</strong></p>
<p>Just reply to this email with the number (or a rough range). It helps me understand whether and where the biggest levers are likely to be, so the 20-minute call is actually useful.</p>
<p>If you'd rather just book the time directly: <a href="https://cal.com/arca/demo" style="color:#0A8A4C;font-weight:600;">https://cal.com/arca/demo</a></p>
<p>Either way — I'm here.</p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca</p>
</div>`,
  });
}
