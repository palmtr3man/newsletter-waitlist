/**
 * email.ts — Dual-stack email provider with runtime toggle
 *
 * EMAIL_PROVIDER env var controls the active provider at runtime:
 *   "brevo"     → Brevo Transactional API (v3)
 *   "sendgrid"  → SendGrid Mail API (default / fallback)
 *   unset       → sendgrid
 *
 * Swap without redeploy: change EMAIL_PROVIDER in Netlify UI → redeploy
 * or rotate via Netlify CLI: netlify env:set EMAIL_PROVIDER brevo
 *
 * BREVO-01 / PAL-64 — committed 2026-06-15
 */

import sgMail from "@sendgrid/mail";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const BREVO_API_KEY    = process.env.BREVO_API_KEY;
const EMAIL_PROVIDER   = (process.env.EMAIL_PROVIDER || "sendgrid").toLowerCase().trim() as "sendgrid" | "brevo";

const SENDER_EMAIL       = "noreply@thispagedoesnotexist12345.us";
const SENDER_NAME        = "The Ultimate Journey";
const DEFAULT_APP_BASE_URL = "https://newsletter.thispagedoesnotexist12345.us";

const BREVO_SMTP_API = "https://api.brevo.com/v3/smtp/email";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.VITE_APP_URL || DEFAULT_APP_BASE_URL).replace(/\/$/, "");
}

function getBoardingPassUrl(queuePosition: number): string {
  return `${getAppBaseUrl()}/?boarding=${queuePosition}`;
}

/** Active provider label for logging */
function activeProvider(): string {
  return EMAIL_PROVIDER === "brevo" ? "Brevo" : "SendGrid";
}

// ---------------------------------------------------------------------------
// Brevo send primitive
// ---------------------------------------------------------------------------
async function sendViaBrevo(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!BREVO_API_KEY) {
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: options.to }],
    subject: options.subject,
    htmlContent: options.html,
    textContent: options.text || options.html.replace(/<[^>]+>/g, ""),
  };

  const res = await fetch(BREVO_SMTP_API, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { success: false, error: `Brevo ${res.status}: ${body.slice(0, 200)}` };
  }

  const data = (await res.json()) as { messageId?: string };
  return { success: true, messageId: data.messageId };
}

