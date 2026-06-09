/**
 * ZPL generator for Zebra ZD220 label printer
 * Label stock: 90mm wide, continuous or die-cut
 * Printer DPI: 203 (8 dots/mm)
 * Layout: QR (left, main) | Name/HN/Schedule (right)
 * Thai text is not used — ZPL built-in fonts lack Thai glyphs.
 */

import type { MedicationPlan, DayKey } from "./types";
import { days } from "./clinical";

const DPI = 203;
const DOTS_PER_MM = DPI / 25.4;
const LABEL_W = Math.round(90 * DOTS_PER_MM); // 720 dots

function d(mm: number): number {
  return Math.round(mm * DOTS_PER_MM);
}

const DAY_ABBR: Record<DayKey, string> = {
  mon: "MON",
  tue: "TUE",
  wed: "WED",
  thu: "THU",
  fri: "FRI",
  sat: "SAT",
  sun: "SUN",
};

function pillText(
  combo: { orangeWhole: number; orangeHalf: number; blueWhole: number; blueHalf: number },
  hold?: boolean,
  dose?: number,
): string {
  if (hold || dose === 0) return "HOLD";
  const parts: string[] = [];
  if (combo.orangeWhole > 0) parts.push(`Or${combo.orangeWhole}`);
  if (combo.orangeHalf > 0) parts.push(`Or1/2`);
  if (combo.blueWhole > 0) parts.push(`Bl${combo.blueWhole}`);
  if (combo.blueHalf > 0) parts.push(`Bl1/2`);
  return parts.length ? parts.join("+") : "HOLD";
}

function doseCell(
  plan: MedicationPlan,
  day: DayKey,
  week: "first" | "maint",
): string {
  const isBeforeClinic = days.indexOf(day) < days.indexOf(plan.clinicDay);
  if (week === "first") {
    if (isBeforeClinic) return "-";
    const entry = plan.firstWeek.find((d) => d.day === day);
    if (!entry) return "-";
    return entry.hold ? "HOLD" : `${entry.dose}mg ${pillText(entry.combo)}`;
  }
  const entry = plan.maintenanceWeek.find((d) => d.day === day);
  if (!entry) return "-";
  return entry.dose === 0 ? "HOLD" : `${entry.dose}mg ${pillText(entry.combo)}`;
}

/** Escape ^ and ~ which are ZPL control characters inside ^FD fields */
function zesc(s: string): string {
  return s.replace(/\^/g, "\\^").replace(/~/g, "\\~");
}

export function generateZpl(plan: MedicationPlan, url: string): string {
  const lines: string[] = [];

  const add = (...parts: string[]) => lines.push(...parts);

  // ── Header ──────────────────────────────────────────────────────────────
  add("^XA");
  add(`^PW${LABEL_W}`); // page width
  add("^LL800"); // max label length (dots); actual content drives real height
  add("^LH0,0"); // label home
  add("^CI28"); // UTF-8 (firmware v75+, harmless if older)
  add("^MMT"); // media type: tear-off

  // ── QR Code (left column, main element) ─────────────────────────────────
  // Magnification 6 → module size 6 dots → QR v3(29mod) ≈ 174×174 dots ≈ 22mm
  const qrX = d(2);
  const qrY = d(2);
  add(`^FO${qrX},${qrY}`);
  add("^BQN,2,6"); // model 2, error-correction N(=M), magnification 6
  add(`^FDMA,${zesc(url)}^FS`);

  // Caption under QR
  add(`^FO${qrX},${qrY + 178}`);
  add("^A0N,16,16");
  add("^FDScan: schedule+audio^FS");

  // W-Code block under caption
  const wcY = qrY + 200;
  add(`^FO${qrX},${wcY}`);
  add("^A0N,16,16");
  add("^FDW-Code^FS");
  add(`^FO${qrX},${wcY + 18}`);
  add("^A0N,30,30");
  add(`^FD${zesc(plan.wCode)}^FS`);

  // ── Right column ─────────────────────────────────────────────────────────
  const rx = d(28); // right column X start (~28mm from left)

  // Schedule table header
  const tblY = d(2);
  const colDay = rx;
  const colW1 = rx + d(13);
  const colMt = rx + d(38);
  const rowH = 22; // dots per row

  // Header row
  add(`^FO${colDay},${tblY}^A0N,18,18^FDDay^FS`);
  add(`^FO${colW1},${tblY}^A0N,18,18^FDWeek 1^FS`);
  add(`^FO${colMt},${tblY}^A0N,18,18^FDMaint.^FS`);

  // Horizontal rule under header
  const hrY = tblY + 20;
  add(`^FO${colDay},${hrY}^GB${LABEL_W - rx},2,2^FS`);

  // Day rows
  days.forEach((day, i) => {
    const y = hrY + 4 + i * rowH;
    add(`^FO${colDay},${y}^A0N,18,18^FD${DAY_ABBR[day]}^FS`);
    add(`^FO${colW1},${y}^A0N,16,16^FD${zesc(doseCell(plan, day, "first"))}^FS`);
    add(`^FO${colMt},${y}^A0N,16,16^FD${zesc(doseCell(plan, day, "maint"))}^FS`);
  });

  // ── Footer warning ────────────────────────────────────────────────────────
  const footY = hrY + 4 + days.length * rowH + 6;
  add(`^FO${d(2)},${footY}^GB${LABEL_W - d(4)},2,2^FS`);
  add(`^FO${d(2)},${footY + 6}`);
  add("^A0N,16,16");
  add("^FD! Seek immediate care if unusual bleeding occurs.^FS");

  // ── End ──────────────────────────────────────────────────────────────────
  add("^XZ");

  return lines.join("\n");
}
