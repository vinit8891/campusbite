/**
 * Canonical Campus Delivery Waves & Batch Window Scheduler.
 *
 * Configured campus wave windows (IST):
 * - Lunch Waves: 12:45 PM – 1:15 PM, 1:15 PM – 1:45 PM
 * - Evening Snacks Wave: 5:15 PM – 5:45 PM
 * - Dinner Waves: 8:00 PM – 8:30 PM, 8:45 PM – 9:15 PM, 9:30 PM – 10:00 PM
 *
 * Orders close strictly 15 minutes before the wave delivery window begins to
 * allow kitchens preparation time.
 */

export interface WaveSlotDefinition {
  slotId: string;
  label: string;
  startHour: number; // in 24h IST
  startMinute: number;
  endHour: number;
  endMinute: number;
  cutoffHour: number;
  cutoffMinute: number;
  deliveryWindow: string;
}

export const CAMPUS_WAVE_SLOTS: WaveSlotDefinition[] = [
  {
    slotId: "LUNCH_WAVE_1",
    label: "Lunch Wave 1",
    startHour: 12,
    startMinute: 45,
    endHour: 13,
    endMinute: 15,
    cutoffHour: 12,
    cutoffMinute: 30,
    deliveryWindow: "12:45 PM – 1:15 PM",
  },
  {
    slotId: "LUNCH_WAVE_2",
    label: "Lunch Wave 2",
    startHour: 13,
    startMinute: 15,
    endHour: 13,
    endMinute: 45,
    cutoffHour: 13,
    cutoffMinute: 0,
    deliveryWindow: "1:15 PM – 1:45 PM",
  },
  {
    slotId: "SNACKS_WAVE_1",
    label: "Evening Snacks Wave",
    startHour: 17,
    startMinute: 15,
    endHour: 17,
    endMinute: 45,
    cutoffHour: 17,
    cutoffMinute: 0,
    deliveryWindow: "5:15 PM – 5:45 PM",
  },
  {
    slotId: "DINNER_WAVE_1",
    label: "Dinner Wave 1",
    startHour: 20,
    startMinute: 0,
    endHour: 20,
    endMinute: 30,
    cutoffHour: 19,
    cutoffMinute: 45,
    deliveryWindow: "8:00 PM – 8:30 PM",
  },
  {
    slotId: "DINNER_WAVE_2",
    label: "Dinner Wave 2",
    startHour: 20,
    startMinute: 45,
    endHour: 21,
    endMinute: 15,
    cutoffHour: 20,
    cutoffMinute: 30,
    deliveryWindow: "8:45 PM – 9:15 PM",
  },
  {
    slotId: "DINNER_WAVE_3",
    label: "Dinner Wave 3",
    startHour: 21,
    startMinute: 30,
    endHour: 22,
    endMinute: 0,
    cutoffHour: 21,
    cutoffMinute: 15,
    deliveryWindow: "9:30 PM – 10:00 PM",
  },
];

export interface BatchWindow {
  slotId: string;
  label: string;
  cutoffTime: Date;
  deliveryWindow: string;
  minutesRemaining: number;
  isRolling?: boolean;
  scheduledWave?: string;
}

/**
 * Returns IST (UTC+5:30) date components for a given Date object.
 */
export function getIstDateComponents(d: Date): {
  year: number;
  month: number;
  date: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
} {
  // Convert UTC timestamp to IST by adding 5.5 hours in milliseconds
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + 5.5 * 3600000);

  return {
    year: istTime.getFullYear(),
    month: istTime.getMonth(),
    date: istTime.getDate(),
    hours: istTime.getHours(),
    minutes: istTime.getMinutes(),
    seconds: istTime.getSeconds(),
    totalMinutes: istTime.getHours() * 60 + istTime.getMinutes(),
  };
}

/**
 * Creates a Date object for a specific IST hour/minute on a given date.
 */
