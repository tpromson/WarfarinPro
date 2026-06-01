import type { PillCombo } from "../types";

function* generateCombos(): Generator<PillCombo> {
  const seen = new Map<number, PillCombo>();
  for (let orangeWhole = 0; orangeWhole <= 4; orangeWhole += 1) {
    for (let orangeHalf = 0; orangeHalf <= 1; orangeHalf += 1) {
      for (let blueWhole = 0; blueWhole <= 4; blueWhole += 1) {
        for (let blueHalf = 0; blueHalf <= 1; blueHalf += 1) {
          const dose = orangeWhole * 2 + orangeHalf * 1 + blueWhole * 3 + blueHalf * 1.5;
          if (dose > 12) continue;
          const tablets = orangeWhole + blueWhole + orangeHalf * 0.5 + blueHalf * 0.5;
          const mixedHalfPenalty = orangeHalf && blueHalf ? 8 : 0;
          const halfPenalty = (orangeHalf + blueHalf) * 2;
          const colorPenalty = orangeWhole + orangeHalf > 0 && blueWhole + blueHalf > 0 ? 1.5 : 0;
          const integerBonus = Number.isInteger(dose) ? -1 : 1;
          const score = tablets + halfPenalty + mixedHalfPenalty + colorPenalty + integerBonus;
          const combo = { dose, orangeWhole, orangeHalf, blueWhole, blueHalf, score };
          const previous = seen.get(dose);
          if (!previous || combo.score < previous.score) seen.set(dose, combo);
        }
      }
    }
  }
  for (const combo of seen.values()) yield combo;
}

export const pillCombos: PillCombo[] = Array.from(generateCombos()).sort(
  (a, b) => a.dose - b.dose || a.score - b.score,
);

export function comboForDose(dose: number): PillCombo {
  return pillCombos.find((combo) => combo.dose === dose) ?? pillCombos[0];
}
