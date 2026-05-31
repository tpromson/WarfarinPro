import { DayKey } from "./types";

export const t = {
  th: {
    doctor: "สำหรับแพทย์",
    patient: "สำหรับผู้ป่วย",
    patientViewer: "ตารางแนะนำการรับประทานยา",
    noPatientId: "ไม่มีการบันทึกข้อมูลส่วนบุคคลในระบบนี้ เพื่อความเป็นส่วนตัวสูงสุด",
    changeWCode: "ป้อนรหัส W-code ใหม่",
    listenThai: "ฟังเสียงนำทาง",
    addToCal: "เพิ่มลงปฏิทิน",
    downloadIcs: "ดาวน์โหลดปฏิทิน (.ics)",
    addToGoogle: "เพิ่มลง Google Calendar",
    saveOffline: "บันทึกในเครื่อง",
    print: "พิมพ์แผ่นแนะนำยา",
    savedPlans: "ประวัติแผนยาที่เลือก",
    noSavedPlans: "ยังไม่มีแผนยาที่บันทึกไว้ในเครื่องนี้",
    enterWCode: "ระบุรหัสตารางยา (W-code)",
    wcodePlaceholder: "เช่น W3500 หรือ W0752",
    wcodeError: "รหัสไม่ถูกต้อง (รูปแบบที่ถูกต้อง เช่น W3500, W0752)",
    showSchedule: "แสดงตารางรับประทานยา",
    patientName: "ชื่อผู้ป่วย / Patient Name",
    hn: "หมายเลขประจำตัวผู้ป่วย (HN)",
    appointment: "วันนัดตรวจครั้งถัดไป / Next Appointment",
    physicianSignature: "ลายมือชื่อแพทย์ / เภสัชกร",
    weeklyDose: "ขนาดยารวมต่อสัปดาห์",
    targetInr: "เป้าหมายค่า INR",
    issued: "วันที่สั่งยา",
    firstWeekTitle: "สัปดาห์แรก (หลังวันตรวจนัด)",
    firstWeekSubtitle: "ตารางกินยาช่วงเริ่มต้น",
    maintenanceWeekTitle: "สัปดาห์ถัดไป (ทานต่อเนื่อง)",
    maintenanceWeekSubtitle: "ทานซ้ำแบบเดิมในทุกสัปดาห์ (จันทร์-อาทิตย์)",
    warningTitle: "ข้อควรระวังสำคัญ! (โปรดอ่านและจำไว้เสมอ)",
    warningText: "หากท่านมีอาการเลือดออกผิดปกติ อุจจาระดำหรือแดง ปัสสาวะเป็นเลือด เวียนศีรษะอย่างรุนแรง หรือหกล้มศีรษะกระแทก ให้รีบเดินทางไปพบแพทย์ที่โรงพยาบาลทันที!",
    zoomText: "ซูมตัวอักษรใหญ่พิเศษ (สำหรับผู้สูงอายุ)",
    zoomNormal: "ย่อขนาดตัวอักษรปกติ",
    printLayout: "รูปแบบการพิมพ์",
    printHalfA4: "ครึ่ง A4 (A5)",
    printLabel: "ฉลากยา (Sticker)",
    downloadPdf: "ดาวน์โหลด PDF",
    wcodeWarning: "ตารางยานี้คำนวณจาก W-code อาจแตกต่างจากแผนยาที่แพทย์สั่ง กรุณาใช้ลิงก์หรือ QR code จากแพทย์เพื่อข้อมูลที่ถูกต้องที่สุด",
  },
  en: {
    doctor: "Doctor",
    patient: "Patient",
    patientViewer: "Medication Dosing Plan",
    noPatientId: "No personal identifiers are stored in this plan for privacy.",
    changeWCode: "Change W-code",
    listenThai: "Listen Guidance",
    addToCal: "Add to Calendar",
    downloadIcs: "Download (.ics)",
    addToGoogle: "Google Calendar",
    saveOffline: "Save Offline",
    print: "Print Plan",
    savedPlans: "Saved Dosing Plans",
    noSavedPlans: "No saved plans on this device.",
    enterWCode: "Enter Dosing Plan Code (W-code)",
    wcodePlaceholder: "e.g., W3500 or W0752",
    wcodeError: "Invalid format (Example format: W3500, W0752)",
    showSchedule: "Display Schedule",
    patientName: "Patient Name / ชื่อผู้ป่วย",
    hn: "Hospital Number (HN)",
    appointment: "Next Appointment / วันนัดตรวจครั้งถัดไป",
    physicianSignature: "Physician/Pharmacist Signature",
    weeklyDose: "Weekly Dose",
    targetInr: "Target INR",
    issued: "Issued Date",
    firstWeekTitle: "First Week",
    firstWeekSubtitle: "Initial dosing schedule",
    maintenanceWeekTitle: "Maintenance Week",
    maintenanceWeekSubtitle: "Repeatable weekly schedule (Mon-Sun)",
    warningTitle: "Critical Safety Warnings!",
    warningText: "If you experience any abnormal bleeding, black or red stools, blood in urine, severe dizziness, or hit your head in a fall, seek immediate medical attention at the hospital!",
    zoomText: "Zoom Large Text (For Seniors)",
    zoomNormal: "Use Normal Text Size",
    printLayout: "Print Layout",
    printHalfA4: "Half A4 (A5)",
    printLabel: "Medicine Label Sticker",
    downloadPdf: "Download PDF",
    wcodeWarning: "This schedule is generated from a W-code and may differ from your doctor's exact prescription. Use the link or QR code from your doctor for the most accurate information.",
  }
};

export function getDayLabel(day: DayKey, lang: "th" | "en"): string {
  if (lang === "en") {
    const en: Record<DayKey, string> = {
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday",
    };
    return en[day];
  }
  const th: Record<DayKey, string> = {
    mon: "วันจันทร์",
    tue: "วันอังคาร",
    wed: "วันพุธ",
    thu: "วันพฤหัสบดี",
    fri: "วันศุกร์",
    sat: "วันเสาร์",
    sun: "วันอาทิตย์",
  };
  return th[day];
}

export function getPillComboDesc(combo: { dose: number; orangeWhole: number; orangeHalf: number; blueWhole: number; blueHalf: number }, hold?: boolean, lang: "th" | "en" = "th"): string {
  if (hold || combo.dose === 0) return lang === "th" ? "งดทานยา" : "HOLD";
  const parts: string[] = [];
  if (lang === "th") {
    if (combo.orangeWhole > 0) parts.push(`สีส้ม ${combo.orangeWhole} เม็ด`);
    if (combo.orangeHalf > 0) parts.push(`สีส้ม 1/2 เม็ด`);
    if (combo.blueWhole > 0) parts.push(`สีฟ้า ${combo.blueWhole} เม็ด`);
    if (combo.blueHalf > 0) parts.push(`สีฟ้า 1/2 เม็ด`);
    return parts.length > 0 ? parts.join(" + ") : "งดยา";
  }
  if (combo.orangeWhole > 0) parts.push(`Orange ${combo.orangeWhole} tab${combo.orangeWhole > 1 ? "s" : ""}`);
  if (combo.orangeHalf > 0) parts.push(`Orange 1/2 tab`);
  if (combo.blueWhole > 0) parts.push(`Blue ${combo.blueWhole} tab${combo.blueWhole > 1 ? "s" : ""}`);
  if (combo.blueHalf > 0) parts.push(`Blue 1/2 tab`);
  return parts.length > 0 ? parts.join(" + ") : "HOLD";
}
