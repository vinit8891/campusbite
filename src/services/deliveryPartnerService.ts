import { authJson } from "@/services/authFetch";
import type {
  DeliveryPartnerProfile,
  DeliveryDashboardStats,
  DeliveryDashboardOrder,
} from "@/types";

export type {
  DeliveryPartnerProfile,
  DeliveryDashboardStats,
  DeliveryDashboardOrder,
};

export async function getDeliveryStatus(phone: string) {
  return authJson<{ online: boolean }>(
    `/delivery-partner/status/${encodeURIComponent(phone)}`,
    {
      role: "delivery_partner",
      cache: "no-store",
    }
  );
}

export async function updateDeliveryStatus(
  phone: string,
  online: boolean
) {
  return authJson("/delivery-partner/status", {
    role: "delivery_partner",
    method: "PUT",
    body: JSON.stringify({
      phone,
      online,
    }),
  });
}

export async function getDeliveryPartnerProfile() {
  return authJson<DeliveryPartnerProfile>("/delivery-partner/me", {
    role: "delivery_partner",
    cache: "no-store",
  });
}

export async function updateDeliveryPartnerProfile(payload: {
  name?: string;
  vehicle?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  profile_image?: string;
  online?: boolean;
}) {
  return authJson<{
    message: string;
    partner: DeliveryPartnerProfile;
  }>("/delivery-partner/me", {
    role: "delivery_partner",
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getDeliveryStats(phone: string) {
  return authJson<DeliveryDashboardStats>(
    `/delivery-dashboard/stats/${encodeURIComponent(phone)}`,
    {
      role: "delivery_partner",
      cache: "no-store",
    }
  );
}
