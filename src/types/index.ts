export interface MenuItem {
    id: number;
    name: string;
    description?: string;
    image: string;
    price: number;
  }
  
  export interface Restaurant {
    id?: number;
    slug: string;
    name: string;
    image: string;
    rating: number;
    deliveryTime: string;
    category?: string;
    cuisine?: string;
    distance?: string;
    description?: string;
    address?: string;
    menu: MenuItem[];
  }
  
  export interface CartItem {
    id: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
  }
  
  export interface Address {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark: string;
  }
  
  export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
  }