import type { DayKey, MedicationPlan, TargetPreset } from "../types";
import { days } from "./days";
import { buildFirstWeek, buildMaintenanceSchedule, isComplex } from "./schedule";

export interface WCodeResult {
  code: string;
  warning: string | null;
}

export function makeWCode(weeklyDose: number, holdDoses: number, clinicDay?: DayKey): WCodeResult {
  const tenths = Math.round(weeklyDose * 10);
  if (tenths < 0 || tenths > 999) {
    return {
      code: "W----",
      warning: `Weekly dose ${weeklyDose} mg is outside W-code range (0–99.9 mg). Plan cannot be encoded as W-code.`,
    };
  }
  const dayDigit = clinicDay ? (days.indexOf(clinicDay) + 1) % 7 : 0;
  return {
    code: `W${String(tenths).padStart(3, "0")}${Math.min(9, Math.max(0, holdDoses))}${dayDigit}`,
    warning: null,
  };
}

export function parseWCodeToPlan(wCode: string): MedicationPlan | null {
  const code = wCode.trim().toUpperCase();

  const fullMatch = code.match(/^W(\d{3})(\d)([0-6])?$/);
  if (!fullMatch) return null;

  const tenths = parseInt(fullMatch[1], 10);
  const weeklyDose = tenths / 10;
  const holdDoses = parseInt(fullMatch[2], 10);
  const hasClinicDay = fullMatch[3] !== undefined;

  let clinicDay: DayKey;
  if (hasClinicDay) {
    const dayIndex = parseInt(fullMatch[3], 10);
    clinicDay = days[(dayIndex + 6) % 7];
  } else {
    const jsDayIndex = new Date().getDay();
    clinicDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][jsDayIndex] as DayKey;
  }

  const target = { preset: "standard" as TargetPreset, lower: 2, upper: 3 };
  const maintenanceWeek = buildMaintenanceSchedule(weeklyDose);
  const firstWeek = buildFirstWeek(maintenanceWeek, clinicDay, holdDoses);

  return {
    version: 1,
    id: `wcode-${code}-${Date.now()}`,
    issuedDate: new Date().toISOString().slice(0, 10),
    clinicDay,
    target,
    currentInr: 2.5,
    previousWeeklyDose: weeklyDose,
    calculatedWeeklyDose: weeklyDose,
    scheduleWeeklyDose: weeklyDose,
    selectedAdjustment: 0,
    firstWeekHoldDoses: holdDoses,
    wCode: code,
    safety: {
      severity: "normal",
      messages: ["สร้างแผนยาโดยสรุปจากการป้อนรหัส W-code"],
      interactionFlags: [],
      contextFlags: [],
      complexSchedule: isComplex(maintenanceWeek),
      roundedSchedule: false,
      majorBleeding: false,
    },
    firstWeek,
    maintenanceWeek,
  };
}

export type { DayKey, MedicationPlan };
