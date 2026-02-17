import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Mail, TrendingUp, Eye } from "lucide-react";

interface SubscriberMetrics {
  totalSubscribers: number;
  paidSubscribers: number;
  skippedPayment: number;
  emailsSent: number;
  emailsOpened: number;
  conversionRate: number;
}

interface Subscriber {
  id: number;
  email: string;
  firstName: string | null;
  queuePosition: number;
  paymentStatus: "pending" | "completed" | "failed" | "skipped";
  createdAt: Date;
}

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<SubscriberMetrics | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-foreground/80 mb-4">
            You don't have permission to access the admin dashboard.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    // Simulate fetching metrics and subscribers
    // In a real app, this would be a tRPC query
    const mockMetrics: SubscriberMetrics = {
      totalSubscribers: 248,
      paidSubscribers: 180,
      skippedPayment: 68,
      emailsSent: 496, // 248 subscribers × 2 emails sent so far
      emailsOpened: 392, // 79% open rate
      conversionRate: 72.6, // 180 / 248
    };

    const mockSubscribers: Subscriber[] = [
      {
        id: 1,
        email: "test@example.com",
        firstName: "John",
        queuePosition: 248,
        paymentStatus: "completed",
        createdAt: new Date(),
      },
      {
        id: 2,
        email: "jane@example.com",
        firstName: "Jane",
        queuePosition: 247,
        paymentStatus: "skipped",
        createdAt: new Date(),
      },
    ];

    setMetrics(mockMetrics);
    setSubscribers(mockSubscribers);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground/80">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Newsletter Admin Dashboard
          </h1>
          <p className="text-foreground/60">
            Manage subscribers and track email campaign performance
          </p>
        </div>

        {/* Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Subscribers */}
            <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/60 text-sm mb-2">Total Subscribers</p>
                  <p className="text-3xl font-bold text-cyan-400">{metrics.totalSubscribers}</p>
                </div>
                <Users className="w-8 h-8 text-cyan-400 opacity-50" />
              </div>
            </Card>

            {/* Paid Subscribers */}
            <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/60 text-sm mb-2">Paid Subscribers</p>
                  <p className="text-3xl font-bold text-green-400">{metrics.paidSubscribers}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </Card>

            {/* Emails Sent */}
            <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/60 text-sm mb-2">Emails Sent</p>
                  <p className="text-3xl font-bold text-purple-400">{metrics.emailsSent}</p>
                </div>
                <Mail className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
            </Card>

            {/* Open Rate */}
            <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/60 text-sm mb-2">Open Rate</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {((metrics.emailsOpened / metrics.emailsSent) * 100).toFixed(1)}%
                  </p>
                </div>
                <Eye className="w-8 h-8 text-orange-400 opacity-50" />
              </div>
            </Card>
          </div>
        )}

        {/* Subscribers Table */}
        <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <h2 className="text-2xl font-bold text-foreground mb-6">Recent Subscribers</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th className="text-left py-3 px-4 text-foreground/80 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-foreground/80 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-foreground/80 font-semibold">Queue Position</th>
                  <th className="text-left py-3 px-4 text-foreground/80 font-semibold">Payment Status</th>
                  <th className="text-left py-3 px-4 text-foreground/80 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-b border-cyan-500/10 hover:bg-cyan-500/5">
                    <td className="py-3 px-4 text-foreground">{subscriber.email}</td>
                    <td className="py-3 px-4 text-foreground">{subscriber.firstName || "-"}</td>
                    <td className="py-3 px-4 text-foreground">#{subscriber.queuePosition}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          subscriber.paymentStatus === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : subscriber.paymentStatus === "skipped"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {subscriber.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground/60 text-sm">
                      {subscriber.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Email Sequence Status */}
        <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30 mt-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Email Sequence Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-black/40 rounded-lg border border-cyan-500/20">
              <p className="text-foreground/60 text-sm mb-2">Day 1: Welcome</p>
              <p className="text-cyan-400 font-semibold">248 sent</p>
              <p className="text-foreground/40 text-xs mt-1">79% open rate</p>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-cyan-500/20">
              <p className="text-foreground/60 text-sm mb-2">Day 3: Content Preview</p>
              <p className="text-cyan-400 font-semibold">248 sent</p>
              <p className="text-foreground/40 text-xs mt-1">Pending opens</p>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-cyan-500/20">
              <p className="text-foreground/60 text-sm mb-2">Day 7: Boarding Reminder</p>
              <p className="text-foreground/40 font-semibold">Scheduled</p>
              <p className="text-foreground/40 text-xs mt-1">Sends in 4 days</p>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-cyan-500/20">
              <p className="text-foreground/60 text-sm mb-2">Day 14: Exclusive Offer</p>
              <p className="text-foreground/40 font-semibold">Scheduled</p>
              <p className="text-foreground/40 text-xs mt-1">Sends in 11 days</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
