import type {
  ContextFlag,
  DayDose,
  DayKey,
  InteractionFlag,
  MedicationPlan,
  SafetyInputs,
  TargetRange,
} from "../types";
import { getSuggestion } from "./dosing";
import { buildFirstWeek, isComplex } from "./schedule";
import { comboForDose } from "./pillcombos";
import { makeWCode } from "./wcode";

interface CompressedPlan {
  i: string;
  d: string;
  c: DayKey;
  t: [number, number, TargetRange["preset"]];
  r: number;
  p: number;
  a: number;
  h: number;
  m: number[];
  s: [number, InteractionFlag[], ContextFlag[]];
  k?: number;
}

export function encodePlan(plan: MedicationPlan): string {
  const compressed: CompressedPlan = {
    i: plan.id,
    d: plan.issuedDate,
    c: plan.clinicDay,
    t: [plan.target.lower, plan.target.upper, plan.target.preset],
    r: plan.currentInr,
    p: plan.previousWeeklyDose,
    a: plan.selectedAdjustment,
    h: plan.firstWeekHoldDoses,
    m: plan.maintenanceWeek.map((day) => day.dose),
    s: [plan.safety.majorBleeding ? 1 : 0, plan.safety.interactionFlags, plan.safety.contextFlags],
    k: plan.usePink === false ? 0 : 1,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 2, plan: compressed }))));
}

export function decodePlan(encoded: string): MedicationPlan | null {
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (payload.v === 1) {
      const v1Safety = payload.plan.safety;
      const majorBleeding =
        typeof v1Safety.majorBleeding === "boolean"
          ? v1Safety.majorBleeding
          : v1Safety.messages.some((msg: string) => msg.toLowerCase().includes("bleeding"));
      return {
        ...payload.plan,
        safety: {
          ...v1Safety,
          majorBleeding,
        },
      };
    }
    if (payload.v === 2) {
      const c = payload.plan as CompressedPlan;
      const target: TargetRange = {
        preset: c.t[2],
        lower: c.t[0],
        upper: c.t[1],
      };
      const safetyInputs: SafetyInputs = {
        majorBleeding: c.s[0] === 1,
        interactions: c.s[1],
        contexts: c.s[2],
      };
      const usePink = c.k === undefined ? true : c.k === 1;

      const maintenanceWeek: DayDose[] = c.m.map((dose, idx) => {
        const day = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][idx] as DayKey;
        return {
          day,
          dose,
          hold: dose === 0,
          combo: comboForDose(dose, usePink),
        };
      });

      const firstWeek = buildFirstWeek(maintenanceWeek, c.c, c.h, usePink);
      const scheduleWeeklyDose = maintenanceWeek.reduce((sum, d) => sum + d.dose, 0);
      const roundedScheduleWeekly = Math.round(scheduleWeeklyDose * 2) / 2;
      const calculatedWeeklyDose = Math.round(c.p * (1 + c.a / 100) * 2) / 2;
      const roundedSchedule = Math.abs(roundedScheduleWeekly - calculatedWeeklyDose) > 0.001;
      const suggestion = getSuggestion(c.r, target, safetyInputs);
      const wCode = makeWCode(roundedScheduleWeekly, c.h, c.c);

      return {
        version: 1,
        id: c.i,
        issuedDate: c.d,
        clinicDay: c.c,
        target,
        currentInr: c.r,
        previousWeeklyDose: c.p,
        calculatedWeeklyDose,
        scheduleWeeklyDose: roundedScheduleWeekly,
        selectedAdjustment: c.a,
        firstWeekHoldDoses: c.h,
        wCode: wCode.code,
        safety: {
          severity: suggestion.severity,
          messages: suggestion.messages,
          interactionFlags: c.s[1],
          contextFlags: c.s[2],
          complexSchedule: isComplex(maintenanceWeek),
          roundedSchedule,
          majorBleeding: safetyInputs.majorBleeding,
        },
        firstWeek,
        maintenanceWeek,
        usePink,
        source: "wcode",
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to decode plan:", error);
    return null;
  }
}

export function buildPatientUrl(plan: MedicationPlan): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = `patient=${encodePlan(plan)}`;
  return url.toString();
}

export function parsePatientHash(): MedicationPlan | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith("patient=")) return null;
  return decodePlan(hash.slice("patient=".length));
}

export type { DayDose, DayKey, InteractionFlag, MedicationPlan };
