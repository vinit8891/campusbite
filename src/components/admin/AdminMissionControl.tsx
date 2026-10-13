"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Power,
  Store,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import {
  getSystemConfig,
  updateSystemConfig,
  toggleCanteenStatusAdmin,
  getPendingPartnersAdmin,
  getBackendHealth,
  type SystemConfig,
  type BackendHealth,
} from "@/services/adminService";
import { getRestaurants, type BackendRestaurant } from "@/services/restaurantService";

export default function AdminMissionControl() {
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [canteens, setCanteens] = useState<BackendRestaurant[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Emergency Pause Modal State
  const [isPauseModalOpen, setIsPauseModalOpen] = useState<boolean>(false);
  const [pendingPauseState, setPendingPauseState] = useState<boolean>(false);
  const [maintenanceMessageInput, setMaintenanceMessageInput] = useState<string>("");
  const [isUpdatingKillSwitch, setIsUpdatingKillSwitch] = useState<boolean>(false);

  // Individual Canteen Toggle State
  const [togglingCanteenId, setTogglingCanteenId] = useState<string | null>(null);

  const loadMissionControlData = async () => {
    try {
      const [configData, restaurantsData, partnersData, healthData] = await Promise.all([
        getSystemConfig().catch(() => null),
        getRestaurants().catch(() => []),
        getPendingPartnersAdmin().catch(() => ({ count: 0, items: [] })),
        getBackendHealth().catch(() => null),
      ]);

      if (configData) {
        setSystemConfig(configData);
        setMaintenanceMessageInput(
          configData.maintenance_message || "CampusBite is currently paused for scheduled maintenance."
        );
      }

      setCanteens(restaurantsData || []);
      setPendingCount(partnersData?.count ?? partnersData?.items?.length ?? 0);
      setHealth(healthData);
    } catch (err: unknown) {
      toast.error("Failed to load Mission Control data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadMissionControlData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadMissionControlData();
  };

  const openKillSwitchModal = (targetActiveState: boolean) => {
    setPendingPauseState(targetActiveState);
    if (systemConfig) {
      setMaintenanceMessageInput(
        systemConfig.maintenance_message || "CampusBite is currently paused for scheduled maintenance."
      );
    }
    setIsPauseModalOpen(true);
  };

  const handleConfirmKillSwitch = async () => {
    setIsUpdatingKillSwitch(true);
    try {
      const updated = await updateSystemConfig({
        is_platform_active: pendingPauseState,
        maintenance_message: maintenanceMessageInput.trim() || undefined,
      });
      setSystemConfig(updated);
      setIsPauseModalOpen(false);
      if (pendingPauseState) {
        toast.success("Platform Resumed: Sitewide checkout is now active.");
      } else {
        toast.warning("Emergency Kill-Switch Engaged: Sitewide checkout has been halted.", {
          description: "All new order attempts will display the maintenance message.",
        });
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle platform operational status."
      );
    } finally {
      setIsUpdatingKillSwitch(false);
    }
  };

  const handleToggleCanteen = async (canteen: BackendRestaurant) => {
    const canteenId = canteen._id || (canteen as any).id || canteen.slug;
    const currentAccepting = canteen.is_accepting_orders !== false;
    const targetAccepting = !currentAccepting;

    // Optimistic UI update
    setCanteens((prev) =>
      prev.map((c) =>
        c._id === canteen._id ? { ...c, is_accepting_orders: targetAccepting } : c
      )
    );
    setTogglingCanteenId(canteenId);

    try {
      await toggleCanteenStatusAdmin(canteenId, targetAccepting);
      toast.success(
        `${canteen.name} is now ${targetAccepting ? "OPEN (Accepting Orders)" : "PAUSED (Not Accepting Orders)"}`
      );
    } catch (err: unknown) {
      // Revert optimistic update
      setCanteens((prev) =>
        prev.map((c) =>
          c._id === canteen._id ? { ...c, is_accepting_orders: currentAccepting } : c
        )
      );
      toast.error(
        err instanceof Error ? err.message : `Failed to update status for ${canteen.name}`
      );
    } finally {
      setTogglingCanteenId(null);
    }
  };

  const isPlatformActive = systemConfig?.is_platform_active ?? true;
  const activeCanteensCount = canteens.filter(
    (c) => c.is_accepting_orders !== false
  ).length;

  // Diagnostics calculations
  const dbStatus =
    typeof health?.database === "object"
      ? health.database.status
      : typeof health?.database === "string"
      ? health.database
      : "connected";
  const dbLatency =
    typeof health?.database === "object" && typeof health.database.latency_ms === "number"
      ? health.database.latency_ms
      : null;
  const isDbConnected = dbStatus === "connected";
  const isPaymentsReady = health?.payment_gateway?.configured !== false;

  const isCritical = !isDbConnected || !isPaymentsReady || (dbLatency !== null && dbLatency > 500);
  const isWarning = !isCritical && (dbLatency !== null && dbLatency >= 50);
  const isOptimal = !isCritical && !isWarning;

  let healthBadgeText = "API Online • DB Latency < 50ms • Payments Ready";
  if (isCritical) {
    if (!isDbConnected) {
      healthBadgeText = "Database Disconnected • Check MongoDB";
    } else if (dbLatency !== null && dbLatency > 500) {
      healthBadgeText = `Critical DB Latency • ${Math.round(dbLatency)}ms (> 500ms)`;
    } else if (!isPaymentsReady) {
      healthBadgeText = "Payment Gateway Offline • Razorpay Keys Missing";
    } else {
      healthBadgeText = "System Degraded • Diagnostics Alert";
    }
  } else if (isWarning) {
    healthBadgeText = `API Online • DB Latency ${Math.round(dbLatency ?? 50)}ms • Payments Ready`;
  } else {
    healthBadgeText = "API Online • DB Latency < 50ms • Payments Ready";
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 animate-pulse rounded bg-stone-200" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-stone-200" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-xl bg-stone-100" />
          <div className="h-32 animate-pulse rounded-xl bg-stone-100" />
          <div className="h-32 animate-pulse rounded-xl bg-stone-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh Control */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  isPlatformActive ? "bg-emerald-400" : "bg-rose-500"
                }`}
              />
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  isPlatformActive ? "bg-emerald-500" : "bg-rose-600"
                }`}
              />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900">
              Admin Mission Control
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time platform toggles, emergency operational switches, and partner verification gate.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* System Health Diagnostics Badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border shadow-xs transition-colors ${
              isOptimal
                ? "bg-emerald-50/90 text-emerald-800 border-emerald-200"
                : isWarning
                ? "bg-amber-50/90 text-amber-800 border-amber-200"
                : "bg-rose-50/90 text-rose-800 border-rose-200"
            }`}
            title={
              health
                ? `DB: ${dbStatus} (${dbLatency !== null ? `${dbLatency}ms` : "< 50ms"}) | Gateway: ${health.payment_gateway?.provider || "razorpay"} (${health.payment_gateway?.mode || "test"}) | Configured: ${isPaymentsReady}`
                : "Checking backend health diagnostics..."
            }
          >
            <span className="flex h-2 w-2 relative">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOptimal
                    ? "bg-emerald-400 animate-ping"
                    : isWarning
                    ? "bg-amber-400 animate-ping"
                    : "bg-rose-500 animate-ping"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isOptimal
                    ? "bg-emerald-500"
                    : isWarning
                    ? "bg-amber-500"
                    : "bg-rose-600"
                }`}
              />
            </span>
            <span className="font-mono text-[11px] font-semibold tracking-tight">
              {healthBadgeText}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-orange-500" : ""}`}
            />
            {refreshing ? "Syncing..." : "Sync Status"}
          </button>
        </div>
      </div>

      {/* Master Control Toggle Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 1. Platform Emergency Pause Switch Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all shadow-sm ${
            isPlatformActive
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-white"
              : "border-rose-300 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 ring-2 ring-rose-500/20"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ${
                  isPlatformActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700 animate-pulse"
                }`}
              >
                <Power className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Kill-Switch
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  {isPlatformActive ? "Platform Active" : "Emergency Paused"}
                </h3>
              </div>
            </div>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isPlatformActive
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
              }`}
            >
              {isPlatformActive ? "LIVE" : "HALTED"}
            </span>
          </div>

          <p className="mt-3 text-xs text-stone-600 line-clamp-2">
            {isPlatformActive
              ? "Checkout & order placement are active sitewide for all students."
              : `Paused: "${systemConfig?.maintenance_message || "Platform is temporarily offline."}"`}
          </p>

          <div className="mt-4 pt-3 border-t border-stone-100">
            {isPlatformActive ? (
              <button
                type="button"
                onClick={() => openKillSwitchModal(false)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all"
              >
                <Power className="h-3.5 w-3.5" />
                Emergency Pause Checkout
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openKillSwitchModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resume Platform Operations
              </button>
            )}
          </div>
        </div>

        {/* 2. Active Canteens Overview Metric Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shadow-inner">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Canteen Operations
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  {activeCanteensCount} of {canteens.length} Open
                </h3>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-stone-600">
            Individual canteens can be paused or opened instantly below. Paused canteens block checkout on customer carts.
          </p>

          <div className="mt-4 pt-3 border-t border-stone-100">
            <a
              href="#canteens-overview"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <span>Manage Canteen Switches</span>
              <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
            </a>
          </div>
        </div>

        {/* 3. Pending Verifications Counter Pill Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ${
                  pendingCount > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Verification Queue
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  {pendingCount === 0 ? "All Verified" : `${pendingCount} Pending`}
                </h3>
              </div>
            </div>

            {pendingCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                Action Required
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                Up to date
              </span>
            )}
          </div>

          <p className="mt-3 text-xs text-stone-600">
            {pendingCount > 0
              ? `${pendingCount} couriers/canteen applicants await credential approval before taking orders.`
              : "No pending verification requests in queue. Couriers must be verified to claim runs."}
          </p>

          <div className="mt-4 pt-3 border-t border-stone-100">
            <Link
              href={ROUTES.ADMIN_VERIFICATIONS}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-stone-800 transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
              <span>Open Verifications Tab</span>
              <ArrowRight className="h-3.5 w-3.5 text-stone-400 ml-auto" />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Canteens Overview Table / Switch Grid */}
      <div id="canteens-overview" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Active Canteens & One-Click Operational Toggles
            </h3>
            <p className="text-xs text-stone-500">
              Overrides order intake immediately. Customers with items from a paused canteen are blocked with an explicit alert.
            </p>
          </div>
          <span className="text-xs font-semibold text-stone-500">
            {canteens.length} canteens registered
          </span>
        </div>

        {canteens.length === 0 ? (
          <p className="text-xs text-stone-400 py-6 text-center">
            No canteens registered yet. Add canteens through the Manage Restaurants tab.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {canteens.map((canteen) => {
              const isOpen = canteen.is_accepting_orders !== false;
              const canteenId = canteen._id || (canteen as any).id || canteen.slug;
              const isToggling = togglingCanteenId === canteenId;

              return (
                <div
                  key={canteenId}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isOpen
                      ? "border-stone-200 bg-white hover:border-emerald-300"
                      : "border-rose-200 bg-rose-50/30 hover:border-rose-300"
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          isOpen ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {canteen.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5">
                      {canteen.cuisine || canteen.address || canteen.email}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        isOpen
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isOpen ? "Accepting Orders" : "Orders Paused"}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggleCanteen(canteen)}
                    className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 ${
                      isOpen
                        ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {isToggling
                      ? "Updating..."
                      : isOpen
                      ? "Pause"
                      : "Open"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Platform Emergency Kill-Switch */}
      {isPauseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  pendingPauseState
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {pendingPauseState ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {pendingPauseState
                    ? "Resume Platform Operations?"
                    : "Emergency Pause Platform?"}
                </h3>
                <p className="text-xs text-stone-500">
                  {pendingPauseState
                    ? "Restore sitewide customer checkout immediately."
                    : "Halt all customer order placements sitewide."}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-stone-50 p-3.5 text-xs text-stone-700 space-y-2 border border-stone-200">
              <p>
                {pendingPauseState
                  ? "Resuming will immediately allow students to place orders and proceed through online/COD checkout."
                  : "Triggering this emergency switch returns HTTP 503 on checkout APIs. Existing orders will remain in progress, but no new orders will be accepted."}
              </p>
              {!pendingPauseState && (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Maintenance Notice Displayed to Users:
                  </label>
                  <textarea
                    rows={2}
                    value={maintenanceMessageInput}
                    onChange={(e) => setMaintenanceMessageInput(e.target.value)}
                    placeholder="Enter maintenance message for customers..."
                    className="w-full rounded-lg border border-stone-300 p-2 text-xs focus:border-rose-500 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPauseModalOpen(false)}
                disabled={isUpdatingKillSwitch}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmKillSwitch}
                disabled={isUpdatingKillSwitch}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                  pendingPauseState
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isUpdatingKillSwitch
                  ? "Applying..."
                  : pendingPauseState
                  ? "Yes, Resume Checkout"
                  : "Yes, Halt Platform Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
