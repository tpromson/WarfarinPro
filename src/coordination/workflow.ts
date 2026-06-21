import type { CoordinationStatus, CorrectionResolution, StaffRole } from "./types";

const VALID_TRANSITIONS: Record<CoordinationStatus, CoordinationStatus[]> = {
  draft: ["physician_reviewed", "cancelled", "expired"],
  physician_reviewed: ["pharmacy_reviewed", "correction_requested", "cancelled", "expired"],
  pharmacy_reviewed: ["dispensed", "correction_requested", "cancelled", "expired"],
  correction_requested: ["physician_revised", "physician_reviewed", "cancelled", "expired"],
  physician_revised: ["pharmacy_reviewed", "correction_requested", "cancelled", "expired"],
  dispensed: ["archived"],
  cancelled: ["archived"],
  expired: ["archived"],
  archived: [],
};

export function canRequestCorrection({
  role,
  status,
}: {
  role: StaffRole;
  status: CoordinationStatus;
}): boolean {
  return role === "pharmacist" && (status === "physician_reviewed" || status === "pharmacy_reviewed");
}

export function canResolveCorrection({
  role,
  status,
}: {
  role: StaffRole;
  status: CoordinationStatus;
}): boolean {
  return role === "doctor" && status === "correction_requested";
}

export function canDispense({
  status,
  hasOpenCorrection,
  planReviewedAfterLatestCorrection,
}: {
  status: CoordinationStatus;
  hasOpenCorrection: boolean;
  planReviewedAfterLatestCorrection: boolean;
}): boolean {
  return status === "pharmacy_reviewed" && !hasOpenCorrection && planReviewedAfterLatestCorrection;
}

export function nextStatusAfterCorrectionResolution(
  resolution: CorrectionResolution,
): CoordinationStatus {
  return resolution === "rejected" ? "physician_reviewed" : "physician_revised";
}

export function transitionSessionStatus(
  current: CoordinationStatus,
  next: CoordinationStatus,
): CoordinationStatus {
  if (!VALID_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid coordination status transition: ${current} -> ${next}`);
  }
  return next;
}
