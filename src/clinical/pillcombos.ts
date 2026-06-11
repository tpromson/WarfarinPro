import type { PillCombo } from "../types";

function generateCombos(usePink: boolean): PillCombo[] {
  const seen = new Map<number, PillCombo>();
  const maxPinkWhole = usePink ? 2 : 0;
  const maxPinkHalf = usePink ? 1 : 0;

  for (let orangeWhole = 0; orangeWhole <= 4; orangeWhole += 1) {
    for (let orangeHalf = 0; orangeHalf <= 1; orangeHalf += 1) {
      for (let blueWhole = 0; blueWhole <= 4; blueWhole += 1) {
        for (let blueHalf = 0; blueHalf <= 1; blueHalf += 1) {
          for (let pinkWhole = 0; pinkWhole <= maxPinkWhole; pinkWhole += 1) {
            for (let pinkHalf = 0; pinkHalf <= maxPinkHalf; pinkHalf += 1) {
              const dose =
                orangeWhole * 2 +
                orangeHalf * 1 +
                blueWhole * 3 +
                blueHalf * 1.5 +
                pinkWhole * 5 +
                pinkHalf * 2.5;
              if (dose > 12) continue;
              const tablets =
                orangeWhole + blueWhole + pinkWhole + (orangeHalf + blueHalf + pinkHalf) * 0.5;
              const splitCount = (orangeHalf ? 1 : 0) + (blueHalf ? 1 : 0) + (pinkHalf ? 1 : 0);
              const mixedHalfPenalty = splitCount > 1 ? 8 : 0;
              const halfPenalty = (orangeHalf + blueHalf + pinkHalf) * 2;
              const colorsUsed =
                (orangeWhole + orangeHalf > 0 ? 1 : 0) +
                (blueWhole + blueHalf > 0 ? 1 : 0) +
                (pinkWhole + pinkHalf > 0 ? 1 : 0);
              const colorPenalty = colorsUsed > 1 ? (colorsUsed - 1) * 1.5 : 0;
              const integerBonus = Number.isInteger(dose) ? -1 : 1;
              const score = tablets + halfPenalty + mixedHalfPenalty + colorPenalty + integerBonus;
              const combo = {
                dose,
                orangeWhole,
                orangeHalf,
                blueWhole,
                blueHalf,
                pinkWhole,
                pinkHalf,
                score,
              };
              const previous = seen.get(dose);
              if (!previous || combo.score < previous.score) seen.set(dose, combo);
            }
          }
        }
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.dose - b.dose || a.score - b.score);
}

export const pillCombosWithPink: PillCombo[] = generateCombos(true);
export const pillCombosWithoutPink: PillCombo[] = generateCombos(false);

// Export pillCombos referencing the full set for backward compatibility
export const pillCombos: PillCombo[] = pillCombosWithPink;

export function getPillCombos(usePink: boolean = true): PillCombo[] {
  return usePink ? pillCombosWithPink : pillCombosWithoutPink;
}

export function comboForDose(dose: number, usePink: boolean = true): PillCombo {
  const combos = getPillCombos(usePink);
  return combos.find((combo) => combo.dose === dose) ?? combos[0];
}
