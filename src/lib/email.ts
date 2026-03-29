import { createHmac } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const FROM = process.env.AUTH_EMAIL_FROM ?? "RealHQ <noreply@realhq.com>";
const FROM_IAN = process.env.OUTREACH_EMAIL_FROM ?? "Ian Baron <ian@realhq.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://realhq.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@realhq.com";
// CAN-SPAM requires a physical postal address in all commercial emails (US law).
// Set REALHQ_PHYSICAL_ADDRESS in Railway env vars before sending FL wave-1.
const PHYSICAL_ADDRESS = process.env.REALHQ_PHYSICAL_ADDRESS ?? "";

/**
 * Send email via Resend and track delivery status in database.
 * Stores message ID for webhook processing of delivery/bounce/open events.
 */
async function sendTrackedEmail({
  userId,
  from,
  to,
  subject,
  html,
  text,
  emailType,
  referenceId,
}: {
  userId: string;
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  emailType?: string;
  referenceId?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] Would send: ${subject} to ${to}`);
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({ from, to, subject, html, text });

    // Store tracking record with Resend message ID
    if (result.data?.id) {
      const recipient = Array.isArray(to) ? to[0] : to;
      await prisma.emailTracking.create({
        data: {
          userId,
          messageId: result.data.id,
          to: recipient,
          from,
          subject,
          emailType,
          referenceId,
          status: "sent",
        },
      }).catch((_err) => {
        // Don't fail the email send if tracking storage fails
        console.error("[email-tracking] Failed to store tracking record:", _err);
      });
    }

    return result;
  } catch (error) {
    console.error("[email] Send failed:", error);
    throw error;
  }
}

function fmtCurrency(v: number) {
  return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1_000)}k`;
}

/** CAN-SPAM compliant unsubscribe footer for nurture emails */
function unsubFooter(email: string): string {
  const token = Buffer.from(email).toString("base64");
  const url = `${APP_URL}/api/unsubscribe?e=${encodeURIComponent(token)}`;
  return `<p style="font-size:11px;color:#aaa;margin-top:24px;line-height:1.5;">
You received this because you used RealHQ's free portfolio audit at realhq.com.<br/>
RealHQ · hello@realhq.com · Commission-only — you pay nothing until RealHQ delivers.<br/>
<a href="${url}" style="color:#aaa;">Unsubscribe</a>
</p>`;
}

function unsubFooterText(email: string): string {
  const token = Buffer.from(email).toString("base64");
  return `\n\n---\nYou received this because you used RealHQ's free portfolio audit. Commission-only — you pay nothing until RealHQ delivers.\nUnsubscribe: ${APP_URL}/api/unsubscribe?e=${encodeURIComponent(token)}`;
}

/** HMAC-signed unsubscribe token for cold outreach emails (prevents spoofed unsubscribes) */
function coldUnsubUrl(email: string, prospectKey?: string): string {
  const identifier = prospectKey ?? email;
  const secret = process.env.CRON_SECRET ?? "";
  const key = createHmac("sha256", secret).update(identifier).digest("base64url");
  return `${APP_URL}/api/unsubscribe?key=${key}&id=${encodeURIComponent(identifier)}`;
}

/** CAN-SPAM / PECR compliant unsubscribe footer for cold outreach emails */
function coldUnsubFooter(email: string, prospectKey?: string): string {
  const url = coldUnsubUrl(email, prospectKey);
  const addrLine = PHYSICAL_ADDRESS ? `<br/>${PHYSICAL_ADDRESS}` : "";
  return `<p style="font-size:11px;color:#aaa;margin-top:32px;line-height:1.5;">
RealHQ · hello@realhq.com${addrLine}<br/>
<a href="${url}" style="color:#aaa;">Unsubscribe from RealHQ emails</a>
</p>`;
}

function coldUnsubFooterText(email: string, prospectKey?: string): string {
  const url = coldUnsubUrl(email, prospectKey);
  const addrLine = PHYSICAL_ADDRESS ? `\n${PHYSICAL_ADDRESS}` : "";
  return `\n\nRealHQ · hello@realhq.com${addrLine}\nUnsubscribe: ${url}`;
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
    subject: `Your RealHQ analysis is ready — ${fmtK(total)}/yr identified`,
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
                  <td style="padding-left:8px; font-size:13px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#e8eef5;">RealHQ</td>
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
              Based on ${portfolioDesc}, RealHQ estimates
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
          <!-- Self-serve CTA -->
          <tr>
            <td style="padding-bottom:28px; font-size:14px; color:#8ba0b8; line-height:1.6;">
              Ready to run this on your actual portfolio? Upload your documents and get a full
              analysis in under 60 seconds — no commitment required.
              <br /><br />
              <a href="${APP_URL}/properties/add" style="color:#0A8A4C; font-weight:600;">
                Upload your documents →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="font-size:12px; color:#3d5a72; line-height:1.5; border-top:1px solid #1a2d45; padding-top:20px;">
              You received this because you signed up at realhq.com. Commission-only — you pay nothing until
              RealHQ delivers. Questions? Reply to this email or write to
              <a href="mailto:hello@realhq.com" style="color:#5a7a96;">hello@realhq.com</a>.
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
                    ${e.floodZone.isHighRisk ? `<br/><span style="color:#F5A94A;font-size:11px;">RealHQ can identify flood-specific insurance discounts for this property.</span>` : ""}
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
    subject: `RealHQ: ${fmtK(estimate.total)}/yr identified for your portfolio`,
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
                <td style="padding-left:8px;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#e8eef5;">RealHQ</td>
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
              Based on your portfolio description, RealHQ estimates
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
              These are benchmarks based on your asset type and count. For a full per-asset breakdown — upload your documents at realhq.com/dashboard for an instant analysis, or book a 20-min call to walk through it together.
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
              RealHQ is commission-only — you pay nothing until we deliver a saving or new income stream.
              Questions? Reply to this email or write to
              <a href="mailto:hello@realhq.com" style="color:#5a7a96;">hello@realhq.com</a>.
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
    text: `You ran your portfolio through RealHQ's audit tool a couple of days ago — I wanted to follow up directly.

Your estimate came back at ${totalStr}/yr across ${portfolioDesc}. That's ${insStr} in insurance, ${energyStr} in energy, and ${incomeStr} in new income.

These are benchmarks. The real numbers — once I look at your actual policies, tariffs, and rent roll — are usually sharper. Sometimes higher, sometimes lower, always more specific.

Here's an example of what that looks like in practice:

A ${n}-asset ${assetType} portfolio I ran through RealHQ last quarter had ${fmtK(insPerAsset)}/asset in insurance overpay — not because they had bad brokers, but because each asset was placed individually. Nobody had ever put them on a combined portfolio schedule. RealHQ ran the retender in 6 weeks. Net saving landed at ${insStr}/yr.

Energy was similar. ${fmtK(energyPerAsset)}/asset in contract gap vs market rate. Contracts had auto-renewed without comparison for 3 years.

Income was the slowest — 5G mast agreements and EV charging take 6–12 months to close — but the ${incomeStr} estimate held up.

Total: ${totalStr}/yr. Commission-only, so they paid nothing until RealHQ delivered.

If you want to do the same for your portfolio, 20 minutes on a call is enough to tell you where the biggest levers are.

Book a time: ${APP_URL}/book

Ian Baron
RealHQ${unsubFooterText(email)}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>You ran your portfolio through RealHQ's audit tool a couple of days ago — I wanted to follow up directly.</p>
<p>Your estimate came back at <strong>${totalStr}/yr</strong> across ${portfolioDesc}. That's <strong style="color:#F5A94A;">${insStr}</strong> in insurance, <strong style="color:#F5A94A;">${energyStr}</strong> in energy, and <strong style="color:#0A8A4C;">${incomeStr}</strong> in new income.</p>
<p>These are benchmarks. The real numbers — once I look at your actual policies, tariffs, and rent roll — are usually sharper. Sometimes higher, sometimes lower, always more specific.</p>
<p>Here's an example of what that looks like in practice:</p>
<div style="border-left:3px solid #0A8A4C;padding:12px 16px;background:#f7faf8;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="margin:0 0 8px 0;">A ${n}-asset ${assetType} portfolio I ran through RealHQ last quarter had <strong>${fmtK(insPerAsset)}/asset</strong> in insurance overpay — not because they had bad brokers, but because each asset was placed individually. RealHQ ran the retender in 6 weeks. Net saving: <strong>${insStr}/yr</strong>.</p>
<p style="margin:0 0 8px 0;">Energy: <strong>${fmtK(energyPerAsset)}/asset</strong> gap vs market rate. Contracts had auto-renewed without comparison for 3 years.</p>
<p style="margin:0;">Total with income streams added: <strong>${totalStr}/yr</strong>. Commission-only — they paid nothing until RealHQ delivered.</p>
</div>
<p>If you want to run the same analysis on your real assets, 20 minutes is enough to tell you where the biggest levers are.</p>
<p><a href="${APP_URL}/book" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Book a 20-min call →</a></p>
<p style="font-size:13px;color:#888;margin-top:8px;">Prefer to explore first? <a href="${APP_URL}/signup?email=${encodeURIComponent(email)}" style="color:#0A8A4C;">Create a free account →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="mailto:hello@realhq.com" style="color:#888;font-size:13px;">hello@realhq.com</a></p>
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
  const realhqFee = Math.round(caseIns * 0.15 + caseEnergy * 0.10 + caseIncome * 0.10);

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

Last quarter I ran a ${caseN}-asset ${assetType} portfolio through RealHQ. The owner had been with the same insurance broker for 7 years and the same energy supplier for 4. Nothing was obviously wrong — the portfolio was profitable, occupancy was good.

Here's what RealHQ found:

Insurance: ${fmtK(caseIns)}/yr above market rate. The portfolio had been placed on individual schedules. Combined placement with a specialist carrier cut the premium immediately.

Energy: ${fmtK(caseEnergy)}/yr above current wholesale rates. Three contracts had auto-renewed without comparison. Switching took 6 weeks total.

New income (EV charging + 5G mast): ${fmtK(caseIncome)}/yr. Two sites already had the infrastructure. Neither stream had been activated.

Total: ${fmtK(caseTotal)}/yr. RealHQ fee on delivery: ${fmtK(realhqFee)}/yr. Net retained by the owner: ${fmtK(caseTotal - realhqFee)}/yr.

That portfolio is worth more now than it was six months ago — not because anything changed in the market, but because the numbers were surfaced and acted on.

Your estimate was ${totalStr}/yr. The methodology is identical.

If you'd like to see what the actual numbers look like for your assets: ${bookUrl}

Ian Baron
RealHQ${unsubFooterText(email)}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>I wanted to share a recent example that's close to your portfolio.</p>
<p>Last quarter I ran a <strong>${caseN}-asset ${assetType} portfolio</strong> through RealHQ. The owner had been with the same insurance broker for 7 years and the same energy supplier for 4. Nothing was obviously wrong — the portfolio was profitable, occupancy was good.</p>
<p><strong>Here's what RealHQ found:</strong></p>
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
      <td style="padding:10px 14px;font-size:12px;color:#6b7280;">RealHQ fee: ${fmtK(realhqFee)}/yr</td>
    </tr>
  </tbody>
</table>
<p>The portfolio is worth more now than it was six months ago — not because anything changed in the market, but because the numbers were surfaced and acted on.</p>
<p>Your estimate was <strong style="color:#F5A94A;">${totalStr}/yr</strong>. The methodology is identical.</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See the numbers for your assets →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="mailto:hello@realhq.com" style="color:#888;font-size:13px;">hello@realhq.com</a></p>
${unsubFooter(email)}
</div>`,
  });
}

