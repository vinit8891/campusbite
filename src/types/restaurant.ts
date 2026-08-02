export interface MenuItem {
    id: number;
    name: string;
    description: string;
    image: string;
    price: number;
  }
  
  export interface Restaurant {
    id: number;
    slug: string;
    name: string;
    image: string;
    description: string;
    rating: number;
    category: string;
    deliveryTime: string;
    menu: MenuItem[];
  }