/**
 * Canonical Cart and Address domain models.
 */

export interface CartItem {
  id: string;
  restaurant_id?: string;
  restaurant_email: string;
  restaurant_name?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}


export interface Address {
  fullName: string;
  phone: string;
  address: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  delivery_instructions?: string;
}