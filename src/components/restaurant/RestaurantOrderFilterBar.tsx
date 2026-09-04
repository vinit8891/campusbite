import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/lib/formatters";
import {
  RESTAURANT_ORDER_STATUSES,
  RESTAURANT_PAYMENT_STATUSES,
  RESTAURANT_PAYMENT_METHODS,
} from "@/hooks/restaurant/useRestaurantOrders";

type RestaurantOrderFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (val: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (val: string) => void;
  loading: boolean;
  onSearchSubmit: (e: React.FormEvent) => void;
};

export function RestaurantOrderFilterBar({
  q,
  setQ,
  status,
  onStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  paymentMethod,
  onPaymentMethodChange,
  loading,
  onSearchSubmit,
}: RestaurantOrderFilterBarProps) {
  return (
    <form
      onSubmit={onSearchSubmit}
      className="grid gap-3 rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs md:grid-cols-2 xl:grid-cols-5"
    >
      <div className="relative xl:col-span-2">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customer, phone, or order ID…"
          className="h-11 pl-9 rounded-2xl border-stone-200 focus-visible:ring-orange-500"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className={`${selectClassName} h-11 rounded-2xl`}
        aria-label="Order status"
      >
        <option value="">All statuses</option>
        {RESTAURANT_ORDER_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        value={paymentStatus}
        onChange={(e) => onPaymentStatusChange(e.target.value)}
        className={`${selectClassName} h-11 rounded-2xl`}
        aria-label="Payment status"
      >
        <option value="">All payment statuses</option>
        {RESTAURANT_PAYMENT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className={`${selectClassName} h-11 rounded-2xl flex-1`}
          aria-label="Payment method"
        >
          <option value="">All methods</option>
          {RESTAURANT_PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>

        <Button
          type="submit"
          variant="outline"
          className="h-11 rounded-2xl shrink-0 gap-2 border-stone-200 hover:bg-stone-50 font-bold"
          disabled={loading}
          aria-label="Refresh orders"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin text-orange-600" : "text-stone-500"}
          />
          <span>Refresh</span>
        </Button>
      </div>
    </form>
  );
}

