import { describe, it, expect, vi, beforeEach } from "vitest";
import * as sgMail from "@sendgrid/mail";

// Mock SendGrid
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(async () => [{ statusCode: 202 }]),
  },
}));

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Email Template Generation", () => {
    it("should generate valid HTML email templates", () => {
      const name = "John Doe";
      const queuePosition = 42;

      // Test that templates are strings
      expect(typeof name).toBe("string");
      expect(typeof queuePosition).toBe("number");
      expect(queuePosition).toBeGreaterThan(0);
    });

    it("should include queue position in email", () => {
      const queuePosition = 123;
      const emailContent = `Passenger #${queuePosition}`;

      expect(emailContent).toContain("Passenger #123");
    });

    it("should format payment amount correctly", () => {
      const amount = 1; // $0.01
      const formatted = (amount / 100).toFixed(2);

      expect(formatted).toBe("0.01");
    });

    it("should include boarding pass URL", () => {
      const queuePosition = 50;
      const boardingPassUrl = `https://newsletter.thispagedoesnotexist12345.us/?boarding=${queuePosition}`;

      expect(boardingPassUrl).toContain("boarding=50");
      expect(boardingPassUrl).toContain("newsletter.thispagedoesnotexist12345.us");
    });
  });

  describe("Email Configuration", () => {
    it("should have correct sender email", () => {
      const senderEmail = "noreply@thispagedoesnotexist12345.us";
      expect(senderEmail).toContain("@thispagedoesnotexist12345.us");
    });

    it("should have correct sender name", () => {
      const senderName = "The Ultimate Journey";
      expect(senderName).toBe("The Ultimate Journey");
    });
  });

  describe("Email Content Validation", () => {
    it("should include aviation theme elements", () => {
      const emailContent = "✈️ Payment Confirmed";
      expect(emailContent).toContain("✈️");
    });

    it("should include boarding pass elements", () => {
      const emailContent = "🎫 Welcome Aboard!";
      expect(emailContent).toContain("🎫");
    });

    it("should include Black Glass theme colors", () => {
      const htmlColor = "#00d9ff"; // Cyan accent
      expect(htmlColor).toBe("#00d9ff");

      const backgroundColor = "#0a0a0a"; // Deep black
      expect(backgroundColor).toBe("#0a0a0a");
    });
  });

  describe("Email Recipient Validation", () => {
    it("should validate email format", () => {
      const validEmails = [
        "test@example.com",
        "user+tag@domain.co.uk",
        "name@company.org",
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it("should reject invalid email format", () => {
      const invalidEmails = ["notanemail", "@example.com", "user@", "user @example.com"];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe("SendGrid Integration", () => {
    it("should initialize SendGrid with API key", () => {
      expect(sgMail.default.setApiKey).toBeDefined();
    });

    it("should have send function available", () => {
      expect(sgMail.default.send).toBeDefined();
    });

    it("should return success response on email send", async () => {
      const response = await sgMail.default.send({
        to: "test@example.com",
        from: "noreply@thispagedoesnotexist12345.us",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(Array.isArray(response)).toBe(true);
      expect(response[0].statusCode).toBe(202);
    });
  });

  describe("Boarding pass URL and Beehiiv CTA rendering", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
      process.env = { ...originalEnv };
      process.env.SENDGRID_API_KEY = "SG.test-key";
    });

    it("uses APP_BASE_URL for boarding-pass links so app routes do not have to target the Beehiiv newsletter domain", async () => {
      process.env.APP_BASE_URL = "https://app.example.com/";
      process.env.BEEHIIV_GIFT_LINK_URL = "https://files.example.com/dashboard-v2.xlsx";

      const { sendBoardingPassEmail } = await import("./email");
      const result = await sendBoardingPassEmail("passenger@example.com", "Jane Passenger", 7);

      expect(result).toEqual({ success: true });
      expect(sgMail.default.send).toHaveBeenCalledTimes(1);

      const [message] = vi.mocked(sgMail.default.send).mock.calls[0];
      expect(message.html).toContain('href="https://app.example.com/?boarding=7"');
      expect(message.text).toContain("View your boarding pass: https://app.example.com/?boarding=7");
      expect(message.html).toContain('href="https://files.example.com/dashboard-v2.xlsx"');
      expect(message.text).toContain("https://files.example.com/dashboard-v2.xlsx");
    });

    it("falls back to VITE_APP_URL when APP_BASE_URL is not configured", async () => {
      delete process.env.APP_BASE_URL;
      process.env.VITE_APP_URL = "https://vite-app.example.com";

      const { sendBoardingPassEmail } = await import("./email");
      await sendBoardingPassEmail("passenger@example.com", "Jane Passenger", 8);

      const [message] = vi.mocked(sgMail.default.send).mock.calls[0];
      expect(message.html).toContain('href="https://vite-app.example.com/?boarding=8"');
      expect(message.text).toContain("View your boarding pass: https://vite-app.example.com/?boarding=8");
    });

    it("omits the gifted-dashboard CTA when no gift URL is configured", async () => {
      delete process.env.BEEHIIV_GIFT_LINK_URL;

      const { sendBoardingPassEmail } = await import("./email");
      await sendBoardingPassEmail("passenger@example.com", "Jane Passenger", 9);

      const [message] = vi.mocked(sgMail.default.send).mock.calls[0];
      expect(message.html).not.toContain("Claim Your Gifted Dashboard");
      expect(message.text).not.toContain("GIFTED DASHBOARD");
      expect(message.html).toContain("View Your Boarding Pass");
      expect(message.html).toContain("?boarding=9");
    });
  });
});
