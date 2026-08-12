import { authJson } from "@/services/authFetch";

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

export type DeliveryPartnerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  vehicle_type: string;
  vehicle_number: string;
  profile_image?: string;
  online: boolean;
  created_at?: string;
};

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

export type DeliveryDashboardStats = {
  phone?: string;
  pending: number;
  completed: number;
  earnings: number;
  rating: number;
  assigned_orders?: number;
  picked_up_orders?: number;
  delivered_today?: number;
  earnings_today?: number;
  total_deliveries?: number;
  deliveries_this_week?: number;
  deliveries_this_month?: number;
  recent_assigned_orders?: DeliveryDashboardOrder[];
};

export type DeliveryDashboardOrder = {
  _id: string;
  restaurant_email?: string;
  customer_name?: string;
  phone?: string;
  address?: string;
  total?: number;
  status?: string;
  items?: Array<{
    id?: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
};

export async function getDeliveryStats(phone: string) {
  return authJson<DeliveryDashboardStats>(
    `/delivery-dashboard/stats/${encodeURIComponent(phone)}`,
    {
      role: "delivery_partner",
      cache: "no-store",
    }
  );
}
