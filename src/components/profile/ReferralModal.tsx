"use client";

import React, { useState, useEffect } from "react";
import {
  Gift,
  Copy,
  CheckCircle2,
  Share2,
  Ticket,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { UserProfile, getCustomerProfile } from "@/services/userService";

export interface ReferralModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  userProfile?: UserProfile | null;
}

export function ReferralCard({ profile }: { profile?: UserProfile | null }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);

  const referralCode = profile?.referral_code || "ZEAL-CAMPUS";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://campusbite.in";
  const referralLink = `${origin}/register?ref=${referralCode}`;

  const shareText = `Hey! Order delicious food from campus eateries on CampusBite. Use my referral code *${referralCode}* to get ₹25 off your food order! Sign up here: ${referralLink}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyVoucher = (vCode: string) => {
    navigator.clipboard.writeText(vCode);
    setCopiedVoucher(vCode);
    toast.success(`Copied voucher ${vCode}! Apply at checkout.`);
    setTimeout(() => setCopiedVoucher(null), 2000);
  };

  const vouchers = profile?.referral_vouchers || [];

  return (
    <div className="overflow-hidden rounded-3xl border border-orange-200/90 bg-gradient-to-br from-orange-50 via-white to-amber-50/60 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-2xl text-white shadow-sm shadow-orange-500/30">
            🎁
          </div>
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">
              <Sparkles className="h-3 w-3 text-orange-600" />
              Student Referral Advantage
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Refer & Earn ₹25
            </h2>
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
        Share your referral code with your campus friends and hostel wingmates. When they complete their first order, you automatically receive a ₹25 food voucher in your account!
      </p>

      {/* Code Display & Copy Box */}
      <div className="rounded-2xl border border-dashed border-orange-300 bg-white p-4 mb-5 shadow-xs">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Your Unique Referral Code
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-orange-600">
            {referralCode}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            {copiedCode ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {/* Copy Referral Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white hover:bg-orange-50/80 px-4 py-2.5 text-xs font-bold text-gray-800 shadow-xs transition active:scale-95 cursor-pointer"
        >
          {copiedLink ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Share2 className="h-4 w-4 text-orange-600" />
          )}
          <span>{copiedLink ? "Link Copied!" : "Copy Referral Link"}</span>
        </button>

        {/* WhatsApp Share */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
        >
          <span className="text-sm">💬</span>
          <span>Share on WhatsApp</span>
        </a>
      </div>

      {/* Earned Vouchers Section */}
      {vouchers.length > 0 ? (
        <div className="border-t border-orange-200/70 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Ticket className="h-4 w-4 text-orange-600" />
              Your Earned Vouchers ({vouchers.length})
            </h3>
            <span className="text-xs text-orange-700 font-bold">
              ₹{vouchers.reduce((s, v) => s + (v.amount || 0), 0)} Total
            </span>
          </div>

          <div className="space-y-2">
            {vouchers.map((voucher, idx) => (
              <div
                key={voucher.code || idx}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black tracking-wider text-stone-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {voucher.code}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    ₹{voucher.amount} OFF
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyVoucher(voucher.code)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  {copiedVoucher === voucher.code ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-orange-200/70 pt-4 flex items-center gap-2 text-xs text-gray-500">
          <Users className="h-4 w-4 text-orange-400 shrink-0" />
          <span>Invite your friends to earn your first ₹25 voucher reward!</span>
        </div>
      )}
    </div>
  );
}

export function ReferralModal({ isOpen, onClose, userProfile }: ReferralModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(userProfile || null);

  useEffect(() => {
    if (isOpen && !profile) {
      getCustomerProfile()
        .then((p) => setProfile(p))
        .catch(() => {});
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-2 sm:p-4">
          <ReferralCard profile={profile} />
        </div>
      </div>
    </div>
  );
}

export default ReferralCard;