export function createIstDate(
  year: number,
  month: number,
  date: number,
  hour: number,
  minute: number
): Date {
  // Construct UTC time matching this IST hour/minute:
  // UTC = IST - 5h 30m
  return new Date(Date.UTC(year, month, date, hour - 5, minute - 30, 0, 0));
}

/**
 * Evaluates the next eligible batch delivery wave for an order.
 * If placed outside standard wave hours, falls back to the next available wave
 * or a 30-min rolling batch window.
 */
export function getNextBatchWindow(
  currentTime: Date = new Date(),
  fulfillmentType: string = "HOSTEL_BATCH"
): BatchWindow {
  const ist = getIstDateComponents(currentTime);
  const currentTotalMins = ist.totalMinutes;

  // 1. Search for upcoming wave today before cutoff
  for (const slot of CAMPUS_WAVE_SLOTS) {
    const cutoffTotalMins = slot.cutoffHour * 60 + slot.cutoffMinute;

    if (cutoffTotalMins > currentTotalMins) {
      const cutoffDate = createIstDate(
        ist.year,
        ist.month,
        ist.date,
        slot.cutoffHour,
        slot.cutoffMinute
      );

      const diffMs = cutoffDate.getTime() - currentTime.getTime();
      const minutesRemaining = Math.max(1, Math.ceil(diffMs / (60 * 1000)));

      return {
        slotId: slot.slotId,
        label: slot.label,
        cutoffTime: cutoffDate,
        deliveryWindow: slot.deliveryWindow,
        minutesRemaining,
        isRolling: false,
        scheduledWave: `${slot.label} (${slot.deliveryWindow})`,
      };
    }
  }

  // 2. If past all waves today (after 9:15 PM IST):
  // Check if after campus hours or late evening -> tomorrow's first wave (Lunch Wave 1)
  const tomorrowFirstSlot = CAMPUS_WAVE_SLOTS[0];
  const tomorrowCutoffDate = createIstDate(
    ist.year,
    ist.month,
    ist.date + 1,
    tomorrowFirstSlot.cutoffHour,
    tomorrowFirstSlot.cutoffMinute
  );

  const diffMs = tomorrowCutoffDate.getTime() - currentTime.getTime();
  const minutesToTomorrow = Math.max(1, Math.ceil(diffMs / (60 * 1000)));

  // If late night after 10 PM IST or early morning, point to Tomorrow's Lunch Wave
  if (ist.hours >= 22 || ist.hours < 11) {
    return {
      slotId: tomorrowFirstSlot.slotId,
      label: `Tomorrow's ${tomorrowFirstSlot.label}`,
      cutoffTime: tomorrowCutoffDate,
      deliveryWindow: `Tomorrow ${tomorrowFirstSlot.deliveryWindow}`,
      minutesRemaining: minutesToTomorrow,
      isRolling: false,
      scheduledWave: `Tomorrow ${tomorrowFirstSlot.label} (${tomorrowFirstSlot.deliveryWindow})`,
    };
  }

  // 3. Fallback: Immediate 30-minute rolling batch window
  const rollingCutoff = new Date(currentTime.getTime() + 15 * 60 * 1000);
  const rollingDeliveryStart = new Date(currentTime.getTime() + 30 * 60 * 1000);
  const rollingDeliveryEnd = new Date(currentTime.getTime() + 50 * 60 * 1000);

  const startStr = rollingDeliveryStart.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const endStr = rollingDeliveryEnd.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    slotId: "ROLLING_BATCH",
    label: "Immediate Rolling Batch",
    cutoffTime: rollingCutoff,
    deliveryWindow: `${startStr} – ${endStr}`,
    minutesRemaining: 15,
    isRolling: true,
    scheduledWave: `Rolling Batch (${startStr} – ${endStr})`,
  };
}

/**
 * Returns all configured daily wave slots.
 */
export function getAllCampusWaveSlots(): WaveSlotDefinition[] {
  return [...CAMPUS_WAVE_SLOTS];
}
