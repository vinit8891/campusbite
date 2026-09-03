"use client";

import React, { useState } from "react";
import { User, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditContactModalProps = {
  isOpen: boolean;
  initialName: string;
  initialPhone: string;
  loading?: boolean;
  onSave: (name: string, phone: string) => Promise<void>;
  onClose: () => void;
};

export function EditContactModal({
  isOpen,
  initialName,
  initialPhone,
  loading = false,
  onSave,
  onClose,
}: EditContactModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) {
      setError("Name must be at least 3 characters.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    await onSave(name.trim(), cleanPhone);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-contact-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="edit-contact-title" className="text-lg font-bold text-gray-900">
            Edit Contact Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 font-medium">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="profile-edit-name" className="mb-1 block text-xs font-semibold uppercase text-gray-600">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="profile-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-edit-phone" className="mb-1 block text-xs font-semibold uppercase text-gray-600">
              Mobile Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="profile-edit-phone"
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                className="pl-9 h-10"
              />
            </div>
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
              type="submit"
              disabled={loading}
              className="h-10 bg-orange-600 text-white hover:bg-orange-700"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditContactModal;