// ---------------------------------------------------------------------------
// SendGrid send primitive
// ---------------------------------------------------------------------------
async function sendViaSendGrid(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    return { success: false, error: "SENDGRID_API_KEY not configured" };
  }

  await sgMail.send({
    to: options.to,
    from: { email: SENDER_EMAIL, name: SENDER_NAME },
    subject: options.subject,
    html: options.html,
    text: options.text || options.html,
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Unified dispatch — routes to active provider, falls back to the other
// ---------------------------------------------------------------------------
async function dispatch(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string; provider?: string }> {
  const primary   = EMAIL_PROVIDER;
  const secondary = primary === "brevo" ? "sendgrid" : "brevo";

  // Primary attempt
  try {
    const result =
      primary === "brevo"
        ? await sendViaBrevo(options)
        : await sendViaSendGrid(options);

    if (result.success) {
      console.log(`[Email] Sent via ${activeProvider()} to ${options.to}`);
      return { ...result, provider: primary };
    }

    console.warn(`[Email] ${activeProvider()} failed (${result.error}), trying ${secondary} fallback`);
  } catch (err) {
    console.warn(`[Email] ${activeProvider()} threw (${String(err)}), trying ${secondary} fallback`);
  }

  // Fallback attempt
  try {
    const fallback =
      secondary === "brevo"
        ? await sendViaBrevo(options)
        : await sendViaSendGrid(options);

    if (fallback.success) {
      console.log(`[Email] Fallback sent via ${secondary} to ${options.to}`);
      return { ...fallback, provider: secondary };
    }

    return { success: false, error: `Both providers failed. Last: ${fallback.error}`, provider: secondary };
  } catch (err) {
    return { success: false, error: `Both providers threw. Last: ${String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generic email sending function.
 * Routes to EMAIL_PROVIDER (default: sendgrid) with automatic fallback.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await dispatch(options);
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send payment receipt email.
 */
export async function sendPaymentReceiptEmail(
  email: string,
  name: string,
  paymentAmount: number,
  paymentId: string,
  queuePosition: number
): Promise<{ success: boolean; error?: string }> {
  try {
    return await dispatch({
      to: email,
      subject: "✈️ Payment Confirmed - Your Boarding Pass is Ready",
      html: generatePaymentReceiptHTML(name, paymentAmount, paymentId, queuePosition),
      text: generatePaymentReceiptText(name, paymentAmount, paymentId, queuePosition),
    });
  } catch (error) {
    console.error("[Email] Failed to send payment receipt:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send boarding pass confirmation email (for waitlist without payment).
 *
 * @param giftLinkUrl  Optional Beehiiv gift subscription URL. When provided, a
 *                     "Claim your gifted dashboard" CTA button is injected into
 *                     both the HTML and plain-text versions of the email.
 *                     Reads from process.env.BEEHIIV_GIFT_LINK_URL when not
 *                     supplied explicitly.
 */
export async function sendBoardingPassEmail(
  email: string,
  name: string,
  queuePosition: number,
  giftLinkUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const resolvedGiftLink = giftLinkUrl ?? process.env.BEEHIIV_GIFT_LINK_URL;

  try {
    return await dispatch({
      to: email,
      subject: "🎫 Your Boarding Pass - You're on the Waitlist!",
      html: generateBoardingPassHTML(name, queuePosition, resolvedGiftLink),
      text: generateBoardingPassText(name, queuePosition, resolvedGiftLink),
    });
  } catch (error) {
    console.error("[Email] Failed to send boarding pass:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send internal signup notification to admin addresses.
 */
export async function sendInternalNotification(
  userEmail: string,
  firstName: string,
  tier: "paid" | "free",
  amountPaid?: number
): Promise<{ success: boolean; error?: string }> {
  const signupDate = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const tierLabel = tier === "paid" ? `Paid ($${((amountPaid || 1) / 100).toFixed(2)})` : "Free";
  const subject = `[New Signup] ${firstName || userEmail} — ${tierLabel} — ${signupDate}`;
  const html = `
    <h2>New Signup on The Ultimate Journey</h2>
    <table style="border-collapse:collapse; font-family: monospace;">
      <tr><td style="padding:4px 12px 4px 0; color:#999;">Email</td><td style="padding:4px 0;"><strong>${userEmail}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0; color:#999;">Name</td><td style="padding:4px 0;">${firstName || "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0; color:#999;">Tier</td><td style="padding:4px 0;">${tierLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0; color:#999;">Date</td><td style="padding:4px 0;">${signupDate}</td></tr>
      <tr><td style="padding:4px 12px 4px 0; color:#999;">Provider</td><td style="padding:4px 0;">${activeProvider()}</td></tr>
    </table>
  `;

  try {
    const result = await dispatch({
      to: "k.clark7@gmail.com",
      subject,
      html,
      text: `New Signup: ${userEmail} | ${tierLabel} | ${signupDate} | via ${activeProvider()}`,
    });
    // Also send to support alias
    await dispatch({
      to: "support@thispagedoesnotexist12345.com",
      subject,
      html,
      text: `New Signup: ${userEmail} | ${tierLabel} | ${signupDate} | via ${activeProvider()}`,
    });
    return result;
  } catch (error) {
    console.error("[Email] Failed to send internal notification:", error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// Template generators (unchanged from original)
// ---------------------------------------------------------------------------

function generatePaymentReceiptHTML(
  name: string,
  amount: number,
  paymentId: string,
  queuePosition: number
): string {
  const amountFormatted = (amount / 100).toFixed(2);
  const boardingPassUrl = getBoardingPassUrl(queuePosition);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0a; color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; }
    .header { background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; color: #0a0a0a; }
    .content { background: #1a1a2e; padding: 30px; border-radius: 0 0 8px 8px; }
    .boarding-pass { background: rgba(0, 217, 255, 0.1); border: 2px solid #00d9ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .boarding-pass h2 { color: #00d9ff; margin-top: 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(0, 217, 255, 0.2); }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #999; font-size: 14px; }
    .detail-value { color: #00d9ff; font-weight: bold; font-size: 16px; }
    .queue-position { font-size: 36px; color: #00d9ff; font-weight: bold; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #00d9ff; color: #0a0a0a; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>✈️ Payment Confirmed</h1></div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Thank you for joining The Ultimate Journey! Your payment has been successfully processed.</p>
      <div class="boarding-pass">
        <h2>Boarding Pass Details</h2>
        <div class="detail-row"><span class="detail-label">Passenger Name</span><span class="detail-value">${name}</span></div>
        <div class="detail-row"><span class="detail-label">Queue Position</span><span class="detail-value">#${queuePosition}</span></div>
        <div class="detail-row"><span class="detail-label">Flight Status</span><span class="detail-value">PRE-BOARDING</span></div>
        <div class="detail-row"><span class="detail-label">Payment Amount</span><span class="detail-value">$${amountFormatted}</span></div>
        <div class="detail-row"><span class="detail-label">Payment ID</span><span class="detail-value">${paymentId}</span></div>
      </div>
      <div class="queue-position">Passenger #${queuePosition}</div>
      <p>You're now on the pre-boarding list for The Ultimate Journey. We'll notify you when boarding begins.</p>
      <center><a href="${boardingPassUrl}" class="button">View Your Boarding Pass</a></center>
      <p style="color: #999; font-size: 14px; margin-top: 30px;">If you have any questions, please reply to this email or visit our website.</p>
    </div>
    <div class="footer"><p>© 2026 The Ultimate Journey. All rights reserved.</p></div>
  </div>
</body>
</html>`;
}

function generatePaymentReceiptText(
  name: string,
  amount: number,
  paymentId: string,
  queuePosition: number
): string {
  const amountFormatted = (amount / 100).toFixed(2);
  return `Hello ${name},

Thank you for joining The Ultimate Journey! Your payment has been successfully processed.

BOARDING PASS DETAILS
=====================
Passenger Name: ${name}
Queue Position: #${queuePosition}
Flight Status: PRE-BOARDING
Payment Amount: $${amountFormatted}
Payment ID: ${paymentId}

You're now on the pre-boarding list for The Ultimate Journey. We'll notify you when boarding begins.

View your boarding pass: ${getBoardingPassUrl(queuePosition)}

If you have any questions, please reply to this email.

© 2026 The Ultimate Journey. All rights reserved.`;
}

function generateBoardingPassHTML(
  name: string,
  queuePosition: number,
  giftLinkUrl?: string
): string {
  const boardingPassUrl = getBoardingPassUrl(queuePosition);
  const giftBlock = giftLinkUrl
    ? `<div style="margin-top: 24px; text-align: center;">
        <p style="color: #ccc; font-size: 14px; margin-bottom: 12px;">
          🎁 As a thank-you for joining early, here's a free copy of the TUJ Dashboard V2:
        </p>
        <a href="${giftLinkUrl}" class="button" style="background: #7c3aed; color: #ffffff;">
          Claim Your Gifted Dashboard
        </a>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0a; color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; }
    .header { background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; color: #0a0a0a; }
    .content { background: #1a1a2e; padding: 30px; border-radius: 0 0 8px 8px; }
    .boarding-pass { background: rgba(0, 217, 255, 0.1); border: 2px solid #00d9ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .boarding-pass h2 { color: #00d9ff; margin-top: 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(0, 217, 255, 0.2); }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #999; font-size: 14px; }
    .detail-value { color: #00d9ff; font-weight: bold; font-size: 16px; }
    .queue-position { font-size: 36px; color: #00d9ff; font-weight: bold; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #00d9ff; color: #0a0a0a; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎫 Welcome Aboard!</h1></div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>You've successfully joined The Ultimate Journey waitlist!</p>
      <div class="boarding-pass">
        <h2>Your Boarding Pass</h2>
        <div class="detail-row"><span class="detail-label">Passenger Name</span><span class="detail-value">${name}</span></div>
        <div class="detail-row"><span class="detail-label">Queue Position</span><span class="detail-value">#${queuePosition}</span></div>
        <div class="detail-row"><span class="detail-label">Flight Status</span><span class="detail-value">PRE-BOARDING</span></div>
      </div>
      <div class="queue-position">Passenger #${queuePosition}</div>
      <p>You're now on the pre-boarding list. We'll notify you when boarding begins and exclusive content becomes available.</p>
      <center><a href="${boardingPassUrl}" class="button">View Your Boarding Pass</a></center>
      ${giftBlock}
      <p style="color: #999; font-size: 14px; margin-top: 30px;">Invite your friends to join The Ultimate Journey and move up the queue!</p>
    </div>
    <div class="footer"><p>© 2026 The Ultimate Journey. All rights reserved.</p></div>
  </div>
</body>
</html>`;
}

function generateBoardingPassText(
  name: string,
  queuePosition: number,
  giftLinkUrl?: string
): string {
  const giftSection = giftLinkUrl
    ? `\n🎁 GIFTED DASHBOARD\n===================\nAs a thank-you for joining early, claim your free copy of the TUJ Dashboard V2:\n${giftLinkUrl}\n`
    : "";

  return `Hello ${name},

You've successfully joined The Ultimate Journey waitlist!

YOUR BOARDING PASS
==================
Passenger Name: ${name}
Queue Position: #${queuePosition}
Flight Status: PRE-BOARDING

You're now on the pre-boarding list. We'll notify you when boarding begins.

View your boarding pass: ${getBoardingPassUrl(queuePosition)}
${giftSection}
Invite your friends to join The Ultimate Journey and move up the queue!

© 2026 The Ultimate Journey. All rights reserved.`;
}
