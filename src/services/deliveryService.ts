const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

// ----------------------
// Get Available Orders
// ----------------------
export async function getAvailableOrders() {
  const res = await fetch(
    `${API_URL}/orders/delivery/available`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch orders");
  }

  return res.json();
}

// ----------------------
// Accept Delivery
// ----------------------
export async function acceptDelivery(
  orderId: string,
  partner: {
    name: string;
    phone: string;
    vehicle: string;
  }
) {
  const res = await fetch(
    `${API_URL}/orders/delivery/accept/${orderId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(partner),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to accept order");
  }

  return res.json();
}

// ----------------------
// My Deliveries
// ----------------------
export async function getMyDeliveries(
  phone: string
) {
  const res = await fetch(
    `${API_URL}/orders/delivery/my/${phone}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to fetch deliveries"
    );
  }

  return res.json();
}

// ====================================================
// LIVE DELIVERY TRACKING
// ====================================================

// ----------------------
// Update Delivery Partner Location
// ----------------------
export async function updateDeliveryLocation(
  orderId: string,
  latitude: number,
  longitude: number
) {
  const res = await fetch(
    `${API_URL}/orders/delivery/location/${orderId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude,
        longitude,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to update location"
    );
  }

  return res.json();
}

// ----------------------
// Get Live Delivery Location
// ----------------------
export async function getDeliveryLocation(
  orderId: string
) {
  const res = await fetch(
    `${API_URL}/orders/delivery/location/${orderId}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to fetch live location"
    );
  }

  return res.json();
}