import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/lib/formatters";
import {
  ADMIN_ORDER_STATUSES,
  ADMIN_PAYMENT_STATUSES,
  ADMIN_PAYMENT_METHODS,
} from "@/hooks/admin/useAdminOrders";

type AdminOrdersFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (val: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (val: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function AdminOrdersFilterBar({
  q,
  setQ,
  status,
  onStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  paymentMethod,
  onPaymentMethodChange,
  loading,
  onSubmit,
}: AdminOrdersFilterBarProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-5"
    >
      <div className="relative xl:col-span-2">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, order ID, restaurant…"
          className="h-10 pl-9"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className={selectClassName}
        aria-label="Order status"
      >
        <option value="">All statuses</option>
        {ADMIN_ORDER_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        value={paymentStatus}
        onChange={(e) => onPaymentStatusChange(e.target.value)}
        className={selectClassName}
        aria-label="Payment status"
      >
        <option value="">All payment statuses</option>
        {ADMIN_PAYMENT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className={selectClassName}
          aria-label="Payment method"
        >
          <option value="">All methods</option>
          {ADMIN_PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>

        <Button
          type="submit"
          variant="outline"
          className="h-10 shrink-0 gap-2"
          disabled={loading}
          aria-label="Refresh orders"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </Button>
      </div>
    </form>
  );
}
