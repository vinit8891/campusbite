type DeliveryHistoryStatCardsProps = {
  totalDeliveries: number;
  weekDeliveries: number;
  monthDeliveries: number;
};

export function DeliveryHistoryStatCards({
  totalDeliveries,
  weekDeliveries,
  monthDeliveries,
}: DeliveryHistoryStatCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl bg-white p-6 shadow">
        <p className="text-sm text-gray-500">Total Deliveries</p>
        <p className="mt-2 text-4xl font-bold text-slate-800">
          {totalDeliveries}
        </p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow">
        <p className="text-sm text-gray-500">Deliveries This Week</p>
        <p className="mt-2 text-4xl font-bold text-orange-600">
          {weekDeliveries}
        </p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow">
        <p className="text-sm text-gray-500">Deliveries This Month</p>
        <p className="mt-2 text-4xl font-bold text-emerald-700">
          {monthDeliveries}
        </p>
      </div>
    </div>
  );
}
