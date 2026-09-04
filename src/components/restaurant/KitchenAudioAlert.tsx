"use client";

import React from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";

type KitchenAudioAlertProps = {
  soundEnabled: boolean;
  onToggleSound: () => void;
  pendingCount: number;
  onTestSound?: () => void;
};

export function KitchenAudioAlert({
  soundEnabled,
  onToggleSound,
  pendingCount,
  onTestSound,
}: KitchenAudioAlertProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleSound}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
          soundEnabled
            ? pendingCount > 0
              ? "bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse"
              : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            : "bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200"
        }`}
        aria-label={soundEnabled ? "Mute kitchen buzzer" : "Enable kitchen buzzer"}
      >
        {soundEnabled ? (
          <>
            <Bell className="h-4 w-4" />
            <span>Sound Alerts: ON</span>
            {pendingCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-amber-700 font-extrabold text-[11px]">
                {pendingCount}
              </span>
            )}
          </>
        ) : (
          <>
            <BellOff className="h-4 w-4" />
            <span>Sound Alerts: OFF</span>
          </>
        )}
      </button>

      {soundEnabled && onTestSound && (
        <button
          type="button"
          onClick={onTestSound}
          title="Test kitchen chime"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default KitchenAudioAlert;
