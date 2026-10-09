export type VendorType = "CAMPUS_CANTEEN" | "HOME_TIFFIN" | "STREET_STALL";

export type CourierType = "STUDENT" | "EXTERNAL_GIG";

export type VerificationStatus =
  | "PENDING_VERIFICATION"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type TransitMode = "WALKING" | "BICYCLE" | "MOTORCYCLE" | "EV_SCOOTER";

export type ComplianceDocType =
  | "FSSAI_LICENSE"
  | "AADHAAR_KYC"
  | "COLLEGE_PERMIT";

export type CourierIdProofType = "STUDENT_ID" | "AADHAAR" | "DRIVING_LICENSE";

export interface StudentDetails {
  roll_no: string;
  hostel_block: string;
  year: string;
}

export interface RestaurantOnboardingPayload {
  vendor_type: VendorType;
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  address_or_stall_landmark: string;
  is_inside_campus: boolean;
  compliance_doc_type: ComplianceDocType;
  compliance_doc_url: string;
  kitchen_or_stall_photo_url: string;
  bank_account_holder: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  settlement_upi_id: string;
}

export interface CourierOnboardingPayload {
  courier_type: CourierType;
  full_name: string;
  phone: string;
  email: string;
  password: string;
  transit_mode: TransitMode;
  id_proof_type: CourierIdProofType;
  id_proof_doc_url: string;
  student_details?: StudentDetails;
  vehicle_number?: string;
  payout_upi_id: string;
  emergency_contact_phone: string;
}

export interface PendingVerificationItem {
  id: string;
  partner_type: "restaurant" | "courier";
  vendor_type?: VendorType;
  courier_type?: CourierType;
  business_name?: string;
  full_name?: string;
  owner_name?: string;
  phone: string;
  email: string;
  verification_status: VerificationStatus;
  created_at: string;
  address_or_stall_landmark?: string;
  is_inside_campus?: boolean;
  compliance_doc_type?: ComplianceDocType;
  compliance_doc_url?: string;
  kitchen_or_stall_photo_url?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  settlement_upi_id?: string;
  transit_mode?: TransitMode;
  id_proof_type?: CourierIdProofType;
  id_proof_doc_url?: string;
  student_details?: StudentDetails;
  vehicle_number?: string;
  payout_upi_id?: string;
  emergency_contact_phone?: string;
  rejection_reason?: string;
}

export interface PendingVerificationsResponse {
  counts: {
    all: number;
    canteens: number;
    tiffins: number;
    stalls: number;
    students: number;
    externals: number;
  };
  items: PendingVerificationItem[];
}

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const UPI_REGEX = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;
