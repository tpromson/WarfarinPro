import { describe, it, expect } from "vitest";
import {
  roundToHalf,
  makeWCode,
  parseWCodeToPlan,
  getSuggestion,
  buildMaintenanceSchedule,
  buildFirstWeek,
  isComplex,
  comboForDose,
  encodePlan,
  decodePlan,
  makePlan,
  generateIcsFile,
  generateGoogleCalendarUrl,
  planSpeech,
} from "./clinical";
import type { SafetyInputs, TargetRange, DayKey, DayDose, MedicationPlan } from "./types";

// ─── roundToHalf ──────────────────────────────────────────

describe("roundToHalf", () => {
  it("rounds integers", () => {
    expect(roundToHalf(0)).toBe(0);
    expect(roundToHalf(21)).toBe(21);
  });
  it("rounds to nearest 0.5", () => {
    expect(roundToHalf(21.2)).toBe(21);
    expect(roundToHalf(21.3)).toBe(21.5);
    expect(roundToHalf(21.7)).toBe(21.5);
    expect(roundToHalf(21.8)).toBe(22);
  });
  it("preserves exact halves", () => {
    expect(roundToHalf(21.5)).toBe(21.5);
  });
});

// ─── W-code ────────────────────────────────────────────────

describe("makeWCode", () => {
  it("encodes weekly dose, hold count, and clinicDay (default 0=sun)", () => {
    expect(makeWCode(21, 1)).toBe("W21010"); // clinicDay defaults to 0 (sun)
    expect(makeWCode(35, 2)).toBe("W35020");
    expect(makeWCode(0, 0)).toBe("W00000");
  });
it("encodes clinicDay when provided", () => {
    expect(makeWCode(21, 1, "mon")).toBe("W21011"); // mon → 1
    expect(makeWCode(21, 1, "thu")).toBe("W21014"); // thu → 4
    expect(makeWCode(35, 2, "sat")).toBe("W35026"); // sat → 6
  });
  it("pads with zeros", () => {
    expect(makeWCode(5, 0)).toBe("W05000");
    expect(makeWCode(7.5, 0)).toBe("W07500");
  });
  it("returns W---- for out-of-range", () => {
    expect(makeWCode(-1, 0)).toBe("W----");
    expect(makeWCode(1000, 0)).toBe("W----");
  });
  it("clamps holdDoses to 0-9, dayIndex defaults to 0", () => {
    expect(makeWCode(21, -1)).toBe("W21000"); // hold clamped to 0, day=0
    expect(makeWCode(21, 15)).toBe("W21090"); // hold clamped to 9, day=0
  });
});

describe("parseWCodeToPlan", () => {
  it("parses a 6-char W-code with clinicDay", () => {
    const plan = parseWCodeToPlan("W21011");
    expect(plan).not.toBeNull();
    expect(plan!.wCode).toBe("W21011");
    expect(plan!.calculatedWeeklyDose).toBe(21);
    expect(plan!.firstWeekHoldDoses).toBe(1);
    expect(plan!.clinicDay).toBe("mon"); // digit 1 → mon
    expect(plan!.maintenanceWeek).toHaveLength(7);
    expect(plan!.firstWeek).toHaveLength(7);
  });
  it("falls back to today when clinicDay omitted (5-char, backward compat)", () => {
    const plan = parseWCodeToPlan("W2101");
    expect(plan).not.toBeNull();
    expect(plan!.wCode).toBe("W2101");
    expect(plan!.calculatedWeeklyDose).toBe(21);
    expect(plan!.firstWeekHoldDoses).toBe(1);
    expect(plan!.maintenanceWeek).toHaveLength(7);
    expect(plan!.firstWeek).toHaveLength(7);
  });
  it("returns null for invalid format", () => {
    expect(parseWCodeToPlan("")).toBeNull();
    expect(parseWCodeToPlan("ABC")).toBeNull();
    expect(parseWCodeToPlan("W123456")).toBeNull();
    expect(parseWCodeToPlan("X12345")).toBeNull();
  });
  it("handles lowercase input", () => {
    const plan = parseWCodeToPlan("w21014");
    expect(plan).not.toBeNull();
    expect(plan!.wCode).toBe("W21014");
    expect(plan!.clinicDay).toBe("thu"); // digit 4 → thu
  });
});

