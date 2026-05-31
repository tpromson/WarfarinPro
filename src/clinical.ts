import {
  ContextFlag,
  DayDose,
  DayKey,
  DoseSuggestion,
  InteractionFlag,
  MedicationPlan,
  PillCombo,
  PlanPayload,
  SafetyInputs,
  TargetPreset,
  TargetRange,
} from "./types";

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

export const contextLabels: Record<ContextFlag, string> = {
  mechanicalValve: "Mechanical valve",
  pregnancy: "Pregnancy",
  liverDisease: "Liver disease",
};

export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

interface CompressedPlan {
  i: string; // id
  d: string; // issuedDate
  c: DayKey; // clinicDay
  t: [number, number, TargetPreset]; // lower, upper, preset
  r: number; // currentInr
  p: number; // previousWeeklyDose
  a: number; // selectedAdjustment
  h: number; // holdDoses
  m: number[]; // maintenanceDoses
  s: [number, InteractionFlag[], ContextFlag[]]; // [majorBleeding (0/1), interactions, contexts]
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
    s: [
      plan.safety.majorBleeding ? 1 : 0,
      plan.safety.interactionFlags,
      plan.safety.contextFlags,
    ],
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 2, plan: compressed }))));
}

export function decodePlan(encoded: string): MedicationPlan | null {
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (payload.v === 1) {
      return {
        ...payload.plan,
        safety: {
          ...payload.plan.safety,
          majorBleeding: payload.plan.safety.messages.some((msg: string) => msg.toLowerCase().includes("bleeding")),
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

      const maintenanceWeek: DayDose[] = c.m.map((dose, idx) => {
        const day = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][idx] as DayKey;
        return {
          day,
          dose,
          hold: dose === 0,
          combo: comboForDose(dose),
        };
      });

      const firstWeek = buildFirstWeek(maintenanceWeek, c.c, c.h);
      const scheduleWeeklyDose = roundToHalf(maintenanceWeek.reduce((sum, d) => sum + d.dose, 0));
      const calculatedWeeklyDose = roundToHalf(c.p * (1 + c.a / 100));
      const roundedSchedule = Math.abs(scheduleWeeklyDose - calculatedWeeklyDose) > 0.001;
      const suggestion = getSuggestion(c.r, target, safetyInputs);
      const wCode = makeWCode(scheduleWeeklyDose, c.h, c.c);

      return {
        version: 1,
        id: c.i,
        issuedDate: c.d,
        clinicDay: c.c,
        target,
        currentInr: c.r,
        previousWeeklyDose: c.p,
        calculatedWeeklyDose,
        scheduleWeeklyDose,
        selectedAdjustment: c.a,
        firstWeekHoldDoses: c.h,
        wCode,
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

export function makeWCode(weeklyDose: number, holdDoses: number, clinicDay?: DayKey): string {
  const tenths = Math.round(weeklyDose * 10);
  if (tenths < 0 || tenths > 999) return "W----";
  const dayDigit = clinicDay ? (days.indexOf(clinicDay) + 1) % 7 : 0;
  return `W${String(tenths).padStart(3, "0")}${Math.min(9, Math.max(0, holdDoses))}${dayDigit}`;
}

export function getSuggestion(inr: number, target: TargetRange, safety: SafetyInputs): DoseSuggestion {
  const hardStopReasons: string[] = [];
  if (inr >= 9) hardStopReasons.push("INR >= 9.0");
  if (safety.majorBleeding) hardStopReasons.push("Major bleeding");
  if (safety.contexts.includes("pregnancy")) hardStopReasons.push("Pregnancy");

  const messages: string[] = [];
  if (safety.contexts.includes("mechanicalValve")) {
    messages.push("Mechanical valve: high-risk indication. Review low INR and hold decisions carefully.");
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
  if (inr < target.lower - mild) return suggestion("caution", "Below target: stronger increase", 15, [10, 15, 20], 0, messages);
  if (inr < target.lower) return suggestion("caution", "Below target: mild increase", 7.5, [5, 7.5, 10], 0, messages);
  if (inr <= target.upper) return suggestion("normal", "Within target", 0, [-7.5, 0, 7.5], 0, messages);
  if (inr <= target.upper + mild) return suggestion("caution", "Above target: mild decrease", -7.5, [-10, -7.5, -5], 0, messages);
  return suggestion("danger", "Above target: consider hold and decrease", -10, [-15, -10], 1, messages);
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

export const pillCombos: PillCombo[] = Array.from(generateCombos()).sort((a, b) => a.dose - b.dose || a.score - b.score);

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

export function comboForDose(dose: number): PillCombo {
  return pillCombos.find((combo) => combo.dose === dose) ?? pillCombos[0];
}

export function buildMaintenanceSchedule(weeklyDose: number): DayDose[] {
  const target = roundToHalf(weeklyDose);
  const candidateDoses = pillCombos.map((combo) => combo.dose).filter((dose) => dose <= 12);
  const avg = target / 7;
  let base = candidateDoses.reduce((best, dose) => (dose <= avg && avg - dose < avg - best ? dose : best), 0);
  if (base === 0 && target > 0) base = 1;
  const doses = days.map(() => base);
  let current = doses.reduce((sum, dose) => sum + dose, 0);
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

  return days.map((day, index) => ({ day, dose: doses[index], combo: comboForDose(doses[index]) }));
}

function nextDose(current: number, candidates: number[], direction: 1 | -1): number {
  const sorted = [...candidates].sort((a, b) => a - b);
  const index = sorted.indexOf(current);
  if (index === -1) return current;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index + direction))];
}

export function buildFirstWeek(maintenance: DayDose[], clinicDay: DayKey, holdDoses: number): DayDose[] {
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
    const tablets = day.combo.orangeWhole + day.combo.blueWhole + (day.combo.orangeHalf + day.combo.blueHalf) * 0.5;
    return tablets > 3 || (day.combo.orangeHalf && day.combo.blueHalf);
  });
}

export function makePlan(params: {
  inr: number;
  previousWeeklyDose: number;
  target: TargetRange;
  safety: SafetyInputs;
  clinicDay: DayKey;
  selectedAdjustment: number;
  holdDoses: number;
  maintenanceWeek?: DayDose[];
}): MedicationPlan {
  const suggestion = getSuggestion(params.inr, params.target, params.safety);
  const calculatedWeeklyDose = roundToHalf(params.previousWeeklyDose * (1 + params.selectedAdjustment / 100));
  const maintenanceWeek = params.maintenanceWeek ?? buildMaintenanceSchedule(calculatedWeeklyDose);
  const scheduleWeeklyDose = roundToHalf(maintenanceWeek.reduce((sum, day) => sum + day.dose, 0));
  const roundedSchedule = Math.abs(scheduleWeeklyDose - calculatedWeeklyDose) > 0.001;
  const firstWeek = buildFirstWeek(maintenanceWeek, params.clinicDay, params.holdDoses);
  const wCode = makeWCode(scheduleWeeklyDose, params.holdDoses, params.clinicDay);

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
    wCode,
    safety: {
      severity: suggestion.severity,
      messages: suggestion.messages,
      interactionFlags: params.safety.interactions,
      contextFlags: params.safety.contexts,
      complexSchedule: isComplex(maintenanceWeek),
      roundedSchedule,
      majorBleeding: params.safety.majorBleeding,
    },
    firstWeek,
    maintenanceWeek,
  };
}

