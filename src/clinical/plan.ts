import type { DayDose, DayKey, MedicationPlan, TargetRange, SafetyInputs } from "../types";
import { roundToHalf } from "./days";
import { getSuggestion } from "./dosing";
import { buildFirstWeek, buildMaintenanceSchedule, isComplex, MAX_WEEKLY_DOSE } from "./schedule";
import { makeWCode } from "./wcode";

export function makePlan(params: {
  inr: number;
  previousWeeklyDose: number;
  target: TargetRange;
  safety: SafetyInputs;
  clinicDay: DayKey;
  selectedAdjustment: number;
  holdDoses: number;
  maintenanceWeek?: DayDose[];
  usePink?: boolean;
}): MedicationPlan {
  const usePink = params.usePink ?? true;
  const suggestion = getSuggestion(params.inr, params.target, params.safety);
  const calculatedWeeklyDose = roundToHalf(
    params.previousWeeklyDose * (1 + params.selectedAdjustment / 100),
  );

  const messages = [...suggestion.messages];
  if (calculatedWeeklyDose > MAX_WEEKLY_DOSE) {
    messages.push(
      `Calculated weekly dose (${calculatedWeeklyDose} mg) exceeds typical maximum (${MAX_WEEKLY_DOSE} mg). Verify this is intentional.`,
    );
  }

  const maintenanceWeek =
    params.maintenanceWeek ?? buildMaintenanceSchedule(calculatedWeeklyDose, usePink);
  const scheduleWeeklyDose = roundToHalf(maintenanceWeek.reduce((sum, day) => sum + day.dose, 0));
  const roundedSchedule = Math.abs(scheduleWeeklyDose - calculatedWeeklyDose) > 0.001;
  const firstWeek = buildFirstWeek(maintenanceWeek, params.clinicDay, params.holdDoses, usePink);
  const wCodeResult = makeWCode(scheduleWeeklyDose, params.holdDoses, params.clinicDay);
  if (wCodeResult.warning) {
    messages.push(wCodeResult.warning);
  }

  return {
    version: 1,
    id: crypto.randomUUID(),
    issuedDate: new Date().toISOString().slice(0, 10),
    clinicDay: params.clinicDay,
    target: params.target,
    currentInr: params.inr,
    previousWeeklyDose: params.previousWeeklyDose,
    calculatedWeeklyDose,
    scheduleWeeklyDose,
    selectedAdjustment: params.selectedAdjustment,
    firstWeekHoldDoses: params.holdDoses,
    wCode: wCodeResult.code,
    safety: {
      severity: suggestion.severity,
      messages,
      interactionFlags: params.safety.interactions,
      contextFlags: params.safety.contexts,
      complexSchedule: isComplex(maintenanceWeek),
      roundedSchedule,
      majorBleeding: params.safety.majorBleeding,
    },
    firstWeek,
    maintenanceWeek,
    usePink,
  };
}

export type { DayDose, DayKey, MedicationPlan };
