import { authJson, publicJson } from "@/services/authFetch";
import { API_URL } from "@/services/apiConfig";
import type {
  RestaurantOnboardingPayload,
  CourierOnboardingPayload,
  PendingVerificationsResponse,
  PendingVerificationItem,
} from "@/types/partnerOnboarding";

export async function onboardRestaurant(payload: RestaurantOnboardingPayload) {
  return await publicJson<{
    success: boolean;
    restaurant_id: string;
    verification_status: string;
    message: string;
  }>("/restaurant/onboard", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function onboardCourier(payload: CourierOnboardingPayload) {
  return await publicJson<{
    success: boolean;
    courier_id: string;
    verification_status: string;
    message: string;
  }>("/delivery/onboard", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadKycDocument(file: File): Promise<{
  success: boolean;
  filename: string;
  file_url: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/upload/kyc-document`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to upload document");
  }

  return await res.json();
}

export async function getPendingVerifications(
  tab: string = "all"
): Promise<PendingVerificationsResponse> {
  return await authJson<PendingVerificationsResponse>(
    `/admin/verifications/pending?tab=${encodeURIComponent(tab)}`,
    {
      role: "admin",
      cache: "no-store",
    }
  );
}

export async function submitVerificationDecision(
  partnerType: "restaurant" | "courier",
  id: string,
  action: "APPROVE" | "REJECT" | "SUSPEND",
  rejectionReason?: string
): Promise<{
  success: boolean;
  message: string;
  verification_status: string;
  partner: PendingVerificationItem;
}> {
  return await authJson(
    `/admin/verifications/${partnerType}/${encodeURIComponent(id)}/decision`,
    {
      role: "admin",
      method: "POST",
      body: JSON.stringify({
        action,
        rejection_reason: rejectionReason,
      }),
    }
  );
}
