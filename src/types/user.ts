/**
 * Canonical User, Customer, and Auth domain models.
 */

export interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  created_at?: string | null;
}

export type Customer = User;

export type CustomerRegisterPayload = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type CustomerLoginResponse = {
  access_token: string;
  token_type: string;
};

export type CustomerRegisterResponse = {
  message: string;
};

export type RestaurantLoginResponse = {
  access_token: string;
  token_type: string;
  owner_name: string;
  restaurant_name: string;
  email: string;
};

export type AdminLoginResponse = {
  access_token: string;
  token_type: string;
};

export type ForgotPasswordPayload = {
  email: string;
  role: "customer" | "restaurant_owner" | "delivery_partner";
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordPayload = {
  token: string;
  new_password: string;
  role: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at?: string | null;
};

export type AdminRestaurantOwner = {
  id: string;
  name: string;
  email: string;
  restaurant: string;
};

export type AdminFinancialAnalytics = {
  total_revenue: number;
  platform_earnings: number;
  total_orders: number;
  restaurant_settlements: number;
  courier_payouts: number;
  gst_pool: number;
  average_order_value: number;
};

export type AdminStats = {
  users: number;
  restaurant_owners: number;
  restaurants: number;
  delivery_partners: number;
  orders: number;
  total_revenue?: number;
  platform_earnings?: number;
  total_orders?: number;
  restaurant_settlements?: number;
  courier_payouts?: number;
  gst_pool?: number;
  average_order_value?: number;
};

export type BackendHealth = {
  status: string;
  app_name?: string;
  environment?: string;
  database?: string;
  version?: string;
  uptime?: number;
};

