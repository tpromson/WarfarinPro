import type { DayKey } from "../types";

export const days: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const dayLabels: Record<DayKey, string> = {
  mon: "จันทร์",
  tue: "อังคาร",
  wed: "พุธ",
  thu: "พฤหัส",
  fri: "ศุกร์",
  sat: "เสาร์",
  sun: "อาทิตย์",
};

export const interactionLabels = {
  nsaid: "NSAIDs",
  antibiotic: "Antibiotics",
  amiodarone: "Amiodarone",
  antiepileptic: "Antiepileptics",
  herbal: "Supplements / herbal",
  alcohol: "Alcohol",
} as const;

export const contextLabels: Record<"mechanicalValve" | "pregnancy" | "liverDisease", string> = {
  mechanicalValve: "Mechanical valve",
  pregnancy: "Pregnancy",
  liverDisease: "Liver disease",
};

export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export type { DayKey };