// ─── getSuggestion (core decision tree) ────────────────────

const standardTarget: TargetRange = { preset: "standard", lower: 2, upper: 3 };
const mechanicalTarget: TargetRange = { preset: "mechanical", lower: 2.5, upper: 3.5 };
const emptySafety: SafetyInputs = { majorBleeding: false, interactions: [], contexts: [] };

describe("getSuggestion", () => {
  it("hard-stop at INR >= 9", () => {
    const result = getSuggestion(9, standardTarget, emptySafety);
    expect(result.severity).toBe("hard-stop");
    expect(result.hardStopReasons).toContain("INR >= 9.0");
    expect(result.reversalGuidance).toBe(true);
  });
  it("hard-stop on major bleeding", () => {
    const result = getSuggestion(4, standardTarget, { ...emptySafety, majorBleeding: true });
    expect(result.severity).toBe("hard-stop");
    expect(result.hardStopReasons).toContain("Major bleeding");
  });
  it("hard-stop on pregnancy", () => {
    const result = getSuggestion(4, standardTarget, { ...emptySafety, contexts: ["pregnancy"] });
    expect(result.severity).toBe("hard-stop");
    expect(result.hardStopReasons).toContain("Pregnancy");
  });
  it("danger alert for INR 5-8.9 without major bleeding", () => {
    const result = getSuggestion(6, standardTarget, emptySafety);
    expect(result.severity).toBe("danger");
    expect(result.defaultAdjustment).toBe(-15);
    expect(result.defaultHoldDoses).toBe(2);
    expect(result.reversalGuidance).toBe(true);
  });
  it("caution for INR below 1.5 (standard)", () => {
    const result = getSuggestion(1.4, standardTarget, emptySafety);
    expect(result.severity).toBe("caution");
    expect(result.defaultAdjustment).toBe(15);
    expect(result.adjustmentOptions).toEqual([10, 15, 20]);
  });
  it("caution for INR 1.5-1.9 (standard)", () => {
    const result = getSuggestion(1.7, standardTarget, emptySafety);
    expect(result.severity).toBe("caution");
    expect(result.defaultAdjustment).toBe(7.5);
  });
  it("normal for INR within standard range", () => {
    const result = getSuggestion(2.5, standardTarget, emptySafety);
    expect(result.severity).toBe("normal");
    expect(result.defaultAdjustment).toBe(0);
    expect(result.label).toBe("Continue same dose");
  });
  it("caution for INR 3-4 (standard) - mild decrease", () => {
    const result = getSuggestion(3.5, standardTarget, emptySafety);
    expect(result.severity).toBe("caution");
    expect(result.defaultAdjustment).toBe(-7.5);
  });
  it("danger for INR >= 4 (standard) - hold and decrease", () => {
    const result = getSuggestion(4.2, standardTarget, emptySafety);
    expect(result.severity).toBe("danger");
    expect(result.defaultAdjustment).toBe(-10);
    expect(result.defaultHoldDoses).toBe(1);
  });
  it("mechanical valve: adds context message", () => {
    const result = getSuggestion(2, standardTarget, {
      ...emptySafety,
      contexts: ["mechanicalValve"],
    });
    expect(result.messages.some((m) => m.toLowerCase().includes("mechanical valve"))).toBe(true);
  });
  it("liver disease: adds context message", () => {
    const result = getSuggestion(2, standardTarget, {
      ...emptySafety,
      contexts: ["liverDisease"],
    });
    expect(result.messages.some((m) => m.toLowerCase().includes("liver disease"))).toBe(true);
  });
  it("interaction flags: adds interaction message", () => {
    const result = getSuggestion(2, standardTarget, {
      ...emptySafety,
      interactions: ["antibiotic"],
    });
    expect(result.messages.some((m) => m.toLowerCase().includes("interaction"))).toBe(true);
  });

  // Non-standard target
  it("handles non-standard target ranges", () => {
    const resultBelow = getSuggestion(1.5, mechanicalTarget, emptySafety);
    expect(resultBelow.severity).toBe("caution");
    expect(resultBelow.defaultAdjustment).toBe(15);

    const resultNormal = getSuggestion(3, mechanicalTarget, emptySafety);
    expect(resultNormal.severity).toBe("normal");

    const resultAbove = getSuggestion(3.7, mechanicalTarget, emptySafety);
    expect(resultAbove.severity).toBe("caution");
  });
});

