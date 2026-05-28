import { MedicationPlan } from "./types";

const key = "warfarinpro.savedPlans";

export function loadSavedPlans(): MedicationPlan[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as MedicationPlan[];
  } catch {
    return [];
  }
}

export function savePlan(plan: MedicationPlan): MedicationPlan[] {
  const existing = loadSavedPlans().filter((item) => item.id !== plan.id);
  const next = [plan, ...existing].slice(0, 10);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

export function deleteSavedPlan(id: string): MedicationPlan[] {
  const next = loadSavedPlans().filter((plan) => plan.id !== id);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