const speakDayLabels: Record<DayKey, string> = {
  mon: "วันจันทร์",
  tue: "วันอังคาร",
  wed: "วันพุธ",
  thu: "วันพฤหัสบดี",
  fri: "วันศุกร์",
  sat: "วันเสาร์",
  sun: "วันอาทิตย์",
};

function speakDoseValue(dose: number, lang: "th" | "en" = "th"): string {
  if (dose === 0) return lang === "th" ? "ศูนย์มิลลิกรัม" : "zero milligrams";
  const integerPart = Math.floor(dose);
  const hasHalf = dose % 1 !== 0;

  if (lang === "th") {
    const thaiNumbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ", "สิบเอ็ด", "สิบสอง"];
    const integerSpeech = integerPart > 0 ? (thaiNumbers[integerPart] || String(integerPart)) : "";
    if (hasHalf) {
      return integerPart > 0 ? `${integerSpeech}มิลลิกรัมครึ่ง` : "ครึ่งมิลลิกรัม";
    }
    return `${integerSpeech}มิลลิกรัม`;
  } else {
    const englishNumbers = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
    const integerSpeech = integerPart > 0 ? (englishNumbers[integerPart] || String(integerPart)) : "";
    if (hasHalf) {
      return integerPart > 0 ? `${integerSpeech} and a half milligrams` : "half a milligram";
    }
    return `${integerSpeech} milligram${dose > 1 ? "s" : ""}`;
  }
}

