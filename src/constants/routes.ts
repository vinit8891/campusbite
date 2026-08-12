export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",

  CART: "/cart",
  CHECKOUT: "/checkout",

  RESTAURANTS: "/restaurants",

  ORDER_SUCCESS: "/order-success",

  PROFILE: "/profile",

  RESTAURANT_DASHBOARD: "/restaurant/dashboard",
  RESTAURANT_ORDERS: "/restaurant/dashboard/orders",
  RESTAURANT_MENU: "/restaurant/dashboard/menu",
  RESTAURANT_LOGIN: "/restaurant/login",

  DELIVERY_DASHBOARD: "/delivery/dashboard",
  DELIVERY_AVAILABLE: "/delivery/dashboard/available-orders",
  DELIVERY_MY: "/delivery/dashboard/my-deliveries",
  DELIVERY_HISTORY: "/delivery/dashboard/history",
  DELIVERY_LOGIN: "/delivery/login",

  ADMIN: "/admin",
  ADMIN_LOGIN: "/admin/login",
  ADMIN_ORDERS: "/admin/orders",
  ADMIN_RESTAURANTS: "/admin/restaurants",
  ADMIN_ADD_RESTAURANT: "/admin/add-restaurant",
  ADMIN_USERS: "/admin/users",
} as const;

export function adminEditRestaurantPath(id: string) {
  return `/admin/edit-restaurant/${id}` as const;
}