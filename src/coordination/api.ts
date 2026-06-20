import type { MedicationPlan } from "../types";
import { canDispense } from "./workflow";
import { getSupabaseClient } from "./supabaseClient";
import type {
  ClinicSession,
  CoordinationStatus,
  CorrectionReason,
  CorrectionResolution,
  StaffProfile,
} from "./types";

type StaffProfileRow = {
  user_id: string;
  role: StaffProfile["role"];
  display_name: string;
  active: boolean;
};

type ClinicSessionRow = {
  id: string;
  session_hash: string;
  clinic_date: string;
  status: CoordinationStatus;
  current_plan: MedicationPlan | null;
  expires_at: string;
  created_by: string;
  physician_reviewed_by: string | null;
  physician_reviewed_at: string | null;
  pharmacy_reviewed_by: string | null;
  pharmacy_reviewed_at: string | null;
  dispensed_by: string | null;
  dispensed_at: string | null;
};

type FindSessionResult = {
  found: boolean;
  sessionId?: string;
  sessionHash?: string;
};

type DispenseReadiness = {
  status: CoordinationStatus;
  hasOpenCorrection: boolean;
  planReviewedAfterLatestCorrection: boolean;
};

function mapStaffProfile(row: StaffProfileRow): StaffProfile {
  return {
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    active: row.active,
  };
}

function mapClinicSession(row: ClinicSessionRow): ClinicSession {
  return {
    id: row.id,
    sessionHash: row.session_hash,
    clinicDate: row.clinic_date,
    status: row.status,
    currentPlan: row.current_plan,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    physicianReviewedBy: row.physician_reviewed_by,
    physicianReviewedAt: row.physician_reviewed_at,
    pharmacyReviewedBy: row.pharmacy_reviewed_by,
    pharmacyReviewedAt: row.pharmacy_reviewed_at,
    dispensedBy: row.dispensed_by,
    dispensedAt: row.dispensed_at,
  };
}

function todayEndIso(clinicDate: string): string {
  return `${clinicDate}T23:59:59.000+07:00`;
}

export async function loadStaffProfile(userId: string): Promise<StaffProfile> {
  const { data, error } = await getSupabaseClient()
    .from("staff_profiles")
    .select("user_id, role, display_name, active")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error(`Staff profile lookup failed: ${error?.message ?? "missing profile"}`);
  }

  return mapStaffProfile(data as StaffProfileRow);
}

export async function findSessionByHn(hn: string, clinicDate: string): Promise<FindSessionResult> {
  const response = await fetch("/api/coordination/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hn, clinicDate }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Session lookup failed: ${message}`);
  }

  return (await response.json()) as FindSessionResult;
}

export async function createDoctorSession({
  sessionHash,
  clinicDate,
  plan,
  userId,
}: {
  sessionHash: string;
  clinicDate: string;
  plan: MedicationPlan;
  userId: string;
}): Promise<ClinicSession> {
  const reviewedAt = new Date().toISOString();
  const { data, error } = await getSupabaseClient()
    .from("clinic_sessions")
    .insert({
      session_hash: sessionHash,
      clinic_date: clinicDate,
      current_plan: plan,
      status: "physician_reviewed",
      created_by: userId,
      physician_reviewed_by: userId,
      physician_reviewed_at: reviewedAt,
      expires_at: todayEndIso(clinicDate),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Session creation failed: ${error?.message ?? "missing session"}`);
  }

  return mapClinicSession(data as ClinicSessionRow);
}

export async function savePlanToCoordinationSession({
  hn,
  clinicDate,
  plan,
  userId,
}: {
  hn: string;
  clinicDate: string;
  plan: MedicationPlan;
  userId: string;
}): Promise<{ sessionId: string; created: boolean }> {
  const result = await findSessionByHn(hn, clinicDate);
  if (result.found && result.sessionId) {
    await savePhysicianReviewedPlan(result.sessionId, plan, userId);
    return { sessionId: result.sessionId, created: false };
  }
  if (!result.sessionHash) {
    throw new Error("Session hash was not returned for new coordination session");
  }

  const session = await createDoctorSession({
    sessionHash: result.sessionHash,
    clinicDate,
    plan,
    userId,
  });
  return { sessionId: session.id, created: true };
}

export async function savePhysicianReviewedPlan(
  sessionId: string,
  plan: MedicationPlan,
  userId: string,
  status: Extract<CoordinationStatus, "physician_reviewed" | "physician_revised"> = "physician_reviewed",
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("clinic_sessions")
    .update({
      current_plan: plan,
      status,
      physician_reviewed_by: userId,
      physician_reviewed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Plan review save failed: ${error.message}`);
  }
}

export async function requestCorrection(
  sessionId: string,
  reason: CorrectionReason,
  note: string,
  userId = "",
): Promise<void> {
  const cleanNote = note.trim();
  if (cleanNote.length > 300) {
    throw new Error("Correction note must be 300 characters or fewer");
  }
  if (cleanNote.length === 0) {
    throw new Error("Correction note is required");
  }

  const { error } = await getSupabaseClient()
    .from("correction_requests")
    .insert({
      session_id: sessionId,
      reason,
      note: cleanNote,
      requested_by: userId,
    });

  if (error) {
    throw new Error(`Correction request failed: ${error.message}`);
  }

  const { error: sessionError } = await getSupabaseClient()
    .from("clinic_sessions")
    .update({ status: "correction_requested" })
    .eq("id", sessionId);

  if (sessionError) {
    throw new Error(`Correction status update failed: ${sessionError.message}`);
  }
}

export async function resolveCorrection(
  requestId: string,
  resolution: CorrectionResolution,
  userId: string,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("correction_requests")
    .update({
      resolution,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw new Error(`Correction resolution failed: ${error.message}`);
  }
}

export async function markPharmacyReviewed(sessionId: string, userId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("clinic_sessions")
    .update({
      status: "pharmacy_reviewed",
      pharmacy_reviewed_by: userId,
      pharmacy_reviewed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Pharmacy review failed: ${error.message}`);
  }
}

export async function markDispensed(
  sessionId: string,
  readiness: DispenseReadiness,
  userId = "",
): Promise<void> {
  if (!canDispense(readiness)) {
    throw new Error("Session is not ready to dispense");
  }

  const { error } = await getSupabaseClient()
    .from("clinic_sessions")
    .update({
      status: "dispensed",
      dispensed_by: userId,
      dispensed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Dispense update failed: ${error.message}`);
  }
}
