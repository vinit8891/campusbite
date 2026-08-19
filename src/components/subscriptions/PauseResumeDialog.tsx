import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Subscription } from "@/services/subscriptionService";

export type PauseResumeDialogProps = {
  subscription: Subscription | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitPause: (subscriptionId: string, pauseFrom: string, pauseTo: string) => Promise<void>;
  busy: boolean;
};

export function PauseResumeDialog({
  subscription,
  isOpen,
  onClose,
  onSubmitPause,
  busy,
}: PauseResumeDialogProps) {
  const [pauseFrom, setPauseFrom] = useState(subscription?.start_date || "");
  const [pauseTo, setPauseTo] = useState(subscription?.end_date || "");

  if (!isOpen || !subscription) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauseFrom || !pauseTo) return;
    await onSubmitPause(subscription.subscription_id, pauseFrom, pauseTo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Pause Subscription</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the date range during which deliveries should be paused.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Pause From</span>
            <Input
              type="date"
              required
              value={pauseFrom}
              onChange={(e) => setPauseFrom(e.target.value)}
              className="mt-1"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Pause Until</span>
            <Input
              type="date"
              required
              value={pauseTo}
              onChange={(e) => setPauseTo(e.target.value)}
              className="mt-1"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !pauseFrom || !pauseTo}>
              {busy ? "Pausing..." : "Confirm Pause"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
