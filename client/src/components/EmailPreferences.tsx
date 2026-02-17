import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Bell, Trash2, X } from "lucide-react";

interface EmailPreferencesProps {
  email: string;
  onClose: () => void;
  onSave: (preferences: {
    emailFrequency: "daily" | "weekly" | "biweekly";
    receivePromotional: boolean;
    receiveProductUpdates: boolean;
  }) => void;
}

export function EmailPreferences({ email, onClose, onSave }: EmailPreferencesProps) {
  const [emailFrequency, setEmailFrequency] = useState<"daily" | "weekly" | "biweekly">("weekly");
  const [receivePromotional, setReceivePromotional] = useState(true);
  const [receiveProductUpdates, setReceiveProductUpdates] = useState(true);
  const [showUnsubscribe, setShowUnsubscribe] = useState(false);

  const handleSave = () => {
    onSave({
      emailFrequency,
      receivePromotional,
      receiveProductUpdates,
    });
  };

  const handleUnsubscribe = () => {
    // In a real app, this would call an API to unsubscribe
    onSave({
      emailFrequency: "weekly",
      receivePromotional: false,
      receiveProductUpdates: false,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-cyan-400" />
              <h2 className="text-2xl font-bold text-foreground">Email Preferences</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-cyan-500/20 rounded-lg transition"
            >
              <X className="w-5 h-5 text-foreground/60" />
            </button>
          </div>

          {/* Email Address */}
          <p className="text-foreground/60 text-sm mb-6">
            Preferences for: <span className="text-cyan-400 font-semibold">{email}</span>
          </p>

          {!showUnsubscribe ? (
            <>
              {/* Email Frequency */}
              <div className="mb-6">
                <label className="block text-foreground font-semibold mb-3">Email Frequency</label>
                <div className="space-y-2">
                  {["daily", "weekly", "biweekly"].map((freq) => (
                    <label key={freq} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="frequency"
                        value={freq}
                        checked={emailFrequency === freq}
                        onChange={(e) => setEmailFrequency(e.target.value as any)}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-foreground capitalize">{freq}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Promotional Emails */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receivePromotional}
                    onChange={(e) => setReceivePromotional(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400"
                  />
                  <div>
                    <p className="text-foreground font-semibold">Promotional Emails</p>
                    <p className="text-foreground/60 text-sm">Exclusive offers and special deals</p>
                  </div>
                </label>
              </div>

              {/* Product Updates */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiveProductUpdates}
                    onChange={(e) => setReceiveProductUpdates(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400"
                  />
                  <div>
                    <p className="text-foreground font-semibold">Product Updates</p>
                    <p className="text-foreground/60 text-sm">New features and announcements</p>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                >
                  Save Preferences
                </Button>
              </div>

              {/* Unsubscribe Link */}
              <button
                onClick={() => setShowUnsubscribe(true)}
                className="w-full mt-4 text-foreground/60 hover:text-foreground/80 text-sm transition"
              >
                Want to unsubscribe from all emails?
              </button>
            </>
          ) : (
            <>
              {/* Unsubscribe Confirmation */}
              <div className="mb-6">
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <p className="text-foreground text-sm">
                    You're about to unsubscribe from all emails. You can resubscribe anytime by updating your preferences.
                  </p>
                </div>

                <p className="text-foreground/60 text-sm mb-6">
                  Are you sure you want to unsubscribe from all emails?
                </p>
              </div>

              {/* Unsubscribe Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUnsubscribe(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUnsubscribe}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Unsubscribe
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
