import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const FROM = process.env.AUTH_EMAIL_FROM ?? "Arca <noreply@arcahq.ai>";
const FROM_IAN = process.env.OUTREACH_EMAIL_FROM ?? "Ian Baron <ian@arcahq.ai>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://arcahq.ai";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@arcahq.ai";

function fmtCurrency(v: number) {
  return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1_000)}k`;
}

/** CAN-SPAM compliant unsubscribe footer for nurture emails */
function unsubFooter(email: string): string {
  const token = Buffer.from(email).toString("base64");
  const url = `${APP_URL}/api/unsubscribe?e=${encodeURIComponent(token)}`;
  return `<p style="font-size:11px;color:#aaa;margin-top:24px;line-height:1.5;">
You received this because you used Arca's free portfolio audit at arcahq.ai.<br/>
Arca · hello@arcahq.ai · Commission-only — you pay nothing until Arca delivers.<br/>
<a href="${url}" style="color:#aaa;">Unsubscribe</a>
</p>`;
}

function unsubFooterText(email: string): string {
  const token = Buffer.from(email).toString("base64");
  return `\n\n---\nYou received this because you used Arca's free portfolio audit. Commission-only — you pay nothing until Arca delivers.\nUnsubscribe: ${APP_URL}/api/unsubscribe?e=${encodeURIComponent(token)}`;
}

/** Returns true if email is on unsubscribe list */
async function isUnsubscribed(email: string): Promise<boolean> {
  try {
    const record = await prisma.unsubscribe.findUnique({ where: { email: email.toLowerCase() } });
    return record != null;
  } catch {
    return false; // Don't block sending on DB errors
  }
}

