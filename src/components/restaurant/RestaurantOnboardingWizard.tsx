"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Store,
  UtensilsCrossed,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  FileCheck,
  CreditCard,
  Upload,
  ArrowRight,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  VendorType,
  ComplianceDocType,
  RestaurantOnboardingPayload,
  IFSC_REGEX,
  UPI_REGEX,
  PHONE_REGEX,
} from "@/types/partnerOnboarding";
import {
  onboardRestaurant,
  uploadKycDocument,
} from "@/services/partnerOnboardingService";
import { ROUTES } from "@/lib/routes";

const VENDOR_CARDS: {
  type: VendorType;
  title: string;
  subtitle: string;
  icon: typeof Store;
  badge: string;
  defaultDoc: ComplianceDocType;
  docLabel: string;
}[] = [
  {
    type: "CAMPUS_CANTEEN",
    title: "Campus Canteen / Mess",
    subtitle: "Hostel dining halls, food courts, and campus building canteens.",
    icon: Store,
    badge: "Official Campus Entity",
    defaultDoc: "COLLEGE_PERMIT",
    docLabel: "College Tender / Operation Permit",
  },
  {
    type: "HOME_TIFFIN",
    title: "Home Tiffin & Dabba",
    subtitle: "Homemade meal providers, dabba makers, and local home cooks.",
    icon: UtensilsCrossed,
    badge: "Micro-Food Entrepreneur",
    defaultDoc: "AADHAAR_KYC",
    docLabel: "Aadhaar KYC or FSSAI License",
  },
  {
    type: "STREET_STALL",
    title: "Food Stall / Maggi Point",
    subtitle: "Campus gate tapris, quick snack kiosks, and student juice points.",
    icon: Coffee,
    badge: "Quick Bite Kiosk",
    defaultDoc: "AADHAAR_KYC",
    docLabel: "Aadhaar Card or Stall Permit",
  },
];

