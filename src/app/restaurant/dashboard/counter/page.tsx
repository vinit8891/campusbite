"use client";

import { MessCounterScanner } from "@/components/restaurant/MessCounterScanner";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";

export default function MessCounterDashboardPage() {
  const ownerEmail = getRestaurantOwnerEmail() || undefined;

  return (
    <div className="space-y-6">
      <MessCounterScanner restaurantEmail={ownerEmail} />
    </div>
  );
}
