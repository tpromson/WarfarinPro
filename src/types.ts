export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TargetPreset = "standard" | "mechanical" | "custom";

export type Severity = "normal" | "caution" | "danger" | "hard-stop";

export type InteractionFlag =
  | "nsaid"
  | "antibiotic"
  | "amiodarone"
  | "antiepileptic"
  | "herbal"
  | "alcohol";

export type ContextFlag = "mechanicalValve" | "pregnancy" | "liverDisease";

export interface TargetRange {
  preset: TargetPreset;
  lower: number;
  upper: number;
}

export interface SafetyInputs {
  majorBleeding: boolean;
  interactions: InteractionFlag[];
  contexts: ContextFlag[];
}

export interface DoseSuggestion {
  severity: Severity;
  label: string;
  defaultAdjustment: number;
  adjustmentOptions: number[];
  holdDoseOptions: number[];
  defaultHoldDoses: number;
  messages: string[];
  hardStopReasons: string[];
  reversalGuidance: boolean;
}

export interface PillCombo {
  dose: number;
  orangeWhole: number;
  orangeHalf: number;
  blueWhole: number;
  blueHalf: number;
  score: number;
}

export interface DayDose {
  day: DayKey;
  dose: number;
  hold?: boolean;
  combo: PillCombo;
}

export interface MedicationPlan {
  version: 1;
  id: string;
  issuedDate: string;
  clinicDay: DayKey;
  target: TargetRange;
  currentInr: number;
  previousWeeklyDose: number;
  calculatedWeeklyDose: number;
  scheduleWeeklyDose: number;
  selectedAdjustment: number;
  firstWeekHoldDoses: number;
  wCode: string;
  safety: {
    severity: Severity;
    messages: string[];
    interactionFlags: InteractionFlag[];
    contextFlags: ContextFlag[];
    complexSchedule: boolean;
    roundedSchedule: boolean;
    majorBleeding: boolean;
  };
  firstWeek: DayDose[];
  maintenanceWeek: DayDose[];
  source?: "wcode";
}

export interface PlanPayload {
  v: 1;
  plan: MedicationPlan;
}