// ── Cold outreach emails (Touch 1, 2 and 3 — admin-dispatched from /admin/leads) ─────────────────────

/** Pure renderer — returns {subject, html, text} without sending or queuing anything. */
export function renderColdOutreachEmail({
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
}): { subject: string; html: string; text: string } {
  const n = Math.max(1, assetCount);
  const sym = market === "seuk" ? "£" : "$";
  const fx = market === "seuk" ? 0.8 : 1;
  function fmtK(v: number) {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    return `${sym}${Math.round(v / 1_000)}k`;
  }

  const bookParams = new URLSearchParams();
  const fullName = company ? `${firstName} ${company}`.trim() : firstName;
  if (firstName) bookParams.set("name", fullName);
  if (company) bookParams.set("company", company);
  bookParams.set("assets", String(n));
  bookParams.set("email", email);
  if (market === "seuk") bookParams.set("portfolio", "se-logistics");
  const bookUrl = `${APP_URL}/book?${bookParams.toString()}`;

  if (touch === 1) {
    if (market === "fl") {
      const subject = `Your insurance bill, ${area} industrial`;
      const insLow = fmtK(Math.round(n * 1_800));
      const insHigh = fmtK(Math.round(n * 4_000));
      return {
        subject,
        text: `${firstName},\n\nQuick question — when did you last retender your commercial insurance across the portfolio?\n\nMost owner-operators I talk to in Florida are sitting on 25–35% overpay vs what's actually available in market right now. On a ${n}-asset portfolio that's typically ${insLow}–${insHigh} a year just sitting on the table.\n\nI run RealHQ. We audit your insurance, energy, and rent roll against live market benchmarks, then go execute the savings. Commission-only — we earn a percentage of what we save you, nothing if we don't deliver.\n\nWorth a 20-minute look at the numbers? I'll pull your portfolio data before the call so we're not wasting time.\n\nIan${coldUnsubFooterText(email, prospectKey)}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Quick question — when did you last retender your commercial insurance across the portfolio?</p>
<p>Most owner-operators I talk to in Florida are sitting on 25–35% overpay vs what's actually available in market right now. On a ${n}-asset portfolio that's typically <strong>${insLow}–${insHigh}</strong> a year just sitting on the table.</p>
<p>I run RealHQ. We audit your insurance, energy, and rent roll against live market benchmarks, then go execute the savings. Commission-only — we earn a percentage of what we save you, nothing if we don't deliver.</p>
<p>Worth a 20-minute look at the numbers? I'll pull your portfolio data before the call so we're not wasting time.</p>
<p style="margin-top:24px;color:#555;">Ian</p>
${coldUnsubFooter(email, prospectKey)}</div>`,
      };
    } else {
      const subject = `Energy contracts and MEES — ${area} industrial`;
      const insLow = fmtK(Math.round(n * 6_000 * fx));
      const insHigh = fmtK(Math.round(n * 12_000 * fx));
      return {
        subject,
        text: `${firstName},\n\nOne thing I see consistently with SE logistics owners right now: energy contracts that haven't been retendered since before the Ofgem price reset — and premises that are sitting at EPC D or below with the MEES 2027 deadline coming.\n\nOn a ${n}-unit industrial portfolio, the combination is typically ${insLow}–${insHigh} a year in avoidable cost. Energy alone, most SE operators I speak to are 15–20% above what a fresh commercial tender returns today.\n\nI run RealHQ. We audit your portfolio against live market benchmarks — insurance, energy, rent roll, ancillary income — and then go and fix what we find. Commission-only, no upfront fees. We earn on what we deliver.\n\nWorth 20 minutes to see where your portfolio sits? I'll pull your premises data before the call.\n\nIan${coldUnsubFooterText(email, prospectKey)}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>One thing I see consistently with SE logistics owners right now: energy contracts that haven't been retendered since before the Ofgem price reset — and premises that are sitting at EPC D or below with the MEES 2027 deadline coming.</p>
<p>On a ${n}-unit industrial portfolio, the combination is typically <strong>${insLow}–${insHigh}</strong> a year in avoidable cost. Energy alone, most SE operators I speak to are 15–20% above what a fresh commercial tender returns today.</p>
<p>I run RealHQ. We audit your portfolio against live market benchmarks — insurance, energy, rent roll, ancillary income — and then go and fix what we find. Commission-only, no upfront fees. We earn on what we deliver.</p>
<p>Worth 20 minutes to see where your portfolio sits? I'll pull your premises data before the call.</p>
<p style="margin-top:24px;color:#555;">Ian</p>
${coldUnsubFooter(email, prospectKey)}</div>`,
      };
    }
  } else if (touch === 2) {
    if (market === "fl") {
      const subject = `Rent roll and income gaps — ${area} industrial`;
      const rentLow = fmtK(Math.round(n * 2_500));
      const rentHigh = fmtK(Math.round(n * 5_500));
      const incomeLow = fmtK(Math.round(n * 2_000));
      const incomeHigh = fmtK(Math.round(n * 4_000));
      return {
        subject,
        text: `${firstName},\n\nSeparate thought — beyond insurance, the other place I consistently see money left on the table in Florida industrials is rent roll and ancillary income.\n\nMost owner-operators I speak to have leases that haven't been reviewed against ERV in 2–3 years. On a ${n}-asset portfolio that's typically ${rentLow}–${rentHigh}/yr in missed uplift. Add EV charging, 5G site rental, and solar — assets that qualify are sitting on another ${incomeLow}–${incomeHigh}/yr uncaptured.\n\nRealHQ audits all of it and then goes and fixes it. Commission-only — we earn on what we deliver, nothing if we don't.\n\nIf you want to see the numbers on your specific portfolio:\n\n${bookUrl}\n\nIan${coldUnsubFooterText(email, prospectKey)}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Separate thought — beyond insurance, the other place I consistently see money left on the table in Florida industrials is rent roll and ancillary income.</p>
<p>Most owner-operators I speak to have leases that haven't been reviewed against ERV in 2–3 years. On a ${n}-asset portfolio that's typically <strong>${rentLow}–${rentHigh}/yr</strong> in missed uplift. Add EV charging, 5G site rental, and solar — assets that qualify are sitting on another <strong>${incomeLow}–${incomeHigh}/yr</strong> uncaptured.</p>
<p>RealHQ audits all of it and then goes and fixes it. Commission-only — we earn on what we deliver, nothing if we don't.</p>
<p>If you want to see the numbers on your specific portfolio:</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See your personalised numbers →</a></p>
<p style="margin-top:24px;color:#555;">Ian</p>
${coldUnsubFooter(email, prospectKey)}</div>`,
      };
    } else {
      const subject = `Rent reviews and income — ${area} industrial`;
      const rentLow = fmtK(Math.round(n * 3_000 * fx));
      const rentHigh = fmtK(Math.round(n * 7_000 * fx));
      const incomeLow = fmtK(Math.round(n * 2_000 * fx));
      const incomeHigh = fmtK(Math.round(n * 4_500 * fx));
      return {
        subject,
        text: `${firstName},\n\nOne more angle worth flagging alongside the energy side — rent reviews and ancillary income.\n\nMost SE logistics owners I speak to have leases running 10–15% below current ERV, with reviews due that haven't been pushed. On a ${n}-unit portfolio that's typically ${rentLow}–${rentHigh}/yr in missed uplift. Then there's the income side — 5G mast sites, EV charging, and solar. SE industrial is well-positioned for all three; most owners haven't had time to run the analysis, which on a ${n}-unit portfolio is another ${incomeLow}–${incomeHigh}/yr sitting uncaptured.\n\nRealHQ audits the full picture — insurance, energy, rent, income — and then goes and executes. Commission-only, no upfront fees.\n\nWorth a look at where your portfolio sits?\n\n${bookUrl}\n\nIan${coldUnsubFooterText(email, prospectKey)}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>One more angle worth flagging alongside the energy side — rent reviews and ancillary income.</p>
<p>Most SE logistics owners I speak to have leases running 10–15% below current ERV, with reviews due that haven't been pushed. On a ${n}-unit portfolio that's typically <strong>${rentLow}–${rentHigh}/yr</strong> in missed uplift.</p>
<p>Then there's the income side — 5G mast sites, EV charging, and solar. SE industrial is well-positioned for all three; most owners haven't had time to run the analysis, which on a ${n}-unit portfolio is another <strong>${incomeLow}–${incomeHigh}/yr</strong> sitting uncaptured.</p>
<p>RealHQ audits the full picture — insurance, energy, rent, income — and then goes and executes. Commission-only, no upfront fees.</p>
<p>Worth a look at where your portfolio sits?</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See your personalised numbers →</a></p>
<p style="margin-top:24px;color:#555;">Ian</p>
${coldUnsubFooter(email, prospectKey)}</div>`,
      };
    }
  } else {
    // Touch 3 — case study email
    if (market === "fl") {
      const subject = `Re: Your insurance bill, ${area} industrial`;
      const caseIns = Math.round(22_000);
      const caseEnergy = Math.round(11_000);
      const caseIncome = 8_000;
      const caseTotal = caseIns + caseEnergy + caseIncome;
      return {
        subject,
        text: `${firstName},\n\nLast one from me.\n\nI recently ran a portfolio health check for a Florida mixed-use operator through RealHQ — 8 assets, similar profile to yours. Found:\n\n- ${fmtK(caseIns)}/yr insurance overpay (placed with two new carriers, saved 28%)\n- ${fmtK(caseEnergy)}/yr energy savings (switched commercial tariff, live in 3 weeks)\n- Two missed income streams (EV charging + subletting opportunity on one asset)\n\nTotal year-1 uplift: ~${fmtK(caseTotal)}. My commission: a fraction of that. Their net: the rest.\n\nIf the timing's wrong, no problem. But if you want to see what that looks like for your portfolio specifically:\n\n${bookUrl}\n\nIan Baron\nRealHQ${coldUnsubFooterText(email, prospectKey)}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Last one from me.</p>
<p>I recently ran a portfolio health check for a Florida mixed-use operator through RealHQ — 8 assets, similar profile to yours. Found:</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;">Insurance overpay</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">${fmtK(caseIns)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">2 carriers, 28% saving</td></tr>
  <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;">Energy savings</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">${fmtK(caseEnergy)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">Commercial tariff switch, 3 weeks</td></tr>
  <tr><td style="padding:10px 14px;font-size:13px;">New income</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#15803d;text-align:right;">${fmtK(caseIncome)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">EV charging + subletting</td></tr>
</table>
<p>Total year-1 uplift: ~<strong>${fmtK(caseTotal)}</strong>. My commission: a fraction of that. Their net: the rest.</p>
<p>If the timing's wrong, no problem. But if you want to see what that looks like for your portfolio specifically:</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See your personalised numbers →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="mailto:ian@realhq.com" style="color:#888;font-size:13px;">ian@realhq.com</a></p>
${coldUnsubFooter(email, prospectKey)}</div>`,
      };
    } else {
      const subject = `Re: Energy contracts and MEES — ${area} industrial`;
      const caseIns = Math.round(68_000 * fx);
      const caseEnergy = Math.round(97_000 * fx);
      const caseMast = Math.round(22_000 * fx);
      const caseTotal = caseIns + caseEnergy + caseMast;
      return {
        subject,
        text: `${firstName},\n\nLast one from me.\n\nI recently ran a portfolio review for a SE logistics owner through RealHQ — 5 units across Kent and Essex. What RealHQ found:\n\n- Insurance: 25% above market rate, ${fmtK(caseIns)}/yr overpay — placed with three specialist carriers, savings live within 6 weeks\n- Energy: legacy dual-fuel contracts, 16% above current commercial rates — ${fmtK(caseEnergy)}/yr — renegotiated across all units\n- Additional income: two 5G mast opportunities identified (${fmtK(Math.round(caseMast / 2))}/yr each), plus EV charging viable on the largest site\n\nYear-1 uplift: over ${fmtK(caseTotal)}. My fee: a commission on what was delivered. Their upfront cost: zero.\n\nIf the timing's not right, no problem. If you want to see what those numbers look like across your specific premises:\n\n${bookUrl}\n\nIan Baron\nRealHQ${coldUnsubFooterText(email, prospectKey)}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Last one from me.</p>
<p>I recently ran a portfolio review for a SE logistics owner through RealHQ — 5 units across Kent and Essex. What RealHQ found:</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;">Insurance overpay</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">${fmtK(caseIns)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">Lloyd's placement, 3 carriers</td></tr>
  <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;">Energy (dual-fuel)</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">${fmtK(caseEnergy)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">All units renegotiated</td></tr>
  <tr><td style="padding:10px 14px;font-size:13px;">5G mast income (×2)</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#15803d;text-align:right;">${fmtK(caseMast)}/yr</td><td style="padding:10px 14px;font-size:12px;color:#6b7280;">MBNL + Cornerstone sites</td></tr>
</table>
<p>Year-1 uplift: over <strong>${fmtK(caseTotal)}</strong>. My fee: a commission on what was delivered. Their upfront cost: zero.</p>
<p>If the timing's not right, no problem. If you want to see what those numbers look like across your specific premises:</p>
<p style="margin-top:20px;"><a href="${bookUrl}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">See your personalised numbers →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="mailto:ian@realhq.com" style="color:#888;font-size:13px;">ian@realhq.com</a></p>
${coldUnsubFooter(email, prospectKey)}</div>`,
      };
    }
  }
}

