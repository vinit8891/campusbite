/**
 * Canonical Subscription and Meal Plan domain models.
 */

export type SubscriptionType = "weekly" | "monthly";
export type MealType = "breakfast" | "lunch" | "dinner" | "combo";
export type SubscriptionStatus = "active" | "paused" | "expired" | "cancelled";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type Subscription = {
  subscription_id: string;
  plan_id?: string | null;
  plan_name?: string | null;
  customer_email: string;
  restaurant_email: string;
  subscription_type: SubscriptionType;
  meal_type: MealType;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  delivery_days: Weekday[];
  price: number;
  payment_status: string;
  auto_renew: boolean;
  skipped_dates: string[];
  pause_from: string | null;
  pause_to: string | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SubscriptionCreateInput = {
  plan_id?: string;
  restaurant_email?: string;
  subscription_type?: SubscriptionType;
  meal_type?: MealType;
  start_date: string;
  end_date?: string;
  delivery_days?: Weekday[];
  price?: number;
  payment_status?: string;
  auto_renew?: boolean;
};

export type SubscriptionCalendarMeal = {
  date: string;
  kind: string;
  subscription_id?: string;
  plan_id?: string | null;
  restaurant_email?: string;
  meal_type?: MealType;
  start_time?: string | null;
  end_time?: string | null;
  plan_name?: string | null;
};

export type SubscriptionCalendar = {
  today_meals: SubscriptionCalendarMeal[];
  upcoming_meals: SubscriptionCalendarMeal[];
  skipped_dates: string[];
  paused_dates: string[];
  range_start: string;
  range_end: string;
};

export type SubscriptionSummary = {
  today_meal: SubscriptionCalendarMeal | null;
  upcoming_meal: SubscriptionCalendarMeal | null;
  last_generated_order: {
    order_id: string;
    status: string;
    payment_status?: string;
    subscription_order_date?: string;
    meal_name?: string | null;
    restaurant_email?: string;
    total?: number;
  } | null;
  subscription_status: SubscriptionStatus | null;
};

export type SubscriptionGenerationStatus = {
  last_generation_time: string | null;
  last_target_date: string | null;
  last_generated_count: number;
  last_skipped_count: number;
  last_trigger: string | null;
  scheduler: {
    enabled: boolean;
    running: boolean;
    status: string;
    daily_time: string | null;
    next_execution: string | null;
  };
};

export type SubscriptionPauseInput = {
  pause_from: string;
  pause_to: string;
};

export type SubscriptionPayment = {
  payment_id: string;
  subscription_id?: string;
  amount: number;
  billing_period: string;
  payment_method: string;
  payment_status: string;
  paid_at?: string | null;
  renewal_due?: string | null;
  transaction_reference?: string | null;
};

export type SubscriptionRenewalResponse = {
  subscription_id: string;
  payment_id: string;
  razorpay_order_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  key_id: string | null;
  payment_status: string;
  plan_name?: string;
};

export type SubscriptionPlan = {
  plan_id: string;
  restaurant_email: string;
  name: string;
  description: string;
  subscription_type: SubscriptionType;
  meal_type: MealType;
  price: number;
  delivery_days: Weekday[];
  start_time: string;
  end_time: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SubscriptionPlanInput = {
  restaurant_email: string;
  name: string;
  description?: string;
  subscription_type: SubscriptionType;
  meal_type: MealType;
  price: number;
  delivery_days: Weekday[];
  start_time: string;
  end_time: string;
  active?: boolean;
};

export type SubscriptionPlanUpdateInput = Partial<
  Omit<SubscriptionPlanInput, "restaurant_email">
>;

export type SubscriptionFilterTab = "all" | "active" | "upcoming" | "history";

export type PaginatedSubscriptionPayments = {
  items: SubscriptionPayment[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type AdminSubscriptionPaymentSummary = {
  total_subscription_revenue: number;
  paid_payments: number;
  pending_payments: number;
  failed_payments: number;
};

export type RestaurantSubscriptionRevenueSummary = {
  active_subscriptions: number;
  monthly_subscription_revenue: number;
  pending_subscription_payments: number;
};

export type AdminSubscriptionsQuery = {
  q?: string;
  status?: SubscriptionStatus | "";
  restaurant_email?: string;
  customer_email?: string;
  page?: number;
  limit?: number;
};