function speakPillDetails(combo: PillCombo, lang: "th" | "en" = "th"): string {
  if (combo.dose === 0) return lang === "th" ? "งดยานะคะ" : "hold your dose";
  const parts: string[] = [];

  if (lang === "th") {
    const thaiNumbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ"];
    if (combo.orangeWhole > 0) {
      const countText = thaiNumbers[combo.orangeWhole] || String(combo.orangeWhole);
      parts.push(`สีส้ม ${countText} เม็ด`);
    }
    if (combo.orangeHalf > 0) {
      parts.push("สีส้ม ครึ่งเม็ด");
    }
    if (combo.blueWhole > 0) {
      const countText = thaiNumbers[combo.blueWhole] || String(combo.blueWhole);
      parts.push(`สีฟ้า ${countText} เม็ด`);
    }
    if (combo.blueHalf > 0) {
      parts.push("สีฟ้า ครึ่งเม็ด");
    }
    return parts.join(" กับ ");
  } else {
    const englishNumbers = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
    if (combo.orangeWhole > 0) {
      const countText = englishNumbers[combo.orangeWhole] || String(combo.orangeWhole);
      parts.push(`${countText} orange tablet${combo.orangeWhole > 1 ? "s" : ""}`);
    }
    if (combo.orangeHalf > 0) {
      parts.push("half orange tablet");
    }
    if (combo.blueWhole > 0) {
      const countText = englishNumbers[combo.blueWhole] || String(combo.blueWhole);
      parts.push(`${countText} blue tablet${combo.blueWhole > 1 ? "s" : ""}`);
    }
    if (combo.blueHalf > 0) {
      parts.push("half blue tablet");
    }
    return parts.join(" and ");
  }
}

function speakWeekSchedule(
  schedule: DayDose[],
  gender: "female" | "male" = "female",
  lang: "th" | "en" = "th"
): string {
  const doseGroups: { dose: number; hold: boolean; days: DayKey[]; combo: PillCombo }[] = [];

  for (const item of schedule) {
    const existing = doseGroups.find((g) => g.dose === item.dose && !!g.hold === !!item.hold);
    if (existing) {
      existing.days.push(item.day);
    } else {
      doseGroups.push({
        dose: item.dose,
        hold: !!item.hold,
        days: [item.day],
        combo: item.combo,
      });
    }
  }

  const groupTexts = doseGroups.map((group) => {
    const dayNames = group.days.map((d) => getSpeechDayLabel(d, lang));
    let daysText = "";
    if (lang === "th") {
      if (group.days.length === 7) {
        daysText = "ทุก วัน";
      } else if (dayNames.length === 1) {
        daysText = dayNames[0];
      } else if (dayNames.length === 2) {
        daysText = `${dayNames[0]} และ ${dayNames[1]}`;
      } else {
        const mainDays = dayNames.slice(0, -1).join(" ");
        const lastDay = dayNames[dayNames.length - 1];
        daysText = `${mainDays} และ ${lastDay}`;
      }
    } else {
      if (group.days.length === 7) {
        daysText = "every day";
      } else if (dayNames.length === 1) {
        daysText = dayNames[0];
      } else if (dayNames.length === 2) {
        daysText = `${dayNames[0]} and ${dayNames[1]}`;
      } else {
        const mainDays = dayNames.slice(0, -1).join(", ");
        const lastDay = dayNames[dayNames.length - 1];
        daysText = `${mainDays}, and ${lastDay}`;
      }
    }

    if (group.hold || group.dose === 0) {
      if (lang === "th") {
        return `${daysText} <break time="150ms"/> ให้งดยา${gender === "female" ? "นะคะ" : "นะครับ"}`;
      } else {
        return `On ${daysText} <break time="150ms"/> hold your warfarin dose`;
      }
    }

    const doseValText = speakDoseValue(group.dose, lang);
    const pillText = speakPillDetails(group.combo, lang);
    if (lang === "th") {
      return `${daysText} <break time="150ms"/> ทาน ${doseValText} <break time="100ms"/> ${pillText} ${gender === "female" ? "ค่ะ" : "ครับ"}`;
    } else {
      return `On ${daysText} <break time="150ms"/> take ${doseValText} <break time="100ms"/> that is ${pillText}`;
    }
  });

  return groupTexts.join(lang === "th" ? ' <break time="400ms"/> ' : ' <break time="500ms"/> ');
}