// ─── comboForDose ──────────────────────────────────────────

describe("comboForDose", () => {
  it("returns combo for exact dose", () => {
    const combo = comboForDose(4);
    expect(combo.dose).toBe(4);
    expect(combo.orangeWhole + combo.blueWhole + (combo.orangeHalf + combo.blueHalf) * 0.5).toBeGreaterThan(0);
  });
  it("returns fallback for unknown dose", () => {
    const combo = comboForDose(999);
    expect(combo).toBeDefined();
  });
  it("returns zero combo for dose 0", () => {
    const combo = comboForDose(0);
    expect(combo.dose).toBe(0);
  });
});

// ─── buildMaintenanceSchedule ──────────────────────────────

describe("buildMaintenanceSchedule", () => {
  it("returns 7 days", () => {
    const schedule = buildMaintenanceSchedule(21);
    expect(schedule).toHaveLength(7);
  });
  it("sum of doses approximates weekly target within 0.5 mg", () => {
    const targets = [0, 7, 10.5, 14, 17.5, 21, 24.5, 28, 31.5, 35, 42, 56, 70, 84];
    for (const target of targets) {
      const schedule = buildMaintenanceSchedule(target);
      const total = schedule.reduce((s, d) => s + d.dose, 0);
      expect(Math.abs(total - target)).toBeLessThanOrEqual(0.5);
    }
  });
  it("all doses have valid combos", () => {
    const schedule = buildMaintenanceSchedule(21);
    for (const day of schedule) {
      expect(day.combo.dose).toBe(day.dose);
    }
  });
  it("returns all-zero schedule for zero dose", () => {
    const schedule = buildMaintenanceSchedule(0);
    expect(schedule.every((d) => d.dose === 0)).toBe(true);
  });
});

// ─── buildFirstWeek ────────────────────────────────────────

describe("buildFirstWeek", () => {
  const maintenance: DayDose[] = [
    { day: "mon", dose: 3, combo: comboForDose(3) },
    { day: "tue", dose: 3, combo: comboForDose(3) },
    { day: "wed", dose: 3, combo: comboForDose(3) },
    { day: "thu", dose: 3, combo: comboForDose(3) },
    { day: "fri", dose: 3, combo: comboForDose(3) },
    { day: "sat", dose: 3, combo: comboForDose(3) },
    { day: "sun", dose: 3, combo: comboForDose(3) },
  ];

  it("orders days starting from clinic day", () => {
    const fw = buildFirstWeek(maintenance, "wed", 0);
    expect(fw[0].day).toBe("wed");
    expect(fw[1].day).toBe("thu");
    expect(fw[6].day).toBe("tue");
  });
  it("applies hold doses at the start", () => {
    const fw = buildFirstWeek(maintenance, "mon", 2);
    expect(fw[0].hold).toBe(true);
    expect(fw[0].dose).toBe(0);
    expect(fw[1].hold).toBe(true);
    expect(fw[1].dose).toBe(0);
    expect(fw[2].hold).toBeFalsy();
    expect(fw[2].dose).toBe(3);
  });
  it("zero hold doses means no holds", () => {
    const fw = buildFirstWeek(maintenance, "mon", 0);
    expect(fw.every((d) => !d.hold)).toBe(true);
  });
});

// ─── isComplex ──────────────────────────────────────────────

