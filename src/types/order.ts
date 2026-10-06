import type { DeliveryPartner } from "./delivery";
import type { OrderPricingBreakdown } from "@/lib/orderPricing";
import type { DeliveryMode, PricingBreakdown } from "@/lib/pricingEngine";

export type { OrderPricingBreakdown, DeliveryMode, PricingBreakdown };

export type OrderItem = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  is_budget_meal?: boolean;
};

export type OrderItemPayload = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  is_budget_meal?: boolean;
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
  delivery_type?: DeliveryMode | "HOSTEL_BATCH" | "STANDARD";
  hostel_block?: string | null;
  batch_window_id?: string;
  scheduled_wave?: string;
  batch_id?: string;
  is_batch_addon?: boolean;
  tip_amount?: number;
  pricing_breakdown?: OrderPricingBreakdown | PricingBreakdown;
  restaurant_latitude?: number | null;
  restaurant_longitude?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  items: OrderItemPayload[];
};

export type Order = {
  _id: string;
  id?: string;
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
  delivery_type?: DeliveryMode | "HOSTEL_BATCH" | "STANDARD";
  hostel_block?: string | null;
  batch_window_id?: string;
  scheduled_wave?: string;
  batch_id?: string;
  is_batch_addon?: boolean;
  tip_amount?: number;
  pricing_breakdown?: OrderPricingBreakdown | PricingBreakdown;
  status: string;
  items: OrderItem[];
  created_at?: string;
  accepted_at?: string;
  ready_at?: string;
  paid_at?: string;
  delivered_at?: string;
  updated_at?: string;
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
  customer_phone?: string;
  phone?: string;
  restaurant_email?: string;
  restaurant_name?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  total?: number;
  created_at?: string;
  order_type?: string;
  delivery_type?: string;
  delivery_for?: string;
  food_subtotal?: number;
  small_order_fee?: number;
  platform_fee?: number;
  restaurant_gst?: number;
  delivery_fee?: number;
  tip_amount?: number;
  items?: OrderItem[];
  pricing_breakdown?: OrderPricingBreakdown | PricingBreakdown;
};

export type AdminOrdersQuery = {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  q?: string;
  page?: number;
  limit?: number;
};
