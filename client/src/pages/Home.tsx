import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Plane, Users, Share2 } from "lucide-react";

/**
 * Newsletter Waitlist Landing Page
 * 
 * Design: Retro-Futuristic Airport Terminal
 * - Departure board aesthetic with flip-text animations
 * - Glassmorphic form cards with cyan neon accents
 * - Aviation-themed boarding pass confirmation
 * - Real-time queue position tracking
 */

interface FormState {
  email: string;
  firstName: string;
  submitted: boolean;
  queuePosition: number;
  totalPassengers: number;
}

export default function Home() {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    firstName: "",
    submitted: false,
    queuePosition: 0,
    totalPassengers: 247,
  });

  const [errors, setErrors] = useState<{ email?: string }>({});

  // Simulate queue position assignment
  useEffect(() => {
    if (formState.submitted) {
      // Simulate API call to get queue position
      const newPosition = formState.totalPassengers + 1;
      setFormState((prev) => ({
        ...prev,
        queuePosition: newPosition,
        totalPassengers: newPosition,
      }));
    }
  }, [formState.submitted]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    // Check localStorage for duplicate
    const storedEmail = localStorage.getItem("newsletter-email");
    if (storedEmail === formState.email) {
      setErrors({ email: "You're already on the waitlist!" });
      return;
    }

    // Save to localStorage
    localStorage.setItem("newsletter-email", formState.email);
    localStorage.setItem("newsletter-name", formState.firstName);

    setErrors({});
    setFormState((prev) => ({ ...prev, submitted: true }));
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
      alert("Link copied to clipboard!");
    }
  };

  if (formState.submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-black to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Boarding Pass */}
          <div className="mb-8 animate-in slide-in-from-left duration-600">
            <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 p-8 backdrop-blur-xl">
              <div className="space-y-6">
                {/* Boarding Pass Header */}
                <div className="border-b border-cyan-500/20 pb-4">
                  <div className="text-cyan-400 font-mono text-sm mb-2">BOARDING PASS</div>
                  <h2 className="text-3xl font-bold text-white">
                    {formState.firstName || "Passenger"}
                  </h2>
                  <p className="text-cyan-400/80 font-mono text-sm mt-1">
                    Flight: ULTIMATE-JOURNEY-2026
                  </p>
                </div>

                {/* Passenger Details */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-white/50 text-xs font-mono mb-1">PASSENGER NO.</p>
                    <p className="text-2xl font-bold text-cyan-400">
                      #{formState.queuePosition}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs font-mono mb-1">STATUS</p>
                    <p className="text-2xl font-bold text-cyan-400">PRE-BOARDING</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs font-mono mb-1">DEPARTURE</p>
                    <p className="text-lg font-mono text-white">March 2026</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs font-mono mb-1">EMAIL</p>
                    <p className="text-sm font-mono text-white break-all">
                      {formState.email}
                    </p>
                  </div>
                </div>

                {/* Queue Info */}
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded p-4">
                  <p className="text-white/80 text-sm">
                    You're passenger <span className="text-cyan-400 font-bold">#{formState.queuePosition}</span> waiting to board.
                  </p>
                  <p className="text-white/60 text-xs mt-2">
                    Estimated departure: March 2026. We'll send you early access when we launch!
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={handleShare}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6 py-2 flex items-center gap-2"
            >
              <Share2 size={18} />
              Invite Others
            </Button>
            <Button
              onClick={() => {
                setFormState({
                  email: "",
                  firstName: "",
                  submitted: false,
                  queuePosition: 0,
                  totalPassengers: formState.totalPassengers,
                });
              }}
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-semibold px-6 py-2"
            >
              Add Another Email
            </Button>
          </div>

          {/* Progress Stats */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users size={20} className="text-cyan-400" />
                <span className="text-white/80">Total Passengers Ready to Board</span>
              </div>
              <p className="text-4xl font-bold text-cyan-400">
                {formState.totalPassengers}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Hero Section */}
      <div className="w-full max-w-2xl mb-12 text-center">
        {/* Departure Board */}
        <div className="mb-8 inline-block bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-xl">
          <div className="font-mono text-cyan-400 text-sm mb-4 tracking-widest">
            DEPARTURE BOARD
          </div>
          <div className="text-cyan-400 font-mono text-xl mb-2 animate-pulse">
            FLIGHT STATUS: PRE-BOARDING
          </div>
          <div className="text-white/60 font-mono text-xs">
            Gate Opening Soon
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Your Flight is Preparing for <span className="text-cyan-400">Departure</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-white/70 mb-8">
          Join the pre-boarding list and be first to receive career navigation insights. 
          <span className="block text-cyan-400/80 mt-2">
            Get your boarding pass today.
          </span>
        </p>

        {/* Airplane Icon */}
        <div className="flex justify-center mb-12">
          <div className="relative w-16 h-16 animate-bounce">
            <Plane className="w-full h-full text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Signup Form */}
      <div className="w-full max-w-md">
        <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/30 p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Email Address *
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={formState.email}
                onChange={(e) => {
                  setFormState({ ...formState, email: e.target.value });
                  if (errors.email) setErrors({});
                }}
                className="bg-white/5 border-cyan-500/30 text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-2">{errors.email}</p>
              )}
            </div>

            {/* First Name Input */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                First Name (Optional)
              </label>
              <Input
                type="text"
                placeholder="John"
                value={formState.firstName}
                onChange={(e) =>
                  setFormState({ ...formState, firstName: e.target.value })
                }
                className="bg-white/5 border-cyan-500/30 text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black font-bold py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50"
            >
              Get My Boarding Pass
            </Button>

            {/* Privacy Notice */}
            <p className="text-xs text-white/50 text-center">
              We respect your privacy. Unsubscribe anytime.{" "}
              <a href="#" className="text-cyan-400 hover:text-cyan-300">
                Privacy Policy
              </a>
            </p>
          </form>
        </Card>

        {/* Queue Counter */}
        <div className="mt-8 text-center">
          <div className="inline-block bg-cyan-500/5 border border-cyan-500/20 rounded-full px-6 py-3">
            <p className="text-white/60 text-sm">
              <span className="text-cyan-400 font-bold text-lg">
                {formState.totalPassengers}
              </span>
              <span className="ml-2">passengers ready to board</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-white/40 text-sm">
        <p>
          © 2026 The Ultimate Journey |{" "}
          <a href="#" className="text-cyan-400/60 hover:text-cyan-400">
            Terms
          </a>{" "}
          |{" "}
          <a href="#" className="text-cyan-400/60 hover:text-cyan-400">
            Privacy
          </a>
        </p>
      </div>
    </div>
  );
}
