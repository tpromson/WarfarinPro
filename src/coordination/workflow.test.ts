import { describe, expect, it } from "vitest";
import {
  canDispense,
  canResolveCorrection,
  canRequestCorrection,
  nextStatusAfterCorrectionResolution,
  transitionSessionStatus,
} from "./workflow";

describe("coordination workflow guards", () => {
  it("blocks dispensing while a correction request is open", () => {
    expect(
      canDispense({
        status: "correction_requested",
        hasOpenCorrection: true,
        planReviewedAfterLatestCorrection: false,
      }),
    ).toBe(false);
  });

  it("allows dispensing only after pharmacy review with no open correction", () => {
    expect(
      canDispense({
        status: "pharmacy_reviewed",
        hasOpenCorrection: false,
        planReviewedAfterLatestCorrection: true,
      }),
    ).toBe(true);
  });

  it("allows only pharmacists to request correction on a physician-reviewed plan", () => {
    expect(canRequestCorrection({ role: "pharmacist", status: "physician_reviewed" })).toBe(true);
    expect(canRequestCorrection({ role: "doctor", status: "physician_reviewed" })).toBe(false);
    expect(canRequestCorrection({ role: "pharmacist", status: "draft" })).toBe(false);
  });

  it("allows only doctors to resolve correction requests", () => {
    expect(canResolveCorrection({ role: "doctor", status: "correction_requested" })).toBe(true);
    expect(canResolveCorrection({ role: "pharmacist", status: "correction_requested" })).toBe(false);
    expect(canResolveCorrection({ role: "doctor", status: "pharmacy_reviewed" })).toBe(false);
  });

  it("returns physician_revised when a doctor resolves correction by updating the plan", () => {
    expect(nextStatusAfterCorrectionResolution("updated_plan")).toBe("physician_revised");
    expect(nextStatusAfterCorrectionResolution("accepted")).toBe("physician_revised");
    expect(nextStatusAfterCorrectionResolution("rejected")).toBe("physician_reviewed");
  });

  it("rejects invalid status transitions", () => {
    expect(() => transitionSessionStatus("draft", "dispensed")).toThrow(
      "Invalid coordination status transition: draft -> dispensed",
    );
  });
});
