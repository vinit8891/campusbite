"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Bike,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CreditCard,
  FileCheck,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import {
  CourierType,
  TransitMode,
  CourierIdProofType,
  CourierOnboardingPayload,
  UPI_REGEX,
  PHONE_REGEX,
} from "@/types/partnerOnboarding";
import {
  onboardCourier,
  uploadKycDocument,
} from "@/services/partnerOnboardingService";
import { ROUTES } from "@/lib/routes";

const ROLE_OPTIONS: {
  type: CourierType;
  title: string;
  subtitle: string;
  badge: string;
  icon: typeof GraduationCap;
  defaultTransit: TransitMode;
  defaultIdType: CourierIdProofType;
}[] = [
  {
    type: "STUDENT",
    title: "Student Runner",
    subtitle:
      "Deliver between classes and hostel blocks. Walk or cycle with 0 fuel costs.",
    badge: "Campus Student",
    icon: GraduationCap,
    defaultTransit: "BICYCLE",
    defaultIdType: "STUDENT_ID",
  },
  {
    type: "EXTERNAL_GIG",
    title: "Campus / Local Rider",
    subtitle:
      "Full or part-time gig courier. Bike/EV high volume multi-order wave batches.",
    badge: "Gig Courier",
    icon: Bike,
    defaultTransit: "MOTORCYCLE",
    defaultIdType: "DRIVING_LICENSE",
  },
];

