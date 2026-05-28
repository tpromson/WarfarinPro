import {
  ContextFlag,
  DayDose,
  DayKey,
  DoseSuggestion,
  MedicationPlan,
  PillCombo,
  PlanPayload,
  SafetyInputs,
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

export function encodePlan(plan: MedicationPlan): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, plan } satisfies PlanPayload))));
}

export function decodePlan(encoded: string): MedicationPlan | null {
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded)))) as PlanPayload;
    return payload.v === 1 ? payload.plan : null;
  } catch {
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

export function makeWCode(weeklyDose: number, holdDoses: number): string {
  const tenths = Math.round(weeklyDose * 10);
  if (tenths < 0 || tenths > 999) return "W----";
  return `W${String(tenths).padStart(3, "0")}${Math.min(9, Math.max(0, holdDoses))}`;
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
  const wCode = makeWCode(scheduleWeeklyDose, params.holdDoses);

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

function speakDoseValue(dose: number): string {
  if (dose === 0) return "ศูนย์มิลลิกรัม";
  const integerPart = Math.floor(dose);
  const hasHalf = dose % 1 !== 0;

  const thaiNumbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ", "สิบเอ็ด", "สิบสอง"];
  const integerSpeech = integerPart > 0 ? (thaiNumbers[integerPart] || String(integerPart)) : "";

  if (hasHalf) {
    return integerPart > 0 ? `${integerSpeech}มิลลิกรัมครึ่ง` : "ครึ่งมิลลิกรัม";
  }
  return `${integerSpeech}มิลลิกรัม`;
}

function speakPillDetails(combo: PillCombo): string {
  if (combo.dose === 0) return "งดยานะคะ";
  const parts: string[] = [];
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
}

function speakWeekSchedule(schedule: DayDose[], gender: "female" | "male" = "female"): string {
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
    const dayNames = group.days.map((d) => speakDayLabels[d]);
    let daysText = "";
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

    if (group.hold || group.dose === 0) {
      return `${daysText} <break time="150ms"/> ให้งดยา${gender === "female" ? "นะคะ" : "นะครับ"}`;
    }

    const doseValText = speakDoseValue(group.dose);
    const pillText = speakPillDetails(group.combo);
    return `${daysText} <break time="150ms"/> ทาน ${doseValText} <break time="100ms"/> ${pillText} ${gender === "female" ? "ค่ะ" : "ครับ"}`;
  });

  return groupTexts.join(' <break time="400ms"/> ');
}

function speakWCode(wCode: string): string {
  if (!wCode || wCode.length < 5) return wCode;
  const chars = wCode.split("");
  const letter = chars[0] === "W" ? "ดับเบิ้ลยู" : chars[0];
  const digits = chars.slice(1).map((char) => {
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
  });
  return `${letter} ${digits.join(" ")}`;
}

export function planSpeech(plan: MedicationPlan, gender: "female" | "male" = "female"): string {
  const wCodeSpeech = speakWCode(plan.wCode);
  const firstWeekSpeech = speakWeekSchedule(plan.firstWeek, gender);
  const maintenanceSpeech = speakWeekSchedule(plan.maintenanceWeek, gender);

  const politeIntro = gender === "female" ? "ค่ะ" : "ครับ";
  const politeWarn = gender === "female" ? "นะคะ" : "นะครับ";

  return `<speak>ยา วาร์ฟาริน รหัส ${wCodeSpeech} ${politeIntro} <break time="400ms"/> สัปดาห์แรก: ${firstWeekSpeech} <break time="500ms"/> สัปดาห์ถัดไป: ${maintenanceSpeech} <break time="500ms"/> <emphasis level="moderate">หากมีเลือดออกผิดปกติ อุจจาระดำ หรือเวียนศีรษะ ให้รีบไปโรงพยาบาลทันที${politeWarn}</emphasis></speak>`;
}

