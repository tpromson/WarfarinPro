import type {
  ContextFlag,
  DoseSuggestion,
  InteractionFlag,
  SafetyInputs,
  TargetRange,
} from "../types";

export function getSuggestion(
  inr: number,
  target: TargetRange,
  safety: SafetyInputs,
): DoseSuggestion {
  const hardStopReasons: string[] = [];
  if (inr >= 9) hardStopReasons.push("INR >= 9.0");
  if (safety.majorBleeding) hardStopReasons.push("Major bleeding");
  if (safety.contexts.includes("pregnancy")) hardStopReasons.push("Pregnancy");

  const messages: string[] = [];
  if (safety.contexts.includes("mechanicalValve")) {
    messages.push(
      "Mechanical valve: high-risk indication. Review low INR and hold decisions carefully.",
    );
  }
  if (safety.contexts.includes("liverDisease")) {
    messages.push("Liver disease: INR may be unstable and bleeding risk may be increased.");
  }
  if (safety.interactions.length > 0) {
    messages.push("Interaction flags present. Consider closer INR follow-up.");
  }

  if (hardStopReasons.length) {
    return {
      severity: "hard-stop",
      label: "Hard Stop",
      defaultAdjustment: 0,
      adjustmentOptions: [0],
      holdDoseOptions: [],
      defaultHoldDoses: 0,
      messages: [
        ...messages,
        "Do not issue a routine medication plan or W-code. Urgent clinical review is required.",
      ],
      hardStopReasons,
      reversalGuidance: inr >= 9 || safety.majorBleeding,
    };
  }

  if (inr >= 5 && inr < 9) {
    return {
      severity: "danger",
      label: "Danger Alert",
      defaultAdjustment: -15,
      adjustmentOptions: [-15, -10],
      holdDoseOptions: [1, 2],
      defaultHoldDoses: 2,
      messages: [
        ...messages,
        "INR 5.0-8.9 without major bleeding: omit 1-2 doses and review reversal need per local protocol.",
      ],
      hardStopReasons: [],
      reversalGuidance: true,
    };
  }

  const standard = target.lower === 2 && target.upper === 3;
  if (standard) {
    if (inr < 1.5) return suggestion("caution", "+10% to +20%", 15, [10, 15, 20], 0, messages);
    if (inr < 2) return suggestion("caution", "+5% to +10%", 7.5, [5, 7.5, 10], 0, messages);
    if (inr <= 3) return suggestion("normal", "Continue same dose", 0, [-7.5, 0, 7.5], 0, messages);
    if (inr < 4) return suggestion("caution", "-5% to -10%", -7.5, [-10, -7.5, -5], 0, messages);
    return suggestion("danger", "Hold 1 dose, then -10%", -10, [-15, -10], 1, messages);
  }

  const width = target.upper - target.lower;
  const mild = Math.max(0.3, width * 0.35);
  if (inr < target.lower - mild)
    return suggestion("caution", "Below target: stronger increase", 15, [10, 15, 20], 0, messages);
  if (inr < target.lower)
    return suggestion("caution", "Below target: mild increase", 7.5, [5, 7.5, 10], 0, messages);
  if (inr <= target.upper)
    return suggestion("normal", "Within target", 0, [-7.5, 0, 7.5], 0, messages);
  if (inr <= target.upper + mild)
    return suggestion("caution", "Above target: mild decrease", -7.5, [-10, -7.5, -5], 0, messages);
  return suggestion(
    "danger",
    "Above target: consider hold and decrease",
    -10,
    [-15, -10],
    1,
    messages,
  );
}

function suggestion(
  severity: DoseSuggestion["severity"],
  label: string,
  defaultAdjustment: number,
  adjustmentOptions: number[],
  defaultHoldDoses: number,
  messages: string[],
): DoseSuggestion {
  return {
    severity,
    label,
    defaultAdjustment,
    adjustmentOptions,
    holdDoseOptions: defaultHoldDoses ? [0, 1, 2] : [0, 1],
    defaultHoldDoses,
    messages,
    hardStopReasons: [],
    reversalGuidance: false,
  };
}

export type { ContextFlag, DoseSuggestion, InteractionFlag, SafetyInputs, TargetRange };
