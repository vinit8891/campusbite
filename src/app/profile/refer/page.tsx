"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { UserProfile, getCustomerProfile } from "@/services/userService";
import { ReferralCard } from "@/components/profile/ReferralModal";
import { ROUTES } from "@/lib/routes";

export default function ReferPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerProfile()
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href={ROUTES.PROFILE}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-orange-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Profile</span>
        </Link>

        {loading ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto mb-2" />
            Loading referral details...
          </div>
        ) : (
          <ReferralCard profile={profile} />
        )}
      </div>
    </main>
  );
}