function getPillDescription(dayDose: DayDose): string {
  if (dayDose.hold || dayDose.dose === 0) {
    return "งดรับประทานยาวาร์ฟารินในวันนี้";
  }
  const combo = dayDose.combo;
  const parts: string[] = [];
  if (combo.orangeWhole > 0) parts.push(`เม็ดสีส้ม (2 mg) จำนวน ${combo.orangeWhole} เม็ด`);
  if (combo.orangeHalf > 0) parts.push(`เม็ดสีส้ม (2 mg) ครึ่งเม็ด`);
  if (combo.blueWhole > 0) parts.push(`เม็ดสีฟ้า (3 mg) จำนวน ${combo.blueWhole} เม็ด`);
  if (combo.blueHalf > 0) parts.push(`เม็ดสีฟ้า (3 mg) ครึ่งเม็ด`);
  return `รับประทาน ${dayDose.dose} mg: ${parts.join(" และ ")}`;
}

export function generateIcsFile(plan: MedicationPlan): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WarfarinPro//Dosing Calendar//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const [yearStr, monthStr, dayStr] = plan.issuedDate.split("-");
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10) - 1;
  const dayNum = parseInt(dayStr, 10);
  const startDate = new Date(yearNum, monthNum, dayNum, 12, 0, 0);

  const dayKeys: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  for (let i = 0; i < 14; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    let doseText = "";
    let description = "";
    let isHold = false;

    if (i < 7) {
      const dayDose = plan.firstWeek[i];
      isHold = !!dayDose.hold;
      doseText = isHold ? "งดยา" : `${dayDose.dose} mg`;
      description = getPillDescription(dayDose);
    } else {
      const weekdayIndex = current.getDay();
      const dayKey = dayKeys[weekdayIndex];
      const dayDose = plan.maintenanceWeek.find((d) => d.day === dayKey);
      if (dayDose) {
        isHold = dayDose.dose === 0;
        doseText = isHold ? "งดยา" : `${dayDose.dose} mg`;
        description = getPillDescription(dayDose);
      } else {
        doseText = "0 mg";
        description = "ไม่มีข้อมูลการกินยา";
      }
    }

    const summary = isHold ? `⚠️ งดยาวาร์ฟาริน (Hold)` : `💊 ทานยาวาร์ฟาริน ${doseText}`;
    const url = buildPatientUrl(plan);

    lines.push(
      "BEGIN:VEVENT",
      `UID:wpro-${plan.id}-${dateStr}@warfarinpro.com`,
      `DTSTAMP:${dateStr}T180000`,
      `DTSTART:${dateStr}T180000`,
      `DTEND:${dateStr}T183000`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}\\nรหัสแผนยา: ${plan.wCode}\\nลิงก์ดูแผนยา: ${url}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function generateGoogleCalendarUrl(plan: MedicationPlan): string {
  const [yearStr, monthStr, dayStr] = plan.issuedDate.split("-");
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10) - 1;
  const dayNum = parseInt(dayStr, 10);
  const startDate = new Date(yearNum, monthNum, dayNum, 12, 0, 0);

  const year = startDate.getFullYear();
  const month = String(startDate.getMonth() + 1).padStart(2, "0");
  const day = String(startDate.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const title = encodeURIComponent("💊 ทานยาวาร์ฟาริน");
  const url = buildPatientUrl(plan);
  const details = encodeURIComponent(
    `ทานยาวาร์ฟารินตามแผนยาประจำสัปดาห์ รหัส ${plan.wCode}\n\nดูตารางกินยาและรูปภาพเม็ดยาได้ที่นี่:\n${url}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T180000/${dateStr}T183000&details=${details}&recur=RRULE:FREQ=DAILY;COUNT=30`;
}

export function parseWCodeToPlan(wCode: string): MedicationPlan | null {
  const code = wCode.trim().toUpperCase();
  const match = code.match(/^W(\d{3})(\d)$/);
  if (!match) return null;

  const tenths = parseInt(match[1], 10);
  const weeklyDose = tenths / 10;
  const holdDoses = parseInt(match[2], 10);

  const todayIndex = new Date().getDay();
  const jsToDaysMap: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const clinicDay = jsToDaysMap[todayIndex];

  const maintenanceWeek = buildMaintenanceSchedule(weeklyDose);
  const firstWeek = buildFirstWeek(maintenanceWeek, clinicDay, holdDoses);

  return {
    version: 1,
    id: `wcode-${code}-${Date.now()}`,
    issuedDate: new Date().toISOString().slice(0, 10),
    clinicDay,
    target: { preset: "standard", lower: 2, upper: 3 },
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
    },
    firstWeek,
    maintenanceWeek,
  };
}

