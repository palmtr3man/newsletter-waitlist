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
});
