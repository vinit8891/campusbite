type Props = {
    jobs: number;
    earnings: number;
  };
  
  export default function DeliveryStats({
    jobs,
    earnings,
  }: Props) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
  
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">
            Today&apos;s Deliveries
          </h2>
  
          <p className="mt-4 text-5xl font-bold text-orange-600">
            {jobs}
          </p>
        </div>
  
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">
            Today&apos;s Earnings
          </h2>
  
          <p className="mt-4 text-5xl font-bold text-green-600">
            ₹{earnings}
          </p>
        </div>
  
      </div>
    );
  }