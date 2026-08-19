/**
 * Canonical Review domain models.
 */

export type Review = {
  id?: string;
  order_id: string;
  restaurant_email: string;
  delivery_partner_phone?: string;
  customer_name: string;
  rating: number;
  review: string;
  created_at?: string;
};

export type ReviewItem = {
  id: string;
  customer_name: string;
  rating: number;
  review: string;
};

export type ReviewSubmitPayload = {
  order_id: string;
  restaurant_email: string;
  delivery_partner_phone?: string;
  customer_name: string;
  rating: number;
  review: string;
};
