import { authJson } from "@/services/authFetch";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  default_hostel_block?: string;
  default_room?: string;
  default_instructions?: string;
  notification_preferences?: {
    whatsapp_updates: boolean;
    sms_alerts: boolean;
    promo_offers: boolean;
  };
  order_count?: number;
  created_at?: string;
}

export interface UpdateUserProfilePayload {
  name?: string;
  phone?: string;
  default_hostel_block?: string;
  default_room?: string;
  default_instructions?: string;
  notification_preferences?: {
    whatsapp_updates: boolean;
    sms_alerts: boolean;
    promo_offers: boolean;
  };
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export async function getCustomerProfile(): Promise<UserProfile> {
  return authJson<UserProfile>("/users/me", {
    role: "customer",
  });
}

export async function updateCustomerProfile(
  payload: UpdateUserProfilePayload
): Promise<{ success: boolean; message: string }> {
  return authJson<{ success: boolean; message: string }>("/users/me", {
    role: "customer",
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function changeCustomerPassword(
  payload: ChangePasswordPayload
): Promise<{ success: boolean; message: string }> {
  return authJson<{ success: boolean; message: string }>("/users/change-password", {
    role: "customer",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomerAccount(): Promise<{ success: boolean; message: string }> {
  return authJson<{ success: boolean; message: string }>("/users/me", {
    role: "customer",
    method: "DELETE",
  });
}
