/**
 * Canonical Order domain models.
 */

import type { DeliveryPartner } from "./delivery";

export type OrderItem = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

export type OrderItemPayload = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
};

export type PlaceOrderPayload = {
  restaurant_email: string;
  customer_name: string;
  phone: string;
  address: string;
  payment_method?: string;
  payment_status?: string;
  total: number;
  delivery_for?: string;
  restaurant_latitude?: number | null;
  restaurant_longitude?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  items: OrderItemPayload[];
};

export type Order = {
  _id: string;
  restaurant_id?: string;
  restaurant_email: string;
  restaurant_name?: string;
  restaurant_image?: string;
  restaurant_cuisine?: string;
  restaurant_phone?: string;
  restaurant_slug?: string;
  customer_name: string;
  customer_email?: string;
  phone: string;
  address: string;

  payment_method: string;
  payment_status?: string;
  total: number;
  status: string;
  items: OrderItem[];
  created_at?: string;
  delivery_for?: string;
  estimated_delivery?: string;
  estimated_time?: string;
  latitude?: number | null;
  longitude?: number | null;
  restaurant_latitude?: number | null;
  restaurant_longitude?: number | null;
  delivery_partner?: DeliveryPartner;
  delivery_otp?: number;
  otp_verified?: boolean;
  review_submitted?: boolean;
};

export type OrderOtp = {
  otp: number | null;
  verified: boolean;
  status: string;
};

export type FilterType = "All" | "Active" | "Delivered" | "Cancelled";

export type SortType =
  | "Newest"
  | "Oldest"
  | "Highest Amount"
  | "Lowest Amount";

export type AdminOrder = {
  _id: string;
  customer_name?: string;
  customer_email?: string;
  restaurant_email?: string;
  restaurant_name?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  total?: number;
  created_at?: string;
};

export type AdminOrdersQuery = {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  q?: string;
  page?: number;
  limit?: number;
};
