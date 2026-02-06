import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Plane, Users, Share2, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Newsletter Waitlist Landing Page with Stripe Payment
 *
 * Design: Retro-Futuristic Airport Terminal
 * - Departure board aesthetic with flip-text animations
 * - Glassmorphic form cards with cyan neon accents
 * - Aviation-themed boarding pass confirmation
 * - Real-time queue position tracking
 * - Stripe $0.01 payment integration
 */

interface FormState {
  email: string;
  firstName: string;
  submitted: boolean;
  queuePosition: number;
  totalPassengers: number;
  paymentStatus: "pending" | "completed" | "failed" | "skipped";
}

export default function Home() {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    firstName: "",
    submitted: false,
    queuePosition: 0,
    totalPassengers: 0,
    paymentStatus: "pending",
  });

  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // tRPC mutations
  const createCheckoutMutation = trpc.payment.createCheckout.useMutation();
  const confirmPaymentMutation = trpc.payment.confirmPayment.useMutation();
  const joinWithoutPaymentMutation = trpc.payment.joinWaitlistWithoutPayment.useMutation();
  const getTotalCountQuery = trpc.payment.getTotalCount.useQuery();

  // Update total passengers count
  useEffect(() => {
    if (getTotalCountQuery.data) {
      setFormState((prev) => ({
        ...prev,
        totalPassengers: getTotalCountQuery.data || 0,
      }));
    }
  }, [getTotalCountQuery.data]);

  // Check for payment success on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (sessionId) {
      handlePaymentSuccess(sessionId);
    }
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      const result = await confirmPaymentMutation.mutateAsync({ sessionId });
      setFormState((prev) => ({
        ...prev,
        submitted: true,
        queuePosition: result.queuePosition,
        paymentStatus: "completed",
        email: result.email,
      }));
      toast.success("Payment successful! Welcome aboard!");
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      toast.error("Failed to confirm payment. Please try again.");
      setFormState((prev) => ({
        ...prev,
        paymentStatus: "failed",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string } = {};

    if (!formState.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formState.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Create Stripe checkout session
      const result = await createCheckoutMutation.mutateAsync({
        email: formState.email,
        firstName: formState.firstName,
      });

      // Open Stripe checkout in new tab
      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank");
        toast.info("Opening payment page in a new window...");
      }
    } catch (error) {
      toast.error("Failed to create payment session. Please try again.");
      setErrors({ email: "Payment setup failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPayment = async () => {
    setIsLoading(true);
    try {
      const result = await joinWithoutPaymentMutation.mutateAsync({
        email: formState.email,
        firstName: formState.firstName,
      });

      setFormState((prev) => ({
        ...prev,
        submitted: true,
        queuePosition: result.queuePosition,
        paymentStatus: "skipped",
      }));
      toast.info("Added to waitlist! (Payment skipped)");
    } catch (error) {
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const text = `I just joined The Ultimate Journey newsletter waitlist! I'm passenger #${formState.queuePosition}. Join me at https://newsletter.thispagedoesnotexist12345.us/`;
    if (navigator.share) {
      navigator.share({
        title: "The Ultimate Journey",
        text: text,
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleReset = () => {
    setFormState({
      email: "",
      firstName: "",
      submitted: false,
      queuePosition: 0,
      totalPassengers: getTotalCountQuery.data || 0,
      paymentStatus: "pending",
    });
    setErrors({});
  };

  if (formState.submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-black to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Boarding Pass */}
          <div className="mb-8 animate-in slide-in-from-left duration-600">
            <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 p-8 backdrop-blur-xl">
              <div className="space-y-6">
                {/* Payment Status Badge */}
                <div className="flex items-center gap-2 mb-4">
                  {formState.paymentStatus === "completed" && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-mono text-sm">PAYMENT VERIFIED</span>
                    </>
                  )}
                  {formState.paymentStatus === "skipped" && (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400 font-mono text-sm">WAITLIST ONLY</span>
                    </>
                  )}
                </div>

                {/* Boarding Pass Header */}
                <div className="border-b border-cyan-500/20 pb-4">
                  <div className="text-cyan-400 font-mono text-sm mb-2">BOARDING PASS</div>
                  <h2 className="text-3xl font-bold text-white">
                    {formState.firstName || "Passenger"}
                  </h2>
                  <p className="text-cyan-400/80 font-mono text-sm mt-1">
                    {formState.email}
                  </p>
                </div>

                {/* Flight Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-cyan-400/60 text-xs font-mono mb-1">FLIGHT</p>
                    <p className="text-white font-bold">ULTIMATE-JOURNEY-2026</p>
                  </div>
                  <div>
                    <p className="text-cyan-400/60 text-xs font-mono mb-1">DEPARTURE</p>
                    <p className="text-white font-bold">March 2026</p>
                  </div>
                  <div>
                    <p className="text-cyan-400/60 text-xs font-mono mb-1">SEAT</p>
                    <p className="text-white font-bold">#{formState.queuePosition}</p>
                  </div>
                  <div>
                    <p className="text-cyan-400/60 text-xs font-mono mb-1">GATE</p>
                    <p className="text-white font-bold">BOARDING</p>
                  </div>
                </div>

                {/* Barcode */}
                <div className="bg-cyan-500/10 p-4 rounded border border-cyan-500/20">
                  <div className="font-mono text-xs text-cyan-400/60 text-center">
                    ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={handleShare}
              className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-semibold py-6 rounded-lg transition-all"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Invite Others
            </Button>

            <Button
              onClick={handleReset}
              className="w-full bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600 text-white font-semibold py-6 rounded-lg transition-all"
            >
              Add Another Email
            </Button>
          </div>

          {/* Passenger Count */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 text-cyan-400">
              <Users className="w-4 h-4" />
              <span className="font-mono text-sm">
                {formState.totalPassengers} passengers ready to board
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Departure Board */}
        <div className="mb-12 text-center">
          <div className="inline-block border border-cyan-500/50 rounded-lg p-4 mb-8 bg-cyan-500/5 backdrop-blur">
            <div className="text-cyan-400 font-mono text-sm mb-2">DEPARTURE BOARD</div>
            <div className="text-cyan-400 font-bold text-2xl">FLIGHT STATUS: PRE-BOARDING</div>
            <div className="text-cyan-400/60 font-mono text-xs mt-2">Gate Opening Soon</div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Your Flight is Preparing for
            <span className="block text-cyan-400 text-shadow-lg">Departure</span>
          </h1>

          <p className="text-lg text-gray-300 mb-4">
            Join the pre-boarding list and be first to receive career navigation insights.
          </p>
          <p className="text-cyan-400 font-semibold">Get your boarding pass today.</p>

          <div className="mt-8 flex justify-center">
            <Plane className="w-16 h-16 text-cyan-400 animate-bounce" />
          </div>
        </div>

        {/* Signup Form */}
        <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-semibold mb-2">Email Address *</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={formState.email}
                onChange={(e) => {
                  setFormState((prev) => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors({});
                }}
                className="bg-slate-900/50 border-cyan-500/30 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-2">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">First Name (Optional)</label>
              <Input
                type="text"
                placeholder="John"
                value={formState.firstName}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, firstName: e.target.value }))
                }
                className="bg-slate-900/50 border-cyan-500/30 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || createCheckoutMutation.isPending}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-6 rounded-lg transition-all disabled:opacity-50"
            >
              {isLoading || createCheckoutMutation.isPending
                ? "Processing..."
                : "Get My Boarding Pass ($0.01)"}
            </Button>

            {/* Fallback Option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cyan-500/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-to-b from-black via-black to-slate-900 text-gray-400">
                  or
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSkipPayment}
              disabled={!formState.email || isLoading || joinWithoutPaymentMutation.isPending}
              className="w-full bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600 text-gray-300 font-semibold py-6 rounded-lg transition-all disabled:opacity-50"
            >
              {joinWithoutPaymentMutation.isPending
                ? "Joining..."
                : "Join Waitlist (Skip Payment)"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500 space-y-2">
            <p>We respect your privacy. Unsubscribe anytime. <a href="#" className="text-cyan-400 hover:underline">Privacy Policy</a></p>
            <div className="flex items-center justify-center gap-2 text-cyan-400">
              <Users className="w-4 h-4" />
              <span className="font-mono">
                {getTotalCountQuery.data || 0} passengers ready to board
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
