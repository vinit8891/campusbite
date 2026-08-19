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

export type AdminStats = {
  users: number;
  restaurant_owners: number;
  restaurants: number;
  delivery_partners: number;
  orders: number;
};

export type BackendHealth = {
  status: string;
  app_name?: string;
  environment?: string;
  database?: string;
  version?: string;
  uptime?: number;
};