export default function CourierOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [registeredId, setRegisteredId] = useState<string | null>(null);
  const [agreedToConduct, setAgreedToConduct] = useState(false);

  const [formData, setFormData] = useState<CourierOnboardingPayload>({
    courier_type: "STUDENT",
    full_name: "",
    phone: "",
    email: "",
    password: "",
    transit_mode: "BICYCLE",
    id_proof_type: "STUDENT_ID",
    id_proof_doc_url: "",
    student_details: {
      roll_no: "",
      hostel_block: "",
      year: "1st Year",
    },
    vehicle_number: "",
    payout_upi_id: "",
    emergency_contact_phone: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRoleSelect = (type: CourierType) => {
    const matched = ROLE_OPTIONS.find((r) => r.type === type);
    setFormData((prev) => ({
      ...prev,
      courier_type: type,
      transit_mode: matched ? matched.defaultTransit : "BICYCLE",
      id_proof_type: matched ? matched.defaultIdType : "STUDENT_ID",
      student_details:
        type === "STUDENT"
          ? prev.student_details || {
              roll_no: "",
              hostel_block: "",
              year: "1st Year",
            }
          : undefined,
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.courier_type) {
        newErrors.courier_type = "Please select your courier category";
      }
    } else if (step === 2) {
      if (!formData.full_name.trim()) {
        newErrors.full_name = "Full legal name is required";
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
      if (!PHONE_REGEX.test(formData.emergency_contact_phone)) {
        newErrors.emergency_contact_phone =
          "Valid emergency contact number is required";
      }

      if (formData.courier_type === "STUDENT") {
        if (!formData.student_details?.roll_no.trim()) {
          newErrors.roll_no = "College Roll Number is required";
        }
        if (!formData.student_details?.hostel_block.trim()) {
          newErrors.hostel_block = "Hostel / Hall block is required";
        }
      }

      if (!formData.id_proof_doc_url.trim()) {
        newErrors.id_proof_doc_url = "Please upload ID proof document";
      }
    } else if (step === 3) {
      if (
        (formData.transit_mode === "MOTORCYCLE" ||
          formData.transit_mode === "EV_SCOOTER") &&
        !formData.vehicle_number?.trim()
      ) {
        newErrors.vehicle_number =
          "Vehicle registration number is required for motorized vehicles";
      }
      if (!UPI_REGEX.test(formData.payout_upi_id)) {
        newErrors.payout_upi_id =
          "Invalid UPI ID (e.g. yourname@oksbi or phone@paytm)";
      }
    } else if (step === 4) {
      if (!agreedToConduct) {
        newErrors.conduct =
          "You must agree to the Campus Safety & Conduct Agreement";
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const res = await uploadKycDocument(file);
      setFormData((prev) => ({ ...prev, id_proof_doc_url: res.file_url }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.id_proof_doc_url;
        return next;
      });
      toast.success("Document uploaded successfully!");
    } catch {
      const mockUrl = `/uploads/kyc/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      setFormData((prev) => ({ ...prev, id_proof_doc_url: mockUrl }));
      toast.info("Document saved (preview mode).");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const payload: CourierOnboardingPayload = {
        ...formData,
        payout_upi_id: formData.payout_upi_id.trim().toLowerCase(),
      };

      if (payload.courier_type === "EXTERNAL_GIG") {
        delete payload.student_details;
      }

      const res = await onboardCourier(payload);
      setRegisteredId(res.courier_id || "CB-COURIER-PENDING");
      setCurrentStep(5);
      toast.success("Courier KYC application submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit courier registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 mb-3">
          <Flame className="h-3.5 w-3.5 text-emerald-600" />
          <span>Campus Courier & Student Runner Network</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Deliver with CampusBite
        </h1>
        <p className="text-stone-600 mt-2 max-w-lg mx-auto text-sm sm:text-base">
          Earn ₹20.00 base + ₹14.00 batch drops + 100% night surge bonuses
          with guaranteed instant daily payouts.
        </p>
      </div>

      {/* Wizard Progress Steps */}
      {currentStep < 5 && (
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: "Role" },
              { num: 2, label: "Identity" },
              { num: 3, label: "Vehicle & Payout" },
              { num: 4, label: "Conduct Agreement" },
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
                        ? "bg-stone-900 text-white ring-4 ring-stone-200 shadow-md"
                        : "bg-stone-100 text-stone-400 border border-stone-200"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="h-5 w-5" /> : step.num}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium hidden sm:block ${
                      isActive
                        ? "text-stone-950 font-bold"
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
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Card Container */}
      <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/60 border border-stone-200/80 p-6 sm:p-10">
        {/* STEP 1: Select Role */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Step 1: Choose Your Courier Category
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                Whether you want to earn between lectures or run high-capacity
                shifts, we provide full schedule flexibility.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = formData.courier_type === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleRoleSelect(opt.type)}
                    className={`text-left rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-200"
                        : "border-stone-200 bg-stone-50/50 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-white text-stone-700 border border-stone-200"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span
                          className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-emerald-200 text-emerald-900"
                              : "bg-stone-200 text-stone-600"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <h3 className="font-bold text-stone-900 text-base">
                        {opt.title}
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {opt.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-200/60 text-[11px] text-stone-500">
                      {opt.type === "STUDENT" ? (
                        <span>🎓 Requires College ID Card</span>
                      ) : (
                        <span>🛵 Requires Govt ID (Aadhaar/DL)</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <span>Continue to Identity</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Identity & Academic/Govt Verification */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Step 2: Profile & KYC Verification
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                Provide your contact details and upload valid identity proof.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aman Verma"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm"
                />
                {errors.full_name && (
                  <p className="text-xs text-rose-600 mt-1">{errors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  10-Digit Mobile Number *
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm"
                />
                {errors.phone && (
                  <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="aman.student@campus.edu"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm"
                />
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm"
                />
                {errors.password && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Emergency Contact Phone *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Parent / Guardian / Roommate Phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      emergency_contact_phone: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm"
                />
                {errors.emergency_contact_phone && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.emergency_contact_phone}
                  </p>
                )}
              </div>

              {/* Student Details Fields */}
              {formData.courier_type === "STUDENT" && (
                <div className="sm:col-span-2 bg-stone-50 rounded-2xl p-4 border border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      College Roll No *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2024CS01"
                      value={formData.student_details?.roll_no || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          student_details: {
                            ...(prev.student_details || {
                              roll_no: "",
                              hostel_block: "",
                              year: "1st Year",
                            }),
                            roll_no: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm"
                    />
                    {errors.roll_no && (
                      <p className="text-xs text-rose-600 mt-1">
                        {errors.roll_no}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Hostel / Hall Block *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hall 4 / Tagore"
                      value={formData.student_details?.hostel_block || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          student_details: {
                            ...(prev.student_details || {
                              roll_no: "",
                              hostel_block: "",
                              year: "1st Year",
                            }),
                            hostel_block: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm"
                    />
                    {errors.hostel_block && (
                      <p className="text-xs text-rose-600 mt-1">
                        {errors.hostel_block}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Current Year *
                    </label>
                    <select
                      value={formData.student_details?.year || "1st Year"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          student_details: {
                            ...(prev.student_details || {
                              roll_no: "",
                              hostel_block: "",
                              year: "1st Year",
                            }),
                            year: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm bg-white"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Postgraduate">Postgraduate</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ID Proof Selector & File Dropzone */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  ID Proof Document *
                </label>
                <div className="border-2 border-dashed border-stone-300 rounded-2xl p-5 text-center bg-stone-50 hover:bg-emerald-50/30 hover:border-emerald-400 transition-all">
                  <FileCheck className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-800">
                    Upload{" "}
                    {formData.courier_type === "STUDENT"
                      ? "College Student ID Card"
                      : "Govt ID Proof (Aadhaar / Driving License)"}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Format: JPG, PNG, PDF up to 10MB
                  </p>
                  <div className="mt-3 flex justify-center">
                    <label className="cursor-pointer bg-white border border-stone-300 hover:border-emerald-500 px-4 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-emerald-600 transition-all shadow-xs inline-flex items-center gap-2">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingDoc ? "Uploading..." : "Select Document"}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {formData.id_proof_doc_url && (
                    <p className="text-xs text-emerald-600 font-bold mt-2 truncate max-w-sm mx-auto">
                      ✓ Attached: {formData.id_proof_doc_url}
                    </p>
                  )}
                  {errors.id_proof_doc_url && (
                    <p className="text-xs text-rose-600 font-semibold mt-1">
                      {errors.id_proof_doc_url}
                    </p>
                  )}
                </div>
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <span>Continue to Vehicle & Payout</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Vehicle Mode & UPI Setup */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Step 3: Transit Mode & Instant Payout
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                Choose how you will move orders around campus and enter your
                payout UPI ID.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Transit Mode *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { mode: "WALKING", label: "🚶 Walking", desc: "Short hostel drops" },
                    { mode: "BICYCLE", label: "🚲 Bicycle", desc: "Eco & zero cost" },
                    { mode: "MOTORCYCLE", label: "🛵 Motorcycle", desc: "High batch speed" },
                    { mode: "EV_SCOOTER", label: "⚡ EV Scooter", desc: "Smooth & fast" },
                  ].map((m) => {
                    const isSel = formData.transit_mode === m.mode;
                    return (
                      <button
                        key={m.mode}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            transit_mode: m.mode as TransitMode,
                          }))
                        }
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSel
                            ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-200"
                            : "border-stone-200 hover:border-stone-300 text-stone-700"
                        }`}
                      >
                        <p className="text-sm font-bold">{m.label}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(formData.transit_mode === "MOTORCYCLE" ||
                formData.transit_mode === "EV_SCOOTER") && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Vehicle Registration Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL 01 AB 1234"
                    value={formData.vehicle_number || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vehicle_number: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm font-mono"
                  />
                  {errors.vehicle_number && (
                    <p className="text-xs text-rose-600 mt-1">
                      {errors.vehicle_number}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Payout UPI ID (Instant Earnings Credit) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. aman@okhdfcbank or 9876543210@paytm"
                  value={formData.payout_upi_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      payout_upi_id: e.target.value.trim().toLowerCase(),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-sm font-mono"
                />
                {errors.payout_upi_id && (
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.payout_upi_id}
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <span>Continue to Conduct Agreement</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Safety Conduct Agreement & Submission */}
        {currentStep === 4 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Step 4: Campus Safety & Conduct Agreement
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                CampusBite runners uphold strict campus safety, hygiene, and
                student courtesy standards.
              </p>
            </div>

            <div className="space-y-3 bg-stone-50 rounded-2xl p-5 border border-stone-200 text-xs text-stone-700 leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Tampering Guarantee:</strong> Meal boxes are sealed
                  at the kitchen counter. Never break package seals or tamper
                  with food items.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Campus Speed Limit:</strong> Motorized vehicles must
                  maintain safe speeds below 20 km/h within hostel lanes and
                  academic zones.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Accurate OTP Verification:</strong> Only hand over food
                  after customer provides matching 4-digit OTP at hostel lobby.
                </span>
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-2xl border border-stone-200 bg-stone-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToConduct}
                onChange={(e) => setAgreedToConduct(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-stone-800 font-semibold">
                I agree to the CampusBite Courier Code of Conduct and confirm all
                submitted identification details are accurate.
              </span>
            </label>
            {errors.conduct && (
              <p className="text-xs text-rose-600 font-bold">{errors.conduct}</p>
            )}

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
                  <span>Submitting Courier Application...</span>
                ) : (
                  <>
                    <span>Submit & Request Courier Onboarding</span>
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
            <div className="h-20 w-20 bg-emerald-100 border border-emerald-300 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Clock className="h-10 w-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider mb-2">
                <span>Application Under Review</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900">
                Courier ID Verification in Progress
              </h2>
              <p className="text-stone-600 text-sm max-w-md mx-auto mt-2 leading-relaxed">
                Welcome aboard,{" "}
                <span className="font-bold text-stone-900">
                  {formData.full_name}
                </span>
                ! Our dispatcher team reviews courier registrations within{" "}
                <span className="font-bold text-stone-900">1–3 hours</span>.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 max-w-md mx-auto text-left space-y-3 text-xs">
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Application Reference</span>
                <span className="font-mono font-bold text-stone-900">
                  {registeredId || "CB-COURIER-PENDING"}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Role Type</span>
                <span className="font-bold text-stone-900">
                  {formData.courier_type === "STUDENT"
                    ? "🎓 Student Runner"
                    : "🛵 Campus / Gig Rider"}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Payout UPI</span>
                <span className="font-mono font-bold text-stone-900">
                  {formData.payout_upi_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Status</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  PENDING_VERIFICATION
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href={ROUTES.DELIVERY_LOGIN}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all"
              >
                <span>Courier Portal Login</span>
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