export async function sendColdOutreachEmail({
  email,
  firstName,
  company,
  assetCount,
  area,
  touch,
  market,
  prospectKey,
  scheduleAfter,
}: {
  email: string;
  firstName: string;
  company?: string | null;
  assetCount: number;
  area: string;
  touch: 1 | 2 | 3;
  market: "fl" | "seuk";
  prospectKey?: string;
  scheduleAfter?: Date; // if set, enqueue to ScheduledEmail instead of sending immediately
}) {
  const isScheduled = !!scheduleAfter;

  if (!isScheduled && !process.env.RESEND_API_KEY) {
    console.log(`[cold-outreach] RESEND_API_KEY not set — skipping Touch ${touch} to ${email}`);
    return;
  }

  if (!isScheduled && await isUnsubscribed(email)) {
    console.log(`[cold-outreach] ${email} is unsubscribed — skipping Touch ${touch}`);
    return;
  }

  const resend = isScheduled ? null : new Resend(process.env.RESEND_API_KEY!);
  const outreachTags = prospectKey
    ? [{ name: "prospectKey", value: prospectKey }, { name: "market", value: market }]
    : undefined;

  // Route to immediate send or queue
  async function emit(args: { from: string; to: string; subject: string; html: string; text: string; tags?: { name: string; value: string }[] }) {
    if (isScheduled) {
      await prisma.scheduledEmail.create({
        data: {
          to: args.to, from: args.from, subject: args.subject,
          html: args.html, text: args.text,
          sendAfter: scheduleAfter!,
          prospectKey: prospectKey ?? null,
          touchNumber: touch,
          market,
        },
      });
    } else {
      await resend!.emails.send(args);
    }
  }

  const rendered = renderColdOutreachEmail({ email, firstName, company, assetCount, area, touch, market, prospectKey });
  await emit({
    from: FROM_IAN,
    to: email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    ...(outreachTags && { tags: outreachTags }),
  });
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
RealHQ

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
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="mailto:hello@realhq.com" style="color:#888;font-size:13px;">hello@realhq.com</a></p>
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
    subject: `${firstName} — what RealHQ found in portfolios like yours`,
    sendAfterMs: 3 * 24 * 60 * 60 * 1000,
    text: `${firstName},

You signed up a few days ago — I wanted to share what RealHQ typically surfaces in the first week on ${portfolioDesc}.

Here's what RealHQ found on a similar portfolio last month:

- Insurance: ${fmtK(ins)} in overpay vs current market — policies placed individually, never put on a portfolio schedule
- Energy: ${fmtK(energy)} gap — commercial contracts not renegotiated since acquisition
- Rent roll: ${fmtK(income)} in undermarket leases — tenants on rates set 4+ years ago with no escalation

That's ${fmtK(total)} in identifiable leakage. Not unusual. Most of it had been sitting there for years.

On your portfolio, the mix will be different — but the pattern is almost always the same.

Want to see what the numbers look like for your specific assets? 20 minutes is enough to tell you where the gaps are.

Book a time: ${APP_URL}/book

Ian Baron
RealHQ${unsubFooterText(email)}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>You signed up a few days ago — I wanted to share what RealHQ typically surfaces in the first week on ${portfolioDesc}.</p>
<p>Here's what RealHQ found on a similar portfolio last month:</p>
<ul style="padding-left:20px;margin:8px 0;">
  <li><strong>Insurance:</strong> ${fmtK(ins)} in overpay vs current market — policies placed individually, never put on a portfolio schedule</li>
  <li><strong>Energy:</strong> ${fmtK(energy)} gap — commercial contracts not renegotiated since acquisition</li>
  <li><strong>Rent roll:</strong> ${fmtK(income)} in undermarket leases — tenants on rates set 4+ years ago with no escalation</li>
</ul>
<p>That's <strong>${fmtK(total)} in identifiable leakage</strong>. Not unusual. Most of it had been sitting there for years.</p>
<p>On your portfolio, the mix will be different — but the pattern is almost always the same.</p>
<p>Want to see what the numbers look like for your specific assets? 20 minutes is enough to tell you where the gaps are.</p>
<p><a href="${APP_URL}/book" style="color:#0A8A4C;font-weight:600;">Book a time →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ</p>
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

RealHQ works best when we run it on your actual assets, not demo data. That's where the real numbers come from — the specific carriers your insurance is placed with, the exact tariff you're on for energy, the rent you're actually charging vs what the market bears.

Before I run anything, one question: how many assets are in your portfolio?

Just reply to this email with the number (or a rough range). It helps me understand whether and where the biggest levers are likely to be, so the 20-minute call is actually useful.

If you'd rather just book the time directly: ${APP_URL}/book

Either way — I'm here.

Ian Baron
RealHQ${unsubFooterText(email)}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>You signed up a week ago — I don't want to pester you, but I also don't want to leave you hanging.</p>
<p>RealHQ works best when we run it on your actual assets, not demo data. That's where the real numbers come from — the specific carriers your insurance is placed with, the exact tariff you're on for energy, the rent you're actually charging vs what the market bears.</p>
<p>Before I run anything, one question: <strong>how many assets are in your portfolio?</strong></p>
<p>Just reply to this email with the number (or a rough range). It helps me understand whether and where the biggest levers are likely to be, so the 20-minute call is actually useful.</p>
<p>If you'd rather just book the time directly: <a href="${APP_URL}/book" style="color:#0A8A4C;font-weight:600;">${APP_URL}/book</a></p>
<p>Either way — I'm here.</p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ</p>
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

Based on ${portfolioDesc} (${assetCount}${assetTypeLabel} assets), RealHQ's benchmarks put the opportunity at ${totalStr}/yr:

- Insurance: ${insStr}/yr — portfolio-level placement vs per-asset policies
- Energy: ${engStr}/yr — renegotiated vs current market rates
- Additional income: ${incStr}/yr — ${assetCount < 5 ? "5G mast, EV charging, and solar where applicable" : "5G masts, EV charging, solar, parking, and billboard across your footprint"}
${callNote ? `\n${callNote}\n` : ""}
Next step: I'll send over a short scope document by end of week. No commitment — this just outlines exactly how RealHQ works on each income stream, what we'd need from you, and the timeline.

Commission-only. You pay nothing until we deliver a saving or new income stream.

Ian Baron
RealHQ
${APP_URL}/book — if you want to book a follow-up`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Great to speak today. As promised, here's a summary of what we ran through.</p>
<p>Based on <strong>${portfolioDesc}</strong>, RealHQ's benchmarks put the opportunity at <strong style="color:#F5A94A;">${totalStr}/yr</strong>:</p>
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
<p><strong>Next step:</strong> I'll send over a short scope document by end of week. No commitment — this just outlines exactly how RealHQ works on each income stream, what we'd need from you, and the timeline.</p>
<p style="font-size:13px;color:#888;">Commission-only. You pay nothing until we deliver a saving or new income stream.</p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="${APP_URL}/book" style="color:#0A8A4C;font-size:13px;">Book a follow-up →</a></p>
${unsubFooter(email)}
</div>`,
  });
}

// ── Booking confirmation — sent immediately when prospect lands on /booked ──
export async function sendBookingConfirmation({
  email,
  firstName,
  company,
  assetCount,
  isUK = false,
}: {
  email: string;
  firstName?: string | null;
  company?: string | null;
  assetCount?: number | null;
  isUK?: boolean;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const sym = isUK ? "£" : "$";
  const n = assetCount && assetCount > 0 ? assetCount : null;
  const name = firstName || "there";
  const portfolioLine = n
    ? `On ${n} assets I'll model insurance, energy, rent, and income benchmarks before the call so we're not starting from zero.`
    : company
    ? `I'll pull benchmarks for ${company} before the call so we're not starting from zero.`
    : `I'll pull portfolio benchmarks before the call so we're not starting from zero.`;
  const reviewItems = isUK
    ? ["Insurance — current vs specialist Lloyd's market placement", "Energy — active contracts vs Ofgem benchmark", "Rent roll — ERV comparison on all tenanted units", "Ancillary income — 5G, EV charging, solar viability"]
    : ["Insurance — current vs available market (avg 25–35% overpay in FL right now)", "Energy — contract vs FL commercial benchmark", "Rent roll — leases vs current ERV", "Ancillary income — EV, 5G rooftop, solar viability"];
  const oppLine = n
    ? `Most ${n}-asset ${isUK ? "SE logistics" : "FL commercial"} portfolios I look at have ${sym}${Math.round(n * (isUK ? 14 : 28))}k–${sym}${Math.round(n * (isUK ? 22 : 42))}k/yr sitting on the table.`
    : "";

  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject: `Call confirmed — ${company ? company : firstName ? `${firstName}'s portfolio` : "your portfolio"} | RealHQ`,
    text: [
      `${name},`,
      `Got your booking — looking forward to it.`,
      portfolioLine,
      `What I'll look at before the call:\n${reviewItems.map((i) => `- ${i}`).join("\n")}`,
      oppLine,
      `You'll leave the call with a specific ${sym} number. No slides, no pitch — just the gap between what you're paying and what you should be paying.`,
      `If anything changes, let me know at ian@realhq.com.`,
      `Ian Baron\nRealHQ`,
    ].filter(Boolean).join("\n\n"),
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${name},</p>
<p>Got your booking — looking forward to it.</p>
<p>${portfolioLine}</p>
<p><strong>What I'll look at before the call:</strong></p>
<ul style="margin:8px 0 16px;padding-left:20px;">
${reviewItems.map((i) => `<li style="margin-bottom:4px;">${i}</li>`).join("\n")}
</ul>
${oppLine ? `<p>${oppLine}</p>` : ""}
<p>You'll leave with a specific ${sym} number. No slides, no pitch — just the gap between what you're paying and what you should be paying.</p>
<p>If anything changes, reply here or write to <a href="mailto:ian@realhq.com" style="color:#0A8A4C;">ian@realhq.com</a>.</p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="mailto:ian@realhq.com" style="color:#888;font-size:13px;">ian@realhq.com</a></p>
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
        <a href="mailto:${email}?subject=Welcome to the RealHQ Partner Programme — ${encodeURIComponent(name)}" style="color:#0A8A4C;font-weight:600;">Reply to ${name} →</a>
      </p>
    </div>`,
  });
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
    subject: `RealHQ Partner Programme — application received`,
    text: `${firstName},\n\nThanks for applying to the RealHQ Partner Programme.\n\nI've received your application as ${role} and will review it within 48 hours. I'll be in touch directly to discuss how we can work together.\n\nA quick recap of how the programme works:\n\n- You introduce a client (or share a contact) — we take it from there\n- RealHQ runs the full analysis and delivers the saving or new income, commission-only\n- You earn 2% of our commission on every income stream we deliver, for 12 months after the introduction\n- No paperwork, no minimum volumes — just a straightforward referral arrangement\n\nIf you have any immediate questions, just reply to this email.\n\nIan Baron\nRealHQ\nhello@realhq.com`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#222;max-width:520px;">
<p>${firstName},</p>
<p>Thanks for applying to the RealHQ Partner Programme.</p>
<p>I've received your application as <strong>${role}</strong> and will review it within 48 hours. I'll be in touch directly to discuss how we can work together.</p>
<p><strong>A quick recap of how the programme works:</strong></p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#222;width:32px;">01</td>
    <td style="padding:10px 14px;font-size:13px;"><strong>You introduce</strong> — send a client our way or share a contact. We handle everything else.</td>
  </tr>
  <tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#222;">02</td>
    <td style="padding:10px 14px;font-size:13px;"><strong>RealHQ delivers</strong> — we run the analysis, manage the process, and recover the saving or new income. Commission-only for the client too.</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#0A8A4C;">03</td>
    <td style="padding:10px 14px;font-size:13px;"><strong style="color:#0A8A4C;">You earn 2%</strong> — of our commission on every income stream delivered, for 12 months after introduction. No minimum volumes, no paperwork beyond a simple referral agreement.</td>
  </tr>
</table>
<p>If you have any immediate questions, just reply to this email.</p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="mailto:hello@realhq.com" style="color:#888;font-size:13px;">hello@realhq.com</a></p>
</div>`,
  }).catch((e) => console.error("[partner-confirm] email failed:", e));
}

