"use client";

import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeleteAccountModalProps = {
  isOpen: boolean;
  userEmail: string;
  loading?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function DeleteAccountModal({
  isOpen,
  userEmail,
  loading = false,
  onConfirm,
  onClose,
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-600">
            <div className="rounded-full bg-red-100 p-2.5">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 id="delete-account-title" className="text-lg font-bold text-gray-900">
              Delete Account
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 space-y-2 text-xs text-red-800 leading-relaxed">
          <p className="font-semibold text-red-900">
            Are you sure you want to permanently delete your account ({userEmail})?
          </p>
          <ul className="list-disc list-inside space-y-1 text-red-700">
            <li>Your order history, tracking records, and saved addresses will be deleted.</li>
            <li>Any active subscriptions will be cancelled.</li>
            <li>This action is irreversible and cannot be recovered.</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-10 bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1.5 font-semibold"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? "Deleting Account..." : "Yes, Delete My Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccountModal;
