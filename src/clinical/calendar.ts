import type { DayDose, DayKey, MedicationPlan, PillCombo } from "../types";
import { buildPatientUrl } from "./encoding";

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
  if (combo.orangeWhole > 0)
    parts.push(`Orange (2 mg) ${combo.orangeWhole} tab${combo.orangeWhole > 1 ? "s" : ""}`);
  if (combo.orangeHalf > 0) parts.push(`Orange (2 mg) 1/2 tab`);
  if (combo.blueWhole > 0)
    parts.push(`Blue (3 mg) ${combo.blueWhole} tab${combo.blueWhole > 1 ? "s" : ""}`);
  if (combo.blueHalf > 0) parts.push(`Blue (3 mg) 1/2 tab`);
  return `Take ${dayDose.dose} mg: ${parts.join(" and ")}`;
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

export function generateIcsFile(
  plan: MedicationPlan,
  startDateStr: string,
  endDateStr: string,
  lang: "th" | "en" = "th",
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

    let doseText: string;
    let description: string;
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
      ? lang === "th"
        ? `⚠️ งดยาวาร์ฟาริน (Hold)`
        : `⚠️ Hold Warfarin`
      : lang === "th"
        ? `💊 ทานยาวาร์ฟาริน ${doseText}`
        : `💊 Take Warfarin ${doseText}`;
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
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function generateGoogleCalendarUrl(
  plan: MedicationPlan,
  startDateStr: string,
  endDateStr: string,
  lang: "th" | "en" = "th",
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

  const firstWeekText = plan.firstWeek
    .map((d) => {
      const dayName = getSpeechDayLabel(d.day, lang);
      const desc = getPillDescription(d, lang);
      return `- ${dayName}: ${desc}`;
    })
    .join("\n");

  const maintenanceWeekText = plan.maintenanceWeek
    .map((d) => {
      const dayName = getSpeechDayLabel(d.day, lang);
      const desc = getPillDescription(d, lang);
      return `- ${dayName}: ${desc}`;
    })
    .join("\n");

  const detailsText =
    lang === "th"
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

export type { DayDose, DayKey, MedicationPlan, PillCombo };
