"use client";

import React, { useEffect, useState } from "react";
import {
  Ticket,
  Plus,
  Trash2,
  Power,
  Calendar,
  Percent,
  IndianRupee,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminCoupon,
  getAdminCoupons,
  createAdminCoupon,
  deleteOrToggleAdminCoupon,
  CreateCouponInput,
} from "@/services/adminService";
import { Button } from "@/components/ui/button";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [minOrderValue, setMinOrderValue] = useState<number | "">(0);
  const [maxDiscount, setMaxDiscount] = useState<number | "">("");
  const [usageLimit, setUsageLimit] = useState<number | "">(500);
  const [expiresAt, setExpiresAt] = useState("");

  const loadCoupons = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminCoupons();
      setCoupons(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load coupons";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) {
      toast.error("Please fill in coupon code and discount value.");
      return;
    }

    try {
      setIsCreating(true);
      const payload: CreateCouponInput = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_value: Number(minOrderValue) || 0,
        max_discount: maxDiscount !== "" ? Number(maxDiscount) : null,
        usage_limit: Number(usageLimit) || 500,
        expires_at: expiresAt || null,
        is_active: true,
      };

      const res = await createAdminCoupon(payload);
      toast.success(res.message || "Coupon created successfully!");
      setCode("");
      setDiscountValue("");
      setMinOrderValue(0);
      setMaxDiscount("");
      setExpiresAt("");
      await loadCoupons();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create coupon";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (coupon: AdminCoupon) => {
    try {
      const id = coupon.id || coupon._id || coupon.code;
      const res = await deleteOrToggleAdminCoupon(id, false);
      toast.success(res.message);
      await loadCoupons();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update coupon status";
      toast.error(msg);
    }
  };

  const handleDelete = async (coupon: AdminCoupon) => {
    if (!confirm(`Are you sure you want to delete coupon ${coupon.code}?`)) {
      return;
    }
    try {
      const id = coupon.id || coupon._id || coupon.code;
      const res = await deleteOrToggleAdminCoupon(id, true);
      toast.success(res.message);
      await loadCoupons();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete coupon";
      toast.error(msg);
    }
  };

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    toast.success(`Copied ${couponCode} to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const activeCount = coupons.filter((c) => c.is_active).length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Ticket className="h-3.5 w-3.5 text-amber-600" />
            Promo Engine
          </div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            Coupon & Discount Hub
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Create and manage promotional discount vouchers for campus students.
          </p>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200 shadow-xs text-center">
            <p className="text-xs text-stone-500 font-medium">Active Codes</p>
            <p className="text-lg font-black text-emerald-600">{activeCount}</p>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200 shadow-xs text-center">
            <p className="text-xs text-stone-500 font-medium">Redemptions</p>
            <p className="text-lg font-black text-amber-600">{totalUses}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Creator Form & Existing List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Creator Form */}
        <div className="lg:col-span-1 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Create New Coupon</h2>
              <p className="text-xs text-stone-500">Add an active discount code</p>
            </div>
          </div>

          <form onSubmit={handleCreateCoupon} className="space-y-4">
            {/* Code */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CAMPUS30, ZEAL10"
                className="w-full h-11 px-3.5 rounded-xl border border-stone-200 bg-stone-50/50 font-mono font-bold text-stone-900 uppercase focus:border-amber-500 focus:bg-white focus:outline-none text-sm transition"
              />
            </div>

            {/* Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Type *
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDiscountType("flat")}
                    className={`py-1.5 rounded-lg transition ${
                      discountType === "flat"
                        ? "bg-white shadow-xs text-amber-700"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    ₹ Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("percent")}
                    className={`py-1.5 rounded-lg transition ${
                      discountType === "percent"
                        ? "bg-white shadow-xs text-amber-700"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    % Percent
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Discount Value *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 text-sm">
                    {discountType === "flat" ? "₹" : "%"}
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === "percent" ? 100 : 10000}
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="e.g. 30"
                    className="w-full h-11 pl-8 pr-3 rounded-xl border border-stone-200 bg-stone-50/50 font-bold text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none text-sm transition"
                  />
                </div>
              </div>
            </div>

            {/* Min Order & Max Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Min Order (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minOrderValue}
                  onChange={(e) =>
                    setMinOrderValue(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0"
                  className="w-full h-11 px-3 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none text-sm transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Max Cap (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={discountType === "flat"}
                  value={maxDiscount}
                  onChange={(e) =>
                    setMaxDiscount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder={discountType === "flat" ? "N/A" : "e.g. 50"}
                  className="w-full h-11 px-3 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none text-sm transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Usage Limit & Expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Usage Limit
                </label>
                <input
                  type="number"
                  min={1}
                  value={usageLimit}
                  onChange={(e) =>
                    setUsageLimit(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="500"
                  className="w-full h-11 px-3 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none text-sm transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none text-sm transition"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isCreating}
              className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition mt-2 cursor-pointer"
            >
              {isCreating ? "Creating Coupon..." : "Create Promo Code"}
            </Button>
          </form>
        </div>

        {/* Existing Coupons List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Existing Coupons ({coupons.length})</h2>
            <button
              onClick={loadCoupons}
              className="text-xs text-amber-700 font-semibold hover:underline"
            >
              Refresh List
            </button>
          </div>

          {loading && (
            <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mx-auto mb-2" />
              Loading coupons...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              {error}
            </div>
          )}

          {!loading && !error && coupons.length === 0 && (
            <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500">
              <Ticket className="h-10 w-10 mx-auto mb-3 text-stone-300" />
              <p className="font-semibold text-stone-700">No coupons yet</p>
              <p className="text-xs text-stone-400 mt-1">
                Create your first promotional discount coupon using the form on the left.
              </p>
            </div>
          )}

          {!loading && !error && coupons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coupons.map((coupon) => {
                const isExpired =
                  coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now();
                const isFlat = coupon.discount_type === "flat";

                return (
                  <div
                    key={coupon.id || coupon._id || coupon.code}
                    className={`relative rounded-3xl border p-5 transition bg-white shadow-xs ${
                      !coupon.is_active || isExpired
                        ? "border-stone-200 opacity-60"
                        : "border-amber-200/90 ring-1 ring-amber-100"
                    }`}
                  >
                    {/* Header badge & Code */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black tracking-wider text-stone-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(coupon.code)}
                          className="text-stone-400 hover:text-stone-700 p-1"
                          title="Copy Code"
                        >
                          {copiedCode === coupon.code ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            !coupon.is_active
                              ? "bg-stone-100 text-stone-500"
                              : isExpired
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {!coupon.is_active ? "Inactive" : isExpired ? "Expired" : "Active"}
                        </span>
                      </div>
                    </div>

                    {/* Value highlight */}
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-2xl font-black text-amber-600">
                        {isFlat ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`}
                      </span>
                      <span className="text-xs font-semibold text-stone-500 uppercase">
                        {isFlat ? "Flat Off" : "Discount"}
                      </span>
                      {!isFlat && coupon.max_discount && (
                        <span className="text-xs text-stone-400">
                          (Max ₹{coupon.max_discount})
                        </span>
                      )}
                    </div>

                    {/* Details pill grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 border-t border-stone-100 pt-3 mb-4">
                      <div>
                        <span className="text-stone-400">Min Order: </span>
                        <span className="font-semibold text-stone-700">
                          ₹{coupon.min_order_value || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400">Used: </span>
                        <span className="font-semibold text-stone-700">
                          {coupon.used_count || 0} / {coupon.usage_limit || "∞"}
                        </span>
                      </div>
                      {coupon.expires_at && (
                        <div className="col-span-2 flex items-center gap-1 text-[11px] text-stone-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(coupon)}
                        className={`text-xs font-semibold flex items-center gap-1 transition ${
                          coupon.is_active
                            ? "text-stone-500 hover:text-rose-600"
                            : "text-emerald-600 hover:text-emerald-700"
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span>{coupon.is_active ? "Deactivate" : "Activate"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(coupon)}
                        className="text-xs text-stone-400 hover:text-rose-600 p-1 transition"
                        title="Delete Coupon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