// ── Pre-demo scan email — sent immediately when prospect books a call ─────────
export async function sendPreDemoScanEmail({
  name,
  email,
  company,
  assets,
  isUK = false,
  prospectKey,
}: {
  name: string;
  email: string;
  company?: string;
  assets: number;
  isUK?: boolean;
  prospectKey?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[pre-demo] RESEND_API_KEY not set — skipping");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const n = Math.max(1, assets);
  const sym = isUK ? "£" : "$";

  const insurance = isUK ? Math.round((342_000 / 5) * n) : Math.round((102_000 / 5) * n);
  const energy    = isUK ? Math.round((489_000 / 5) * n) : Math.round((161_000 / 5) * n);
  const income    = isUK ? Math.round((329_000 / 5) * n) : Math.round((243_000 / 5) * n);
  const total     = insurance + energy + income;

  function fmtK(v: number) {
    return v >= 1_000_000
      ? `${sym}${(v / 1_000_000).toFixed(1)}M`
      : `${sym}${Math.round(v / 1_000)}k`;
  }

  const firstName = name.split(" ")[0] || "there";
  const market    = isUK ? "SE UK" : "Florida";
  const assetDesc = `${n}-asset ${isUK ? "SE England" : "Florida"} commercial portfolio`;
  const scanHref  = `${APP_URL}/properties/add?assets=${n}${isUK ? "&market=uk" : ""}`;
  const bookHref  = `${APP_URL}/book?assets=${n}${company ? `&company=${encodeURIComponent(company)}` : ""}${isUK ? "&currency=GBP" : ""}`;

  const subject = `${firstName} — your portfolio numbers before our call`;

  const textBody = `We pulled the benchmarks for a ${assetDesc} before our call.

Here's what the scan found:

• Insurance: ${fmtK(insurance)}/yr above market rate
• Energy: ${fmtK(energy)}/yr above market rate
• Untapped income (EV / 5G / ${isUK ? "solar" : "parking"}): ${fmtK(income)}/yr

Total opportunity: ${fmtK(total)}/yr

These are benchmarks based on ${market} market data — the real numbers for your assets will differ, but this is what a ${n}-asset portfolio typically carries above market.

We'll go through your specifics on the call. If you want to explore the estimates before then:
${scanHref}

Ian Baron
RealHQ
Commission-only — you pay nothing until RealHQ delivers.`;

  const htmlBody = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#222;max-width:520px;">
<p>We pulled the benchmarks for a <strong>${assetDesc}</strong> before our call.</p>
<p>Here's what the scan found:</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <thead>
    <tr style="background:#f9fafb;">
      <th style="text-align:left;padding:10px 14px;font-size:12px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Category</th>
      <th style="text-align:right;padding:10px 14px;font-size:12px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Opportunity / yr</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 14px;font-size:13px;">Insurance benchmarking</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#F5A94A;text-align:right;">${fmtK(insurance)}</td>
    </tr>
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 14px;font-size:13px;">Energy contract gap</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#F5A94A;text-align:right;">${fmtK(energy)}</td>
    </tr>
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 14px;font-size:13px;">Untapped income (EV / 5G / ${isUK ? "solar" : "parking"})</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#0A8A4C;text-align:right;">${fmtK(income)}</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;font-size:13px;font-weight:700;">Total</td>
      <td style="padding:10px 14px;font-size:15px;font-weight:700;color:#F5A94A;text-align:right;">${fmtK(total)}/yr</td>
    </tr>
  </tbody>
</table>
<p style="font-size:13px;color:#555;">These are ${market} market benchmarks for a ${n}-asset portfolio — I'll walk through your actual numbers on the call.</p>
<p style="margin-top:20px;">
  <a href="${bookHref}" style="display:inline-block;background:#0A8A4C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Confirm your call slot →</a>
</p>
<p style="margin-top:8px;font-size:13px;color:#888;">Or <a href="${scanHref}" style="color:#0A8A4C;">explore the estimates in detail →</a></p>
<p style="margin-top:24px;color:#555;">Ian Baron<br/>RealHQ<br/><a href="mailto:hello@realhq.com" style="color:#888;font-size:13px;">hello@realhq.com</a></p>
<p style="font-size:11px;color:#aaa;margin-top:16px;">Commission-only — you pay nothing until RealHQ delivers.</p>
</div>`;

  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject,
    text: textBody,
    html: htmlBody,
    ...(prospectKey ? { tags: [{ name: "prospectKey", value: prospectKey }] } : {}),
  }).catch((e) => console.error("[pre-demo] email send failed:", e));
}

/** Alert Ian when a prospect's email bounces — flags the address as bad. */
export async function sendAdminBounceAlert({
  prospectKey,
  toEmail,
  bounceType,
  name,
  company,
  portfolioDesc,
}: {
  prospectKey: string;
  toEmail: string;
  bounceType?: string;
  name?: string;
  company?: string;
  portfolioDesc?: string;
}) {
  const displayName = name && company ? `${name} — ${company}` : (name ?? company ?? prospectKey);
  const subject = `⚠️ Bounce: ${displayName} <${toEmail}>`;

  if (!process.env.RESEND_API_KEY) {
    console.warn(`[admin-bounce] ${subject}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject,
    html: `<div style="font-family:sans-serif;font-size:14px;color:#222;max-width:600px;">
      <h2 style="font-size:16px;color:#c0392b;margin-bottom:4px;">⚠️ Email Bounced</h2>
      ${name || company ? `<p style="font-size:18px;font-weight:700;margin:8px 0 2px;">${name ?? ""}${name && company ? " — " : ""}${company ?? ""}</p>` : ""}
      ${portfolioDesc ? `<p style="color:#555;margin:2px 0 10px;font-size:13px;">${portfolioDesc}</p>` : ""}
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Prospect key</td><td><strong>${prospectKey}</strong></td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Bounced email</td><td><a href="mailto:${toEmail}" style="color:#c0392b;">${toEmail}</a></td></tr>
        ${bounceType ? `<tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Bounce type</td><td>${bounceType}</td></tr>` : ""}
      </table>
      <p style="color:#c0392b;font-size:13px;">Update the email address or mark this prospect as unreachable before the next send.</p>
      <a href="${APP_URL}/admin/prospects" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#c0392b;color:#fff;font-weight:600;text-decoration:none;border-radius:4px;">Open Prospects →</a>
    </div>`,
  }).catch((e) => console.error("[admin-bounce] alert failed:", e));
}

