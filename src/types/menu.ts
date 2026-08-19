/**
 * Canonical Menu and MenuItem domain models.
 */

export interface MenuItem {
  id?: number | string;
  _id?: string;
  restaurant_email?: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
  available?: boolean;
  isVeg?: boolean;
  type?: string;
  bestseller?: boolean;
  is_bestseller?: boolean;
  best_seller?: boolean;
}

export type BackendMenuItem = {
  _id?: string;
  id?: number | string;
  restaurant_email?: string;
  name: string;
  description?: string;
  image: string;
  price: number;
  category?: string;
  available?: boolean;
};



export type MenuQuery = {
  q?: string;
  category?: string;
  available?: boolean;
  page?: number;
  limit?: number;
};
