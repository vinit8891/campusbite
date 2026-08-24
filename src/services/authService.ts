import { publicJson } from "@/services/authFetch";
import type {
  LoginCredentials,
  CustomerRegisterPayload,
  CustomerLoginResponse,
  CustomerRegisterResponse,
  RestaurantLoginResponse,
  DeliveryPartnerInfo,
  DeliveryLoginResponse,
  AdminLoginResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from "@/types";

export type {
  LoginCredentials,
  CustomerRegisterPayload,
  CustomerLoginResponse,
  CustomerRegisterResponse,
  RestaurantLoginResponse,
  DeliveryPartnerInfo,
  DeliveryLoginResponse,
  AdminLoginResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
};


export async function loginCustomer(credentials: LoginCredentials) {
  return publicJson<CustomerLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function registerCustomer(payload: CustomerRegisterPayload) {
  return publicJson<CustomerRegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginRestaurantOwner(credentials: LoginCredentials) {
  return publicJson<RestaurantLoginResponse>("/restaurant-owner/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function loginDeliveryPartner(credentials: LoginCredentials) {
  return publicJson<DeliveryLoginResponse>("/delivery/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function loginAdmin(credentials: LoginCredentials) {
  return publicJson<AdminLoginResponse>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function requestPasswordReset(payload: ForgotPasswordPayload) {
  return publicJson<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: ResetPasswordPayload) {
  return publicJson<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

