/**
 * ZPL generator for Zebra ZD220 label printer
 * Label stock: 90mm wide, continuous or die-cut
 * Printer DPI: 203 (8 dots/mm)
 * Output: 2 labels per print
 *   Label 1: Schedule table — Thai headers + day abbreviations + dose info
 *   Label 2: Large QR (centered) + W-code + issued date
 *
 * Thai characters require a UTF-8 capable font on the printer.
 * Enable with ^CI28 (firmware v75+). Default A0 font lacks Thai glyphs —
 * download a Thai TrueType font to printer flash and reference with ^A@.
 */

import type { MedicationPlan, DayKey } from "./types";
import { days } from "./clinical";

const DPI = 203;
const DOTS_PER_MM = DPI / 25.4;
const LABEL_W = Math.round(90 * DOTS_PER_MM); // 720 dots = 90mm

function d(mm: number): number {
  return Math.round(mm * DOTS_PER_MM);
}

const DAY_SHORT_TH: Record<DayKey, string> = {
  mon: "จัน",
  tue: "อัง",
  wed: "พุธ",
  thu: "พฤหัส",
  fri: "ศุกร์",
  sat: "เสาร์",
  sun: "อาทิตย์",
};

function pillText(combo: {
  orangeWhole: number;
  orangeHalf: number;
  blueWhole: number;
  blueHalf: number;
  pinkWhole: number;
  pinkHalf: number;
}): string {
  const parts: string[] = [];
  if (combo.orangeWhole > 0) parts.push(`ส้ม ${combo.orangeWhole}`);
  if (combo.orangeHalf > 0) parts.push(`ส้ม 1/2`);
  if (combo.blueWhole > 0) parts.push(`ฟ้า ${combo.blueWhole}`);
  if (combo.blueHalf > 0) parts.push(`ฟ้า 1/2`);
  if (combo.pinkWhole > 0) parts.push(`ชมพู ${combo.pinkWhole}`);
  if (combo.pinkHalf > 0) parts.push(`ชมพู 1/2`);
  return parts.join("+") || "งดยา";
}

function doseCell(plan: MedicationPlan, day: DayKey, week: "first" | "maint"): string {
  const isBeforeClinic = days.indexOf(day) < days.indexOf(plan.clinicDay);
  if (week === "first") {
    if (isBeforeClinic) return "-";
    const entry = plan.firstWeek.find((e) => e.day === day);
    if (!entry) return "-";
    return entry.hold ? "งดยา" : `${entry.dose}mg ${pillText(entry.combo)}`;
  }
  const entry = plan.maintenanceWeek.find((e) => e.day === day);
  if (!entry) return "-";
  return entry.dose === 0 ? "งดยา" : `${entry.dose}mg ${pillText(entry.combo)}`;
}

/** Escape ^ and ~ which are ZPL control characters inside ^FD fields */
function zesc(s: string): string {
  return s.replace(/\^/g, "\\^").replace(/~/g, "\\~");
}

export function generateZpl(plan: MedicationPlan, url: string): string {
  const lines: string[] = [];
  const add = (...parts: string[]) => lines.push(...parts);

  const LM = d(2); // left margin (2mm)
  const RW = LABEL_W - d(2); // usable right edge

  // ── Label 1: Schedule Table ─────────────────────────────────────────────
  // Column X positions: Day(0-22mm) | Week1(22-56mm) | Maint(56-88mm)
  const colDay = LM;
  const colW1 = LM + d(22);
  const colMt = LM + d(56);
  const rowH = 32; // dots per row ≈ 4mm
  const hdrY = d(3);

  // Pre-calculate label 1 length
  const hrY1 = hdrY + 26;
  const footY1 = hrY1 + 4 + days.length * rowH + 8;
  const ll1 = footY1 + 2 + 6 + 22 + d(5); // rule + gap + warning text + bottom margin

  add("^XA");
  add(`^PW${LABEL_W}`);
  add(`^LL${ll1}`);
  add("^LH0,0");
  add("^CI28");
  add("^MMT");

  // Header row
  add(`^FO${colDay},${hdrY}^A0N,24,24^FDวัน^FS`);
  add(`^FO${colW1},${hdrY}^A0N,20,20^FDสัปดาห์แรก^FS`);
  add(`^FO${colMt},${hdrY}^A0N,20,20^FDสัปดาห์ถัดไป^FS`);

  // Separator line under header
  add(`^FO${LM},${hrY1}^GB${RW - LM},2,2^FS`);

  // Day rows
  days.forEach((day, i) => {
    const y = hrY1 + 4 + i * rowH;
    add(`^FO${colDay},${y}^A0N,22,22^FD${DAY_SHORT_TH[day]}^FS`);
    add(`^FO${colW1},${y}^A0N,22,22^FD${zesc(doseCell(plan, day, "first"))}^FS`);
    add(`^FO${colMt},${y}^A0N,22,22^FD${zesc(doseCell(plan, day, "maint"))}^FS`);
  });

  // Footer: rule + warning
  add(`^FO${LM},${footY1}^GB${RW - LM},2,2^FS`);
  add(`^FO${LM},${footY1 + 8}^A0N,18,18^FDพบแพทย์ทันทีหากมีเลือดออกผิดปกติ อุจจาระดำ^FS`);

  add("^XZ");

  // ── Label 2: Large QR + W-code ──────────────────────────────────────────
  // QR: mag 14, estimated module count 33 (v4) to 37 (v5) depending on URL length
  // v4 width = 14×33 = 462 dots ≈ 57.8mm; v5 = 14×37 = 518 dots ≈ 64.8mm (both fit 90mm)
  const qrMag = 14;
  const qrEst = qrMag * 33; // estimated size for centering (v4)
  const qrX = Math.round((LABEL_W - qrEst) / 2);
  const qrY = d(6);
  const captY = qrY + qrEst + d(4);
  const wcLblY = captY + 26;
  const wcValY = wcLblY + 26;
  const dateY = wcValY + 52;
  const ll2 = dateY + 22 + d(6);

  add("^XA");
  add(`^PW${LABEL_W}`);
  add(`^LL${ll2}`);
  add("^LH0,0");
  add("^CI28");
  add("^MMT");

  // Large QR centered
  add(`^FO${qrX},${qrY}`);
  add(`^BQN,2,${qrMag}`);
  add(`^FDMA,${zesc(url)}^FS`);

  // Caption below QR
  add(`^FO${LM},${captY}^A0N,20,20^FDสแกนดูตาราง/ฟังเสียง^FS`);

  // W-Code label + large value
  add(`^FO${LM},${wcLblY}^A0N,18,18^FDW-Code^FS`);
  add(`^FO${LM},${wcValY}^A0N,44,44^FD${zesc(plan.wCode)}^FS`);

  // Date meta
  add(`^FO${LM},${dateY}^A0N,18,18^FDWarfarin · ${zesc(plan.issuedDate)}^FS`);

  add("^XZ");

  return lines.join("\n");
}
