// Renewal Monitoring — uses only RECORDED expiration dates and CONFIGURED reminder
// thresholds. It never estimates renewal windows or processing times.

import type { PermitRecord } from "../types.ts";

export interface RenewalStatus {
  permit: PermitRecord;
  daysUntilExpiry: number;
  /** The smallest configured threshold that has been reached, if any. */
  activeThreshold?: number;
  /** Next configured threshold not yet reached. */
  nextThreshold?: number;
  urgency: "expired" | "critical" | "due" | "upcoming" | "ok";
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.UTC(+fromISO.slice(0, 4), +fromISO.slice(5, 7) - 1, +fromISO.slice(8, 10));
  const b = Date.UTC(+toISO.slice(0, 4), +toISO.slice(5, 7) - 1, +toISO.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function renewalStatus(permit: PermitRecord, today: string): RenewalStatus {
  const days = daysBetween(today, permit.expiresOn);
  const sorted = [...permit.reminderDays].sort((a, b) => a - b);
  const reached = sorted.filter((t) => days <= t);
  const activeThreshold = reached[0];
  const nextThreshold = [...sorted].reverse().find((t) => days > t);
  const smallest = sorted[0] ?? 0;
  let urgency: RenewalStatus["urgency"] = "ok";
  if (days < 0) urgency = "expired";
  else if (days <= smallest) urgency = "critical";
  else if (activeThreshold !== undefined) urgency = activeThreshold <= 30 ? "due" : "upcoming";
  return { permit, daysUntilExpiry: days, activeThreshold, nextThreshold, urgency };
}

/**
 * Reminders that should fire on `today`: a threshold fires on the day the permit
 * first crosses it. The scheduled Lambda runs daily and is idempotent via
 * (permitId, threshold) keys.
 */
export function remindersDue(permits: PermitRecord[], today: string): { permit: PermitRecord; threshold: number; daysUntilExpiry: number }[] {
  const out: { permit: PermitRecord; threshold: number; daysUntilExpiry: number }[] = [];
  for (const p of permits) {
    const days = daysBetween(today, p.expiresOn);
    for (const t of p.reminderDays) if (days === t) out.push({ permit: p, threshold: t, daysUntilExpiry: days });
  }
  return out;
}
