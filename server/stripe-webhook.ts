import express, { Request, Response } from "express";
import Stripe from "stripe";
import { handlePaymentSuccess } from "./payment";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Stripe webhook handler for payment events
 * Webhook events: checkout.session.completed, payment_intent.succeeded
 */
export function setupStripeWebhook(app: express.Application) {
  // CRITICAL: Use express.raw() BEFORE express.json() for webhook signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;

      if (!sig) {
        console.error("[Webhook] Missing Stripe signature");
        return res.status(400).json({ error: "Missing signature" });
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (error) {
        console.error("[Webhook] Signature verification failed:", error);
        return res.status(400).json({ error: "Signature verification failed" });
      }

      // CRITICAL: Handle test events for testing
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({
          verified: true,
        });
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log("[Webhook] Checkout session completed:", session.id);

            if (session.payment_status === "paid") {
              try {
                const result = await handlePaymentSuccess(session.id);
                console.log("[Webhook] Payment processed for:", result.email);
              } catch (error) {
                console.error("[Webhook] Failed to process payment:", error);
              }
            }
            break;
          }

          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log("[Webhook] Payment intent succeeded:", paymentIntent.id);
            break;
          }

          case "charge.failed": {
            const charge = event.data.object as Stripe.Charge;
            console.log("[Webhook] Charge failed:", charge.id);
            break;
          }

          default:
            console.log("[Webhook] Unhandled event type:", event.type);
        }

        res.json({ received: true });
      } catch (error) {
        console.error("[Webhook] Error processing event:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}
