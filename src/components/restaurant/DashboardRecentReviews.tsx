import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyticsOverview } from "@/hooks/restaurant/useRestaurantDashboard";

type DashboardRecentReviewsProps = {
  analytics: AnalyticsOverview | null;
};

export function DashboardRecentReviews({
  analytics,
}: DashboardRecentReviewsProps) {
  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle>Recent Reviews</CardTitle>
        <CardDescription>
          Average {analytics?.reviews_summary.average_rating ?? 0} ★ across{" "}
          {analytics?.reviews_summary.count ?? 0} reviews
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(analytics?.recent_reviews || []).length === 0 ? (
          <p className="text-sm text-gray-500">
            No reviews yet. Feedback will appear here after customers rate
            delivered orders.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(analytics?.recent_reviews || []).map((review) => (
              <div
                key={review.id}
                className="rounded-xl border bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{review.customer_name}</p>
                  <p className="text-sm font-bold text-yellow-600">
                    ⭐ {review.rating}
                  </p>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                  {review.review || "No written feedback."}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
