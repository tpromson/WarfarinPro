import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffProfile } from "./types";

const singleMock = vi.fn();
const orderMock = vi.fn();
const isMock = vi.fn(() => ({ single: singleMock }));
const eqMock = vi.fn(() => ({ single: singleMock, is: isMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const insertSelectSingleMock = vi.fn();
const insertSelectMock = vi.fn(() => ({ single: insertSelectSingleMock }));
const insertMock = vi.fn(() => ({ select: insertSelectMock }));
const updateEqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const fromMock = vi.fn(() => ({ select: selectMock, insert: insertMock, update: updateMock }));

vi.mock("./supabaseClient", () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

describe("coordination API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    eqMock.mockImplementation(() => ({ single: singleMock, order: orderMock, is: isMock }));
    isMock.mockImplementation(() => ({ single: singleMock }));
  });

  it("loads active staff profile for the current user", async () => {
    const profile: StaffProfile = {
      userId: "user-1",
      role: "doctor",
      displayName: "Dr Test",
      active: true,
    };
    singleMock.mockResolvedValueOnce({
      data: {
        user_id: "user-1",
        role: "doctor",
        display_name: "Dr Test",
        active: true,
      },
      error: null,
    });

    const { loadStaffProfile } = await import("./api");

    await expect(loadStaffProfile("user-1")).resolves.toEqual(profile);
  });

  it("throws when profile lookup fails", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const { loadStaffProfile } = await import("./api");

    await expect(loadStaffProfile("user-1")).rejects.toThrow("Staff profile lookup failed: not found");
  });

  it("finds session by HN through the server hash endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ found: true, sessionId: "session-1" }),
      }),
    );

    const { findSessionByHn } = await import("./api");

    await expect(findSessionByHn("12345", "2026-06-20")).resolves.toEqual({
      found: true,
      sessionId: "session-1",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/coordination/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hn: "12345", clinicDate: "2026-06-20" }),
      }),
    );
  });

  it("loads a clinic session by id", async () => {
    singleMock.mockResolvedValueOnce({
      data: {
        id: "session-1",
        session_hash: "hashed-hn",
        clinic_date: "2026-06-21",
        status: "physician_reviewed",
        current_plan: null,
        expires_at: "2026-06-21T23:59:59.000+07:00",
        created_by: "doctor-1",
        physician_reviewed_by: "doctor-1",
        physician_reviewed_at: "2026-06-21T12:00:00.000Z",
        pharmacy_reviewed_by: null,
        pharmacy_reviewed_at: null,
        dispensed_by: null,
        dispensed_at: null,
      },
      error: null,
    });

    const { loadClinicSession } = await import("./api");

    await expect(loadClinicSession("session-1")).resolves.toEqual(
      expect.objectContaining({
        id: "session-1",
        status: "physician_reviewed",
      }),
    );
  });

  it("loads today's clinic sessions ordered by latest physician review", async () => {
    orderMock.mockResolvedValueOnce({
      data: [
        {
          id: "session-2",
          session_hash: "hash-2",
          clinic_date: "2026-06-21",
          status: "correction_requested",
          current_plan: null,
          expires_at: "2026-06-21T23:59:59.000+07:00",
          created_by: "doctor-1",
          physician_reviewed_by: "doctor-1",
          physician_reviewed_at: "2026-06-21T13:00:00.000Z",
          pharmacy_reviewed_by: null,
          pharmacy_reviewed_at: null,
          dispensed_by: null,
          dispensed_at: null,
        },
      ],
      error: null,
    });

    const { loadTodayClinicSessions } = await import("./api");

    await expect(loadTodayClinicSessions("2026-06-21")).resolves.toEqual([
      expect.objectContaining({
        id: "session-2",
        status: "correction_requested",
      }),
    ]);
    expect(fromMock).toHaveBeenCalledWith("clinic_sessions");
    expect(selectMock).toHaveBeenCalledWith("*");
    expect(eqMock).toHaveBeenCalledWith("clinic_date", "2026-06-21");
    expect(orderMock).toHaveBeenCalledWith("physician_reviewed_at", {
      ascending: false,
      nullsFirst: false,
    });
  });

  it("rejects correction notes longer than 300 characters", async () => {
    const { requestCorrection } = await import("./api");

    await expect(requestCorrection("session-1", "pill_burden", "x".repeat(301))).rejects.toThrow(
      "Correction note must be 300 characters or fewer",
    );
  });

  it("loads an open correction request for a session", async () => {
    singleMock.mockResolvedValueOnce({
      data: {
        id: "correction-1",
        session_id: "session-1",
        reason: "pill_burden",
        note: "ลดจำนวนเม็ดยาได้ไหม",
        requested_by: "pharmacist-1",
        requested_at: "2026-06-21T12:05:00.000Z",
        resolved_by: null,
        resolved_at: null,
        resolution: null,
      },
      error: null,
    });

    const { loadOpenCorrectionRequest } = await import("./api");

    await expect(loadOpenCorrectionRequest("session-1")).resolves.toEqual(
      expect.objectContaining({
        id: "correction-1",
        sessionId: "session-1",
        reason: "pill_burden",
        note: "ลดจำนวนเม็ดยาได้ไหม",
      }),
    );
    expect(fromMock).toHaveBeenCalledWith("correction_requests");
    expect(selectMock).toHaveBeenCalledWith("*");
    expect(eqMock).toHaveBeenCalledWith("session_id", "session-1");
    expect(isMock).toHaveBeenCalledWith("resolved_at", null);
  });

  it("resolves a correction request and restores the session status", async () => {
    updateEqMock.mockResolvedValue({ error: null });

    const { resolveCorrectionForSession } = await import("./api");

    await expect(
      resolveCorrectionForSession({
        requestId: "correction-1",
        sessionId: "session-1",
        resolution: "rejected",
        userId: "doctor-1",
      }),
    ).resolves.toBeUndefined();

    expect(fromMock).toHaveBeenCalledWith("correction_requests");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: "rejected",
        resolved_by: "doctor-1",
      }),
    );
    expect(fromMock).toHaveBeenCalledWith("clinic_sessions");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "physician_reviewed",
        physician_reviewed_by: "doctor-1",
      }),
    );
    expect(updateEqMock).toHaveBeenCalledWith("id", "session-1");
  });

  it("blocks dispensing when workflow guard fails", async () => {
    const { markDispensed } = await import("./api");

    await expect(
      markDispensed("session-1", {
        status: "correction_requested",
        hasOpenCorrection: true,
        planReviewedAfterLatestCorrection: false,
      }),
    ).rejects.toThrow("Session is not ready to dispense");
  });

  it("creates and physician-reviews a coordination session when no session exists for HN", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ found: false, sessionHash: "hashed-hn" }),
      }),
    );
    insertSelectSingleMock.mockResolvedValueOnce({
      data: {
        id: "session-1",
        session_hash: "hashed-hn",
        clinic_date: "2026-06-21",
        status: "physician_reviewed",
        current_plan: null,
        expires_at: "2026-06-21T23:59:59.000+07:00",
        created_by: "doctor-1",
        physician_reviewed_by: "doctor-1",
        physician_reviewed_at: "2026-06-21T12:00:00.000Z",
        pharmacy_reviewed_by: null,
        pharmacy_reviewed_at: null,
        dispensed_by: null,
        dispensed_at: null,
      },
      error: null,
    });

    const { savePlanToCoordinationSession } = await import("./api");

    await expect(
      savePlanToCoordinationSession({
        hn: "12345",
        clinicDate: "2026-06-21",
        plan: {} as never,
        userId: "doctor-1",
      }),
    ).resolves.toEqual({ sessionId: "session-1", created: true });
  });
});
