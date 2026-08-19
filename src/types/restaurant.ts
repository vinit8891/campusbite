/**
 * Canonical Restaurant domain models.
 */

import type { BackendMenuItem, MenuItem } from "./menu";

export interface Restaurant {
  id?: number | string;
  _id?: string;
  slug?: string;
  name: string;
  email?: string;
  image?: string;
  rating?: number;
  deliveryTime?: string;
  category?: string;
  cuisine?: string;
  distance?: string;
  description?: string;
  address?: string;
  phone?: string;
  menu?: MenuItem[] | BackendMenuItem[];
}


export type BackendRestaurant = {
  _id: string;
  slug: string;
  name: string;
  email: string;
  cuisine?: string;
  rating?: number;
  delivery_time?: string;
  distance?: string;
  image: string;
  description?: string;
  address?: string;
  phone?: string;
  opening_hours?: string;
  closing_hours?: string;
  latitude?: number;
  longitude?: number;
  menu?: BackendMenuItem[];
};

export type RestaurantsQuery = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  email?: string;
  slug?: string;
  include_menu?: boolean;
};

export type AdminRestaurantInput = {
  slug: string;
  name: string;
  email: string;
  cuisine: string;
  rating: number;
  delivery_time: string;
  distance: string;
  image: string;
  latitude: number;
  longitude: number;
};