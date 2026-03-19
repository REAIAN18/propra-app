import { Resend } from "resend";

const FROM = process.env.AUTH_EMAIL_FROM ?? "Arca <noreply@arca.ai>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://arca.ai";

export async function sendWelcomeEmail({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping welcome email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const firstName = name.split(" ")[0];
  const dashboardUrl = `${APP_URL}/dashboard?welcome=1`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your Arca portfolio analysis is ready",
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
              Welcome, ${firstName} — your demo portfolio is ready
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="font-size:14px; color:#8ba0b8; line-height:1.6; padding-bottom:24px;">
              Arca has analysed a live FL Mixed portfolio (12 assets, $2.8M gross income) and found
              <span style="color:#F5A94A; font-weight:600;">$194k</span> of hidden opportunity across
              insurance, energy, and additional income streams.
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; color:#8ba0b8; line-height:1.6; padding-bottom:32px;">
              Click below to see every line item — exactly where the money is and how Arca recovers it.
              No credit card. No contracts. Commission-only when Arca delivers.
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
                  <td style="padding:12px 16px; font-size:13px; color:#8ba0b8;">Insurance overpay</td>
                  <td style="padding:12px 16px; font-size:13px; font-weight:600; color:#F5A94A; text-align:right;">$42k / yr</td>
                </tr>
                <tr style="border-bottom:1px solid #1a2d45;">
                  <td style="padding:12px 16px; font-size:13px; color:#8ba0b8;">Energy overpay</td>
                  <td style="padding:12px 16px; font-size:13px; font-weight:600; color:#1647E8; text-align:right;">$28k / yr</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; font-size:13px; color:#8ba0b8;">Additional income</td>
                  <td style="padding:12px 16px; font-size:13px; font-weight:600; color:#0A8A4C; text-align:right;">$124k / yr</td>
                </tr>
              </table>
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
