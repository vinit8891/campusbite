/**
 * Canonical Delivery and Delivery Partner domain models.
 */

export const RIDER_BASE_PAYOUT = 20.00; // Primary drop wage (₹20.00)
export const RIDER_BATCH_ADDON_PAYOUT = 14.00; // Secondary/subsequent drop add-on wage (₹14.00)
export const LARGE_CART_THRESHOLD = 150.00;
export const LARGE_CART_RIDER_BONUS = 5.00;
export const NIGHT_SURGE_FEE = 10.00;

export const MILESTONE_TIER_1 = { count: 3, bonus: 20.0 };   // 3 drops = +₹20
export const MILESTONE_TIER_2 = { count: 6, bonus: 50.0 };   // 6 drops = +₹50
export const MILESTONE_TIER_3 = { count: 10, bonus: 100.0 }; // 10 drops = +₹100
export const RIDER_MILESTONES = [MILESTONE_TIER_1, MILESTONE_TIER_2, MILESTONE_TIER_3];

export type DeliveryPartner = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  vehicle?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  latitude?: number | null;
  longitude?: number | null;
  cash_in_hand?: number;
  total_payout_earned?: number;
  net_cash_due?: number;
  is_active?: boolean;
  is_online?: boolean;
};

export type RiderCashReconciliation = {
  cash_in_hand: number;
  total_payout_earned: number;
  net_cash_due: number;
  total_cod_collected?: number;
  total_remitted?: number;
  completed_deliveries?: number;
  isLocked?: boolean;
  is_locked?: boolean;
  lockout_reason?: string;
  excess_amount?: number;
  max_limit?: number;
};

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
  cash_in_hand?: number;
  total_payout_earned?: number;
  net_cash_due?: number;
  created_at?: string;
};

export type DeliveryPartnerInfo = {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  vehicle_number: string;
  cash_in_hand?: number;
  total_payout_earned?: number;
  net_cash_due?: number;
};

export type DeliveryLoginResponse = {
  success: boolean;
  message: string;
  token: string;
  access_token: string;
  partner: DeliveryPartnerInfo;
};

export type AvailableOrdersQuery = {
  q?: string;
  restaurant?: string;
  payment_method?: string;
  page?: number;
  limit?: number;
};

export type MyDeliveriesQuery = {
  status?: string;
  q?: string;
  limit?: number;
};

export type DeliveryOrder = {
  _id: string;
  customer_name?: string;
  customer_email?: string;
  phone?: string;
  address?: string;
  payment_method?: string;
  payment_status?: string;
  total?: number;
  food_subtotal?: number;
  subtotal?: number;
  tip_amount?: number;
  tip?: number;
  delivery_fee?: number;
  is_batch_addon?: boolean;
  isBatchAddon?: boolean;
  batch_id?: string;
  calculated_payout?: number;
  status?: string;
  cash_in_hand?: number;
  total_payout_earned?: number;
  net_cash_due?: number;
  items?: Array<{
    id?: number | string;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
  restaurant_email?: string;
  restaurant_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  delivery_partner?: {
    accepted_at?: string;
    phone?: string;
    name?: string;
    vehicle?: string;
    cash_in_hand?: number;
    total_payout_earned?: number;
    net_cash_due?: number;
  };
};

export type DeliveryDashboardOrder = {
  _id: string;
  restaurant_email?: string;
  customer_name?: string;
  phone?: string;
  address?: string;
  total?: number;
  food_subtotal?: number;
  subtotal?: number;
  tip_amount?: number;
  tip?: number;
  delivery_fee?: number;
  is_batch_addon?: boolean;
  isBatchAddon?: boolean;
  batch_id?: string;
  calculated_payout?: number;
  status?: string;
  items?: Array<{
    id?: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
};


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
  cash_in_hand?: number;
  total_payout_earned?: number;
  net_cash_due?: number;
  isLocked?: boolean;
  is_locked?: boolean;
  lockout_reason?: string;
  excess_amount?: number;
  max_limit?: number;
  cash_reconciliation?: RiderCashReconciliation;
  recent_assigned_orders?: DeliveryDashboardOrder[];
};

export type AdminDeliveryPartner = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  vehicle?: string;
  vehicle_number?: string;
  status: string;
  cash_in_hand?: number;
  total_payout_earned?: number;
  net_cash_due?: number;
};

export type RiderCihStatus = "ACTIVE" | "APPROACHING_LIMIT" | "LOCKED";

export type RiderReconciliationItem = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle?: string;
  vehicle_number?: string;
  orders_delivered: number;
  cash_collected: number;
  wages_kept: number;
  net_cash_due: number;
  net_due: number;
  max_limit: number;
  is_locked: boolean;
  excess_amount: number;
  status: RiderCihStatus | string;
  remittance_status: "CLEAR" | "DUES_PENDING";
  approved_remittances?: number;
  utr?: string;
  remitted_at?: string;
};

export type RiderReconciliationSummary = {
  total_cash_collected: number;
  total_campus_cih?: number;
  total_wages_kept: number;
  net_unremitted_dues: number;
  locked_riders_count?: number;
  approaching_limit_count?: number;
  active_riders_count?: number;
  riders: RiderReconciliationItem[];
};

export type CanteenDailySettlement = {
  restaurant_email: string;
  restaurant_name: string;
  upi_id: string;
  orders_count: number;
  gross_food_sales: number;
  commission_deducted: number;
  gst_amount?: number;
  net_payable_subtotal: number;
  net_disbursed?: number;
  status: "Settled" | "Pending";
  settled_at?: string;
  settled_by?: string;
  transaction_ref?: string;
  settlement_date: string;
};

export type TrackingLocation = {
  customer_latitude: number;
  customer_longitude: number;
  partner_latitude?: number | null;
  partner_longitude?: number | null;
  restaurant_latitude: number;
  restaurant_longitude: number;
  status: string;
  restaurant_name?: string;
  restaurant_cuisine?: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  delivery_partner_vehicle?: string;
  customer_name?: string;
  customer_address?: string;
  is_within_200m?: boolean;
  distance_meters?: number | null;
  hostel_block?: string | null;
};



