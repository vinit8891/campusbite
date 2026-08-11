"use client";

import { useState } from "react";

import RatingStars from "./RatingStars";
import { AuthHttpError, authJson } from "@/services/authFetch";

type Props = {
  orderId: string;
  restaurantEmail: string;
  deliveryPartnerPhone: string;
  customerName: string;

  onSuccess?: () => void;
};

export default function ReviewModal({
  orderId,
  restaurantEmail,
  deliveryPartnerPhone,
  customerName,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);

  const [rating, setRating] = useState(0);

  const [review, setReview] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function submitReview() {
    if (rating === 0) {
      alert("Please select rating.");
      return;
    }

    try {
      setLoading(true);

      await authJson("/reviews/", {
        role: "customer",
        method: "POST",
        body: JSON.stringify({
          order_id: orderId,
          restaurant_email: restaurantEmail,
          delivery_partner_phone: deliveryPartnerPhone,
          customer_name: customerName,
          rating,
          review,
        }),
      });

      alert(
        "Thank you for your feedback ❤️"
      );

      setOpen(false);

      setRating(0);

      setReview("");

      onSuccess?.();
    } catch (err) {
      console.error(err);

      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }

      alert(
        err instanceof Error
          ? err.message
          : "Unable to submit review."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-white transition hover:bg-yellow-600"
      >
        ⭐ Rate Delivery
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">

            <h2 className="mb-6 text-3xl font-bold">
              Rate Your Experience
            </h2>

            <div className="mb-6">

              <RatingStars
                value={rating}
                onChange={setRating}
              />

            </div>

            <textarea
              rows={5}
              value={review}
              onChange={(e) =>
                setReview(
                  e.target.value
                )
              }
              placeholder="Write your review..."
              className="w-full rounded-xl border p-4 outline-none focus:border-orange-500"
            />

            <div className="mt-8 flex justify-end gap-3">

              <button
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-xl border px-5 py-2"
              >
                Cancel
              </button>

              <button
                disabled={loading}
                onClick={submitReview}
                className="rounded-xl bg-orange-600 px-6 py-2 font-semibold text-white disabled:opacity-50"
              >
                {loading
                  ? "Submitting..."
                  : "Submit Review"}
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}