const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export async function placeOrder(
  data: any
) {
  const payload = {
    ...data,

    restaurant_email:
      data.restaurant_email,

    restaurant_latitude:
      data.restaurant_latitude ??
      18.52043,

    restaurant_longitude:
      data.restaurant_longitude ??
      73.856743,

    // GPS is optional
    latitude:
      data.latitude ?? null,

    longitude:
      data.longitude ?? null,

    delivery_for:
      data.delivery_for || "self",
  };

  console.log(
    "Placing Order Payload:",
    payload
  );

  const res = await fetch(
    `${API_URL}/orders/`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const error =
      await res.text();

    console.error(
      "Place Order Error:",
      error
    );

    throw new Error(error);
  }

  return res.json();
}