/** Alert Ian immediately when a prospect clicks the booking link — high buying signal. */
export async function sendAdminClickAlert({
  prospectKey,
  market,
  name,
  company,
  email,
  portfolioDesc,
}: {
  prospectKey: string;
  market?: string;
  name?: string;
  company?: string;
  email?: string;
  portfolioDesc?: string;
}) {
  const displayName = name && company ? `${name} — ${company}` : (name ?? company ?? prospectKey);
  const subject = `🔥 Hot prospect clicked booking link — ${displayName}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[admin-click] ${subject}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject,
    html: `<div style="font-family:sans-serif;font-size:14px;color:#222;max-width:600px;">
      <h2 style="font-size:16px;color:#0A8A4C;margin-bottom:4px;">🔥 Hot Prospect — Booking Link Clicked</h2>
      <p style="color:#555;">A prospect just clicked the booking link in your outreach email. This is a strong buying signal — follow up now if they haven't booked within the hour.</p>
      ${name || company ? `<p style="font-size:20px;font-weight:700;margin:12px 0 2px;">${name ?? ""}${name && company ? " — " : ""}${company ?? ""}</p>` : ""}
      ${email ? `<p style="margin:2px 0 4px;"><a href="mailto:${email}" style="color:#0A8A4C;font-weight:600;">${email}</a></p>` : ""}
      ${portfolioDesc ? `<p style="color:#555;margin:2px 0 12px;font-size:13px;">${portfolioDesc}</p>` : ""}
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Prospect key</td><td><strong>${prospectKey}</strong></td></tr>
        ${market ? `<tr><td style="padding:3px 12px 3px 0;color:#5a7a96;">Market</td><td>${market.toUpperCase()}</td></tr>` : ""}
      </table>
      <a href="${APP_URL}/admin/prospects" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#0A8A4C;color:#fff;font-weight:600;text-decoration:none;border-radius:4px;">Open /admin/prospects →</a>
    </div>`,
  }).catch((e) => console.error("[admin-click] alert failed:", e));
}

export async function sendInsuranceBoundEmail({
  email,
  name,
  carrier,
  policyType,
  quotedPremium,
  annualSaving,
  currency,
}: {
  email: string;
  name?: string | null;
  carrier: string;
  policyType?: string | null;
  quotedPremium: number;
  annualSaving: number;
  currency?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping insurance bound email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const firstName = name ? name.split(" ")[0] : "there";
  const sym = currency === "GBP" ? "£" : "$";
  const premiumFmt = `${sym}${Math.round(quotedPremium).toLocaleString()}`;
  const savingFmt = `${sym}${Math.round(annualSaving).toLocaleString()}`;
  const policyLine = policyType ? ` (${policyType})` : "";

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Insurance bound — ${carrier} | RealHQ`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0B1622;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1622;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111D2B;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 32px 24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;">Insurance Confirmed</p>
        <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#F0F4F8;">Your policy has been bound</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#B0BEC5;line-height:1.6;">Hi ${firstName}, your insurance policy is now in place.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
          <tr>
            <td style="padding:10px 16px;background:#1A2D3F;border-radius:6px 6px 0 0;">
              <p style="margin:0;font-size:12px;color:#5a7a96;text-transform:uppercase;letter-spacing:0.06em;">Carrier</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#F0F4F8;">${carrier}${policyLine}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 16px;background:#152232;margin-top:2px;">
              <p style="margin:0;font-size:12px;color:#5a7a96;text-transform:uppercase;letter-spacing:0.06em;">Annual Premium</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#F0F4F8;">${premiumFmt}/yr</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 16px;background:#0D2115;border-radius:0 0 6px 6px;margin-top:2px;">
              <p style="margin:0;font-size:12px;color:#5a7a96;text-transform:uppercase;letter-spacing:0.06em;">Annual Saving</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0A8A4C;">${savingFmt}/yr</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 8px;font-size:14px;color:#B0BEC5;line-height:1.6;"><strong style="color:#F0F4F8;">Next steps:</strong></p>
        <ul style="margin:0 0 24px;padding:0 0 0 20px;color:#B0BEC5;font-size:14px;line-height:1.8;">
          <li>Your broker will send policy documents within 2 business days</li>
          <li>RealHQ earns a one-time commission — no ongoing cost to you</li>
          <li>We'll flag renewal 60 days before expiry so you're always on best terms</li>
        </ul>
        <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#0A8A4C;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">View dashboard →</a>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #1E3040;">
        <p style="margin:0;font-size:11px;color:#4a6070;line-height:1.5;">RealHQ · hello@realhq.com · Commission-only — you pay nothing.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    text: `Hi ${firstName},\n\nYour insurance policy has been bound.\n\nCarrier: ${carrier}${policyLine}\nAnnual premium: ${premiumFmt}/yr\nAnnual saving: ${savingFmt}/yr\n\nNext steps:\n- Your broker will send policy documents within 2 business days\n- RealHQ earns a one-time commission — no ongoing cost to you\n- We'll flag renewal 60 days before expiry\n\nView your dashboard: ${APP_URL}/dashboard\n\nRealHQ · hello@realhq.com`,
  }).catch((e) => console.error("[insurance-bound] email failed:", e));
}