describe("isComplex", () => {
  it("flags schedule with >3 tablets on a day", () => {
    const schedule: DayDose[] = Array.from({ length: 7 }, (_, i) => ({
      day: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][i] as DayKey,
      dose: 12,
      combo: { dose: 12, orangeWhole: 4, blueWhole: 4, orangeHalf: 0, blueHalf: 0, score: 0 },
    }));
    expect(isComplex(schedule)).toBe(true);
  });
  it("flags mixed half-tablets on a day", () => {
    const schedule: DayDose[] = Array.from({ length: 7 }, (_, i) => ({
      day: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][i] as DayKey,
      dose: 5.5,
      combo: { dose: 5.5, orangeWhole: 0, blueWhole: 0, orangeHalf: 1, blueHalf: 1, score: 0 },
    }));
    expect(isComplex(schedule)).toBe(true);
  });
  it("simple schedule returns false", () => {
    const schedule: DayDose[] = Array.from({ length: 7 }, (_, i) => ({
      day: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][i] as DayKey,
      dose: 3,
      combo: { dose: 3, orangeWhole: 0, blueWhole: 1, orangeHalf: 0, blueHalf: 0, score: 0 },
    }));
    expect(isComplex(schedule)).toBe(false);
  });
});

// ─── encodePlan / decodePlan ────────────────────────────────

describe("encodePlan / decodePlan", () => {
  it("round-trips a plan correctly", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "mon",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    const encoded = encodePlan(plan);
    const decoded = decodePlan(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(plan.id);
    expect(decoded!.wCode).toBe(plan.wCode);
    expect(decoded!.currentInr).toBe(2.5);
    expect(decoded!.previousWeeklyDose).toBe(21);
    expect(decoded!.firstWeek[0].day).toBe("mon");
  });
  it("supports safety flags in round-trip", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: { majorBleeding: false, interactions: ["antibiotic", "amiodarone"], contexts: ["mechanicalValve"] },
      clinicDay: "mon",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    const decoded = decodePlan(encodePlan(plan));
    expect(decoded!.safety.interactionFlags).toContain("antibiotic");
    expect(decoded!.safety.interactionFlags).toContain("amiodarone");
    expect(decoded!.safety.contextFlags).toContain("mechanicalValve");
  });
  it("returns null for garbage input", () => {
    expect(decodePlan("not-a-valid-plan")).toBeNull();
    expect(decodePlan("")).toBeNull();
  });
});

// ─── makePlan (integration) ────────────────────────────────

describe("makePlan", () => {
  it("creates a complete plan with required fields", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "wed",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    expect(plan.id).toBeTruthy();
    expect(plan.issuedDate).toBeTruthy();
    expect(plan.firstWeek).toHaveLength(7);
    expect(plan.maintenanceWeek).toHaveLength(7);
    expect(plan.firstWeek[0].day).toBe("wed");
    expect(plan.wCode).toMatch(/^W\d{5}$/);
  });
  it("applies custom maintenance schedule", () => {
    const customSchedule: DayDose[] = [
      { day: "mon", dose: 3, combo: comboForDose(3) },
      { day: "tue", dose: 3, combo: comboForDose(3) },
      { day: "wed", dose: 3, combo: comboForDose(3) },
      { day: "thu", dose: 3, combo: comboForDose(3) },
      { day: "fri", dose: 3, combo: comboForDose(3) },
      { day: "sat", dose: 3, combo: comboForDose(3) },
      { day: "sun", dose: 3, combo: comboForDose(3) },
    ];
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "mon",
      selectedAdjustment: 0,
      holdDoses: 0,
      maintenanceWeek: customSchedule,
    });
    expect(plan.maintenanceWeek[0].dose).toBe(3);
    expect(plan.scheduleWeeklyDose).toBe(21);
    expect(plan.safety.roundedSchedule).toBe(false);
  });
});

// ─── generateIcsFile ───────────────────────────────────────

describe("generateIcsFile", () => {
  it("generates ICS with correct structure", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "mon",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    const ics = generateIcsFile(plan, "2026-05-30", "2026-06-13", "th");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain(`SUMMARY:`);
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain(plan.wCode);

    // Verify patient URL link is included ONLY in the first day event
    const events = ics.split("BEGIN:VEVENT");
    // events[0] is the header (before the first VEVENT)
    // events[1] is the first VEVENT (i = 0)
    // events[2] is the second VEVENT (i = 1)
    expect(events.length).toBeGreaterThan(2);
    expect(events[1]).toContain("ลิงก์ดูแผนยา/URL:");
    expect(events[2]).not.toContain("ลิงก์ดูแผนยา/URL:");
    
    // Count total occurrences of the URL prefix in the entire string to be absolutely sure
    const occurrences = (ics.match(/ลิงก์ดูแผนยา\/URL:/g) || []).length;
    expect(occurrences).toBe(1);
  });
  it("includes hold events for first week holds", () => {
    const plan = makePlan({
      inr: 5.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "mon",
      selectedAdjustment: -15,
      holdDoses: 2,
    });
    const ics = generateIcsFile(plan, "2026-05-30", "2026-06-13", "th");
    expect(ics).toContain("⚠️ งดยาวาร์ฟาริน");
  });
});