/** Queue a nurture email for delivery at sendAfter. Falls back to immediate send if DB write fails. */
async function queueEmail({
  to,
  from,
  subject,
  html,
  text,
  sendAfterMs,
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  sendAfterMs: number;
}): Promise<void> {
  const sendAfter = new Date(Date.now() + sendAfterMs);
  try {
    await prisma.scheduledEmail.create({ data: { to, from, subject, html, text, sendAfter } });
  } catch (err) {
    console.error("[email-queue] DB write failed, sending immediately:", err);
    if (!process.env.RESEND_API_KEY) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from, to, subject, html, text }).catch((e) =>
      console.error("[email-queue] immediate fallback failed:", e)
    );
  }
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
  enrichmentSummary,
}: {
  email: string;
  portfolioInput: string;
  assetType?: string | null;
  assetCount?: number | null;
  estimateTotal?: number | null;
  enrichmentSummary?: string | null;
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
      ${enrichmentSummary ? `<br/><strong>Property data:</strong><br/><pre style="font-size:12px;color:#555;background:#f5f5f5;padding:8px;border-radius:4px;">${enrichmentSummary}</pre>` : ""}
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
                  <td style="padding:12px 16px; font-size:13px; font-weight:600; color:#F5A94A; text-align:right;">${fmtK(eng)} / yr</td>
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
              <a href="${APP_URL}/book" style="color:#0A8A4C; font-weight:600;">
                Book a call with Arca →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="font-size:12px; color:#3d5a72; line-height:1.5; border-top:1px solid #1a2d45; padding-top:20px;">
              You received this because you signed up at arcahq.ai. Commission-only — you pay nothing until
              Arca delivers. Questions? Reply to this email or write to
              <a href="mailto:hello@arcahq.ai" style="color:#5a7a96;">hello@arcahq.ai</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
${unsubFooter(email)}
</body>
</html>`,
  });
}

type EnrichItem = {
  address: string;
  floodZone?: { zone: string; description: string; isHighRisk: boolean } | null;
  property?: { assessedValue?: number | null; yearBuilt?: number | null; sqft?: number | null; useCode?: string | null } | null;
  narrative?: string | null;
};

export async function sendAuditLeadEmail({
  email,
  portfolioInput,
  estimate,
  enrichments,
}: {
  email: string;
  portfolioInput: string;
  estimate: { insurance: number; energy: number; income: number; total: number; assetType: string; assetCount: number };
  enrichments?: EnrichItem[];
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping audit lead email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  function fmtK(v: number) { return v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${Math.round(v/1_000)}k`; }
  function fmtVal(v: number) { return v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${Math.round(v/1_000)}k`; }

  const summary = portfolioInput.length > 120 ? portfolioInput.slice(0, 117) + "…" : portfolioInput;

  // Build enrichment block for the email — only show if we have real data
  const enrichedProps = (enrichments ?? []).filter(e => e.floodZone || e.property?.assessedValue || e.narrative);
  const enrichmentBlock = enrichedProps.length > 0
    ? `
          <!-- Property data section -->
          <tr>
            <td style="padding-bottom:8px;font-size:13px;font-weight:600;color:#8ba0b8;">
              Property intelligence from public records:
            </td>
          </tr>
          ${enrichedProps.map(e => `
          <tr>
            <td style="padding-bottom:16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a2d45;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#5a7a96;background:#0d1825;">
                    ${e.address}
                  </td>
                </tr>
                ${e.floodZone ? `
                <tr>
                  <td style="padding:10px 14px;font-size:12px;border-top:1px solid #1a2d45;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${e.floodZone.isHighRisk ? "#FF8080" : "#5BF0AC"};margin-right:6px;vertical-align:middle;"></span>
                    <strong style="color:#e8eef5;">Flood Zone ${e.floodZone.zone}</strong>
                    <span style="color:#5a7a96;"> — ${e.floodZone.description}</span>
                    ${e.floodZone.isHighRisk ? `<br/><span style="color:#F5A94A;font-size:11px;">Arca can identify flood-specific insurance discounts for this property.</span>` : ""}
                  </td>
                </tr>` : ""}
                ${e.property?.assessedValue ? `
                <tr>
                  <td style="padding:10px 14px;font-size:12px;border-top:1px solid #1a2d45;color:#8ba0b8;">
                    County record: assessed at <strong style="color:#e8eef5;">${fmtVal(e.property.assessedValue)}</strong>
                    ${e.property.yearBuilt ? `, built <strong style="color:#e8eef5;">${e.property.yearBuilt}</strong>` : ""}
                    ${e.property.sqft ? ` · <strong style="color:#e8eef5;">${e.property.sqft.toLocaleString()} sq ft</strong>` : ""}
                  </td>
                </tr>` : ""}
                ${e.narrative ? `
                <tr>
                  <td style="padding:10px 14px;font-size:12px;border-top:1px solid #1a2d45;color:#8ba0b8;font-style:italic;line-height:1.5;">
                    ${e.narrative}
                  </td>
                </tr>` : ""}
              </table>
            </td>
          </tr>`).join("")}`
    : "";

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
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#F5A94A;text-align:right;">${fmtK(estimate.energy)}/yr</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#8ba0b8;">Additional income (est.)</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0A8A4C;text-align:right;">${fmtK(estimate.income)}/yr</td>
                </tr>
              </table>
            </td>
          </tr>
          ${enrichmentBlock}
          <!-- Next step -->
          <tr>
            <td style="font-size:14px;color:#8ba0b8;line-height:1.6;padding-bottom:20px;">
              These are benchmarks based on your asset type and count. For a detailed per-asset analysis — specific to your actual properties — book a 20-min call. We'll send you a full breakdown within 48 hours.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:16px;">
              <a href="${APP_URL}/book"
                style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:600;">
                Book a 20-min call →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${APP_URL}/signup?email=${encodeURIComponent(email)}"
                style="display:inline-block;background:transparent;color:#5a7a96;text-decoration:none;padding:10px 0;font-size:13px;border-bottom:1px solid #1a2d45;">
                Or explore the full dashboard yourself →
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
${unsubFooter(email)}
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

  const n = estimate.assetCount;
  const assetType = estimate.assetType;
  const portfolioDesc = `${n} ${assetType} asset${n !== 1 ? "s" : ""}`;

  const insPerAsset = Math.round(estimate.insurance / n);
  const energyPerAsset = Math.round(estimate.energy / n);
  const totalStr = fmtK(estimate.total);
  const insStr = fmtK(estimate.insurance);
  const energyStr = fmtK(estimate.energy);
  const incomeStr = fmtK(estimate.income);

  if (await isUnsubscribed(email)) {
    console.log(`[audit-nurture-day2] Skipping — ${email} is unsubscribed`);
    return;
  }

  await queueEmail({
    to: email,
    from: FROM_IAN,
    subject: `A quick follow-up on your ${totalStr}/yr estimate`,
    sendAfterMs: 2 * 24 * 60 * 60 * 1000,
    text: `You ran your portfolio through Arca's audit tool a couple of days ago — I wanted to follow up directly.

Your estimate came back at ${totalStr}/yr across ${portfolioDesc}. That's ${insStr} in insurance, ${energyStr} in energy, and ${incomeStr} in new income.

These are benchmarks. The real numbers — once we look at your actual policies, tariffs, and rent roll — are usually sharper. Sometimes higher, sometimes lower, always more specific.

Here's an example of what that looks like in practice:

A ${n}-asset ${assetType} portfolio we ran last quarter had ${fmtK(insPerAsset)}/asset in insurance overpay — not because they had bad brokers, but because each asset was placed individually. Nobody had ever put them on a combined portfolio schedule. We retendered in 6 weeks. Net saving landed at ${insStr}/yr.

Energy was similar. ${fmtK(energyPerAsset)}/asset in contract gap vs market rate. Contracts had auto-renewed without comparison for 3 years.

Income was the slowest — 5G mast agreements and EV charging take 6–12 months to close — but the ${incomeStr} estimate held up.

Total: ${totalStr}/yr. Commission-only, so they paid nothing until we delivered.

If you want to do the same for your portfolio, 20 minutes on a call is enough to tell you where the biggest levers are.

Book a time: ${APP_URL}/book

Ian Baron
Arca${unsubFooterText(email)}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>You ran your portfolio through Arca's audit tool a couple of days ago — I wanted to follow up directly.</p>
<p>Your estimate came back at <strong>${totalStr}/yr</strong> across ${portfolioDesc}. That's <strong style="color:#F5A94A;">${insStr}</strong> in insurance, <strong style="color:#F5A94A;">${energyStr}</strong> in energy, and <strong style="color:#0A8A4C;">${incomeStr}</strong> in new income.</p>
<p>These are benchmarks. The real numbers — once we look at your actual policies, tariffs, and rent roll — are usually sharper. Sometimes higher, sometimes lower, always more specific.</p>
<p>Here's an example of what that looks like in practice:</p>
<div style="border-left:3px solid #0A8A4C;padding:12px 16px;background:#f7faf8;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="margin:0 0 8px 0;">A ${n}-asset ${assetType} portfolio we ran last quarter had <strong>${fmtK(insPerAsset)}/asset</strong> in insurance overpay — not because they had bad brokers, but because each asset was placed individually. We retendered in 6 weeks. Net saving: <strong>${insStr}/yr</strong>.</p>
<p style="margin:0 0 8px 0;">Energy: <strong>${fmtK(energyPerAsset)}/asset</strong> gap vs market rate. Contracts had auto-renewed without comparison for 3 years.</p>
<p style="margin:0;">Total with income streams added: <strong>${totalStr}/yr</strong>. Commission-only — they paid nothing until we delivered.</p>
</div>
<p>If you want to run the same analysis on your real assets, 20 minutes is enough to tell you where the biggest levers are.</p>
<p><a href="${APP_URL}/book" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Book a 20-min call →</a></p>
<p style="font-size:13px;color:#888;margin-top:8px;">Prefer to explore first? <a href="${APP_URL}/signup?email=${encodeURIComponent(email)}" style="color:#0A8A4C;">Create a free account →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca<br/><a href="mailto:hello@arcahq.ai" style="color:#888;font-size:13px;">hello@arcahq.ai</a></p>
${unsubFooter(email)}
</div>`,
  });
}

// ── Nurture sequence — Day 3 post-audit (case study) ─────────────────────
export async function sendAuditLeadNurtureDay3({
  email,
  estimate,
}: {
  email: string;
  estimate: { insurance: number; energy: number; income: number; total: number; assetType: string; assetCount: number };
}) {
  function fmtK(v: number) { return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1_000)}k`; }

  const n = estimate.assetCount;
  const assetType = estimate.assetType;
  const totalStr = fmtK(estimate.total);

  // Case study numbers — scaled relative to estimate
  const caseN = Math.max(5, Math.round(n * 1.4));
  const caseIns = Math.round(caseN * 19_000);
  const caseEnergy = Math.round(caseN * 31_000);
  const caseIncome = Math.round(80_000 + Math.min(caseN, 20) * 4_500);
  const caseTotal = caseIns + caseEnergy + caseIncome;
  const arcaFee = Math.round(caseIns * 0.15 + caseEnergy * 0.10 + caseIncome * 0.10);

  const bookUrl = `${APP_URL}/book?assets=${n}`;

  if (await isUnsubscribed(email)) {
    console.log(`[audit-nurture-day3] Skipping — ${email} is unsubscribed`);
    return;
  }

  await queueEmail({
    to: email,
    from: FROM_IAN,
    subject: `What ${fmtK(caseTotal)}/yr actually looks like`,
    sendAfterMs: 3 * 24 * 60 * 60 * 1000,
    text: `I wanted to share a recent example that's close to your portfolio.

Last quarter we ran an analysis for a ${caseN}-asset ${assetType} portfolio. The owner had been with the same insurance broker for 7 years and the same energy supplier for 4. Nothing was obviously wrong — the portfolio was profitable, occupancy was good.

Here's what we found:

Insurance: ${fmtK(caseIns)}/yr above market rate. The portfolio had been placed on individual schedules. Combined placement with a specialist carrier cut the premium immediately.

Energy: ${fmtK(caseEnergy)}/yr above current wholesale rates. Three contracts had auto-renewed without comparison. Switching took 6 weeks total.

New income (EV charging + 5G mast): ${fmtK(caseIncome)}/yr. Two sites already had the infrastructure. Neither stream had been activated.

Total: ${fmtK(caseTotal)}/yr. Arca fee on delivery: ${fmtK(arcaFee)}/yr. Net retained by the owner: ${fmtK(caseTotal - arcaFee)}/yr.

That portfolio is worth more now than it was six months ago — not because anything changed in the market, but because the numbers were surfaced and acted on.

Your estimate was ${totalStr}/yr. The methodology is identical.

If you'd like to see what the actual numbers look like for your assets: ${bookUrl}

Ian Baron
Arca${unsubFooterText(email)}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>I wanted to share a recent example that's close to your portfolio.</p>
<p>Last quarter we ran an analysis for a <strong>${caseN}-asset ${assetType} portfolio</strong>. The owner had been with the same insurance broker for 7 years and the same energy supplier for 4. Nothing was obviously wrong — the portfolio was profitable, occupancy was good.</p>
<p><strong>Here's what we found:</strong></p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <thead>
    <tr style="background:#f9fafb;">
      <th style="text-align:left;padding:10px 14px;font-size:12px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Category</th>
      <th style="text-align:right;padding:10px 14px;font-size:12px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Saving / yr</th>
      <th style="text-align:left;padding:10px 14px;font-size:12px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">How</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 14px;font-size:13px;">Insurance</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#F5A94A;text-align:right;">${fmtK(caseIns)}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280;">Combined placement, specialist carrier</td>
    </tr>
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 14px;font-size:13px;">Energy</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#F5A94A;text-align:right;">${fmtK(caseEnergy)}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280;">3 contracts switched in 6 weeks</td>
    </tr>
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 14px;font-size:13px;">New income</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#0A8A4C;text-align:right;">${fmtK(caseIncome)}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280;">EV charging + 5G mast activated</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;font-size:13px;font-weight:700;">Total</td>
      <td style="padding:10px 14px;font-size:15px;font-weight:700;color:#F5A94A;text-align:right;">${fmtK(caseTotal)}/yr</td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280;">Arca fee: ${fmtK(arcaFee)}/yr</td>
    </tr>
  </tbody>
</table>
<p>The portfolio is worth more now than it was six months ago — not because anything changed in the market, but because the numbers were surfaced and acted on.</p>
<p>Your estimate was <strong style="color:#F5A94A;">${totalStr}/yr</strong>. The methodology is identical.</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See the numbers for your assets →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca<br/><a href="mailto:hello@arcahq.ai" style="color:#888;font-size:13px;">hello@arcahq.ai</a></p>
${unsubFooter(email)}
</div>`,
  });
}

