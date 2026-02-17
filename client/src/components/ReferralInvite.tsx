import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share2, Copy, Check, Users, Crown } from "lucide-react";
import { toast } from "sonner";

interface ReferralInviteProps {
  referralCode: string;
  isVip: boolean;
  successfulReferrals: number;
  passengerName: string;
}

export function ReferralInvite({
  referralCode,
  isVip,
  successfulReferrals,
  passengerName,
}: ReferralInviteProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = `https://newsletter.thispagedoesnotexist12345.us?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `Join me on The Ultimate Journey! I'm passenger #${successfulReferrals + 1}. Use my referral link to get early access: ${referralLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "The Ultimate Journey",
          text: shareText,
          url: referralLink,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 mb-6">
      {/* VIP Badge */}
      {isVip && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <Crown className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-semibold text-sm">VIP Member</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-bold text-foreground">Invite Friends & Earn VIP Status</h3>
      </div>

      {/* Description */}
      <p className="text-foreground/80 text-sm mb-4">
        Share your referral link with friends. When they join, you'll automatically become a VIP member with exclusive benefits!
      </p>

      {/* Referral Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-black/40 rounded-lg border border-purple-500/20">
          <p className="text-foreground/60 text-xs mb-1">Successful Referrals</p>
          <p className="text-2xl font-bold text-purple-400">{successfulReferrals}</p>
        </div>
        <div className="p-3 bg-black/40 rounded-lg border border-purple-500/20">
          <p className="text-foreground/60 text-xs mb-1">Your Status</p>
          <p className="text-lg font-bold text-purple-400">{isVip ? "VIP ⭐" : "Standard"}</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="mb-6">
        <label className="block text-foreground/80 text-sm font-semibold mb-2">Your Referral Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralCode}
            readOnly
            className="flex-1 px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-cyan-400 font-mono text-sm"
          />
          <Button
            onClick={handleCopyLink}
            size="sm"
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleShare}
          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share with Friends
        </Button>
      </div>

      {/* How It Works */}
      <div className="mt-6 p-4 bg-black/40 rounded-lg border border-purple-500/20">
        <p className="text-foreground/80 text-xs font-semibold mb-2">How It Works:</p>
        <ol className="text-foreground/60 text-xs space-y-1">
          <li>1. Share your referral link with friends</li>
          <li>2. They sign up using your link</li>
          <li>3. You automatically become VIP</li>
          <li>4. Unlock exclusive VIP benefits</li>
        </ol>
      </div>
    </Card>
  );
}
