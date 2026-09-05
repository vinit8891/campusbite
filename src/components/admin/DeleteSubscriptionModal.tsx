"use client";

import React from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters";
import type { Subscription } from "@/services/subscriptionService";

export interface DeleteSubscriptionModalProps {
  isOpen: boolean;
  subscription: Subscription | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteSubscriptionModal({
  isOpen,
  subscription,
  loading = false,
  onConfirm,
  onCancel,
}: DeleteSubscriptionModalProps) {
  if (!isOpen || !subscription) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-subscription-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center gap-3 text-red-600">
          <div className="rounded-full bg-red-100 p-2.5">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2
              id="delete-subscription-modal-title"
              className="text-lg font-bold text-gray-900"
            >
              Confirm Subscription Deletion
            </h2>
            <p className="text-xs text-gray-500 font-mono">
              ID: {subscription.subscription_id.slice(0, 8)}…
            </p>
          </div>
        </div>

        {/* Subscription Details Card */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1.5 text-xs text-stone-700">
          <div className="flex justify-between">
            <span className="text-stone-500">Customer:</span>
            <span className="font-semibold text-stone-900 truncate max-w-[200px]">
              {subscription.customer_email}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Plan:</span>
            <span className="font-medium text-stone-900 capitalize">
              {subscription.meal_type} · {subscription.subscription_type}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Period:</span>
            <span className="font-medium text-stone-900">
              {formatDate(subscription.start_date)} – {formatDate(subscription.end_date)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Status:</span>
            <span className="font-bold text-stone-900 capitalize">
              {subscription.status}
            </span>
          </div>
        </div>

        {/* Warning Text */}
        <p className="text-sm text-gray-600 leading-relaxed">
          Permanently delete this subscription and cancel any unserved meal tokens. This action cannot be undone.
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="h-10 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-10 bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? "Deleting..." : "Confirm Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteSubscriptionModal;
