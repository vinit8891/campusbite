"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Bike,
  Building2,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourierShiftSlot, CourierShiftReservation } from "@/types";
import {
  getMessShiftSlots,
  reserveMessShift,
  getMyMessShifts,
  cancelMessShift,
} from "@/services/subscriptionService";

export interface MessShiftRosterProps {
  courierPhone?: string;
  isOnline?: boolean;
}

export function MessShiftRoster({
  courierPhone,
  isOnline = true,
}: MessShiftRosterProps) {
  const [selectedDate, setSelectedDate] = useState<"today" | "tomorrow">("today");
  const [slots, setSlots] = useState<CourierShiftSlot[]>([]);
  const [myReservations, setMyReservations] = useState<CourierShiftReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const targetDateStr = selectedDate === "today" ? todayStr : tomorrowStr;

  const loadData = async () => {
    setLoading(true);
    try {
      const [slotsRes, myRes] = await Promise.all([
        getMessShiftSlots(targetDateStr),
        getMyMessShifts(),
      ]);
      setSlots(slotsRes.items || []);
      setMyReservations(myRes.items || []);
    } catch {
      // Offline fallback mock data for testing
      setSlots([
        {
          wave_slot_id: "LUNCH_WAVE_1",
          label: "Lunch Wave 1 (1:00 PM)",
          delivery_window: "12:45 PM – 1:15 PM",
          shift_date: targetDateStr,
          cutoff_time: "12:30 IST",
          minutes_until_cutoff: 35,
          is_past_cutoff: false,
          guaranteed_base_payout: 20.0,
          addon_payout_per_order: 10.0,
          expected_payout_range: "₹20 – ₹60",
          capacity: 5,
          reserved_count: 2,
          is_available: true,
          is_reserved_by_me: false,
          status: "AVAILABLE",
        },
        {
          wave_slot_id: "LUNCH_WAVE_2",
          label: "Lunch Wave 2 (1:30 PM)",
          delivery_window: "1:15 PM – 1:45 PM",
          shift_date: targetDateStr,
          cutoff_time: "13:00 IST",
          minutes_until_cutoff: 65,
          is_past_cutoff: false,
          guaranteed_base_payout: 20.0,
          addon_payout_per_order: 10.0,
          expected_payout_range: "₹20 – ₹60",
          capacity: 5,
          reserved_count: 1,
          is_available: true,
          is_reserved_by_me: false,
          status: "AVAILABLE",
        },
        {
          wave_slot_id: "DINNER_WAVE_1",
          label: "Dinner Wave 1 (8:15 PM)",
          delivery_window: "8:00 PM – 8:30 PM",
          shift_date: targetDateStr,
          cutoff_time: "19:45 IST",
          minutes_until_cutoff: 240,
          is_past_cutoff: false,
          guaranteed_base_payout: 20.0,
          addon_payout_per_order: 10.0,
          expected_payout_range: "₹20 – ₹70",
          capacity: 5,
          reserved_count: 3,
          is_available: true,
          is_reserved_by_me: false,
          status: "AVAILABLE",
        },
        {
          wave_slot_id: "DINNER_WAVE_2",
          label: "Dinner Wave 2 (9:00 PM)",
          delivery_window: "8:45 PM – 9:15 PM",
          shift_date: targetDateStr,
          cutoff_time: "20:30 IST",
          minutes_until_cutoff: 285,
          is_past_cutoff: false,
          guaranteed_base_payout: 20.0,
          addon_payout_per_order: 10.0,
          expected_payout_range: "₹20 – ₹70",
          capacity: 5,
          reserved_count: 0,
          is_available: true,
          is_reserved_by_me: false,
          status: "AVAILABLE",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedDate]);

  const handleReserve = async (slotId: string) => {
    setBusySlotId(slotId);
    try {
      const res = await reserveMessShift({
        wave_slot_id: slotId,
        shift_date: targetDateStr,
      });
      toast.success(res.message || "Shift run claimed successfully! 🛵");
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim shift");
    } finally {
      setBusySlotId(null);
    }
  };

  const handleCancel = async (resId: string) => {
    if (!window.confirm("Release this shift reservation?")) return;
    try {
      await cancelMessShift(resId);
      toast.success("Shift reservation released");
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to release shift");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner: Guaranteed Payout Formula */}
      <div className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs">
                <Sparkles className="h-3 w-3" />
                Guaranteed Wave Pay
              </span>
              <span className="text-xs font-bold text-amber-100">
                • Clustered Lobby Runs
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Hostel Mess Wave Shift Roster
            </h2>
            <p className="text-xs text-amber-100 max-w-xl">
              Claim lunch and dinner lobby batches ahead of time. Earn guaranteed ₹20 base + ₹10 per order add-on per hostel block.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-stone-950/40 p-4 border border-white/20 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black text-lg shadow-sm">
              ₹20
            </div>
            <div>
              <span className="text-xs font-black block">+ ₹10/Order Add-On</span>
              <span className="text-[10px] text-amber-200 block">
                Up to ₹60 – ₹100 per 20-min wave
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Online Status Reminder */}
      {!isOnline && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-300 p-4 text-xs text-amber-900 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold block">
              ⚠️ You are currently Offline (Off Duty)
            </span>
            <span className="text-amber-800">
              Remember to switch to <strong>Online</strong> at least 20 minutes before your scheduled wave (T-20 cutoff) to avoid reservation auto-release.
            </span>
          </div>
        </div>
      )}

      {/* Date Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate("today")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDate === "today"
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            📅 Today ({todayStr})
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate("tomorrow")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDate === "tomorrow"
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            ⏭️ Tomorrow ({tomorrowStr})
          </button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => void loadData()}
          className="h-8 gap-1 text-xs border-stone-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Active Shift Slots Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-600" />
          <h3 className="text-sm font-bold text-stone-900">
            Available Wave Shifts for {selectedDate === "today" ? "Today" : "Tomorrow"}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slots.map((slot) => {
            const isReserved = slot.is_reserved_by_me;
            const isBusy = busySlotId === slot.wave_slot_id;

            return (
              <div
                key={slot.wave_slot_id}
                data-testid={`shift-card-${slot.wave_slot_id}`}
                className={`rounded-2xl border p-5 transition-all shadow-xs space-y-4 ${
                  isReserved
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-orange-600 uppercase">
                        {slot.label}
                      </span>
                      {isReserved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          CONFIRMED
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-stone-900 mt-0.5">
                      {slot.delivery_window}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-stone-900 block">
                      {slot.expected_payout_range}
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      Guaranteed Rate
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 rounded-xl p-3 border border-stone-200/80">
                  <div>
                    <span className="text-[10px] font-medium text-stone-500 block">
                      Kitchen Cutoff
                    </span>
                    <span className="font-bold text-stone-800">
                      {slot.cutoff_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-stone-500 block">
                      Rider Capacity
                    </span>
                    <span className="font-bold text-stone-800">
                      {slot.reserved_count} / {slot.capacity} Claimed
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-600 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-stone-400" />
                    <span>Hostel Lobby Clusters</span>
                  </div>

                  {isReserved ? (
                    <span className="text-xs font-bold text-emerald-700">
                      ✓ Reserved for you
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      data-testid={`btn-claim-${slot.wave_slot_id}`}
                      disabled={!slot.is_available || isBusy}
                      onClick={() => handleReserve(slot.wave_slot_id)}
                      className="h-9 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      {isBusy ? "Claiming..." : slot.is_available ? "Claim Shift" : "Slot Full"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Reserved Shifts Stream */}
      {myReservations.length > 0 && (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Bike className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-bold text-stone-900">
              My Active Shift Reservations ({myReservations.length})
            </h3>
          </div>

          <div className="space-y-3">
            {myReservations.map((res) => (
              <div
                key={res.reservation_id}
                className="flex items-center justify-between rounded-2xl bg-stone-50 p-4 border border-stone-200/80 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">
                      {res.slot_label} ({res.shift_date})
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                      {res.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Window: {res.delivery_window} • Guaranteed Base: ₹{res.base_payout} + ₹{res.addon_payout}/drop
                  </p>
                </div>

                {res.status === "CONFIRMED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancel(res.reservation_id)}
                    className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Release Slot
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MessShiftRoster;
