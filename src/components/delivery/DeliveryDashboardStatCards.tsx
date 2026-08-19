type DeliveryDashboardStatCardsProps = {
  assigned: number;
  pickedUp: number;
  deliveredToday: number;
  earningsToday: number;
  totalDeliveries: number;
  allTimeEarnings?: number;
};

function StatCard({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <h2 className={`mt-2 text-4xl font-bold ${valueClass}`}>{value}</h2>
      {hint ? <p className="mt-2 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

export function DeliveryDashboardStatCards({
  assigned,
  pickedUp,
  deliveredToday,
  earningsToday,
  totalDeliveries,
  allTimeEarnings,
}: DeliveryDashboardStatCardsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Assigned Orders"
        value={String(assigned)}
        valueClass="text-orange-600"
      />
      <StatCard
        label="Picked Up"
        value={String(pickedUp)}
        valueClass="text-blue-600"
      />
      <StatCard
        label="Delivered Today"
        value={String(deliveredToday)}
        valueClass="text-green-600"
      />
      <StatCard
        label="Earnings Today"
        value={`₹${earningsToday}`}
        valueClass="text-emerald-700"
      />
      <StatCard
        label="Total Deliveries"
        value={String(totalDeliveries)}
        valueClass="text-slate-800"
        hint={`All-time earnings ₹${allTimeEarnings ?? 0}`}
      />
    </div>
  );
}
