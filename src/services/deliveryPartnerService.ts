const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

// ----------------------
// Get Delivery Partner Status
// ----------------------
export async function getDeliveryStatus(
  phone: string
) {
  const res = await fetch(
    `${API}/delivery-partner/status/${phone}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to fetch delivery partner status"
    );
  }

  return res.json();
}

// ----------------------
// Update Online / Offline Status
// ----------------------
export async function updateDeliveryStatus(
  phone: string,
  online: boolean
) {
  const res = await fetch(
    `${API}/delivery-partner/status`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        online,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to update delivery status"
    );
  }

  return res.json();
}