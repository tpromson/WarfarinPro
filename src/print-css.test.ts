import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const printCss = readFileSync(join(process.cwd(), "src/print.css"), "utf8");

describe("print CSS", () => {
  it("keeps the half-A4 medication sheet within the A5 printable area", () => {
    expect(printCss).toMatch(/\.sheet\.layout-half-a4\s*\{[\s\S]*height:\s*190mm !important/);
    expect(printCss).toMatch(/\.sheet\.layout-half-a4\s*\.sheet-info-row\s*\.sheet-metrics\s*\{[\s\S]*flex:\s*0 0 44% !important/);
  });
});
