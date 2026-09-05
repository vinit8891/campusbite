"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { isNewOrder, isOrderStale } from "@/lib/orderDomain";
import type { Order } from "@/types";

export function playKitchenChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5) - soft sine beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Tone 2: 880 Hz (A5) - higher confirmation chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.18);
    gain2.gain.setValueAtTime(0.3, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.5);
  } catch {
    // Gracefully handle browser sound restriction if not yet unlocked
  }
}

export function useKitchenAudio(orders: Order[]) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("cb_kitchen_sound_enabled");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const pendingCount = orders.filter(
    (o) => isNewOrder(o.status) && !isOrderStale(o.created_at)
  ).length;
  const lastPendingCountRef = useRef(pendingCount);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cb_kitchen_sound_enabled", JSON.stringify(next));
      } catch {
        // ignore
      }
      if (next) {
        playKitchenChime();
      }
      return next;
    });
  }, []);

  // Play immediately when new pending orders increase
  useEffect(() => {
    if (soundEnabled && pendingCount > lastPendingCountRef.current && pendingCount > 0) {
      playKitchenChime();
    }
    lastPendingCountRef.current = pendingCount;
  }, [pendingCount, soundEnabled]);

  // Repeat chime every 12 seconds as long as pending orders remain
  useEffect(() => {
    if (!soundEnabled || pendingCount === 0) return;

    const interval = setInterval(() => {
      playKitchenChime();
    }, 12000);

    return () => clearInterval(interval);
  }, [soundEnabled, pendingCount]);

  return {
    soundEnabled,
    toggleSound,
    pendingCount,
    playChime: playKitchenChime,
  };
}
