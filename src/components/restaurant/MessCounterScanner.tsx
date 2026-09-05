"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  QrCode,
  Calculator,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Delete,
  Volume2,
  VolumeX,
  Sparkles,
  Camera,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  redeemSubscriptionMeal,
  getMessCounterSummary,
  type MealRedemptionResult,
  type MessCounterSummary,
} from "@/services/subscriptionService";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";

export function playSuccessChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880.0, now + 0.1); // A5

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.4);
  } catch {
    // Audio synthesis fallback
  }
}

export function playErrorBuzz() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(160, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Audio synthesis fallback
  }
}

export interface MessCounterScannerProps {
  initialSummary?: MessCounterSummary | null;
  restaurantEmail?: string;
}

export function MessCounterScanner({
  initialSummary,
  restaurantEmail: propRestaurantEmail,
}: MessCounterScannerProps) {
  const [mode, setMode] = useState<"keypad" | "scanner">("keypad");
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<MealRedemptionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [summary, setSummary] = useState<MessCounterSummary | null>(
    initialSummary || null
  );
  const [recentRedemptions, setRecentRedemptions] = useState<
    MealRedemptionResult[]
  >([]);

  const restaurantEmail = propRestaurantEmail || getRestaurantOwnerEmail();

  const loadSummary = async () => {
    try {
      const data = await getMessCounterSummary();
      setSummary(data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const handleKeyPress = (num: string) => {
    if (tokenInput.length < 8) {
      setTokenInput((prev) => prev + num);
      setErrorMessage("");
      setLastResult(null);
    }
  };

  const handleBackspace = () => {
    setTokenInput((prev) => prev.slice(0, -1));
    setErrorMessage("");
  };

  const handleClear = () => {
    setTokenInput("");
    setErrorMessage("");
    setLastResult(null);
  };

  const handleRedeem = async (tokenToUse?: string) => {
    const raw = tokenToUse || tokenInput;
    if (!raw.trim()) {
      setErrorMessage("Please enter a 4-digit token or scan a QR pass");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setLastResult(null);

    try {
      const result = await redeemSubscriptionMeal({
        token: raw.trim(),
        restaurant_email: restaurantEmail || undefined,
      });

      setLastResult(result);
      setRecentRedemptions((prev) => [result, ...prev.slice(0, 9)]);
      setTokenInput("");

      if (audioEnabled) {
        playSuccessChime();
      }

      toast.success(
        `✅ ${result.customer_name} marked as served (${result.plan_name})`
      );

      // Refresh counter stats
      void loadSummary();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Redemption failed";
      setErrorMessage(msg);
      if (audioEnabled) {
        playErrorBuzz();
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner: Today's Serving Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">
              🍛 Meals Served Today
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-stone-900">
              {summary?.meals_served ?? recentRedemptions.length}
            </span>
            <span className="text-xs font-semibold text-stone-500">
              / {summary?.total_subscribers ? `${summary.total_subscribers} active` : "Headcount"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-black uppercase tracking-wider text-stone-500">
            ⏰ Current Window
          </span>
          <p className="mt-2 text-xl font-bold text-stone-900">
            Lunch Service
          </p>
          <span className="text-xs text-stone-500 font-medium">
            12:00 PM – 3:00 PM
          </span>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-stone-500">
              Audio Feedback
            </span>
            <p className="mt-1 text-sm font-bold text-stone-900">
              {audioEnabled ? "Chime Enabled" : "Muted"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAudioEnabled((v) => !v)}
            aria-label="Toggle redemption audio chime"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            {audioEnabled ? (
              <Volume2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <VolumeX className="h-5 w-5 text-stone-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main Counter Interface: Keypad / Scanner Tabs */}
      <div className="rounded-3xl border border-stone-200/80 bg-white shadow-md overflow-hidden">
        {/* Tab Controls */}
        <div className="flex border-b border-stone-200 bg-stone-50/70 p-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("keypad")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              mode === "keypad"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200/80"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calculator className="h-4 w-4 text-orange-600" />
            <span>Quick Keypad Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("scanner")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              mode === "scanner"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200/80"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <QrCode className="h-4 w-4 text-orange-600" />
            <span>QR Code Scanner</span>
          </button>
        </div>

        <div className="p-6 md:p-8">
          {/* Status Feedback Banners */}
          {lastResult && (
            <div data-testid="redemption-success-banner" className="mb-6 animate-in fade-in slide-in-from-top-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 flex items-center gap-3.5 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-emerald-950 truncate">
                  ✅ Valid Token: {lastResult.customer_name} • {lastResult.meal_type} Thali [Marked as Served]
                </p>
                <p className="text-xs text-emerald-800 font-medium">
                  {lastResult.plan_name} • {lastResult.message || "Meal successfully redeemed!"}
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-emerald-200/60 px-2 py-1 rounded-md text-emerald-900">
                {lastResult.redeemed_at.includes("T")
                  ? new Date(lastResult.redeemed_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : lastResult.redeemed_at}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 flex items-center gap-3.5 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rose-950">
                  Verification Failed
                </p>
                <p className="text-xs text-rose-800 font-medium">
                  {errorMessage}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClear}
                className="h-8 text-xs border-rose-200 text-rose-800 hover:bg-rose-100"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Mode 1: Keypad Lookup */}
          {mode === "keypad" && (
            <div className="max-w-md mx-auto space-y-6">
              {/* Display Input Window */}
              <div className="flex flex-col items-center justify-center rounded-3xl bg-stone-900 text-white p-6 shadow-inner relative">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Enter 4-Digit Token or Student Phone
                </span>
                <div className="h-14 w-full flex items-center justify-center">
                  <input
                    data-testid="keypad-display-input"
                    type="text"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      setErrorMessage("");
                      setLastResult(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tokenInput.trim()) {
                        void handleRedeem();
                      }
                    }}
                    placeholder="— — — —"
                    className="w-full text-center text-3xl sm:text-4xl font-black font-mono tracking-widest text-amber-400 bg-transparent border-none focus:outline-none placeholder:text-stone-600"
                  />
                </div>
              </div>

              {/* Oversized Touch Keypad */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeyPress(digit)}
                    className="flex h-16 sm:h-18 items-center justify-center rounded-2xl border border-stone-200/90 bg-stone-50/80 text-2xl sm:text-3xl font-black text-stone-900 hover:bg-amber-500 hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}

                {/* Bottom Row */}
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear token input"
                  className="flex h-16 sm:h-18 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-200 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleKeyPress("0")}
                  className="flex h-16 sm:h-18 items-center justify-center rounded-2xl border border-stone-200/90 bg-stone-50/80 text-2xl sm:text-3xl font-black text-stone-900 hover:bg-amber-500 hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Backspace token input"
                  className="flex h-16 sm:h-18 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 active:scale-95 transition-all cursor-pointer"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={() => handleRedeem()}
                disabled={loading || !tokenInput.trim()}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-base shadow-lg shadow-orange-950/20 active:scale-98 transition-all cursor-pointer"
              >
                {loading ? "Verifying Token..." : "⚡ Verify & Serve Meal"}
              </Button>
            </div>
          )}

          {/* Mode 2: Camera QR Scanner Frame */}
          {mode === "scanner" && (
            <div className="max-w-md mx-auto space-y-6 text-center">
              <div className="relative mx-auto flex h-72 w-full max-w-xs flex-col items-center justify-center rounded-3xl border-4 border-dashed border-orange-500/60 bg-stone-900 text-white overflow-hidden shadow-xl p-4">
                {/* Visual Camera Scan Target */}
                <div className="relative h-48 w-48 rounded-2xl border-2 border-amber-400 p-3 flex flex-col items-center justify-center">
                  <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1" />
                  <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1" />
                  <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1" />
                  <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1" />

                  <Camera className="h-12 w-12 text-amber-400 animate-pulse mb-2" />
                  <span className="text-[11px] font-bold text-stone-300">
                    Align Student QR Here
                  </span>

                  {/* Animated Scan Line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-bounce" />
                </div>
              </div>

              {/* Quick Simulator Buttons for Web Testing */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2 text-left">
                <span className="text-xs font-bold text-stone-700 block">
                  🧪 Scanner Simulation / Quick Tokens:
                </span>
                <div className="flex flex-wrap gap-2">
                  {["#4821", "#7310", "#9924", "9876543210"].map((simToken) => (
                    <button
                      key={simToken}
                      type="button"
                      onClick={() => handleRedeem(simToken)}
                      className="py-1.5 px-3 rounded-xl bg-white border border-stone-300 text-xs font-mono font-bold text-stone-800 hover:border-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                    >
                      Scan {simToken}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Redemptions Stream */}
      {recentRedemptions.length > 0 && (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-900 border-b border-stone-100 pb-3">
            <History className="h-4 w-4 text-orange-600" />
            <span>Live Redemption Stream ({recentRedemptions.length} Meals Checked In)</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentRedemptions.map((item, idx) => (
              <div
                key={`${item.customer_email}-${idx}`}
                className="flex items-center justify-between rounded-xl bg-stone-50 p-3 border border-stone-200/70 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    ✓
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-stone-900 block truncate">
                      {item.customer_name}
                    </span>
                    <span className="text-[11px] text-stone-500 truncate block">
                      {item.plan_name} • {item.customer_email}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-stone-600 font-semibold shrink-0">
                  {item.redeemed_at.includes("T")
                    ? new Date(item.redeemed_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : item.redeemed_at}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MessCounterScanner;
