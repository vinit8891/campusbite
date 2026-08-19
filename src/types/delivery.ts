/**
 * Canonical Delivery and Delivery Partner domain models.
 */

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
  created_at?: string;
};

export type DeliveryPartnerInfo = {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  vehicle_number: string;
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
  status?: string;
  items?: Array<{
    id?: number | string;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
  restaurant_email?: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  delivery_partner?: {
    accepted_at?: string;
    phone?: string;
    name?: string;
  };
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

export type AdminDeliveryPartner = {
  id: string;
  name: string;
  email: string;
  status: string;
};


