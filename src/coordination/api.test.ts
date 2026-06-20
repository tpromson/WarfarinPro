import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffProfile } from "./types";

const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
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

  it("rejects correction notes longer than 300 characters", async () => {
    const { requestCorrection } = await import("./api");

    await expect(requestCorrection("session-1", "pill_burden", "x".repeat(301))).rejects.toThrow(
      "Correction note must be 300 characters or fewer",
    );
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
});
