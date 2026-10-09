"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Store,
  UtensilsCrossed,
  Coffee,
  GraduationCap,
  Bike,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  FileText,
  MapPin,
  Building2,
  CreditCard,
  User,
  Phone,
  Mail,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  PendingVerificationItem,
  PendingVerificationsResponse,
  VendorType,
  CourierType,
} from "@/types/partnerOnboarding";
import {
  getPendingVerifications,
  submitVerificationDecision,
} from "@/services/partnerOnboardingService";

type FilterTab =
  | "all"
  | "canteens"
  | "tiffins"
  | "stalls"
  | "students"
  | "externals";

export default function PartnerVerificationHub() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<PendingVerificationsResponse>({
    counts: {
      all: 0,
      canteens: 0,
      tiffins: 0,
      stalls: 0,
      students: 0,
      externals: 0,
    },
    items: [],
  });

  const [selectedItem, setSelectedItem] =
    useState<PendingVerificationItem | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [itemToReject, setItemToReject] =
    useState<PendingVerificationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  const fetchVerifications = async (tab: FilterTab = activeTab) => {
    setIsLoading(true);
    try {
      const res = await getPendingVerifications(tab);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load verification queue.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications(activeTab);
  }, [activeTab]);

  const handleApprove = async (item: PendingVerificationItem) => {
    setIsProcessing(true);
    try {
      await submitVerificationDecision(
        item.partner_type,
        item.id,
        "APPROVE"
      );
      toast.success(
        `✓ ${
          item.business_name || item.full_name
        } approved and activated for orders!`
      );
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      fetchVerifications(activeTab);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve partner.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (item: PendingVerificationItem) => {
    setItemToReject(item);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!itemToReject) return;
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    setIsProcessing(true);
    try {
      await submitVerificationDecision(
        itemToReject.partner_type,
        itemToReject.id,
        "REJECT",
        rejectionReason.trim()
      );
      toast.success(`Application rejected with reason provided.`);
      setIsRejectModalOpen(false);
      setItemToReject(null);
      if (selectedItem?.id === itemToReject.id) {
        setSelectedItem(null);
      }
      fetchVerifications(activeTab);
    } catch (err: any) {
      toast.error(err.message || "Failed to reject application.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = data.items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.business_name || item.full_name || "").toLowerCase();
    const owner = (item.owner_name || "").toLowerCase();
    const email = item.email.toLowerCase();
    const phone = item.phone.toLowerCase();
    return (
      name.includes(q) ||
      owner.includes(q) ||
      email.includes(q) ||
      phone.includes(q)
    );
  });

  const getTierBadge = (item: PendingVerificationItem) => {
    if (item.partner_type === "restaurant") {
      switch (item.vendor_type) {
        case "CAMPUS_CANTEEN":
          return (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
              <Store className="h-3 w-3" /> Campus Canteen
            </span>
          );
        case "HOME_TIFFIN":
          return (
            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-900 text-[11px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
              <UtensilsCrossed className="h-3 w-3" /> Home Tiffin
            </span>
          );
        case "STREET_STALL":
          return (
            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-[11px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
              <Coffee className="h-3 w-3" /> Food Stall
            </span>
          );
        default:
          return null;
      }
    } else {
      switch (item.courier_type) {
        case "STUDENT":
          return (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              <GraduationCap className="h-3 w-3" /> Student Runner
            </span>
          );
        case "EXTERNAL_GIG":
          return (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
              <Bike className="h-3 w-3" /> Gig Courier
            </span>
          );
        default:
          return null;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">
                Partner Verification Hub
              </h1>
              <p className="text-xs text-stone-500">
                Review and approve multi-tier campus dining partners and student
                couriers.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchVerifications(activeTab)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-all cursor-pointer"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
        {[
          { id: "all", label: "All Applicants", count: data.counts.all },
          { id: "canteens", label: "Canteens & Mess", count: data.counts.canteens },
          { id: "tiffins", label: "Home Tiffins", count: data.counts.tiffins },
          { id: "stalls", label: "Small Stalls", count: data.counts.stalls },
          { id: "students", label: "Student Runners", count: data.counts.students },
          { id: "externals", label: "External Couriers", count: data.counts.externals },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? "bg-stone-700 text-white"
                    : "bg-stone-200 text-stone-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search applicants by name, business, phone or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm text-stone-900 shadow-2xs"
        />
      </div>

      {/* Verification Queue List */}
      {isLoading ? (
        <div className="py-16 text-center">
          <RefreshCw className="h-8 w-8 text-stone-400 animate-spin mx-auto mb-2" />
          <p className="text-sm font-bold text-stone-600">
            Loading verification queue...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">
            Queue Clean & All Caught Up!
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            No pending partner applications found for the selected filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isRestaurant = item.partner_type === "restaurant";
            const displayName = isRestaurant
              ? item.business_name
              : item.full_name;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md hover:border-stone-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Tier Badge */}
                  <div className="flex items-center justify-between mb-3">
                    {getTierBadge(item)}
                    <span className="text-[10px] text-stone-400 font-mono">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString()
                        : "Recent"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 leading-snug truncate">
                    {displayName}
                  </h3>

                  {isRestaurant && item.owner_name && (
                    <p className="text-xs text-stone-600 mt-0.5 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-stone-400" />
                      <span>{item.owner_name}</span>
                    </p>
                  )}

                  <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                      <span className="font-mono">{item.phone}</span>
                    </p>
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </p>
                    {item.settlement_upi_id && (
                      <p className="flex items-center gap-2 truncate text-stone-500">
                        <CreditCard className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span className="font-mono">{item.settlement_upi_id}</span>
                      </p>
                    )}
                    {item.payout_upi_id && (
                      <p className="flex items-center gap-2 truncate text-stone-500">
                        <CreditCard className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span className="font-mono">{item.payout_upi_id}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-stone-600" />
                    <span>Inspect KYC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(item)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openRejectModal(item)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    title="Reject Application"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPLICANT REVIEW LIGHTBOX MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                {getTierBadge(selectedItem)}
                <span className="text-xs font-mono text-stone-400">
                  ID: {selectedItem.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="h-8 w-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Applicant Title */}
            <div>
              <h2 className="text-2xl font-black text-stone-900">
                {selectedItem.business_name || selectedItem.full_name}
              </h2>
              {selectedItem.owner_name && (
                <p className="text-xs text-stone-500 mt-0.5">
                  Owner / Representative:{" "}
                  <strong className="text-stone-800">
                    {selectedItem.owner_name}
                  </strong>
                </p>
              )}
            </div>

            {/* Comprehensive Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-400 block">Phone</span>
                <span className="font-bold text-stone-900">
                  {selectedItem.phone}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Email</span>
                <span className="font-bold text-stone-900">
                  {selectedItem.email}
                </span>
              </div>

              {selectedItem.partner_type === "restaurant" && (
                <>
                  <div>
                    <span className="text-stone-400 block">Campus Location</span>
                    <span className="font-bold text-stone-900">
                      {selectedItem.is_inside_campus
                        ? "🏫 Inside Campus"
                        : "📍 Off-Campus (2km)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Address / Stall</span>
                    <span className="font-bold text-stone-900">
                      {selectedItem.address_or_stall_landmark}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Bank Account Holder</span>
                    <span className="font-bold text-stone-900">
                      {selectedItem.bank_account_holder}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Bank & IFSC</span>
                    <span className="font-mono font-bold text-stone-900">
                      {selectedItem.bank_account_number} ({selectedItem.bank_ifsc_code})
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-stone-400 block">Daily 9PM Settlement UPI</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedItem.settlement_upi_id}
                    </span>
                  </div>
                </>
              )}

              {selectedItem.partner_type === "courier" && (
                <>
                  <div>
                    <span className="text-stone-400 block">Transit Mode</span>
                    <span className="font-bold text-stone-900">
                      {selectedItem.transit_mode}
                      {selectedItem.vehicle_number
                        ? ` (${selectedItem.vehicle_number})`
                        : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Emergency Contact</span>
                    <span className="font-bold text-stone-900">
                      {selectedItem.emergency_contact_phone}
                    </span>
                  </div>
                  {selectedItem.student_details && (
                    <>
                      <div>
                        <span className="text-stone-400 block">Roll No</span>
                        <span className="font-mono font-bold text-stone-900">
                          {selectedItem.student_details.roll_no}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Hostel & Year</span>
                        <span className="font-bold text-stone-900">
                          {selectedItem.student_details.hostel_block} (
                          {selectedItem.student_details.year})
                        </span>
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <span className="text-stone-400 block">Instant Payout UPI</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedItem.payout_upi_id}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Document Previews */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-700">
                Uploaded KYC Verification Media
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedItem.compliance_doc_url && (
                  <div className="border border-stone-200 rounded-xl p-3 bg-stone-50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-800">
                        {selectedItem.compliance_doc_type || "Compliance Doc"}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate max-w-[180px]">
                        {selectedItem.compliance_doc_url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewMediaUrl(selectedItem.compliance_doc_url || null)
                      }
                      className="px-2.5 py-1 bg-white border border-stone-300 rounded-lg font-bold text-stone-700 hover:text-amber-600 text-[11px] cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                )}

                {selectedItem.kitchen_or_stall_photo_url && (
                  <div className="border border-stone-200 rounded-xl p-3 bg-stone-50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-800">Kitchen / Stall Photo</p>
                      <p className="text-[11px] text-stone-500 truncate max-w-[180px]">
                        {selectedItem.kitchen_or_stall_photo_url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewMediaUrl(
                          selectedItem.kitchen_or_stall_photo_url || null
                        )
                      }
                      className="px-2.5 py-1 bg-white border border-stone-300 rounded-lg font-bold text-stone-700 hover:text-amber-600 text-[11px] cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                )}

                {selectedItem.id_proof_doc_url && (
                  <div className="border border-stone-200 rounded-xl p-3 bg-stone-50 flex items-center justify-between text-xs sm:col-span-2">
                    <div>
                      <p className="font-bold text-stone-800">
                        {selectedItem.id_proof_type || "ID Proof Document"}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate max-w-[280px]">
                        {selectedItem.id_proof_doc_url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewMediaUrl(selectedItem.id_proof_doc_url || null)
                      }
                      className="px-2.5 py-1 bg-white border border-stone-300 rounded-lg font-bold text-stone-700 hover:text-amber-600 text-[11px] cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-stone-200 pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => openRejectModal(selectedItem)}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reject Application
              </button>
              <button
                type="button"
                onClick={() => handleApprove(selectedItem)}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                ✓ Approve & Activate Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON DIALOG MODAL */}
      {isRejectModalOpen && itemToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-black text-stone-900">
                Reject KYC Application
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              Please specify the reason for rejecting{" "}
              <strong>
                {itemToReject.business_name || itemToReject.full_name}
              </strong>
              . This explanation will be logged and communicated to the partner.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Unclear student ID photo, mismatch in IFSC code, or invalid Aadhaar document."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs text-stone-900"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setItemToReject(null);
                }}
                className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT LIGHTBOX PREVIEW */}
      {previewMediaUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-3xl w-full bg-stone-900 rounded-3xl overflow-hidden p-4 text-center">
            <button
              type="button"
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-white text-xs font-mono mb-3 truncate">
              {previewMediaUrl}
            </h4>
            <div className="bg-stone-950 rounded-2xl p-6 min-h-[300px] flex items-center justify-center">
              {previewMediaUrl.endsWith(".pdf") ? (
                <div className="text-stone-300 text-xs space-y-2">
                  <FileText className="h-12 w-12 text-amber-400 mx-auto" />
                  <p className="font-bold">PDF Document Uploaded</p>
                  <a
                    href={previewMediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-stone-950 font-bold rounded-lg hover:bg-amber-400"
                  >
                    <span>Open Full PDF in New Tab</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="text-stone-300 text-xs space-y-2">
                  <Store className="h-12 w-12 text-emerald-400 mx-auto" />
                  <p className="font-bold">KYC Image Preview</p>
                  <p className="text-stone-500 text-[11px]">{previewMediaUrl}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
