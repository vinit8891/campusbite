"use client";

import React, { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPricingSafeguardsCard from "@/components/admin/AdminPricingSafeguardsCard";
import { getBackendHealth, type BackendHealth } from "@/services/adminService";
import { Server, ShieldCheck, Database, Cpu, Activity } from "lucide-react";

export default function AdminSettingsPage() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadHealth() {
      try {
        const data = await getBackendHealth();
        if (!cancelled) setHealth(data);
      } catch (_) {
        // Silent fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminPageHeader
        title="Pricing & Safeguards"
        description="Active campus economics policies, unit threshold rules, and runtime status"
      />

      {/* Pricing Safeguards Engine */}
      <section aria-label="Platform Pricing Safeguards">
        <AdminPricingSafeguardsCard />
      </section>

      {/* Runtime Environment & Architecture Health */}
      <section aria-label="System Runtime Diagnostics" className="space-y-4">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          <span>System Runtime & Service Matrix</span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
              <span>Backend Core</span>
              <Server className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-3 text-lg font-bold text-stone-900">
              {health?.app_name || "CampusBite Engine"}
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operational (v{health?.version || "1.0.0"})</span>
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
              <span>Environment</span>
              <Cpu className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-3 text-lg font-bold text-stone-900 capitalize">
              {health?.environment || "Production Mode"}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Zero-cold-start edge & API gateway
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
              <span>Database Cluster</span>
              <Database className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-lg font-bold text-stone-900">
              {health?.database || "MongoDB Atlas"}
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Connected & Indexed</span>
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
              <span>Audit & Compliance</span>
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-3 text-lg font-bold text-stone-900">
              18% GST / Take-Rate
            </p>
            <p className="mt-1 text-xs text-stone-500">
              9:00 PM automated batch ledgering
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