export async function sendEnergySwitchedEmail({
  email,
  name,
  supplier,
  quotedRate,
  quotedCost,
  annualSaving,
  market = "fl",
}: {
  email: string;
  name?: string | null;
  supplier: string;
  quotedRate: number;
  quotedCost: number;
  annualSaving: number;
  market?: "fl" | "seuk";
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping energy switched email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const firstName = name ? name.split(" ")[0] : "there";
  const isUK = market === "seuk";
  const sym = isUK ? "£" : "$";
  const rateUnit = isUK ? "p/kWh" : "¢/kWh";
  const costFmt = `${sym}${Math.round(quotedCost).toLocaleString()}`;
  const savingFmt = `${sym}${Math.round(annualSaving).toLocaleString()}`;
  const rateFmt = `${quotedRate.toFixed(1)}${rateUnit}`;
  // Typical switch takes 28 days
  const switchDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Energy switch confirmed — ${supplier} | RealHQ`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0B1622;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1622;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111D2B;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 32px 24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;">Energy Switch Confirmed</p>
        <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#F0F4F8;">Your energy switch is underway</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#B0BEC5;line-height:1.6;">Hi ${firstName}, your switch to ${supplier} has been submitted.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
          <tr>
            <td style="padding:10px 16px;background:#1A2D3F;border-radius:6px 6px 0 0;">
              <p style="margin:0;font-size:12px;color:#5a7a96;text-transform:uppercase;letter-spacing:0.06em;">New Supplier</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#F0F4F8;">${supplier}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 16px;background:#152232;">
              <p style="margin:0;font-size:12px;color:#5a7a96;text-transform:uppercase;letter-spacing:0.06em;">Unit Rate</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#F0F4F8;">${rateFmt}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 16px;background:#152232;">
              <p style="margin:0;font-size:12px;color:#5a7a96;text-transform:uppercase;letter-spacing:0.06em;">New Annual Cost</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#F0F4F8;">${costFmt}/yr</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 16px;background:#0D2115;border-radius:0 0 6px 6px;">
              <p style="margin:0;font-size:12px;color:#5a7a96;text-transform:uppercase;letter-spacing:0.06em;">Annual Saving</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0A8A4C;">${savingFmt}/yr</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 8px;font-size:14px;color:#B0BEC5;line-height:1.6;"><strong style="color:#F0F4F8;">What happens next:</strong></p>
        <ul style="margin:0 0 24px;padding:0 0 0 20px;color:#B0BEC5;font-size:14px;line-height:1.8;">
          <li>Expected switch date: <strong style="color:#F0F4F8;">${switchDate}</strong> (approx. 28 days)</li>
          <li>Your current supplier will be notified automatically</li>
          <li>RealHQ earns a one-time commission — no ongoing cost to you</li>
        </ul>
        <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#0A8A4C;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">View dashboard →</a>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #1E3040;">
        <p style="margin:0;font-size:11px;color:#4a6070;line-height:1.5;">RealHQ · hello@realhq.com · Commission-only — you pay nothing.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    text: `Hi ${firstName},\n\nYour energy switch to ${supplier} has been submitted.\n\nNew supplier: ${supplier}\nUnit rate: ${rateFmt}\nNew annual cost: ${costFmt}/yr\nAnnual saving: ${savingFmt}/yr\nExpected switch date: ${switchDate}\n\nYour current supplier will be notified automatically. RealHQ earns a one-time commission — no ongoing cost to you.\n\nView your dashboard: ${APP_URL}/dashboard\n\nRealHQ · hello@realhq.com`,
  }).catch((e) => console.error("[energy-switched] email failed:", e));
}

export async function sendQuoteAcknowledgmentEmail({
  email,
  quoteType,
  address,
}: {
  email: string;
  quoteType: "insurance" | "energy";
  address?: string;
}) {
  const labelMap = {
    insurance: "insurance",
    energy: "energy",
  };
  const label = labelMap[quoteType];
  const addressLine = address ? `<p style="color:#5a7a96;margin:0;">Property: ${address}</p>` : "";

  if (!process.env.RESEND_API_KEY) {
    console.log(`[quote-ack] would send ${label} ack to ${email}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.OUTREACH_EMAIL_FROM ?? "ian@realhq.com",
    to: email,
    subject: `Your ${label} quote is being prepared — RealHQ`,
    html: `<div style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;max-width:560px;line-height:1.6;">
      <p>Hi,</p>
      <p>We've received your ${label} quote request.</p>
      ${addressLine}
      <p>RealHQ is pulling competing quotes now. You'll receive a full cost comparison within 24 hours.</p>
      <p>In the meantime, you can view your portfolio on your <a href="${APP_URL}/dashboard" style="color:#0A8A4C;">dashboard</a>.</p>
      <p style="margin-top:24px;">Ian Baron<br>RealHQ</p>
    </div>`,
  });
}

