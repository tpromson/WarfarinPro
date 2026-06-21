import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const printCss = readFileSync(join(process.cwd(), "src/print.css"), "utf8");
const stylesCss = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
const allCss = `${printCss}\n${stylesCss}`;

function rule(selector: string, css = allCss): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
  if (!match) throw new Error(`Missing print CSS rule: ${selector}`);
  return match[1];
}

function mmValue(block: string, property: string): number {
  const match = block.match(new RegExp(`${property}:\\s*([0-9.]+)mm !important`));
  if (!match) throw new Error(`Missing ${property} mm value in rule:\n${block}`);
  return Number(match[1]);
}

function pxValue(block: string, property: string): number {
  const match = block.match(new RegExp(`${property}:\\s*([0-9.]+)px !important`));
  if (!match) throw new Error(`Missing ${property} px value in rule:\n${block}`);
  return Number(match[1]);
}

function firstPxValue(block: string, property: string): number {
  const match = block.match(new RegExp(`${property}:\\s*([0-9.]+)px`));
  if (!match) throw new Error(`Missing ${property} px value in rule:\n${block}`);
  return Number(match[1]);
}

describe("print CSS", () => {
  it("keeps the half-A4 medication sheet within the A5 printable area", () => {
    const sheet = rule(".sheet.layout-half-a4");
    expect(mmValue(sheet, "height")).toBeLessThanOrEqual(190);
    expect(mmValue(sheet, "max-height")).toBeLessThanOrEqual(190);
    expect(mmValue(sheet, "padding")).toBeLessThanOrEqual(4);
    expect(sheet).toContain("page-break-inside: avoid !important");
    expect(sheet).toContain("justify-content: flex-start !important");
  });

  it("keeps half-A4 summary metrics on the same row as patient blanks", () => {
    expect(rule(".sheet.layout-half-a4 .sheet-info-row")).toContain("flex-wrap: nowrap !important");
    expect(rule(".sheet.layout-half-a4 .sheet-info-row .blank-grid")).toContain(
      "flex: 0 0 52% !important",
    );
    expect(rule(".sheet.layout-half-a4 .sheet-info-row .sheet-metrics")).toContain(
      "flex: 0 0 44% !important",
    );
  });

  it("keeps half-A4 QR and dosing rows compact enough for one page", () => {
    const qrRule = rule(".sheet.layout-half-a4 .sheet-head .qr-code-img,\n  .sheet.layout-half-a4 .sheet-head .qr-code-box");
    expect(mmValue(qrRule, "height")).toBe(18);
    expect(mmValue(qrRule, "width")).toBe(18);

    expect(firstPxValue(rule(".sheet.layout-half-a4 .day-row"), "padding")).toBeLessThanOrEqual(4);
    expect(pxValue(rule(".sheet.layout-half-a4 .pill"), "height")).toBeLessThanOrEqual(16);
    expect(mmValue(rule(".sheet.layout-half-a4 .instructions"), "padding")).toBeLessThanOrEqual(2);
  });

  it("keeps QR artwork square in every print layout", () => {
    const qrBase = rule(".qr-code-img,\n  .qr-code-box,\n  .label-qr-img,\n  .label-qrpage-img,\n  .qr-sticker-img");
    expect(qrBase).toContain("aspect-ratio: 1 / 1 !important");
    expect(qrBase).toContain("object-fit: contain !important");

    const labelQr = rule(".layout-label-qrcode .label-qrpage-img");
    expect(mmValue(labelQr, "width")).toBe(mmValue(labelQr, "height"));

    const stickerQr = rule(".layout-qr-sheet .qr-sticker-img");
    expect(stickerQr).toContain("height: calc(28mm - 4mm)");
    expect(stickerQr).toContain("width: calc(28mm - 4mm)");
  });
});
