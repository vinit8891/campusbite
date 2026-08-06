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

// ----------------------
// Update Live Location
// ----------------------
export async function updateLiveLocation(
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
// Get Delivery OTP
// ----------------------
export async function getOrderOTP(
  orderId: string
) {
  const res = await fetch(
    `${API_URL}/orders/otp/${orderId}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to get OTP");
  }

  return res.json();
}

// ----------------------
// Verify Delivery OTP
// ----------------------
export async function verifyDeliveryOTP(
  orderId: string,
  otp: number
) {
  const res = await fetch(
    `${API_URL}/orders/verify-otp/${orderId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        otp,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("OTP verification failed");
  }

  return res.json();
}