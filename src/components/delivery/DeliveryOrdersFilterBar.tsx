import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/lib/formatters";
import { DELIVERY_STATUS_OPTIONS } from "@/hooks/delivery/useDeliveryOrders";

type DeliveryOrdersFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  onRefresh: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function DeliveryOrdersFilterBar({
  q,
  setQ,
  status,
  onStatusChange,
  onRefresh,
  onSubmit,
}: DeliveryOrdersFilterBarProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border bg-white p-4 shadow md:grid-cols-[1fr_180px_auto_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customer, email, or order ID"
          className="pl-9"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className={selectClassName}
      >
        <option value="">All statuses</option>
        {DELIVERY_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
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