// ── Cold outreach emails (Touch 1, 2 and 3 — admin-dispatched from /admin/leads) ─────────────────────

export async function sendColdOutreachEmail({
  email,
  firstName,
  company,
  assetCount,
  area,
  touch,
  market,
  prospectKey,
}: {
  email: string;
  firstName: string;
  company?: string | null;
  assetCount: number;
  area: string;
  touch: 1 | 2 | 3;
  market: "fl" | "seuk";
  prospectKey?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[cold-outreach] RESEND_API_KEY not set — skipping Touch ${touch} to ${email}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const n = Math.max(1, assetCount);
  const sym = market === "seuk" ? "£" : "$";
  const outreachTags = prospectKey
    ? [{ name: "prospectKey", value: prospectKey }, { name: "market", value: market }]
    : undefined;
  const fx = market === "seuk" ? 0.8 : 1;
  function fmtK(v: number) {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    return `${sym}${Math.round(v / 1_000)}k`;
  }

  // Personalised book link
  const bookParams = new URLSearchParams();
  const fullName = company ? `${firstName} ${company}`.trim() : firstName;
  if (firstName) bookParams.set("name", fullName);
  if (company) bookParams.set("company", company);
  bookParams.set("assets", String(n));
  if (market === "seuk") bookParams.set("portfolio", "se-logistics");
  const bookUrl = `${APP_URL}/book?${bookParams.toString()}`;

  if (touch === 1) {
    if (market === "fl") {
      const subject = `Your insurance bill, ${area} industrial`;
      const insLow = fmtK(Math.round(n * 1_800));
      const insHigh = fmtK(Math.round(n * 4_000));
      await resend.emails.send({
        from: FROM_IAN,
        to: email,
        subject,
        text: `${firstName},\n\nQuick question — when did you last retender your commercial insurance across the portfolio?\n\nMost owner-operators I talk to in Florida are sitting on 25–35% overpay vs what's actually available in market right now. On a ${n}-asset portfolio that's typically ${insLow}–${insHigh} a year just sitting on the table.\n\nI run Arca. We audit your insurance, energy, and rent roll against live market benchmarks, then go execute the savings. Commission-only — we earn a percentage of what we save you, nothing if we don't deliver.\n\nWorth a 20-minute look at the numbers? I'll pull your portfolio data before the call so we're not wasting time.\n\nIan`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Quick question — when did you last retender your commercial insurance across the portfolio?</p>
<p>Most owner-operators I talk to in Florida are sitting on 25–35% overpay vs what's actually available in market right now. On a ${n}-asset portfolio that's typically <strong>${insLow}–${insHigh}</strong> a year just sitting on the table.</p>
<p>I run Arca. We audit your insurance, energy, and rent roll against live market benchmarks, then go execute the savings. Commission-only — we earn a percentage of what we save you, nothing if we don't deliver.</p>
<p>Worth a 20-minute look at the numbers? I'll pull your portfolio data before the call so we're not wasting time.</p>
<p style="margin-top:24px;color:#555;">Ian</p>
</div>`,
        ...(outreachTags && { tags: outreachTags }),
      });
    } else {
      // SE UK Touch 1
      const subject = `Energy contracts and MEES — ${area} industrial`;
      const insLow = fmtK(Math.round(n * 6_000 * fx));
      const insHigh = fmtK(Math.round(n * 12_000 * fx));
      await resend.emails.send({
        from: FROM_IAN,
        to: email,
        subject,
        text: `${firstName},\n\nOne thing I see consistently with SE logistics owners right now: energy contracts that haven't been retendered since before the Ofgem price reset — and premises that are sitting at EPC D or below with the MEES 2027 deadline coming.\n\nOn a ${n}-unit industrial portfolio, the combination is typically ${insLow}–${insHigh} a year in avoidable cost. Energy alone, most SE operators I speak to are 15–20% above what a fresh commercial tender returns today.\n\nI run Arca. We audit your portfolio against live market benchmarks — insurance, energy, rent roll, ancillary income — and then go and fix what we find. Commission-only, no upfront fees. We earn on what we deliver.\n\nWorth 20 minutes to see where your portfolio sits? I'll pull your premises data before the call.\n\nIan`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>One thing I see consistently with SE logistics owners right now: energy contracts that haven't been retendered since before the Ofgem price reset — and premises that are sitting at EPC D or below with the MEES 2027 deadline coming.</p>
<p>On a ${n}-unit industrial portfolio, the combination is typically <strong>${insLow}–${insHigh}</strong> a year in avoidable cost. Energy alone, most SE operators I speak to are 15–20% above what a fresh commercial tender returns today.</p>
<p>I run Arca. We audit your portfolio against live market benchmarks — insurance, energy, rent roll, ancillary income — and then go and fix what we find. Commission-only, no upfront fees. We earn on what we deliver.</p>
<p>Worth 20 minutes to see where your portfolio sits? I'll pull your premises data before the call.</p>
<p style="margin-top:24px;color:#555;">Ian</p>
</div>`,
        ...(outreachTags && { tags: outreachTags }),
      });
    }
  } else if (touch === 2) {
    // Touch 2 — rent roll + income angle (different hook from Touch 1)
    if (market === "fl") {
      const subject = `Rent roll and income gaps — ${area} industrial`;
      const rentLow = fmtK(Math.round(n * 2_500));
      const rentHigh = fmtK(Math.round(n * 5_500));
      const incomeLow = fmtK(Math.round(n * 2_000));
      const incomeHigh = fmtK(Math.round(n * 4_000));
      await resend.emails.send({
        from: FROM_IAN,
        to: email,
        subject,
        text: `${firstName},\n\nSeparate thought — beyond insurance, the other place I consistently see money left on the table in Florida industrials is rent roll and ancillary income.\n\nMost owner-operators I speak to have leases that haven't been reviewed against ERV in 2–3 years. On a ${n}-asset portfolio that's typically ${rentLow}–${rentHigh}/yr in missed uplift. Add EV charging, 5G site rental, and solar — assets that qualify are sitting on another ${incomeLow}–${incomeHigh}/yr uncaptured.\n\nArca audits all of it and then goes and fixes it. Commission-only — we earn on what we deliver, nothing if we don't.\n\nIf you want to see the numbers on your specific portfolio:\n\n${bookUrl}\n\nIan`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Separate thought — beyond insurance, the other place I consistently see money left on the table in Florida industrials is rent roll and ancillary income.</p>
<p>Most owner-operators I speak to have leases that haven't been reviewed against ERV in 2–3 years. On a ${n}-asset portfolio that's typically <strong>${rentLow}–${rentHigh}/yr</strong> in missed uplift. Add EV charging, 5G site rental, and solar — assets that qualify are sitting on another <strong>${incomeLow}–${incomeHigh}/yr</strong> uncaptured.</p>
<p>Arca audits all of it and then goes and fixes it. Commission-only — we earn on what we deliver, nothing if we don't.</p>
<p>If you want to see the numbers on your specific portfolio:</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See your personalised numbers →</a></p>
<p style="margin-top:24px;color:#555;">Ian</p>
</div>`,
        ...(outreachTags && { tags: outreachTags }),
      });
    } else {
      // SE UK Touch 2 — rent ERV drift + income angle
      const subject = `Rent reviews and income — ${area} industrial`;
      const rentLow = fmtK(Math.round(n * 3_000 * fx));
      const rentHigh = fmtK(Math.round(n * 7_000 * fx));
      const incomeLow = fmtK(Math.round(n * 2_000 * fx));
      const incomeHigh = fmtK(Math.round(n * 4_500 * fx));
      await resend.emails.send({
        from: FROM_IAN,
        to: email,
        subject,
        text: `${firstName},\n\nOne more angle worth flagging alongside the energy side — rent reviews and ancillary income.\n\nMost SE logistics owners I speak to have leases running 10–15% below current ERV, with reviews due that haven't been pushed. On a ${n}-unit portfolio that's typically ${rentLow}–${rentHigh}/yr in missed uplift. Then there's the income side — 5G mast sites, EV charging, and solar. SE industrial is well-positioned for all three; most owners haven't had time to run the analysis, which on a ${n}-unit portfolio is another ${incomeLow}–${incomeHigh}/yr sitting uncaptured.\n\nArca audits the full picture — insurance, energy, rent, income — and then goes and executes. Commission-only, no upfront fees.\n\nWorth a look at where your portfolio sits?\n\n${bookUrl}\n\nIan`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>One more angle worth flagging alongside the energy side — rent reviews and ancillary income.</p>
<p>Most SE logistics owners I speak to have leases running 10–15% below current ERV, with reviews due that haven't been pushed. On a ${n}-unit portfolio that's typically <strong>${rentLow}–${rentHigh}/yr</strong> in missed uplift.</p>
<p>Then there's the income side — 5G mast sites, EV charging, and solar. SE industrial is well-positioned for all three; most owners haven't had time to run the analysis, which on a ${n}-unit portfolio is another <strong>${incomeLow}–${incomeHigh}/yr</strong> sitting uncaptured.</p>
<p>Arca audits the full picture — insurance, energy, rent, income — and then goes and executes. Commission-only, no upfront fees.</p>
<p>Worth a look at where your portfolio sits?</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See your personalised numbers →</a></p>
<p style="margin-top:24px;color:#555;">Ian</p>
</div>`,
        ...(outreachTags && { tags: outreachTags }),
      });
    }
  } else {
    // Touch 3 — case study email
    if (market === "fl") {
      const subject = `Re: Your insurance bill, ${area} industrial`;
      const caseIns = Math.round(22_000);
      const caseEnergy = Math.round(11_000);
      const caseIncome = 8_000;
      const caseTotal = caseIns + caseEnergy + caseIncome;
      await resend.emails.send({
        from: FROM_IAN,
        to: email,
        subject,
        text: `${firstName},\n\nLast one from me.\n\nWe recently ran a portfolio health check for a Florida mixed-use operator — 8 assets, similar profile to yours. Found:\n\n- ${fmtK(caseIns)}/yr insurance overpay (placed with two new carriers, saved 28%)\n- ${fmtK(caseEnergy)}/yr energy savings (switched commercial tariff, live in 3 weeks)\n- Two missed income streams (EV charging + subletting opportunity on one asset)\n\nTotal year-1 uplift: ~${fmtK(caseTotal)}. Our commission: a fraction of that. Their net: the rest.\n\nIf the timing's wrong, no problem. But if you want to see what that looks like for your portfolio specifically:\n\n${bookUrl}\n\nIan Baron\nArca`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Last one from me.</p>
<p>We recently ran a portfolio health check for a Florida mixed-use operator — 8 assets, similar profile to yours. Found:</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;">Insurance overpay</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">${fmtK(caseIns)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">2 carriers, 28% saving</td></tr>
  <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;">Energy savings</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">${fmtK(caseEnergy)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">Commercial tariff switch, 3 weeks</td></tr>
  <tr><td style="padding:10px 14px;font-size:13px;">New income</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#15803d;text-align:right;">${fmtK(caseIncome)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">EV charging + subletting</td></tr>
</table>
<p>Total year-1 uplift: ~<strong>${fmtK(caseTotal)}</strong>. Our commission: a fraction of that. Their net: the rest.</p>
<p>If the timing's wrong, no problem. But if you want to see what that looks like for your portfolio specifically:</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See your personalised numbers →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca<br/><a href="mailto:ian@arcahq.ai" style="color:#888;font-size:13px;">ian@arcahq.ai</a></p>
</div>`,
        ...(outreachTags && { tags: outreachTags }),
      });
    } else {
      // SE UK Touch 3
      const subject = `Re: Energy contracts and MEES — ${area} industrial`;
      const caseIns = Math.round(68_000 * fx);
      const caseEnergy = Math.round(97_000 * fx);
      const caseMast = Math.round(22_000 * fx);
      const caseTotal = caseIns + caseEnergy + caseMast;
      await resend.emails.send({
        from: FROM_IAN,
        to: email,
        subject,
        text: `${firstName},\n\nLast one from me.\n\nWe recently ran a portfolio review for a SE logistics owner — 5 units across Kent and Essex. What we found:\n\n- Insurance: 25% above market rate, ${fmtK(caseIns)}/yr overpay — placed with three specialist carriers, savings live within 6 weeks\n- Energy: legacy dual-fuel contracts, 16% above current commercial rates — ${fmtK(caseEnergy)}/yr — renegotiated across all units\n- Additional income: two 5G mast opportunities identified (${fmtK(Math.round(caseMast / 2))}/yr each), plus EV charging viable on the largest site\n\nYear-1 uplift: over ${fmtK(caseTotal)}. Our fee: a commission on what we delivered. Their upfront cost: zero.\n\nIf the timing's not right, no problem. If you want to see what those numbers look like across your specific premises:\n\n${bookUrl}\n\nIan Baron\nArca`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Last one from me.</p>
<p>We recently ran a portfolio review for a SE logistics owner — 5 units across Kent and Essex. What we found:</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;">Insurance overpay</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">${fmtK(caseIns)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">Lloyd's placement, 3 carriers</td></tr>
  <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;">Energy (dual-fuel)</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">${fmtK(caseEnergy)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">All units renegotiated</td></tr>
  <tr><td style="padding:10px 14px;font-size:13px;">5G mast income (×2)</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#15803d;text-align:right;">${fmtK(caseMast)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">MBNL + Cornerstone sites</td></tr>
</table>
<p>Year-1 uplift: over <strong>${fmtK(caseTotal)}</strong>. Our fee: a commission on what we delivered. Their upfront cost: zero.</p>
<p>If the timing's not right, no problem. If you want to see what those numbers look like across your specific premises:</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See your personalised numbers →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca<br/><a href="mailto:ian@arcahq.ai" style="color:#888;font-size:13px;">ian@arcahq.ai</a></p>
</div>`,
        ...(outreachTags && { tags: outreachTags }),
      });
    }
  }
}

// ── Nurture sequence — Day 5 post-audit (last nudge) ─────────────────────
export async function sendAuditLeadNurtureDay5({
  email,
  estimate,
}: {
  email: string;
  estimate: { insurance: number; energy: number; income: number; total: number; assetType: string; assetCount: number };
}) {
  function fmtK(v: number) { return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1_000)}k`; }

  const totalStr = fmtK(estimate.total);
  const monthlyStr = fmtK(Math.round(estimate.total / 12));
  const bookUrl = `${APP_URL}/book?assets=${estimate.assetCount}`;

  if (await isUnsubscribed(email)) {
    console.log(`[audit-nurture-day5] Skipping — ${email} is unsubscribed`);
    return;
  }

  await queueEmail({
    to: email,
    from: FROM_IAN,
    subject: `Still ${totalStr}/yr`,
    sendAfterMs: 5 * 24 * 60 * 60 * 1000,
    text: `One last follow-up.

Your estimate was ${totalStr}/yr. Every month you don't act on it costs roughly ${monthlyStr} — money that the portfolio is already generating but not keeping.

None of it is complex to fix. Insurance retender takes 3–6 weeks. Energy switch takes 3–4. New income streams take longer, but the work to initiate them is minimal.

Commission-only. 20 minutes to get started.

Book a time: ${bookUrl}

Ian Baron
Arca

You'll hear nothing more from me after this unless you reach out.${unsubFooterText(email)}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>One last follow-up.</p>
<p>Your estimate was <strong style="color:#F5A94A;">${totalStr}/yr</strong>. Every month you don't act on it costs roughly <strong>${monthlyStr}</strong> — money the portfolio is already generating but not keeping.</p>
<p>None of it is complex to fix:</p>
<ul style="padding-left:20px;color:#444;margin:12px 0;">
  <li style="margin-bottom:6px;">Insurance retender — 3–6 weeks</li>
  <li style="margin-bottom:6px;">Energy switch — 3–4 weeks</li>
  <li>Income streams — 6–12 months, but minimal work to initiate</li>
</ul>
<p>Commission-only. You pay nothing until we deliver.</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Book a 20-min call →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca<br/><a href="mailto:hello@arcahq.ai" style="color:#888;font-size:13px;">hello@arcahq.ai</a></p>
${unsubFooter(email)}
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

  if (await isUnsubscribed(email)) {
    console.log(`[nurture-day3] Skipping — ${email} is unsubscribed`);
    return;
  }

  await queueEmail({
    to: email,
    from: FROM_IAN,
    subject: `${firstName} — what Arca found in portfolios like yours`,
    sendAfterMs: 3 * 24 * 60 * 60 * 1000,
    text: `${firstName},

You signed up a few days ago — I wanted to share what we typically surface in the first week on ${portfolioDesc}.

Here's what Arca found when we ran a similar portfolio through our benchmarking system last month:

- Insurance: ${fmtK(ins)} in overpay vs current market — policies placed individually, never put on a portfolio schedule
- Energy: ${fmtK(energy)} gap — commercial contracts not renegotiated since acquisition
- Rent roll: ${fmtK(income)} in undermarket leases — tenants on rates set 4+ years ago with no escalation

That's ${fmtK(total)} in identifiable leakage. Not unusual. Most of it had been sitting there for years.

On your portfolio, the mix will be different — but the pattern is almost always the same.

Want to see what the numbers look like for your specific assets? 20 minutes is enough to tell you where the gaps are.

Book a time: ${APP_URL}/book

Ian Baron
Arca${unsubFooterText(email)}`,
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
<p><a href="${APP_URL}/book" style="color:#0A8A4C;font-weight:600;">Book a time →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca</p>
${unsubFooter(email)}
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

  if (await isUnsubscribed(email)) {
    console.log(`[nurture-day7] Skipping — ${email} is unsubscribed`);
    return;
  }

  await queueEmail({
    to: email,
    from: FROM_IAN,
    subject: `Still here if you want to run it on your portfolio`,
    sendAfterMs: 7 * 24 * 60 * 60 * 1000,
    text: `${firstName},

You signed up a week ago — I don't want to pester you, but I also don't want to leave you hanging.

Arca works best when we run it on your actual assets, not demo data. That's where the real numbers come from — the specific carriers your insurance is placed with, the exact tariff you're on for energy, the rent you're actually charging vs what the market bears.

Before I run anything, one question: how many assets are in your portfolio?

Just reply to this email with the number (or a rough range). It helps me understand whether and where the biggest levers are likely to be, so the 20-minute call is actually useful.

If you'd rather just book the time directly: ${APP_URL}/book

Either way — I'm here.

Ian Baron
Arca${unsubFooterText(email)}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>You signed up a week ago — I don't want to pester you, but I also don't want to leave you hanging.</p>
<p>Arca works best when we run it on your actual assets, not demo data. That's where the real numbers come from — the specific carriers your insurance is placed with, the exact tariff you're on for energy, the rent you're actually charging vs what the market bears.</p>
<p>Before I run anything, one question: <strong>how many assets are in your portfolio?</strong></p>
<p>Just reply to this email with the number (or a rough range). It helps me understand whether and where the biggest levers are likely to be, so the 20-minute call is actually useful.</p>
<p>If you'd rather just book the time directly: <a href="${APP_URL}/book" style="color:#0A8A4C;font-weight:600;">${APP_URL}/book</a></p>
<p>Either way — I'm here.</p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca</p>
${unsubFooter(email)}
</div>`,
  });
}

// ── Post-demo follow-up ───────────────────────────────────────────────────
export async function sendPostDemoFollowUp({
  email,
  firstName,
  company,
  assetCount,
  assetType,
  estimateTotal,
  callNote,
  currencySym = "$",
}: {
  email: string;
  firstName: string;
  company?: string | null;
  assetCount: number;
  assetType?: string | null;
  estimateTotal: number;
  callNote?: string | null;
  currencySym?: string;
}) {
  const sym = currencySym || "$";
  function fmtK(v: number) { return v >= 1_000_000 ? `${sym}${(v / 1_000_000).toFixed(1)}M` : `${sym}${Math.round(v / 1_000)}k`; }
  const fx = sym === "£" ? 0.8 : 1;

  const ins = Math.round(assetCount * 1_500 * fx);
  const eng = Math.round(assetCount * 4_333 * fx);
  const inc = Math.round((80_000 + Math.min(assetCount, 20) * 2_200) * fx);
  const totalStr = fmtK(estimateTotal);
  const insStr = fmtK(ins);
  const engStr = fmtK(eng);
  const incStr = fmtK(inc);
  const portfolioDesc = company
    ? `${company}'s ${assetCount}-asset portfolio`
    : `your ${assetCount}-asset portfolio`;
  const assetTypeLabel = assetType ? ` ${assetType}` : "";

  const subject = `Following up — ${totalStr}/yr identified for ${company ?? firstName}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[post-demo] Would send "${subject}" to ${email}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject,
    text: `${firstName},

Great to speak today. As promised, here's a summary of what we ran through.

Based on ${portfolioDesc} (${assetCount}${assetTypeLabel} assets), Arca's benchmarks put the opportunity at ${totalStr}/yr:

- Insurance: ${insStr}/yr — portfolio-level placement vs per-asset policies
- Energy: ${engStr}/yr — renegotiated vs current market rates
- Additional income: ${incStr}/yr — ${assetCount < 5 ? "5G mast, EV charging, and solar where applicable" : "5G masts, EV charging, solar, parking, and billboard across your footprint"}
${callNote ? `\n${callNote}\n` : ""}
Next step: I'll send over a short scope document by end of week. No commitment — this just outlines exactly how Arca works on each income stream, what we'd need from you, and the timeline.

Commission-only. You pay nothing until we deliver a saving or new income stream.

Ian Baron
Arca
${APP_URL}/book — if you want to book a follow-up`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Great to speak today. As promised, here's a summary of what we ran through.</p>
<p>Based on <strong>${portfolioDesc}</strong>, Arca's benchmarks put the opportunity at <strong style="color:#F5A94A;">${totalStr}/yr</strong>:</p>
<table style="border:1px solid #e0e8f0;border-radius:10px;border-collapse:collapse;width:100%;margin:16px 0;">
  <tr style="border-bottom:1px solid #e0e8f0;">
    <td style="padding:10px 14px;font-size:13px;color:#555;">Insurance overpay</td>
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#F5A94A;text-align:right;">${insStr}/yr</td>
  </tr>
  <tr style="border-bottom:1px solid #e0e8f0;">
    <td style="padding:10px 14px;font-size:13px;color:#555;">Energy overpay</td>
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#F5A94A;text-align:right;">${engStr}/yr</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#555;">Additional income streams</td>
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#0A8A4C;text-align:right;">${incStr}/yr</td>
  </tr>
</table>
${callNote ? `<div style="border-left:3px solid #0A8A4C;padding:10px 14px;background:#f5faf7;border-radius:0 8px 8px 0;margin:16px 0;font-size:13px;color:#333;">${callNote}</div>` : ""}
<p><strong>Next step:</strong> I'll send over a short scope document by end of week. No commitment — this just outlines exactly how Arca works on each income stream, what we'd need from you, and the timeline.</p>
<p style="font-size:13px;color:#888;">Commission-only. You pay nothing until we deliver a saving or new income stream.</p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca<br/><a href="${APP_URL}/book" style="color:#0A8A4C;font-size:13px;">Book a follow-up →</a></p>
${unsubFooter(email)}
</div>`,
  });
}

// ── Partner programme application alert ───────────────────────────────────
export async function sendPartnerApplicationAlert({
  name,
  email,
  company,
  role,
  clientBase,
  message,
}: {
  name: string;
  email: string;
  company: string;
  role: string;
  clientBase?: string | null;
  message?: string | null;
}) {
  const subject = `New partner application: ${name} — ${company} (${role})`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[partner-alert] ${subject} | ${email} | client base: "${clientBase ?? "—"}"`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject,
    html: `<div style="font-family:sans-serif;font-size:14px;color:#222;max-width:600px;">
      <h2 style="font-size:16px;margin-bottom:4px;">New referral partner application</h2>
      <p style="color:#5a7a96;margin-top:0;">From ${APP_URL}/partners</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Name</td><td><strong>${name}</strong></td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Company</td><td>${company}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Role</td><td>${role}</td></tr>
        ${clientBase ? `<tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Client base</td><td>${clientBase}</td></tr>` : ""}
        ${message ? `<tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Message</td><td>${message}</td></tr>` : ""}
      </table>
      <p style="margin-top:16px;">
        <a href="mailto:${email}?subject=Welcome to the Arca Partner Programme — ${encodeURIComponent(name)}" style="color:#0A8A4C;font-weight:600;">Reply to ${name} →</a>
      </p>
    </div>`,
  });
}

export async function sendAdminServiceLeadAlert({
  serviceType,
  email,
  details,
}: {
  serviceType: string;
  email: string;
  details: Record<string, unknown>;
}) {
  const SERVICE_LABELS: Record<string, string> = {
    insurance_retender: "Insurance Retender",
    energy_switch: "Energy Switch",
    income_activation: "Income Activation",
    income_scan: "Income Scan Request",
    financing_refinance: "Financing / Refinance",
    rent_review: "Rent Review",
    work_order_tender: "Work Order Tender",
    acquisition_offer: "Acquisition Offer",
    acquisition_pass: "Acquisition Pass",
    tenant_action: "Tenant Action",
    planning_flag: "Planning Flag for Review",
    compliance_renewal: "Compliance Renewal",
    transaction_sale: "Transaction / Sale",
    book_visit: "Book Page Visit",
    demo_visit: "Demo Link Visit",
  };
  const SERVICE_PAGES: Record<string, string> = {
    insurance_retender: "/insurance",
    energy_switch: "/energy",
    income_activation: "/income",
    income_scan: "/income",
    financing_refinance: "/financing",
    rent_review: "/rent-clock",
    work_order_tender: "/work-orders",
    acquisition_offer: "/scout",
    acquisition_pass: "/scout",
    tenant_action: "/tenants",
    planning_flag: "/planning",
    compliance_renewal: "/compliance",
    transaction_sale: "/hold-sell",
    book_visit: "/book",
    demo_visit: "/dashboard",
  };
  const label = SERVICE_LABELS[serviceType] ?? serviceType.replace(/_/g, " ");
  const sourcePage = SERVICE_PAGES[serviceType] ?? "/dashboard";
  const subject = `New ${label} lead: ${email}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[service-lead] ${subject}`, details);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const rows = Object.entries(details)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">${k}</td><td><strong>${v}</strong></td></tr>`)
    .join("");

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject,
    html: `<div style="font-family:sans-serif;font-size:14px;color:#222;max-width:600px;">
      <h2 style="font-size:16px;margin-bottom:4px;">New ${label} lead</h2>
      <p style="color:#5a7a96;margin-top:0;">From ${APP_URL}${sourcePage}</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
        ${rows}
      </table>
      <p style="margin-top:16px;">
        <a href="mailto:${email}?subject=Your Arca ${label} Request" style="color:#0A8A4C;font-weight:600;">Reply to lead →</a>
      </p>
    </div>`,
  });

  // Send prospect confirmation for actionable service types (skip anonymous/visit-only leads)
  const CONFIRMATION_SKIP = new Set(["book_visit", "demo_visit", "acquisition_pass"]);
  const isRealEmail = email && email.includes("@") && email !== "anonymous";
  if (isRealEmail && !CONFIRMATION_SKIP.has(serviceType)) {
    const SERVICE_NEXT_STEPS: Record<string, { tagline: string; steps: string[] }> = {
      insurance_retender: {
        tagline: "We'll benchmark your current premiums against the specialist market and come back with a gap analysis.",
        steps: ["Review your current policy terms and insurer", "Benchmark against specialist CRE carriers", "Present you with comparable quotes within 5 days"],
      },
      energy_switch: {
        tagline: "We'll model your current tariff against the wholesale market and identify the best switching window.",
        steps: ["Analyse your current supplier contracts and tariffs", "Model against market alternatives", "Recommend the optimal switch timing and carrier"],
      },
      income_activation: {
        tagline: "We'll review your assets for solar, EV, 5G, and parking income potential and send a ranked opportunity list.",
        steps: ["Map each asset against income opportunity types", "Model projected annual income per opportunity", "Recommend which to activate first based on ROI"],
      },
      financing_refinance: {
        tagline: "We'll review your current loan terms and identify refinancing or restructuring opportunities.",
        steps: ["Audit current LTV, ICR, and maturity profile", "Benchmark against current lender appetite", "Identify the best refinancing window and structure"],
      },
      rent_review: {
        tagline: "We'll analyse passing rents against current ERV and identify review and reversion opportunities.",
        steps: ["Review lease schedules and passing rents", "Benchmark against current market ERV", "Recommend review strategy and priority assets"],
      },
      work_order_tender: {
        tagline: "We'll scope your works and run a competitive tender to find the best contractor pricing.",
        steps: ["Scope the works and prepare tender documents", "Invite 3–5 qualified contractors to quote", "Present a ranked shortlist with pricing"],
      },
      compliance_renewal: {
        tagline: "We'll schedule the renewal and track it through to sign-off so nothing lapses.",
        steps: ["Log the certificate against your asset", "Instruct a qualified inspector", "Track to sign-off and update your compliance register"],
      },
      planning_flag: {
        tagline: "We'll review the application and provide a briefing on how it affects your asset and options.",
        steps: ["Review the planning application in detail", "Assess the impact on your asset value and use", "Recommend any representations or actions to take"],
      },
      tenant_action: {
        tagline: "We'll review the situation and recommend next steps on lease management.",
        steps: ["Review the lease terms and tenant status", "Assess risk and identify options", "Recommend the optimal course of action"],
      },
      transaction_sale: {
        tagline: "We'll prepare a disposal strategy with indicative pricing and timing.",
        steps: ["Review the asset's investment metrics and comparables", "Prepare an indicative pricing range", "Recommend disposal method and timing"],
      },
      income_scan: {
        tagline: "We'll scan your portfolio for all income activation opportunities and rank them by ROI.",
        steps: ["Map all assets against income opportunity types", "Model projected annual income per opportunity", "Deliver a ranked opportunity report within 48 hours"],
      },
      acquisition_offer: {
        tagline: "We'll review the asset and let you know whether it meets your criteria.",
        steps: ["Review the asset against your acquisition criteria", "Assess pricing, risk, and market comparables", "Provide a clear go/no-go recommendation"],
      },
    };
    const ctx = SERVICE_NEXT_STEPS[serviceType];
    if (ctx) {
      const stepRows = ctx.steps.map((s, i) =>
        `<tr><td style="padding:6px 0;vertical-align:top;"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#0A8A4C;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">${i + 1}</span></td><td style="padding:6px 0;font-size:14px;color:#333;">${s}</td></tr>`
      ).join("");
      const propertyContext = (details.propertyAddress as string) || (details.assetName as string) || null;
      await resend.emails.send({
        from: FROM_IAN,
        to: email,
        subject: `Arca received your ${label} request`,
        html: `<div style="font-family:sans-serif;font-size:14px;color:#222;max-width:600px;line-height:1.6;">
          <p style="font-size:16px;font-weight:600;margin-bottom:4px;">Hi,</p>
          <p style="margin-top:0;">We've received your <strong>${label}</strong> request${propertyContext ? ` for <strong>${propertyContext}</strong>` : ""}.</p>
          <p style="color:#555;">${ctx.tagline}</p>
          <p style="font-weight:600;margin-bottom:8px;">Here's what happens next:</p>
          <table style="border-collapse:collapse;margin-bottom:20px;">${stepRows}</table>
          <p style="color:#555;">Arca works on commission-only — you pay nothing until we deliver a saving or new income stream. No contracts, no retainer.</p>
          <p style="margin-top:20px;">
            <a href="${APP_URL}/book" style="display:inline-block;padding:10px 20px;background:#0A8A4C;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Book a 20-min call →</a>
          </p>
          <p style="color:#888;font-size:13px;margin-top:12px;">Or just reply to this email.<br/>Ian Baron · Arca · hello@arcahq.ai</p>
        </div>`,
      }).catch((e) => console.error("[service-lead] confirmation email failed:", e));
    }
  }
}

// ── Partner programme application confirmation ─────────────────────────────
export async function sendPartnerConfirmationEmail({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[partner-confirm] RESEND_API_KEY not set — skipping confirmation to ${email}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const firstName = name.split(" ")[0];

  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject: `Arca Partner Programme — application received`,
    text: `${firstName},\n\nThanks for applying to the Arca Partner Programme.\n\nI've received your application as ${role} and will review it within 48 hours. I'll be in touch directly to discuss how we can work together.\n\nA quick recap of how the programme works:\n\n- You introduce a client (or share a contact) — we take it from there\n- Arca runs the full analysis and delivers the saving or new income, commission-only\n- You earn 2% of our commission on every income stream we deliver, for 12 months after the introduction\n- No paperwork, no minimum volumes — just a straightforward referral arrangement\n\nIf you have any immediate questions, just reply to this email.\n\nIan Baron\nArca\nhello@arcahq.ai`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Thanks for applying to the Arca Partner Programme.</p>
<p>I've received your application as <strong>${role}</strong> and will review it within 48 hours. I'll be in touch directly to discuss how we can work together.</p>
<p><strong>A quick recap of how the programme works:</strong></p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#222;width:32px;">01</td>
    <td style="padding:10px 14px;font-size:13px;"><strong>You introduce</strong> — send a client our way or share a contact. We handle everything else.</td>
  </tr>
  <tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#222;">02</td>
    <td style="padding:10px 14px;font-size:13px;"><strong>Arca delivers</strong> — we run the analysis, manage the process, and recover the saving or new income. Commission-only for the client too.</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#0A8A4C;">03</td>
    <td style="padding:10px 14px;font-size:13px;"><strong style="color:#0A8A4C;">You earn 2%</strong> — of our commission on every income stream delivered, for 12 months after introduction. No minimum volumes, no paperwork beyond a simple referral agreement.</td>
  </tr>
</table>
<p>If you have any immediate questions, just reply to this email.</p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>Arca<br/><a href="mailto:hello@arcahq.ai" style="color:#888;font-size:13px;">hello@arcahq.ai</a></p>
</div>`,
  }).catch((e) => console.error("[partner-confirm] email failed:", e));
}
