import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Mail, Users, Share2, AlertCircle, CheckCircle, Settings, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { EmailPreferences } from "@/components/EmailPreferences";
import { ReferralInvite } from "@/components/ReferralInvite";

/**
 * Newsletter landing page
 *
 * Design: dark glass theme with cyan accents.
 * - Outcome-focused subscription copy
 * - Single hero email capture path
 * - Referral and preference tools after signup
 */

// Auto-expire theme: revert to default after March 1 2026
function initTheme() {
  if (new Date() > new Date("2026-03-01")) {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.setAttribute("data-theme", "february-glass-2026");
}

interface FormState {
  email: string;
  firstName: string;
  submitted: boolean;
  queuePosition: number;
  totalPassengers: number;
  paymentStatus: "pending" | "completed" | "failed" | "skipped";
  referralCode?: string;
  isVip?: boolean;
  successfulReferrals?: number;
}

export default function Home() {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    firstName: "",
    submitted: false,
    queuePosition: 0,
    totalPassengers: 0,
    paymentStatus: "pending",
    referralCode: "",
    isVip: false,
    successfulReferrals: 0,
  });

  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailPreferences, setShowEmailPreferences] = useState(false);

  // Apply Black Glass theme on mount
  useEffect(() => {
    initTheme();
  }, []);

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

  // Check for payment success and referral code on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const referralCode = params.get("ref");

    if (referralCode) {
      sessionStorage.setItem("referralCode", referralCode);
    }

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
        referralCode: result.referralCode,
        isVip: result.isVip,
        successfulReferrals: result.successfulReferrals,
      }));
      toast.success("Payment successful. You are subscribed.");
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
      const referralCode = sessionStorage.getItem("referralCode");
      const result = await createCheckoutMutation.mutateAsync({
        email: formState.email,
        firstName: formState.firstName,
        referralCode: referralCode || undefined,
      });

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
        referralCode: result.referralCode,
        isVip: result.isVip,
        successfulReferrals: result.successfulReferrals,
      }));
      toast.success("Subscription received. Check your email to confirm your Signal subscription.");
    } catch (error) {
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const text = `I just joined The Ultimate Journey newsletter for weekly job-search signals. Join me at https://newsletter.thispagedoesnotexist12345.us/`;
    if (navigator.share) {
      navigator.share({ title: "The Ultimate Journey", text });
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
      referralCode: "",
      isVip: false,
      successfulReferrals: 0,
    });
    setErrors({});
  };

  const handleSaveEmailPreferences = (preferences: any) => {
    toast.success("Email preferences updated!");
    setShowEmailPreferences(false);
  };

  if (formState.submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-black to-slate-900 flex flex-col">
        {/* Header nav */}
        <header className="w-full flex items-center justify-between px-6 py-4 border-b border-cyan-500/20">
          <a
            href="https://newsletter.thispagedoesnotexist12345.us/"
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition font-mono text-sm"
            style={{ textShadow: "0 0 8px rgba(0,217,255,0.6)" }}
          >
            <Mail className="w-4 h-4" />
            newsletter.thispagedoesnotexist12345.us
          </a>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {/* Subscription Confirmation */}
            <div className="mb-8 animate-in slide-in-from-left duration-600">
              <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 p-8 backdrop-blur-xl">
                <div className="space-y-6">
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

                  <div className="border-b border-cyan-500/20 pb-4">
                    <div className="text-cyan-400 font-mono text-sm mb-2">SUBSCRIPTION CONFIRMED</div>
                    <h2 className="text-3xl font-bold text-white">
                      {formState.firstName || "Subscriber"}
                    </h2>
                    <p className="text-cyan-400/80 font-mono text-sm mt-1">{formState.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-cyan-400/60 text-xs font-mono mb-1">NEWSLETTER</p>
                      <p className="text-white font-bold">TUJ CAREER SIGNALS</p>
                    </div>
                    <div>
                      <p className="text-cyan-400/60 text-xs font-mono mb-1">CADENCE</p>
                      <p className="text-white font-bold">Weekly</p>
                    </div>
                    <div>
                      <p className="text-cyan-400/60 text-xs font-mono mb-1">QUEUE</p>
                      <p className="text-white font-bold">#{formState.queuePosition}</p>
                    </div>
                    <div>
                      <p className="text-cyan-400/60 text-xs font-mono mb-1">STATUS</p>
                      <p className="text-white font-bold">Subscribed</p>
                    </div>
                  </div>

                  <div className="bg-cyan-500/10 p-4 rounded border border-cyan-500/20">
                    <div className="font-mono text-xs text-cyan-400/60 text-center">
                      ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
                    <p className="text-green-300 font-semibold">Subscription received.</p>
                    <p className="text-foreground/70 text-sm mt-1">
                      Check your email to confirm your Signal subscription and start receiving weekly job-search guidance.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {formState.referralCode && (
              <ReferralInvite
                referralCode={formState.referralCode}
                isVip={formState.isVip || false}
                successfulReferrals={formState.successfulReferrals || 0}
                passengerName={formState.firstName || "Subscriber"}
              />
            )}

            {/* V3 Roadmap Teaser */}
            <div className="mb-6 animate-in fade-in duration-700">
              <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 p-6 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-purple-300 font-mono text-xs mb-1 uppercase tracking-widest">Coming in V3</p>
                    <h3 className="text-white font-bold text-lg mb-2">The Ultimate Journey Dashboard — Next Level</h3>
                    <p className="text-foreground/70 text-sm leading-relaxed">
                      V3 brings AI-powered job matching, one-click application tracking, and a supporter tier with early access to premium career tools.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  onClick={handleShare}
                  className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-semibold py-6 rounded-lg transition-all"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Invite Others
                </Button>
                <Button
                  onClick={() => setShowEmailPreferences(true)}
                  className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 font-semibold py-6 rounded-lg transition-all"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Email Preferences
                </Button>
              </div>
              <Button onClick={handleReset} variant="outline" className="w-full">
                Start Over
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full px-6 py-4 border-t border-cyan-500/20 text-center space-y-1">
          <a
            href="https://newsletter.thispagedoesnotexist12345.us/"
            className="block text-cyan-400/70 hover:text-cyan-400 text-sm transition font-mono"
          >
            TUJ Newsletter
          </a>
          <p className="text-foreground/40 text-xs font-mono">
            Weekly career signals from The Ultimate Journey.
          </p>
        </footer>

        {showEmailPreferences && (
          <EmailPreferences
            email={formState.email}
            onClose={() => setShowEmailPreferences(false)}
            onSave={handleSaveEmailPreferences}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-slate-900 flex flex-col">
      {/* Header nav */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-cyan-500/20">
        <a
          href="https://newsletter.thispagedoesnotexist12345.us/"
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition font-mono text-sm"
          style={{ textShadow: "0 0 8px rgba(0,217,255,0.6)" }}
        >
          <Mail className="w-4 h-4" />
          newsletter.thispagedoesnotexist12345.us
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Signal Header */}
          <div className="mb-12 text-center animate-in fade-in duration-700">
            <div className="inline-block mb-8 p-4 border-2 border-cyan-400/50 rounded-lg bg-cyan-500/10 backdrop-blur">
              <div className="text-cyan-400 font-mono text-sm mb-2">TUJ CAREER NEWSLETTER</div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Weekly signals to help you land your next role.
              </h1>
              <p className="text-cyan-400/80 font-mono text-sm mt-2">Practical job-search insight, delivered once a week.</p>
            </div>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Move faster with clearer
              <span className="block text-cyan-400">career signals</span>
            </h2>
            <p className="text-foreground/80 text-lg mb-6">
              Practical job-search insights for operators, builders, and career switchers using TUJ to move with more confidence.
            </p>
            <p className="text-cyan-400 font-semibold text-lg">One email a week. No spam. Unsubscribe anytime.</p>
          </div>

          {/* Signup Form */}
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 p-8 backdrop-blur-xl mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-foreground font-semibold mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formState.email}
                  onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-cyan-400 transition"
                />
                {errors.email && <p className="text-red-400 text-sm mt-2">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-2">
                  First Name <span className="text-foreground/40">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="John"
                  value={formState.firstName}
                  onChange={(e) => setFormState((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-foreground/60 text-sm mb-1">Subscribers receiving weekly signals</p>
                <p className="text-3xl font-bold text-cyan-400">{formState.totalPassengers}</p>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? "Processing..." : "Subscribe with supporter checkout ($0.01)"}
                </Button>
                <Button
                  type="button"
                  onClick={handleSkipPayment}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full py-3"
                >
                  {isLoading ? "Processing..." : "Subscribe free"}
                </Button>
              </div>
            </form>
          </Card>

          <div className="text-center text-foreground/60 text-sm">
            <p>Secure supporter checkout is powered by Stripe.</p>
            <p className="mt-2">Your email is used only for TUJ newsletter updates and preferences.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-6 py-4 border-t border-cyan-500/20 text-center space-y-1">
        <a
          href="https://newsletter.thispagedoesnotexist12345.us/"
          className="block text-cyan-400/70 hover:text-cyan-400 text-sm transition font-mono"
        >
          TUJ Newsletter
        </a>
        <p className="text-foreground/40 text-xs font-mono">
          Weekly career signals from The Ultimate Journey.
        </p>
      </footer>
    </div>
  );
}