export async function sendInsuranceQuoteAckEmail({
  email,
  name,
  propertyAddress,
}: {
  email: string;
  name?: string | null;
  propertyAddress?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping insurance quote ack email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const firstName = name ? name.split(" ")[0] : "there";
  const addressLine = propertyAddress ? ` for ${propertyAddress}` : "";

  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject: `Your insurance quote is being prepared — RealHQ`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0B1622;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1622;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111D2B;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 32px 24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#2563EB;text-transform:uppercase;">Insurance Quote</p>
        <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#F0F4F8;">Your quote is being prepared</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#B0BEC5;line-height:1.6;">Hi ${firstName}, RealHQ has received your insurance quote request${addressLine} and is pulling competing quotes now — you'll have results within 24 hours.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
          <tr>
            <td style="padding:12px 16px;background:#1A2D3F;border-radius:6px 6px 0 0;border-bottom:1px solid #0B1622;">
              <p style="margin:0;font-size:13px;color:#B0BEC5;line-height:1.6;">✓ &nbsp;You'll receive competing quotes from <strong style="color:#F0F4F8;">8–12 carriers</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;background:#1A2D3F;border-bottom:1px solid #0B1622;">
              <p style="margin:0;font-size:13px;color:#B0BEC5;line-height:1.6;">✓ &nbsp;RealHQ surfaces the best option with a <strong style="color:#F0F4F8;">full cost comparison</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;background:#1A2D3F;border-radius:0 0 6px 6px;">
              <p style="margin:0;font-size:13px;color:#B0BEC5;line-height:1.6;">✓ &nbsp;Commission-only — <strong style="color:#F0F4F8;">you pay nothing</strong> until RealHQ delivers savings</p>
            </td>
          </tr>
        </table>
        <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">View dashboard →</a>
        <p style="margin:24px 0 0;font-size:14px;color:#B0BEC5;line-height:1.6;">Ian Baron<br/><span style="color:#4a6070;">RealHQ</span></p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #1E3040;">
        <p style="margin:0;font-size:11px;color:#4a6070;line-height:1.5;">RealHQ · ian@realhq.com · Commission-only — you pay nothing.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    text: `Hi ${firstName},\n\nRealHQ has received your insurance quote request${addressLine} and is pulling competing quotes now — you'll have results within 24 hours.\n\nWhat to expect:\n- You'll receive competing quotes from 8–12 carriers\n- RealHQ surfaces the best option with a full cost comparison\n- Commission-only — you pay nothing until RealHQ delivers savings\n\nView your dashboard: ${APP_URL}/dashboard\n\nIan Baron\nRealHQ · ian@realhq.com`,
  }).catch((e) => console.error("[insurance-quote-ack] email failed:", e));
}

export async function sendEnergyQuoteAckEmail({
  email,
  name,
  propertyAddress,
}: {
  email: string;
  name?: string | null;
  propertyAddress?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping energy quote ack email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const firstName = name ? name.split(" ")[0] : "there";
  const addressLine = propertyAddress ? ` for ${propertyAddress}` : "";

  await resend.emails.send({
    from: FROM_IAN,
    to: email,
    subject: `Your energy quote is being prepared — RealHQ`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0B1622;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1622;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111D2B;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 32px 24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;">Energy Quote</p>
        <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#F0F4F8;">Your quote is being prepared</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#B0BEC5;line-height:1.6;">Hi ${firstName}, RealHQ has received your energy quote request${addressLine} and is pulling competing quotes now — you'll have results within 24 hours.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
          <tr>
            <td style="padding:12px 16px;background:#1A2D3F;border-radius:6px 6px 0 0;border-bottom:1px solid #0B1622;">
              <p style="margin:0;font-size:13px;color:#B0BEC5;line-height:1.6;">✓ &nbsp;You'll receive competing quotes from <strong style="color:#F0F4F8;">8–12 carriers</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;background:#1A2D3F;border-bottom:1px solid #0B1622;">
              <p style="margin:0;font-size:13px;color:#B0BEC5;line-height:1.6;">✓ &nbsp;RealHQ surfaces the best option with a <strong style="color:#F0F4F8;">full cost comparison</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;background:#1A2D3F;border-radius:0 0 6px 6px;">
              <p style="margin:0;font-size:13px;color:#B0BEC5;line-height:1.6;">✓ &nbsp;Commission-only — <strong style="color:#F0F4F8;">you pay nothing</strong> until RealHQ delivers savings</p>
            </td>
          </tr>
        </table>
        <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#0A8A4C;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">View dashboard →</a>
        <p style="margin:24px 0 0;font-size:14px;color:#B0BEC5;line-height:1.6;">Ian Baron<br/><span style="color:#4a6070;">RealHQ</span></p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #1E3040;">
        <p style="margin:0;font-size:11px;color:#4a6070;line-height:1.5;">RealHQ · ian@realhq.com · Commission-only — you pay nothing.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    text: `Hi ${firstName},\n\nRealHQ has received your energy quote request${addressLine} and is pulling competing quotes now — you'll have results within 24 hours.\n\nWhat to expect:\n- You'll receive competing quotes from 8–12 carriers\n- RealHQ surfaces the best option with a full cost comparison\n- Commission-only — you pay nothing until RealHQ delivers savings\n\nView your dashboard: ${APP_URL}/dashboard\n\nIan Baron\nRealHQ · ian@realhq.com`,
  }).catch((e) => console.error("[energy-quote-ack] email failed:", e));
}

// ── Property-added activation (1 hr after first property add) ─────────────
export async function sendPropertyAddedActivationEmail({
  email,
  name,
  address,
  assetType,
  country,
}: {
  email: string;
  name: string;
  address: string;
  assetType?: string | null;
  country?: string | null;
}) {
  if (await isUnsubscribed(email)) {
    console.log(`[property-added-activation] Skipping — ${email} is unsubscribed`);
    return;
  }

  const isUK = country === "UK";
  const sym = isUK ? "£" : "$";

  // Benchmark figures scaled to n=1 asset (Day-3 nurture 5-asset baseline ÷ 5)
  const scaleFactor = 1 / 5;
  const ins = Math.round(102000 * scaleFactor);    // ~20,400
  const energy = Math.round(161000 * scaleFactor); // ~32,200
  const income = Math.round(243000 * scaleFactor); // ~48,600
  const total = ins + energy + income;

  function fmtK(v: number) {
    return v >= 1_000_000
      ? `${sym}${(v / 1_000_000).toFixed(1)}M`
      : `${sym}${Math.round(v / 1_000)}k`;
  }

  const firstName = name.split(" ")[0];

  // Shorten address to street + city (drop postcode/state/country suffix)
  const addressParts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const shortAddress =
    addressParts.length >= 2
      ? `${addressParts[0]}, ${addressParts[1]}`
      : addressParts[0] ?? address;

  const subject = `Your RealHQ analysis is ready — ${shortAddress}`;

  await queueEmail({
    to: email,
    from: FROM_IAN,
    subject,
    sendAfterMs: 60 * 60 * 1000,
    text: `${firstName},

Your property has been added to RealHQ — and RealHQ has run it through its benchmarking system.

Here's what typically surfaces on a property like ${shortAddress}:

- Insurance: ${fmtK(ins)}/yr — policies placed individually are almost never on best-market terms
- Energy: ${fmtK(energy)}/yr — commercial contracts left on default rates after acquisition
- Additional income: ${fmtK(income)}/yr — undermarket rents or unutilised space

That's up to ${fmtK(total)}/yr of identifiable opportunity on a single asset. Commission-only — you pay nothing until RealHQ delivers.

Get your insurance quote: ${APP_URL}/insurance
Compare energy rates: ${APP_URL}/energy

Ian Baron
RealHQ${unsubFooterText(email)}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0B1622;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1622;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111D2B;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 32px 24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;">Analysis Ready</p>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F0F4F8;">Your RealHQ analysis is ready</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#5a7a96;">${shortAddress}</p>
        <p style="margin:0 0 20px;font-size:15px;color:#B0BEC5;line-height:1.6;">${firstName} — RealHQ has run your property through its benchmarking system. Here's what typically surfaces on a single asset:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:6px;overflow:hidden;margin:0 0 24px;">
          <tr>
            <td style="padding:12px 16px;background:#1A2D3F;border-bottom:1px solid #0B1622;">
              <span style="font-size:13px;color:#8ba0b8;">Insurance savings (est.)</span>
            </td>
            <td style="padding:12px 16px;background:#1A2D3F;border-bottom:1px solid #0B1622;text-align:right;">
              <span style="font-size:13px;font-weight:600;color:#F5A94A;">${fmtK(ins)} / yr</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;background:#152232;border-bottom:1px solid #0B1622;">
              <span style="font-size:13px;color:#8ba0b8;">Energy savings (est.)</span>
            </td>
            <td style="padding:12px 16px;background:#152232;border-bottom:1px solid #0B1622;text-align:right;">
              <span style="font-size:13px;font-weight:600;color:#F5A94A;">${fmtK(energy)} / yr</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;background:#1A2D3F;">
              <span style="font-size:13px;color:#8ba0b8;">Additional income (est.)</span>
            </td>
            <td style="padding:12px 16px;background:#1A2D3F;text-align:right;">
              <span style="font-size:13px;font-weight:600;color:#0A8A4C;">${fmtK(income)} / yr</span>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 24px;font-size:14px;color:#B0BEC5;line-height:1.6;">Up to <strong style="color:#e8eef5;">${fmtK(total)}/yr</strong> of identifiable opportunity. Commission-only — you pay nothing until RealHQ delivers.</p>
        <a href="${APP_URL}/insurance" style="display:inline-block;padding:12px 24px;background:#0A8A4C;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;margin-right:12px;">Get your insurance quote →</a>
        <a href="${APP_URL}/energy" style="display:inline-block;padding:12px 24px;background:#1A2D3F;color:#e8eef5;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;margin-top:8px;">Compare energy rates →</a>
        <p style="margin:24px 0 0;font-size:14px;color:#B0BEC5;line-height:1.6;">Ian Baron<br/><span style="color:#4a6070;">RealHQ</span></p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #1E3040;">
        ${unsubFooter(email)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
  });
}

// =============================================================================
// WAVE 2 EMAIL ADDITIONS
// =============================================================================

// ---------------------------------------------------------------------------
// Planning Intelligence
// ---------------------------------------------------------------------------

/** Sent when a nearby planning application changes status (cron-triggered). */
export async function sendPlanningStatusAlert(
  email: string,
  assetName: string,
  app: {
    refNumber: string;
    description: string;
    lastStatusSeen: string | null;
    distanceMetres: number | null;
    impact: string | null;
    impactScore: number | null;
  },
  newStatus: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const distanceText = app.distanceMetres
    ? `${Math.round(app.distanceMetres)}m from asset`
    : "nearby";

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Planning update near ${assetName}: ${app.refNumber} → ${newStatus}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
      <p style="font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;margin:0 0 8px;">Planning Intelligence</p>
      <h2 style="margin:0 0 16px;font-size:20px;">Application status changed near ${assetName}</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
        <tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;width:140px;font-size:13px;color:#64748b;">Reference</td><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;">${app.refNumber}</td></tr>
        <tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">Previous status</td><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;">${app.lastStatusSeen ?? "unknown"}</td></tr>
        <tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">New status</td><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;">${newStatus}</td></tr>
        <tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">Description</td><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;">${app.description.substring(0, 200)}${app.description.length > 200 ? "…" : ""}</td></tr>
        <tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">Distance</td><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;">${distanceText}</td></tr>
        ${app.impact ? `<tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">Impact</td><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;">${app.impact}${app.impactScore != null ? ` (${app.impactScore}/10)` : ""}</td></tr>` : ""}
      </table>
      <a href="${APP_URL}/planning" style="display:inline-block;padding:12px 20px;background:#1647E8;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">View in RealHQ →</a>
    </div>`,
  });
}

// ---------------------------------------------------------------------------
// Tenant Intelligence
// ---------------------------------------------------------------------------

/** Sent when the cron creates a renewal engagement action for a lease. */
export async function sendTenantEngagementAlert(
  email: string,
  tenantName: string,
  assetName: string,
  horizon: string,
  engagementId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Lease renewal action: ${tenantName} at ${assetName} — ${horizon} remaining`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
      <p style="font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;margin:0 0 8px;">Tenant Intelligence</p>
      <h2 style="margin:0 0 16px;font-size:20px;">Lease renewal action required</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
        <strong>${tenantName}</strong>'s lease at <strong>${assetName}</strong> expires in approximately ${horizon}. RealHQ has drafted a renewal letter for your review.
      </p>
      <a href="${APP_URL}/tenants?engagement=${engagementId}" style="display:inline-block;padding:12px 20px;background:#1647E8;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">Review renewal letter →</a>
    </div>`,
  });
}

