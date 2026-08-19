import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DeliveryHistoryFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  fromDate: string;
  setFromDate: (val: string) => void;
  toDate: string;
  setToDate: (val: string) => void;
  onRefresh: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function DeliveryHistoryFilterBar({
  q,
  setQ,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  onRefresh,
  onSubmit,
}: DeliveryHistoryFilterBarProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border bg-white p-4 shadow md:grid-cols-[1fr_140px_140px_auto_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customer, restaurant, or order ID"
          className="pl-9"
        />
      </div>

      <Input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        aria-label="From date"
      />

      <Input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        aria-label="To date"
      />

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
