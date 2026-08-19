import { formatDate, formatDateTime } from "@/lib/formatters";
import type {
  SubscriptionGenerationStatus,
  AdminSubscriptionPaymentSummary,
} from "@/services/subscriptionService";

type AdminSubscriptionSummaryCardsProps = {
  generationStatus: SubscriptionGenerationStatus | null;
  paymentSummary: AdminSubscriptionPaymentSummary | null;
};

export function AdminSubscriptionSummaryCards({
  generationStatus,
  paymentSummary,
}: AdminSubscriptionSummaryCardsProps) {
  return (
    <>
      <div className="mb-6 grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Last Generation Time
          </p>
          <p className="mt-1 font-medium">
            {formatDateTime(generationStatus?.last_generation_time)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Last Generated Count
          </p>
          <p className="mt-1 font-medium">
            {generationStatus?.last_generated_count ?? 0}
            {generationStatus?.last_target_date
              ? ` · ${formatDate(generationStatus.last_target_date)}`
              : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Scheduler Status
          </p>
          <p className="mt-1 font-medium capitalize">
            {generationStatus?.scheduler.status ?? "—"}
            {generationStatus?.scheduler.daily_time
              ? ` · ${generationStatus.scheduler.daily_time}`
              : ""}
          </p>
          {generationStatus?.scheduler.next_execution ? (
            <p className="text-xs text-muted-foreground">
              Next: {formatDateTime(generationStatus.scheduler.next_execution)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-6 grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Total Subscription Revenue
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            ₹{Number(paymentSummary?.total_subscription_revenue ?? 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Paid</p>
          <p className="mt-1 text-2xl font-semibold">
            {paymentSummary?.paid_payments ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {paymentSummary?.pending_payments ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Failed</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">
            {paymentSummary?.failed_payments ?? 0}
          </p>
        </div>
      </div>
    </>
  );
}