function speakWCode(wCode: string, lang: "th" | "en" = "th"): string {
  if (!wCode || wCode.length < 5) return wCode;
  const chars = wCode.split("");
  const letter = chars[0] === "W" ? (lang === "th" ? "ดับเบิ้ลยู" : "double-u") : chars[0];
  const digits = chars.slice(1).map((char) => {
    if (lang === "th") {
      const mapping: Record<string, string> = {
        "0": "ศูนย์",
        "1": "หนึ่ง",
        "2": "สอง",
        "3": "สาม",
        "4": "สี่",
        "5": "ห้า",
        "6": "หก",
        "7": "เจ็ด",
        "8": "แปด",
        "9": "เก้า",
        "-": "ขีด",
      };
      return mapping[char] || char;
    } else {
      const mapping: Record<string, string> = {
        "0": "zero",
        "1": "one",
        "2": "two",
        "3": "three",
        "4": "four",
        "5": "five",
        "6": "six",
        "7": "seven",
        "8": "eight",
        "9": "nine",
        "-": "dash",
      };
      return mapping[char] || char;
    }
  });
  return `${letter} ${digits.join(" ")}`;
}

export function isFirstWeekOver(plan: MedicationPlan): boolean {
  if (!plan.issuedDate) return true;
  const issued = new Date(plan.issuedDate);
  if (isNaN(issued.getTime())) return true;
  const daysSince = Math.floor((Date.now() - issued.getTime()) / 86400000);
  return daysSince >= 7;
}

export function planSpeech(
  plan: MedicationPlan,
  gender: "female" | "male" = "female",
  lang: "th" | "en" = "th"
): string {
  const wCodeSpeech = speakWCode(plan.wCode, lang);
  const firstWeekOver = isFirstWeekOver(plan);
  const maintenanceSpeech = speakWeekSchedule(plan.maintenanceWeek, gender, lang);

  if (lang === "th") {
    const politeIntro = gender === "female" ? "ค่ะ" : "ครับ";
    const politeWarn = gender === "female" ? "นะคะ" : "นะครับ";

    if (firstWeekOver) {
      const speech = `ยา วาร์ฟาริน รหัส ${wCodeSpeech} ${politeIntro} <break time="400ms"/> ผ่านช่วงสัปดาห์แรกแล้วนะคะ <break time="200ms"/> ตารางยาปกติของคุณคือ: ${maintenanceSpeech} <break time="500ms"/> <emphasis level="moderate">หากมีเลือดออกผิดปกติ อุจจาระดำ หรือเวียนศีรษะ ให้รีบไปโรงพยาบาลทันที${politeWarn}</emphasis>`;
      if (gender === "female") {
        return `<speak><prosody rate="105%" pitch="+4%">${speech}</prosody></speak>`;
      }
      return `<speak>${speech}</speak>`;
    }

    const firstWeekToSpeak = plan.firstWeek.filter(
      (item) => days.indexOf(item.day) >= days.indexOf(plan.clinicDay)
    );
    const firstWeekSpeech = speakWeekSchedule(firstWeekToSpeak, gender, lang);

    const speech = `ยา วาร์ฟาริน รหัส ${wCodeSpeech} ${politeIntro} <break time="400ms"/> สัปดาห์แรก: ${firstWeekSpeech} <break time="500ms"/> สัปดาห์ถัดไป: ${maintenanceSpeech} <break time="500ms"/> <emphasis level="moderate">หากมีเลือดออกผิดปกติ อุจจาระดำ หรือเวียนศีรษะ ให้รีบไปโรงพยาบาลทันที${politeWarn}</emphasis>`;

    if (gender === "female") {
      return `<speak><prosody rate="105%" pitch="+4%">${speech}</prosody></speak>`;
    }
    return `<speak>${speech}</speak>`;
  } else {
    if (firstWeekOver) {
      const speech = `Warfarin medication plan, code ${wCodeSpeech}. <break time="400ms"/> The first week is completed. Your regular maintenance schedule is: ${maintenanceSpeech} <break time="500ms"/> <emphasis level="moderate">If you experience abnormal bleeding, black stool, or severe dizziness, please go to the hospital immediately.</emphasis>`;
      return `<speak>${speech}</speak>`;
    }

    const firstWeekToSpeak = plan.firstWeek.filter(
      (item) => days.indexOf(item.day) >= days.indexOf(plan.clinicDay)
    );
    const firstWeekSpeech = speakWeekSchedule(firstWeekToSpeak, gender, lang);

    const speech = `Warfarin medication plan, code ${wCodeSpeech}. <break time="400ms"/> First week schedule: ${firstWeekSpeech} <break time="500ms"/> Maintenance schedule: ${maintenanceSpeech} <break time="500ms"/> <emphasis level="moderate">If you experience abnormal bleeding, black stool, or severe dizziness, please go to the hospital immediately.</emphasis>`;
    return `<speak>${speech}</speak>`;
  }
}

