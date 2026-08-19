import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/lib/formatters";

type AvailableOrdersFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  restaurant: string;
  onRestaurantChange: (val: string) => void;
  restaurantOptions: string[];
  paymentMethod: string;
  onPaymentMethodChange: (val: string) => void;
  onRefresh: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function AvailableOrdersFilterBar({
  q,
  setQ,
  restaurant,
  onRestaurantChange,
  restaurantOptions,
  paymentMethod,
  onPaymentMethodChange,
  onRefresh,
  onSubmit,
}: AvailableOrdersFilterBarProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border bg-white p-4 shadow md:grid-cols-[1fr_180px_160px_auto_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customer, restaurant, address, or order ID"
          className="pl-9"
        />
      </div>

      <select
        value={restaurant}
        onChange={(e) => onRestaurantChange(e.target.value)}
        className={selectClassName}
      >
        <option value="">All restaurants</option>
        {restaurantOptions.map((email) => (
          <option key={email} value={email}>
            {email}
          </option>
        ))}
      </select>

      <select
        value={paymentMethod}
        onChange={(e) => onPaymentMethodChange(e.target.value)}
        className={selectClassName}
      >
        <option value="">All payments</option>
        <option value="cod">COD</option>
        <option value="online">Online</option>
      </select>

      <Button type="submit" variant="outline">
        Search
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onRefresh}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
    </form>
  );
}
