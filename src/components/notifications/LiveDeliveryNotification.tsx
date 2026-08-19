"use client";

type Props = {
  status: string;
};

export default function LiveDeliveryNotification({
  status,
}: Props) {
  let message = "";
  let color = "";

  switch (status) {
    case "Assigned":
      message =
        "🛵 Delivery partner has accepted your order.";
      color = "bg-blue-100 text-blue-700";
      break;

    case "Picked Up":
      message =
        "📦 Your order has been picked up.";
      color = "bg-orange-100 text-orange-700";
      break;

    case "Out for Delivery":
      message =
        "🚀 Your order is on the way!";
      color = "bg-purple-100 text-purple-700";
      break;

    case "Delivered":
      message =
        "🎉 Order Delivered Successfully!";
      color = "bg-green-100 text-green-700";
      break;

    default:
      return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-5 rounded-xl p-4 font-semibold ${color}`}
    >
      {message}
    </div>
  );
}