function getSpeechDayLabel(day: DayKey, lang: "th" | "en" = "th"): string {
  const en: Record<DayKey, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };
  const th: Record<DayKey, string> = {
    mon: "วันจันทร์",
    tue: "วันอังคาร",
    wed: "วันพุธ",
    thu: "วันพฤหัสบดี",
    fri: "วันศุกร์",
    sat: "วันเสาร์",
    sun: "วันอาทิตย์",
  };
  return lang === "th" ? th[day] : en[day];
}

function getPillDescription(dayDose: DayDose, lang: "th" | "en" = "th"): string {
  if (dayDose.hold || dayDose.dose === 0) {
    return lang === "th" ? "งดรับประทานยาวาร์ฟารินในวันนี้" : "Hold warfarin today";
  }
  const combo = dayDose.combo;
  const parts: string[] = [];
  if (lang === "th") {
    if (combo.orangeWhole > 0) parts.push(`เม็ดสีส้ม (2 mg) จำนวน ${combo.orangeWhole} เม็ด`);
    if (combo.orangeHalf > 0) parts.push(`เม็ดสีส้ม (2 mg) ครึ่งเม็ด`);
    if (combo.blueWhole > 0) parts.push(`เม็ดสีฟ้า (3 mg) จำนวน ${combo.blueWhole} เม็ด`);
    if (combo.blueHalf > 0) parts.push(`เม็ดสีฟ้า (3 mg) ครึ่งเม็ด`);
    return `รับประทาน ${dayDose.dose} mg: ${parts.join(" และ ")}`;
  }
  if (combo.orangeWhole > 0) parts.push(`Orange (2 mg) ${combo.orangeWhole} tab${combo.orangeWhole > 1 ? "s" : ""}`);
  if (combo.orangeHalf > 0) parts.push(`Orange (2 mg) 1/2 tab`);
  if (combo.blueWhole > 0) parts.push(`Blue (3 mg) ${combo.blueWhole} tab${combo.blueWhole > 1 ? "s" : ""}`);
  if (combo.blueHalf > 0) parts.push(`Blue (3 mg) 1/2 tab`);
  return `Take ${dayDose.dose} mg: ${parts.join(" and ")}`;
}

