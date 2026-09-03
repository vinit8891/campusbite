"use client";

import React from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeleteUserModalProps = {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteUserModal({
  isOpen,
  userName,
  userEmail,
  loading = false,
  onConfirm,
  onCancel,
}: DeleteUserModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <div className="rounded-full bg-red-100 p-2.5">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 id="delete-modal-title" className="text-lg font-bold text-gray-900">
            Confirm User Deletion
          </h2>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Are you sure you want to delete{" "}
          <strong className="text-gray-900">{userName || "this user"}</strong>
          {userEmail ? ` (${userEmail})` : ""}? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-10 bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? "Deleting..." : "Confirm Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteUserModal;
