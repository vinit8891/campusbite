export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  PROFILE: "/profile",
  CART: "/cart",
  CHECKOUT: "/checkout",
  MY_ORDERS: "/my-orders",
  ORDERS: "/orders",
  ORDER_SUCCESS: "/order-success",
  RESTAURANTS: "/restaurants",
  SUBSCRIPTIONS: "/subscriptions",
  SUBSCRIPTIONS_CALENDAR: "/subscriptions/calendar",
  ABOUT: "/about",
  CONTACT: "/contact",
  TERMS: "/terms",
  PRIVACY_POLICY: "/privacy-policy",

  // Restaurant
  RESTAURANT_LOGIN: "/restaurant/login",
  RESTAURANT_REGISTER: "/restaurant/register",
  RESTAURANT_DASHBOARD: "/restaurant/dashboard",
  RESTAURANT_ORDERS: "/restaurant/dashboard/orders",
  RESTAURANT_MENU: "/restaurant/dashboard/menu",
  RESTAURANT_MENU_ADD: "/restaurant/dashboard/menu/add",
  RESTAURANT_PROFILE: "/restaurant/dashboard/profile",
  RESTAURANT_SUBSCRIPTION_PLANS: "/restaurant/dashboard/subscription-plans",
  RESTAURANT_SUBSCRIPTIONS: "/restaurant/dashboard/subscriptions",

  // Delivery
  DELIVERY_LOGIN: "/delivery/login",
  DELIVERY_REGISTER: "/delivery/register",
  DELIVERY_DASHBOARD: "/delivery/dashboard",
  DELIVERY_AVAILABLE: "/delivery/dashboard/available-orders",
  DELIVERY_ORDERS: "/delivery/dashboard/orders",
  DELIVERY_MY: "/delivery/dashboard/my-deliveries",
  DELIVERY_HISTORY: "/delivery/dashboard/history",
  DELIVERY_PROFILE: "/delivery/dashboard/profile",
  DELIVERY_EARNINGS: "/delivery/earnings",

  // Admin
  ADMIN: "/admin",
  ADMIN_LOGIN: "/admin/login",
  ADMIN_ORDERS: "/admin/orders",
  ADMIN_USERS: "/admin/users",
  ADMIN_RESTAURANTS: "/admin/restaurants",
  ADMIN_ADD_RESTAURANT: "/admin/add-restaurant",
  ADMIN_SUBSCRIPTIONS: "/admin/subscriptions",
} as const;

// Dynamic route helpers
export function orderDetailsPath(id: string) {
  return `/orders/${encodeURIComponent(id)}`;
}

export function trackOrderPath(id: string) {
  return `/track-order/${encodeURIComponent(id)}`;
}

export function restaurantDetailsPath(slug: string) {
  return `/restaurants/${encodeURIComponent(slug)}`;
}

export function adminEditRestaurantPath(id: string) {
  return `/admin/edit-restaurant/${encodeURIComponent(id)}`;
}

export function menuEditPath(id: string) {
  return `/restaurant/dashboard/menu/edit/${encodeURIComponent(id)}`;
}

/**
 * Convenient namespaced routes object
 */
export const routes = {
  // Public
  home: ROUTES.HOME,
  login: ROUTES.LOGIN,
  register: ROUTES.REGISTER,
  profile: ROUTES.PROFILE,
  cart: ROUTES.CART,
  checkout: ROUTES.CHECKOUT,
  myOrders: ROUTES.MY_ORDERS,
  orders: ROUTES.ORDERS,
  orderSuccess: ROUTES.ORDER_SUCCESS,
  restaurants: ROUTES.RESTAURANTS,
  restaurantDetails: restaurantDetailsPath,
  orderDetails: orderDetailsPath,
  trackOrder: trackOrderPath,
  subscriptions: ROUTES.SUBSCRIPTIONS,
  subscriptionCalendar: ROUTES.SUBSCRIPTIONS_CALENDAR,
  about: ROUTES.ABOUT,
  contact: ROUTES.CONTACT,
  terms: ROUTES.TERMS,
  privacyPolicy: ROUTES.PRIVACY_POLICY,

  // Restaurant
  restaurant: {
    login: ROUTES.RESTAURANT_LOGIN,
    register: ROUTES.RESTAURANT_REGISTER,
    dashboard: ROUTES.RESTAURANT_DASHBOARD,
    orders: ROUTES.RESTAURANT_ORDERS,
    menu: ROUTES.RESTAURANT_MENU,
    menuCreate: ROUTES.RESTAURANT_MENU_ADD,
    menuEdit: menuEditPath,
    profile: ROUTES.RESTAURANT_PROFILE,
    subscriptionPlans: ROUTES.RESTAURANT_SUBSCRIPTION_PLANS,
    subscriptions: ROUTES.RESTAURANT_SUBSCRIPTIONS,
  },

  // Delivery
  delivery: {
    login: ROUTES.DELIVERY_LOGIN,
    register: ROUTES.DELIVERY_REGISTER,
    dashboard: ROUTES.DELIVERY_DASHBOARD,
    availableOrders: ROUTES.DELIVERY_AVAILABLE,
    activeOrders: ROUTES.DELIVERY_ORDERS,
    orders: ROUTES.DELIVERY_ORDERS,
    myDeliveries: ROUTES.DELIVERY_MY,
    history: ROUTES.DELIVERY_HISTORY,
    profile: ROUTES.DELIVERY_PROFILE,
    earnings: ROUTES.DELIVERY_EARNINGS,
  },

  // Admin
  admin: {
    dashboard: ROUTES.ADMIN,
    login: ROUTES.ADMIN_LOGIN,
    orders: ROUTES.ADMIN_ORDERS,
    users: ROUTES.ADMIN_USERS,
    restaurants: ROUTES.ADMIN_RESTAURANTS,
    addRestaurant: ROUTES.ADMIN_ADD_RESTAURANT,
    editRestaurant: adminEditRestaurantPath,
    subscriptions: ROUTES.ADMIN_SUBSCRIPTIONS,
  },
} as const;
