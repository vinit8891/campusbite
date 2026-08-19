import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/lib/formatters";
import {
  ADMIN_SUBSCRIPTION_STATUSES,
} from "@/hooks/admin/useAdminSubscriptions";
import type { SubscriptionStatus } from "@/services/subscriptionService";

type AdminSubscriptionFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  status: SubscriptionStatus | "";
  setStatus: (val: SubscriptionStatus | "") => void;
  restaurantEmail: string;
  setRestaurantEmail: (val: string) => void;
  customerEmail: string;
  setCustomerEmail: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
};

export function AdminSubscriptionFilterBar({
  q,
  setQ,
  status,
  setStatus,
  restaurantEmail,
  setRestaurantEmail,
  customerEmail,
  setCustomerEmail,
  onSubmit,
  onReset,
}: AdminSubscriptionFilterBarProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-3 rounded-xl border bg-white p-4 lg:grid-cols-5"
    >
      <div className="relative lg:col-span-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search customer or restaurant email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <select
        className={selectClassName}
        value={status}
        onChange={(e) =>
          setStatus(e.target.value as SubscriptionStatus | "")
        }
      >
        <option value="">All statuses</option>
        {ADMIN_SUBSCRIPTION_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <Input
        placeholder="Restaurant email"
        value={restaurantEmail}
        onChange={(e) => setRestaurantEmail(e.target.value)}
      />

      <Input
        placeholder="Customer email"
        value={customerEmail}
        onChange={(e) => setCustomerEmail(e.target.value)}
      />

      <div className="flex gap-2 lg:col-span-5">
        <Button type="submit">Apply filters</Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </form>
  );
}
