import type { DayDose, DayKey, MedicationPlan, PillCombo } from "../types";
import { days } from "./days";

function speakDoseValue(dose: number, lang: "th" | "en" = "th"): string {
  if (dose === 0) return lang === "th" ? "ศูนย์มิลลิกรัม" : "zero milligrams";
  const integerPart = Math.floor(dose);
  const hasHalf = dose % 1 !== 0;

  if (lang === "th") {
    const thaiNumbers = [
      "ศูนย์",
      "หนึ่ง",
      "สอง",
      "สาม",
      "สี่",
      "ห้า",
      "หก",
      "เจ็ด",
      "แปด",
      "เก้า",
      "สิบ",
      "สิบเอ็ด",
      "สิบสอง",
    ];
    const integerSpeech = integerPart > 0 ? thaiNumbers[integerPart] || String(integerPart) : "";
    if (hasHalf) {
      return integerPart > 0 ? `${integerSpeech}มิลลิกรัมครึ่ง` : "ครึ่งมิลลิกรัม";
    }
    return `${integerSpeech}มิลลิกรัม`;
  } else {
    const englishNumbers = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
    ];
    const integerSpeech = integerPart > 0 ? englishNumbers[integerPart] || String(integerPart) : "";
    if (hasHalf) {
      return integerPart > 0 ? `${integerSpeech} and a half milligrams` : "half a milligram";
    }
    return `${integerSpeech} milligram${dose > 1 ? "s" : ""}`;
  }
}

function speakPillDetails(combo: PillCombo, lang: "th" | "en" = "th", gender: "female" | "male" = "female"): string {
  if (combo.dose === 0) return lang === "th" ? `งดยา${gender === "female" ? "นะคะ" : "นะครับ"}` : "hold your dose";
  const parts: string[] = [];

  if (lang === "th") {
    const thaiNumbers = [
      "ศูนย์",
      "หนึ่ง",
      "สอง",
      "สาม",
      "สี่",
      "ห้า",
      "หก",
      "เจ็ด",
      "แปด",
      "เก้า",
      "สิบ",
    ];
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
    const englishNumbers = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
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
  lang: "th" | "en" = "th",
): string {
  const doseGroups: {
    dose: number;
    hold: boolean;
    days: DayKey[];
    combo: PillCombo;
  }[] = [];

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
    let daysText: string;
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
    const pillText = speakPillDetails(group.combo, lang, gender);
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
  lang: "th" | "en" = "th",
): string {
  const wCodeSpeech = speakWCode(plan.wCode, lang);
  const firstWeekOver = isFirstWeekOver(plan);
  const maintenanceSpeech = speakWeekSchedule(plan.maintenanceWeek, gender, lang);

  if (lang === "th") {
    const politeIntro = gender === "female" ? "ค่ะ" : "ครับ";
    const politeWarn = gender === "female" ? "นะคะ" : "นะครับ";

    if (firstWeekOver) {
      const speech = `ยา วาร์ฟาริน รหัส ${wCodeSpeech} ${politeIntro} <break time="400ms"/> ผ่านช่วงสัปดาห์แรกแล้ว${politeWarn} <break time="200ms"/> ตารางยาปกติของคุณคือ: ${maintenanceSpeech} <break time="500ms"/> <emphasis level="moderate">หากมีเลือดออกผิดปกติ อุจจาระดำ หรือเวียนศีรษะ ให้รีบไปโรงพยาบาลทันที${politeWarn}</emphasis>`;
      if (gender === "female") {
        return `<speak><prosody rate="105%" pitch="+4%">${speech}</prosody></speak>`;
      }
      return `<speak>${speech}</speak>`;
    }

    const firstWeekToSpeak = plan.firstWeek.filter(
      (item) => days.indexOf(item.day) >= days.indexOf(plan.clinicDay),
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
      (item) => days.indexOf(item.day) >= days.indexOf(plan.clinicDay),
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

export type { DayDose, DayKey, MedicationPlan, PillCombo };
