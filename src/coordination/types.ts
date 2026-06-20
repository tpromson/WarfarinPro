import type { MedicationPlan } from "../types";

export type StaffRole = "doctor" | "pharmacist" | "admin";

export type CoordinationStatus =
  | "draft"
  | "physician_reviewed"
  | "pharmacy_reviewed"
  | "correction_requested"
  | "physician_revised"
  | "dispensed"
  | "cancelled"
  | "expired"
  | "archived";

export type CorrectionReason =
  | "pill_burden"
  | "stock_issue"
  | "safety_concern"
  | "unclear_instruction"
  | "other";

export type CorrectionResolution = "accepted" | "rejected" | "updated_plan";

export type StaffProfile = {
  userId: string;
  role: StaffRole;
  displayName: string;
  active: boolean;
};

export type ClinicSession = {
  id: string;
  sessionHash: string;
  clinicDate: string;
  status: CoordinationStatus;
  currentPlan: MedicationPlan | null;
  expiresAt: string;
  createdBy: string;
  physicianReviewedBy: string | null;
  physicianReviewedAt: string | null;
  pharmacyReviewedBy: string | null;
  pharmacyReviewedAt: string | null;
  dispensedBy: string | null;
  dispensedAt: string | null;
};

export type CorrectionRequest = {
  id: string;
  sessionId: string;
  reason: CorrectionReason;
  note: string;
  requestedBy: string;
  requestedAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: CorrectionResolution | null;
};