// ─── generateGoogleCalendarUrl ──────────────────────────────

describe("generateGoogleCalendarUrl", () => {
  it("returns a valid Google Calendar URL", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "mon",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    const url = generateGoogleCalendarUrl(plan, "2026-05-30", "2026-06-27", "th");
    expect(url).toContain("https://calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain(plan.wCode);
    expect(url).toContain("UNTIL=20260627");
  });
});

// ─── planSpeech ─────────────────────────────────────────────

describe("planSpeech", () => {
  it("generates SSML with speak tags", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "mon",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    const speech = planSpeech(plan, "female");
    expect(speech).toContain("<speak>");
    expect(speech).toContain("</speak>");
    expect(speech).toContain("วาร์ฟาริน");
    expect(speech).toContain("ดับเบิ้ลยู");
  });
  it("uses correct gendered politeness", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "mon",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    expect(planSpeech(plan, "female")).toContain("ค่ะ");
    expect(planSpeech(plan, "male")).toContain("ครับ");
  });
  it("omits first week days before clinic day (e.g. clinicDay = thu)", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "thu",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    const speech = planSpeech(plan, "female", "th");
    
    // Extract first week speech block
    const firstWeekStart = speech.indexOf("สัปดาห์แรก:");
    const firstWeekEnd = speech.indexOf("สัปดาห์ถัดไป:");
    expect(firstWeekStart).toBeGreaterThan(-1);
    expect(firstWeekEnd).toBeGreaterThan(-1);
    
    const firstWeekSpeechText = speech.substring(firstWeekStart, firstWeekEnd);
    
    // Thu, Fri, Sat, Sun should be present
    expect(firstWeekSpeechText).toContain("วันพฤหัสบดี");
    expect(firstWeekSpeechText).toContain("วันศุกร์");
    expect(firstWeekSpeechText).toContain("วันเสาร์");
    expect(firstWeekSpeechText).toContain("วันอาทิตย์");
    
    // Mon, Tue, Wed should be omitted in the first week part
    expect(firstWeekSpeechText).not.toContain("วันจันทร์");
    expect(firstWeekSpeechText).not.toContain("วันอังคาร");
    expect(firstWeekSpeechText).not.toContain("วันพุธ");
  });
  it("generates correct English speech structure and filters past days", () => {
    const plan = makePlan({
      inr: 2.5,
      previousWeeklyDose: 21,
      target: standardTarget,
      safety: emptySafety,
      clinicDay: "thu",
      selectedAdjustment: 0,
      holdDoses: 0,
    });
    const speech = planSpeech(plan, "female", "en");
    expect(speech).toContain("<speak>");
    expect(speech).toContain("</speak>");
    expect(speech).toContain("Warfarin");
    expect(speech).toContain("double-u");
    expect(speech).toContain("First week schedule:");

    // Extract first week speech block
    const firstWeekStart = speech.indexOf("First week schedule:");
    const firstWeekEnd = speech.indexOf("Maintenance schedule:");
    expect(firstWeekStart).toBeGreaterThan(-1);
    expect(firstWeekEnd).toBeGreaterThan(-1);
    
    const firstWeekSpeechText = speech.substring(firstWeekStart, firstWeekEnd);
    
    // English day names for Thu-Sun should be present
    expect(firstWeekSpeechText).toContain("Thursday");
    expect(firstWeekSpeechText).toContain("Friday");
    expect(firstWeekSpeechText).toContain("Saturday");
    expect(firstWeekSpeechText).toContain("Sunday");
    
    // Mon-Wed should be omitted in the first week part
    expect(firstWeekSpeechText).not.toContain("Monday");
    expect(firstWeekSpeechText).not.toContain("Tuesday");
    expect(firstWeekSpeechText).not.toContain("Wednesday");
  });
});
