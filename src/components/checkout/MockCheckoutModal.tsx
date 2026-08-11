"use client";

type MockCheckoutModalProps = {
  amount: number;
  orderId: string;
  busy: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  onDismiss: () => void;
};

export default function MockCheckoutModal({
  amount,
  orderId,
  busy,
  onSuccess,
  onFailure,
  onDismiss,
}: MockCheckoutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Razorpay Mock Checkout
        </p>
        <h2 className="mt-2 text-xl font-bold text-gray-900">
          Simulate Test Payment
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          RAZORPAY_MOCK is enabled. No card details are collected. The backend
          verifies payment signatures server-side.
        </p>

        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-semibold">₹{amount.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span className="text-gray-500">Order</span>
            <span className="truncate font-mono text-xs">{orderId}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onSuccess}
            className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {busy ? "Processing…" : "Simulate Payment Success"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onFailure}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            Simulate Payment Failure
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            className="rounded-xl border px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Close Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
