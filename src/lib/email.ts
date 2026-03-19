import { Resend } from "resend";

const FROM = process.env.AUTH_EMAIL_FROM ?? "Arca <noreply@arca.ai>";
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