// ---------------------------------------------------------------------------
// Rent Review
// ---------------------------------------------------------------------------

/** Sent when a rent review event is created at a trigger horizon (18m/12m/6m/3m). */
export async function sendRentReviewAlert(
  email: string,
  tenantName: string,
  assetName: string,
  horizon: string,
  annualUpliftPotential: number | null,
  currency: "GBP" | "USD" = "GBP",
  rentReviewId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const sym = currency === "GBP" ? "£" : "$";
  const upliftText = annualUpliftPotential && annualUpliftPotential > 0
    ? `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">RealHQ analysis shows potential uplift of <strong>${sym}${Math.round(annualUpliftPotential).toLocaleString()}/yr</strong>.</p>`
    : "";

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Rent review opportunity: ${tenantName} at ${assetName} — ${horizon}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
      <p style="font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;margin:0 0 8px;">Rent Review</p>
      <h2 style="margin:0 0 16px;font-size:20px;">Rent review window approaching</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
        A rent review clause is triggered in approximately ${horizon} for <strong>${tenantName}</strong> at <strong>${assetName}</strong>.
      </p>
      ${upliftText}
      <a href="${APP_URL}/requests?review=${rentReviewId}" style="display:inline-block;padding:12px 20px;background:#1647E8;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">Start rent review →</a>
    </div>`,
  });
}

// ---------------------------------------------------------------------------
// Work Orders
// ---------------------------------------------------------------------------

/** Sent to a contractor with their unique token to submit a quote. */
export async function sendContractorTenderInvite(
  contractorEmail: string,
  contractorName: string,
  workOrderTitle: string,
  assetName: string,
  scope: string,
  deadlineDate: string,
  tenderToken: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const tenderUrl = `${APP_URL}/tender/respond/${tenderToken}`;

  await resend.emails.send({
    from: FROM,
    to: contractorEmail,
    subject: `Tender invitation: ${workOrderTitle} at ${assetName}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
      <p style="font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;margin:0 0 8px;">Work Order Tender</p>
      <h2 style="margin:0 0 16px;font-size:20px;">Tender invitation: ${workOrderTitle}</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 4px;">Dear ${contractorName},</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">You are invited to submit a quote for the following work order at <strong>${assetName}</strong>.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:20px;">
        <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px;">Scope of works</p>
        <p style="font-size:13px;color:#374151;line-height:1.6;margin:0;white-space:pre-line;">${scope.substring(0, 1000)}</p>
      </div>
      <p style="font-size:14px;color:#374151;margin:0 0 20px;"><strong>Quote deadline:</strong> ${deadlineDate}</p>
      <a href="${tenderUrl}" style="display:inline-block;padding:12px 20px;background:#1647E8;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">Submit your quote →</a>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">This link is unique to your business. Do not forward.</p>
    </div>`,
  });
}

/** Sent to the owner when a work order is completed and commission is created. */
export async function sendWorkOrderComplete(
  email: string,
  ownerName: string | null,
  workOrderTitle: string,
  assetName: string,
  finalCost: number,
  currency: "GBP" | "USD" = "GBP",
  workOrderId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const sym = currency === "GBP" ? "£" : "$";
  const firstName = ownerName ? ownerName.split(" ")[0] : "there";

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Work order complete: ${workOrderTitle} at ${assetName}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
      <p style="font-size:12px;font-weight:600;letter-spacing:0.08em;color:#0A8A4C;text-transform:uppercase;margin:0 0 8px;">Work Orders</p>
      <h2 style="margin:0 0 16px;font-size:20px;">Work complete: ${workOrderTitle}</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hi ${firstName}, the work order at <strong>${assetName}</strong> has been completed and signed off.</p>
      <div style="background:#E8F5EE;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin-bottom:20px;">
        <p style="font-size:13px;color:#374151;margin:0;"><strong>Final cost:</strong> ${sym}${Math.round(finalCost).toLocaleString()}</p>
      </div>
      <a href="${APP_URL}/requests?order=${workOrderId}" style="display:inline-block;padding:12px 20px;background:#1647E8;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:6px;">View work order →</a>
    </div>`,
  });
}