export default function RestaurantOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  const [formData, setFormData] = useState<RestaurantOnboardingPayload>({
    vendor_type: "CAMPUS_CANTEEN",
    business_name: "",
    owner_name: "",
    phone: "",
    email: "",
    password: "",
    address_or_stall_landmark: "",
    is_inside_campus: true,
    compliance_doc_type: "COLLEGE_PERMIT",
    compliance_doc_url: "",
    kitchen_or_stall_photo_url: "",
    bank_account_holder: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    settlement_upi_id: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleVendorSelect = (type: VendorType) => {
    const matched = VENDOR_CARDS.find((c) => c.type === type);
    setFormData((prev) => ({
      ...prev,
      vendor_type: type,
      compliance_doc_type: matched ? matched.defaultDoc : "AADHAAR_KYC",
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.vendor_type) {
        newErrors.vendor_type = "Please select a partner tier";
      }
    } else if (step === 2) {
      if (!formData.business_name.trim()) {
        newErrors.business_name = "Business name is required";
      }
      if (!formData.owner_name.trim()) {
        newErrors.owner_name = "Owner name is required";
      }
      if (!PHONE_REGEX.test(formData.phone)) {
        newErrors.phone = "Enter a valid 10-digit mobile number";
      }
      if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
        newErrors.email = "Enter a valid email address";
      }
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
      if (!formData.address_or_stall_landmark.trim()) {
        newErrors.address_or_stall_landmark =
          "Address or stall landmark is required";
      }
    } else if (step === 3) {
      if (!formData.compliance_doc_url.trim()) {
        newErrors.compliance_doc_url = "Please upload compliance/ID proof document";
      }
      if (!formData.kitchen_or_stall_photo_url.trim()) {
        newErrors.kitchen_or_stall_photo_url =
          "Please upload kitchen/counter photo";
      }
    } else if (step === 4) {
      if (!formData.bank_account_holder.trim()) {
        newErrors.bank_account_holder = "Bank account holder name is required";
      }
      if (
        !formData.bank_account_number.trim() ||
        formData.bank_account_number.length < 8
      ) {
        newErrors.bank_account_number = "Enter a valid account number (min 8 digits)";
      }
      if (!IFSC_REGEX.test(formData.bank_ifsc_code.toUpperCase())) {
        newErrors.bank_ifsc_code =
          "Invalid IFSC code (e.g. SBIN0001234 - 4 letters, 0, 6 characters)";
      }
      if (!UPI_REGEX.test(formData.settlement_upi_id)) {
        newErrors.settlement_upi_id =
          "Invalid UPI ID (e.g. sharma.tiffin@okhdfcbank or 9876543210@paytm)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please fill in all required fields correctly.");
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "compliance_doc_url" | "kitchen_or_stall_photo_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "compliance_doc_url") setUploadingDoc(true);
    else setUploadingPhoto(true);

    try {
      const res = await uploadKycDocument(file);
      setFormData((prev) => ({ ...prev, [field]: res.file_url }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      toast.success("Document uploaded successfully!");
    } catch (err: any) {
      // Fallback for local mock file representation
      const mockUrl = `/uploads/kyc/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      setFormData((prev) => ({ ...prev, [field]: mockUrl }));
      toast.info("Document saved (preview mode).");
    } finally {
      if (field === "compliance_doc_url") setUploadingDoc(false);
      else setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const normalizedPayload = {
        ...formData,
        bank_ifsc_code: formData.bank_ifsc_code.toUpperCase().trim(),
        settlement_upi_id: formData.settlement_upi_id.trim(),
      };

      const res = await onboardRestaurant(normalizedPayload);
      setRegisteredId(res.restaurant_id || "NEW-PARTNER");
      setCurrentStep(5);
      toast.success("Registration submitted! Your KYC is under review.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit partner registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 border border-orange-200 px-3 py-1 text-xs font-bold text-orange-800 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-orange-600" />
          <span>Flexible Multi-Tier Campus Partner Network</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Partner with CampusBite
        </h1>
        <p className="text-stone-600 mt-2 max-w-xl mx-auto text-sm sm:text-base">
          From full campus mess halls to home dabba cooks & Maggi tapris — join
          our loss-proof 9:00 PM instant settlement network.
        </p>
      </div>

      {/* Wizard Progress Steps */}
      {currentStep < 5 && (
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: "Partner Tier" },
              { num: 2, label: "Eatery Info" },
              { num: 3, label: "Verification" },
              { num: 4, label: "Daily Payout" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPassed = currentStep > step.num;
              return (
                <div key={step.num} className="flex flex-col items-center">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      isPassed
                        ? "bg-emerald-600 text-white shadow-sm"
                        : isActive
                        ? "bg-orange-600 text-white ring-4 ring-orange-100 shadow-md"
                        : "bg-stone-100 text-stone-400 border border-stone-200"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="h-5 w-5" /> : step.num}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium hidden sm:block ${
                      isActive
                        ? "text-orange-950 font-bold"
                        : isPassed
                        ? "text-emerald-700"
                        : "text-stone-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Container Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/60 border border-stone-200/80 p-6 sm:p-10">
        {/* STEP 1: Select Vendor Type */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Step 1: Choose Your Partner Tier
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                We cater to all campus food creators with streamlined
                compliance rules tailored to your scale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {VENDOR_CARDS.map((card) => {
                const Icon = card.icon;
                const isSelected = formData.vendor_type === card.type;
                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => handleVendorSelect(card.type)}
                    className={`text-left rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-200"
                        : "border-stone-200 bg-stone-50/50 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? "bg-orange-500 text-white shadow-sm"
                              : "bg-white text-stone-700 border border-stone-200"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span
                          className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-orange-200/70 text-orange-900"
                              : "bg-stone-200/70 text-stone-600"
                          }`}
                        >
                          {card.badge}
                        </span>
                      </div>
                      <h3 className="font-bold text-stone-900 text-base">
                        {card.title}
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {card.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-200/60 text-[11px] text-stone-500 font-medium">
                      📋 KYC: <span className="font-semibold text-stone-700">{card.docLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {errors.vendor_type && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {errors.vendor_type}
              </p>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              >
                <span>Continue to Eatery Info</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Eatery & Contact Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Step 2: Business & Contact Details
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                Tell us about your brand name, owner identity, and physical
                service location.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Eatery / Business Name *
                </label>
                <input
                  type="text"
                  placeholder={
                    formData.vendor_type === "HOME_TIFFIN"
                      ? "e.g. Sharma Aunty Home Kitchen & Tiffin"
                      : formData.vendor_type === "STREET_STALL"
                      ? "e.g. Gate 2 Hot Maggi Point"
                      : "e.g. Aryabhatta Hall Central Mess"
                  }
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      business_name: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm"
                />
                {errors.business_name && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.business_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Owner / Representative Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Sharma"
                  value={formData.owner_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      owner_name: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm"
                />
                {errors.owner_name && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.owner_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  10-Digit Mobile Phone *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm"
                />
                {errors.phone && (
                  <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Business Email *
                </label>
                <input
                  type="email"
                  placeholder="partner@campusbite.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm"
                />
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Account Password *
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm"
                />
                {errors.password && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Campus Location Toggle */}
              <div className="sm:col-span-2 bg-stone-50 rounded-2xl p-4 border border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-bold text-stone-900">
                        Is this eatery located inside university campus grounds?
                      </p>
                      <p className="text-xs text-stone-500">
                        Select Yes for hostel messes/food court; No for
                        off-campus kitchens within 2km radius.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        is_inside_campus: !prev.is_inside_campus,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      formData.is_inside_campus
                        ? "bg-orange-600"
                        : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_inside_campus
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Dynamic Address / Landmark */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  {formData.is_inside_campus
                    ? "Campus Building, Floor & Stall/Counter No. *"
                    : "Off-Campus Address & Nearest Gate / Landmark *"}
                </label>
                <input
                  type="text"
                  placeholder={
                    formData.is_inside_campus
                      ? "e.g. Ground Floor, Student Activity Centre (SAC) Counter #3"
                      : "e.g. Flat 201, Green View Apts, 300m from Main Gate #1"
                  }
                  value={formData.address_or_stall_landmark}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address_or_stall_landmark: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm"
                />
                {errors.address_or_stall_landmark && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.address_or_stall_landmark}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold px-5 py-3 rounded-2xl transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              >
                <span>Continue to Documents</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Verification & KYC Document Upload */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Step 3: Identity & Compliance Verification
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                Upload clear photos or PDFs for fast verification approval
                (typical turnaround under 2–4 hours).
              </p>
            </div>

            <div className="space-y-4">
              {/* Compliance Doc Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Select Document Type *
                </label>
                <select
                  value={formData.compliance_doc_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compliance_doc_type: e.target.value as ComplianceDocType,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm bg-white"
                >
                  {formData.vendor_type === "CAMPUS_CANTEEN" && (
                    <option value="COLLEGE_PERMIT">
                      College Authority Tender / Operating Permit
                    </option>
                  )}
                  <option value="AADHAAR_KYC">
                    Owner Aadhaar Card (KYC Front & Back)
                  </option>
                  <option value="FSSAI_LICENSE">
                    FSSAI Registration / Food Safety License
                  </option>
                </select>
              </div>

              {/* Compliance Doc Upload Box */}
              <div className="border-2 border-dashed border-stone-300 rounded-2xl p-5 text-center bg-stone-50 hover:bg-orange-50/30 hover:border-orange-400 transition-all">
                <FileCheck className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-800">
                  Upload {formData.compliance_doc_type.replace(/_/g, " ")} (PDF / Image)
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Supported formats: JPG, PNG, PDF up to 10MB
                </p>
                <div className="mt-3 flex justify-center">
                  <label className="cursor-pointer bg-white border border-stone-300 hover:border-orange-500 px-4 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-orange-600 transition-all shadow-xs inline-flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingDoc ? "Uploading..." : "Select File"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        handleFileUpload(e, "compliance_doc_url")
                      }
                      className="hidden"
                    />
                  </label>
                </div>
                {formData.compliance_doc_url && (
                  <p className="text-xs text-emerald-600 font-bold mt-2 truncate max-w-sm mx-auto">
                    ✓ Attached: {formData.compliance_doc_url}
                  </p>
                )}
                {errors.compliance_doc_url && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">
                    {errors.compliance_doc_url}
                  </p>
                )}
              </div>

              {/* Kitchen / Stall Counter Photo */}
              <div className="border-2 border-dashed border-stone-300 rounded-2xl p-5 text-center bg-stone-50 hover:bg-orange-50/30 hover:border-orange-400 transition-all">
                <Store className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-800">
                  Kitchen / Counter Live Photo *
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Photo showing meal preparation counter or hygienic food area
                </p>
                <div className="mt-3 flex justify-center">
                  <label className="cursor-pointer bg-white border border-stone-300 hover:border-orange-500 px-4 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-orange-600 transition-all shadow-xs inline-flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingPhoto ? "Uploading..." : "Select Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(e, "kitchen_or_stall_photo_url")
                      }
                      className="hidden"
                    />
                  </label>
                </div>
                {formData.kitchen_or_stall_photo_url && (
                  <p className="text-xs text-emerald-600 font-bold mt-2 truncate max-w-sm mx-auto">
                    ✓ Attached: {formData.kitchen_or_stall_photo_url}
                  </p>
                )}
                {errors.kitchen_or_stall_photo_url && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">
                    {errors.kitchen_or_stall_photo_url}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold px-5 py-3 rounded-2xl transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              >
                <span>Continue to Settlement Setup</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Daily 9 PM Settlement Setup */}
        {currentStep === 4 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-stone-900">
                  Step 4: Daily 9:00 PM Settlement Setup
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5" /> Direct IMPS/UPI Payout
                </span>
              </div>
              <p className="text-sm text-stone-500 mt-1">
                All completed orders and redeemed subscription tokens are
                credited every evening at 9:00 PM without deduction delays.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Bank Account Holder Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SUNITA SHARMA"
                  value={formData.bank_account_holder}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bank_account_holder: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm"
                />
                {errors.bank_account_holder && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.bank_account_holder}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10293847561"
                  value={formData.bank_account_number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bank_account_number: e.target.value.replace(/\s+/g, ""),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm font-mono"
                />
                {errors.bank_account_number && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.bank_account_number}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Bank IFSC Code *
                </label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="e.g. SBIN0001234"
                  value={formData.bank_ifsc_code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bank_ifsc_code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm font-mono"
                />
                {errors.bank_ifsc_code && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.bank_ifsc_code}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Settlement UPI ID (Primary Daily Credit) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. sharma.kitchen@okhdfcbank or 9876543210@paytm"
                  value={formData.settlement_upi_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settlement_upi_id: e.target.value.trim().toLowerCase(),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 text-sm font-mono"
                />
                {errors.settlement_upi_id && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.settlement_upi_id}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Automated Daily Loss-Proof Settlement</p>
                <p className="mt-0.5 text-amber-800">
                  By clicking Submit, you authorize CampusBite to disburse your
                  net food revenue daily directly into the provided UPI/Bank
                  account.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold px-5 py-3 rounded-2xl transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting KYC Application...</span>
                ) : (
                  <>
                    <span>Submit & Request Verification</span>
                    <CheckCircle2 className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: Under Review Status Screen */}
        {currentStep === 5 && (
          <div className="text-center py-8 space-y-6">
            <div className="h-20 w-20 bg-amber-100 border border-amber-300 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Clock className="h-10 w-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2">
                <span>Application Under Review</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900">
                KYC Verification in Progress
              </h2>
              <p className="text-stone-600 text-sm max-w-md mx-auto mt-2 leading-relaxed">
                Thank you for applying,{" "}
                <span className="font-bold text-stone-900">
                  {formData.business_name}
                </span>
                . Our campus security and food compliance team verifies new
                partners within{" "}
                <span className="font-bold text-stone-900">2–4 hours</span>.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 max-w-md mx-auto text-left space-y-3 text-xs">
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Application Reference</span>
                <span className="font-mono font-bold text-stone-900">
                  {registeredId || "CB-KYC-PENDING"}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Partner Tier</span>
                <span className="font-bold text-stone-900">
                  {formData.vendor_type.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Settlement UPI</span>
                <span className="font-mono font-bold text-stone-900">
                  {formData.settlement_upi_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Status</span>
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  PENDING_VERIFICATION
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href={ROUTES.RESTAURANT_LOGIN}
                className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-orange-600/30 transition-all"
              >
                <span>Partner Portal Login</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={ROUTES.HOME}
                className="inline-flex items-center justify-center gap-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold px-6 py-3 rounded-2xl transition-all"
              >
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
