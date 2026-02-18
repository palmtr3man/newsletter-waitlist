

/**
 * Send internal signup notification to admin addresses
 */
export async function sendInternalNotification(
  userEmail: string,
  firstName: string,
  tier: "paid" | "free",
  amountPaid?: number
): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    console.warn("[Email] SendGrid API key not configured, skipping internal notification");
    return { success: false, error: "SendGrid not configured" };
  }

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
    </table>
  `;

  try {
    await sgMail.send({
      to: ["k.clark7@gmail.com", "support@thispagedoesnotexist12345.com"],
      from: { email: SENDER_EMAIL, name: SENDER_NAME },
      subject,
      html,
      text: `New Signup: ${userEmail} | ${tierLabel} | ${signupDate}`,
    });
    console.log(`[Email] Internal notification sent for ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send internal notification:", error);
    return { success: false, error: String(error) };
  }
}
import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL = "noreply@thispagedoesnotexist12345.us";
const SENDER_NAME = "The Ultimate Journey";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Generic email sending function
 */
export async function sendEmail(
  options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }
) {
  if (!SENDGRID_API_KEY) {
    console.warn("[Email] SendGrid API key not configured, skipping email");
    return { success: false, error: "SendGrid not configured" };
  }

  try {
    const msg = {
      to: options.to,
      from: {
        email: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html,
    };

    await sgMail.send(msg);
    console.log(`[Email] Email sent to ${options.to}`);
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  email: string,
  name: string,
  paymentAmount: number,
  paymentId: string,
  queuePosition: number
) {
  if (!SENDGRID_API_KEY) {
    console.warn("[Email] SendGrid API key not configured, skipping email");
    return { success: false, error: "SendGrid not configured" };
  }

  try {
    const msg = {
      to: email,
      from: {
        email: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      subject: "✈️ Payment Confirmed - Your Boarding Pass is Ready",
      html: generatePaymentReceiptHTML(name, paymentAmount, paymentId, queuePosition),
      text: generatePaymentReceiptText(name, paymentAmount, paymentId, queuePosition),
    };

    await sgMail.send(msg);
    console.log(`[Email] Payment receipt sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send payment receipt:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send boarding pass confirmation email (for waitlist without payment)
 */
export async function sendBoardingPassEmail(
  email: string,
  name: string,
  queuePosition: number
) {
  if (!SENDGRID_API_KEY) {
    console.warn("[Email] SendGrid API key not configured, skipping email");
    return { success: false, error: "SendGrid not configured" };
  }

  try {
    const msg = {
      to: email,
      from: {
        email: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      subject: "🎫 Your Boarding Pass - You're on the Waitlist!",
      html: generateBoardingPassHTML(name, queuePosition),
      text: generateBoardingPassText(name, queuePosition),
    };

    await sgMail.send(msg);
    console.log(`[Email] Boarding pass sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send boarding pass:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generate payment receipt HTML email
 */
function generatePaymentReceiptHTML(
  name: string,
  amount: number,
  paymentId: string,
  queuePosition: number
): string {
  const amountFormatted = (amount / 100).toFixed(2);
  const boardingPassUrl = `https://newsletter.thispagedoesnotexist12345.us/?boarding=${queuePosition}`;

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
    <div class="header">
      <h1>✈️ Payment Confirmed</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Thank you for joining The Ultimate Journey! Your payment has been successfully processed.</p>
      
      <div class="boarding-pass">
        <h2>Boarding Pass Details</h2>
        <div class="detail-row">
          <span class="detail-label">Passenger Name</span>
          <span class="detail-value">${name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Queue Position</span>
          <span class="detail-value">#${queuePosition}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Flight Status</span>
          <span class="detail-value">PRE-BOARDING</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Amount</span>
          <span class="detail-value">$${amountFormatted}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment ID</span>
          <span class="detail-value">${paymentId}</span>
        </div>
      </div>

      <div class="queue-position">
        Passenger #${queuePosition}
      </div>

      <p>You're now on the pre-boarding list for The Ultimate Journey. We'll notify you when boarding begins.</p>
      
      <center>
        <a href="${boardingPassUrl}" class="button">View Your Boarding Pass</a>
      </center>

      <p style="color: #999; font-size: 14px; margin-top: 30px;">
        If you have any questions, please reply to this email or visit our website.
      </p>
    </div>
    <div class="footer">
      <p>© 2026 The Ultimate Journey. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate payment receipt plain text email
 */
function generatePaymentReceiptText(
  name: string,
  amount: number,
  paymentId: string,
  queuePosition: number
): string {
  const amountFormatted = (amount / 100).toFixed(2);

  return `
Hello ${name},

Thank you for joining The Ultimate Journey! Your payment has been successfully processed.

BOARDING PASS DETAILS
=====================
Passenger Name: ${name}
Queue Position: #${queuePosition}
Flight Status: PRE-BOARDING
Payment Amount: $${amountFormatted}
Payment ID: ${paymentId}

You're now on the pre-boarding list for The Ultimate Journey. We'll notify you when boarding begins.

View your boarding pass: https://newsletter.thispagedoesnotexist12345.us/?boarding=${queuePosition}

If you have any questions, please reply to this email.

© 2026 The Ultimate Journey. All rights reserved.
  `;
}

/**
 * Generate boarding pass HTML email (for waitlist without payment)
 */
function generateBoardingPassHTML(name: string, queuePosition: number): string {
  const boardingPassUrl = `https://newsletter.thispagedoesnotexist12345.us/?boarding=${queuePosition}`;

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
    <div class="header">
      <h1>🎫 Welcome Aboard!</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>You've successfully joined The Ultimate Journey waitlist!</p>
      
      <div class="boarding-pass">
        <h2>Your Boarding Pass</h2>
        <div class="detail-row">
          <span class="detail-label">Passenger Name</span>
          <span class="detail-value">${name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Queue Position</span>
          <span class="detail-value">#${queuePosition}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Flight Status</span>
          <span class="detail-value">PRE-BOARDING</span>
        </div>
      </div>

      <div class="queue-position">
        Passenger #${queuePosition}
      </div>

      <p>You're now on the pre-boarding list. We'll notify you when boarding begins and exclusive content becomes available.</p>
      
      <center>
        <a href="${boardingPassUrl}" class="button">View Your Boarding Pass</a>
      </center>

      <p style="color: #999; font-size: 14px; margin-top: 30px;">
        Invite your friends to join The Ultimate Journey and move up the queue!
      </p>
    </div>
    <div class="footer">
      <p>© 2026 The Ultimate Journey. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate boarding pass plain text email
 */
function generateBoardingPassText(name: string, queuePosition: number): string {
  return `
Hello ${name},

You've successfully joined The Ultimate Journey waitlist!

YOUR BOARDING PASS
==================
Passenger Name: ${name}
Queue Position: #${queuePosition}
Flight Status: PRE-BOARDING

You're now on the pre-boarding list. We'll notify you when boarding begins and exclusive content becomes available.

View your boarding pass: https://newsletter.thispagedoesnotexist12345.us/?boarding=${queuePosition}

Invite your friends to join The Ultimate Journey and move up the queue!

© 2026 The Ultimate Journey. All rights reserved.
  `;
}
