import type { DayDose, DayKey } from "../types";
import { days, roundToHalf } from "./days";
import { comboForDose, pillCombos } from "./pillcombos";

export const MAX_WEEKLY_DOSE = 100;

/*
 * Builds a 7-day maintenance schedule that approximates the target weekly dose.
 *
 * Algorithm (greedy with fixed day-order):
 * 1. Compute base dose = largest pill-combo dose <= avg daily dose (target / 7).
 * 2. Initialize all 7 days with base dose.
 * 3. Iteratively increase doses (round-up pass) following day-order [thu, mon, wed, fri, tue, sat, sun].
 *    Each day steps up to the next available pill-combo dose only if the total still fits the target.
 * 4. Iteratively decrease doses (round-down pass) in reverse order to correct any excess.
 *
 * The fixed day-order distributes larger doses toward mid-week (thu, wed, fri) rather than
 * concentrating them at the start (mon) or end (sun).  This is a design choice to create
 * memorable patterns and avoid placing high-dose days adjacent to each other.
 *
 * The algorithm is greedy and may not find a globally optimal distribution,
 * but it satisfies the ±0.5 mg weekly tolerance for all tested targets.
 */
export function buildMaintenanceSchedule(weeklyDose: number): DayDose[] {
  const target = roundToHalf(weeklyDose);
  const candidateDoses = pillCombos.map((combo) => combo.dose).filter((dose) => dose <= 12);
  const avg = target / 7;
  let base = candidateDoses.reduce(
    (best, dose) => (dose <= avg && avg - dose < avg - best ? dose : best),
    0,
  );
  if (base === 0 && target > 0) base = 1;
  const doses = days.map(() => base);
  let current = doses.reduce((sum, dose) => sum + dose, 0);
  // Day-order for distribution: thu=3, mon=0, wed=2, fri=4, tue=1, sat=5, sun=6
  const order = [3, 0, 2, 4, 1, 5, 6];

  while (current < target - 0.001) {
    let changed = false;
    for (const index of order) {
      if (current >= target - 0.001) break;
      const next = nextDose(doses[index], candidateDoses, 1);
      if (next !== doses[index] && current + next - doses[index] <= target + 0.001) {
        current += next - doses[index];
        doses[index] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  while (current > target + 0.001) {
    let changed = false;
    for (const index of [...order].reverse()) {
      if (current <= target + 0.001) break;
      const next = nextDose(doses[index], candidateDoses, -1);
      if (next !== doses[index]) {
        current -= doses[index] - next;
        doses[index] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return days.map((day, index) => ({
    day,
    dose: doses[index],
    combo: comboForDose(doses[index]),
  }));
}

function nextDose(current: number, candidates: number[], direction: 1 | -1): number {
  const sorted = [...candidates].sort((a, b) => a - b);
  const index = sorted.indexOf(current);
  if (index === -1) return current;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index + direction))];
}

export function buildFirstWeek(
  maintenance: DayDose[],
  clinicDay: DayKey,
  holdDoses: number,
): DayDose[] {
  const start = days.indexOf(clinicDay);
  const ordered = Array.from({ length: 7 }, (_, offset) => days[(start + offset) % 7]);
  return ordered.map((day, index) => {
    if (index < holdDoses) return { day, dose: 0, hold: true, combo: comboForDose(0) };
    const maintenanceDose = maintenance.find((item) => item.day === day);
    return maintenanceDose ? { ...maintenanceDose } : { day, dose: 0, combo: comboForDose(0) };
  });
}

export function isComplex(schedule: DayDose[]): boolean {
  return schedule.some((day) => {
    const tablets =
      day.combo.orangeWhole +
      day.combo.blueWhole +
      (day.combo.orangeHalf + day.combo.blueHalf) * 0.5;
    return tablets > 3 || (day.combo.orangeHalf && day.combo.blueHalf);
  });
}

export type { DayDose, DayKey };