export function generateIcsFile(
  plan: MedicationPlan,
  startDateStr: string,
  endDateStr: string,
  lang: "th" | "en" = "th"
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WarfarinPro//Dosing Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const [sYear, sMonth, sDay] = startDateStr.split("-").map(Number);
  const startDate = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);

  const [eYear, eMonth, eDay] = endDateStr.split("-").map(Number);
  const endDate = new Date(eYear, eMonth - 1, eDay, 12, 0, 0);

  const msDiff = endDate.getTime() - startDate.getTime();
  let totalDays = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
  totalDays = Math.max(1, Math.min(90, totalDays));

  const dayKeys: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  for (let i = 0; i < totalDays; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    let doseText = "";
    let description = "";
    let isHold = false;

    const weekdayIndex = current.getDay();
    const dayKey = dayKeys[weekdayIndex];

    const issuedDateObj = new Date(plan.issuedDate + "T12:00:00");
    const diffTime = current.getTime() - issuedDateObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const isDateInFirstWeek = diffDays >= 0 && diffDays < 7;

    const dayDose = isDateInFirstWeek
      ? plan.firstWeek.find((d) => d.day === dayKey)
      : plan.maintenanceWeek.find((d) => d.day === dayKey);

    if (dayDose) {
      isHold = !!dayDose.hold || dayDose.dose === 0;
      doseText = isHold ? (lang === "th" ? "งดยา" : "HOLD") : `${dayDose.dose} mg`;
      description = getPillDescription(dayDose, lang);
    } else {
      doseText = "0 mg";
      description = lang === "th" ? "ไม่มีข้อมูลการกินยา" : "No dosing details available";
    }

    const summary = isHold
      ? (lang === "th" ? `⚠️ งดยาวาร์ฟาริน (Hold)` : `⚠️ Hold Warfarin`)
      : (lang === "th" ? `💊 ทานยาวาร์ฟาริน ${doseText}` : `💊 Take Warfarin ${doseText}`);
    const url = buildPatientUrl(plan);
    const descSuffix = i === 0 ? `\\nลิงก์ดูแผนยา/URL: ${url}` : "";

    lines.push(
      "BEGIN:VEVENT",
      `UID:wpro-${plan.id}-${dateStr}@warfarinpro.com`,
      `DTSTAMP:${dateStr}T180000`,
      `DTSTART:${dateStr}T180000`,
      `DTEND:${dateStr}T183000`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}\\nรหัสแผนยา/Code: ${plan.wCode}${descSuffix}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT0M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder",
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function generateGoogleCalendarUrl(
  plan: MedicationPlan,
  startDateStr: string,
  endDateStr: string,
  lang: "th" | "en" = "th"
): string {
  const [sYear, sMonth, sDay] = startDateStr.split("-").map(Number);
  const startDate = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);

  const [eYear, eMonth, eDay] = endDateStr.split("-").map(Number);
  const endDate = new Date(eYear, eMonth - 1, eDay, 12, 0, 0);

  const startYear = startDate.getFullYear();
  const startMonth = String(startDate.getMonth() + 1).padStart(2, "0");
  const startDay = String(startDate.getDate()).padStart(2, "0");
  const dateStr = `${startYear}${startMonth}${startDay}`;

  const endYear = endDate.getFullYear();
  const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
  const endDay = String(endDate.getDate()).padStart(2, "0");
  const untilStr = `${endYear}${endMonth}${endDay}`;

  const title = encodeURIComponent(lang === "th" ? "💊 ทานยาวาร์ฟาริน" : "💊 Take Warfarin");
  const url = buildPatientUrl(plan);

  const firstWeekText = plan.firstWeek.map((d) => {
    const dayName = getSpeechDayLabel(d.day, lang);
    const desc = getPillDescription(d, lang);
    return `- ${dayName}: ${desc}`;
  }).join("\n");

  const maintenanceWeekText = plan.maintenanceWeek.map((d) => {
    const dayName = getSpeechDayLabel(d.day, lang);
    const desc = getPillDescription(d, lang);
    return `- ${dayName}: ${desc}`;
  }).join("\n");

  const detailsText = lang === "th"
    ? `ทานยาวาร์ฟารินตามแผนยาประจำสัปดาห์ รหัส ${plan.wCode}\n\n` +
      `📅 ตารางกินยาสัปดาห์แรก:\n${firstWeekText}\n\n` +
      `🔁 ตารางกินยาปกติ:\n${maintenanceWeekText}\n\n` +
      `ดูตารางกินยาและรูปภาพเม็ดยาได้ที่นี่:\n${url}`
    : `Take warfarin according to weekly plan code ${plan.wCode}\n\n` +
      `📅 First Week Schedule:\n${firstWeekText}\n\n` +
      `🔁 Maintenance Schedule:\n${maintenanceWeekText}\n\n` +
      `View detailed schedule and pill visuals here:\n${url}`;

  const details = encodeURIComponent(detailsText);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T180000/${dateStr}T183000&details=${details}&recur=RRULE:FREQ=DAILY;UNTIL=${untilStr}T235959Z`;
}

export function parseWCodeToPlan(wCode: string): MedicationPlan | null {
  const code = wCode.trim().toUpperCase();

  const fullMatch = code.match(/^W(\d{3})(\d)([0-6])?$/);
  if (!fullMatch) return null;

  const tenths = parseInt(fullMatch[1], 10);
  const weeklyDose = tenths / 10;
  const holdDoses = parseInt(fullMatch[2], 10);
  const hasClinicDay = fullMatch[3] !== undefined;

  const days: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
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

