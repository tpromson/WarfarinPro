import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speechController } from "./tts";
import type { DayDose, MedicationPlan } from "./types";
import { clearVoiceLog, getVoiceLogEntries } from "./voiceLog";
import { clearAnalyticsDebugLog, getAnalyticsDebugLog } from "./analytics";

function makeDose(day: DayDose["day"]): DayDose {
  return {
    day,
    dose: 5,
    combo: {
      dose: 5,
      orangeWhole: 1,
      orangeHalf: 0,
      blueWhole: 1,
      blueHalf: 0,
      pinkWhole: 0,
      pinkHalf: 0,
      score: 3,
    },
  };
}

function makePlan(): MedicationPlan {
  const week = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map(makeDose);
  return {
    version: 1,
    id: "test-plan",
    issuedDate: "2026-06-18",
    clinicDay: "mon",
    target: { preset: "standard", lower: 2, upper: 3 },
    currentInr: 2.4,
    previousWeeklyDose: 35,
    calculatedWeeklyDose: 35,
    scheduleWeeklyDose: 35,
    selectedAdjustment: 0,
    firstWeekHoldDoses: 0,
    wCode: "W123",
    safety: {
      severity: "normal",
      messages: [],
      interactionFlags: [],
      contextFlags: [],
      complexSchedule: false,
      roundedSchedule: false,
      majorBleeding: false,
    },
    firstWeek: week,
    maintenanceWeek: week,
  };
}

describe("speechController voice metadata", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_TTS_ENDPOINT", "/api/tts");
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            audioContent: "ZmFrZS1tcDM=",
            voiceName: "th-TH-Chirp3-HD-Kore",
          }),
      }),
    );
    class MockAudio {
      currentTime = 0;
      addEventListener = vi.fn();
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
    }
    vi.stubGlobal("Audio", MockAudio);
    window.plausible = vi.fn() as typeof window.plausible;
    sessionStorage.clear();
    clearVoiceLog();
    clearAnalyticsDebugLog();
  });

  afterEach(() => {
    speechController.stop();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    clearVoiceLog();
    clearAnalyticsDebugLog();
    delete window.plausible;
  });

  it("reports the Google TTS voice model used for the current playback", async () => {
    await speechController.play(makePlan(), "female", "th");

    expect(fetch).toHaveBeenCalledWith(
      "/api/tts",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(speechController.getVoiceInfo()).toEqual({
      provider: "Google Cloud TTS",
      model: "Chirp 3 HD",
      voiceName: "th-TH-Chirp3-HD-Kore",
    });
  });

  it("keeps the proxy-selected Google voice name when replaying cached audio", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          audioContent: "ZmFrZS1tcDM=",
          voiceName: "th-TH-Chirp3-HD-Aoede",
        }),
    } as Response);

    const plan = makePlan();
    await speechController.play(plan, "female", "th");
    expect(speechController.getVoiceInfo()?.voiceName).toBe("th-TH-Chirp3-HD-Aoede");
    expect(fetch).toHaveBeenCalledTimes(1);

    speechController.stop();
    await speechController.play(plan, "female", "th");

    expect(speechController.getVoiceInfo()?.voiceName).toBe("th-TH-Chirp3-HD-Aoede");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("writes safe local voice logs without plan identifiers", async () => {
    await speechController.play(makePlan(), "female", "th");

    const logs = getVoiceLogEntries();
    expect(logs.map((entry) => entry.event)).toEqual(
      expect.arrayContaining(["play_requested", "voice_selected"]),
    );
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "voice_selected",
          provider: "Google Cloud TTS",
          model: "Chirp 3 HD",
          voiceName: "th-TH-Chirp3-HD-Kore",
          lang: "th",
          gender: "female",
        }),
      ]),
    );
    expect(JSON.stringify(logs)).not.toContain("W123");
    expect(JSON.stringify(logs)).not.toContain("test-plan");
  });

  it("writes safe audio analytics without plan identifiers", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "true");
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "plausible");

    await speechController.play(makePlan(), "female", "th");

    expect(window.plausible).toHaveBeenCalledWith("audio_event", {
      props: expect.objectContaining({
        action: "voice_selected",
        lang: "th",
        gender: "female",
        provider: "google_tts",
        model: "Chirp 3 HD",
      }),
    });
    expect(JSON.stringify(getAnalyticsDebugLog())).not.toContain("W123");
    expect(JSON.stringify(getAnalyticsDebugLog())).not.toContain("test-plan");
  });

  it("stops instead of falling back to browser speech when the TTS endpoint is missing", async () => {
    vi.stubEnv("VITE_TTS_ENDPOINT", "");
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", {
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      pause: vi.fn(),
      resume: vi.fn(),
      speak,
    });

    await speechController.play(makePlan(), "female", "th");

    expect(speak).not.toHaveBeenCalled();
    expect(speechController.getStatus()).toBe("idle");
    expect(getVoiceLogEntries()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "google_tts_failed",
          provider: "Google Cloud TTS",
          reason: "missing cloud TTS endpoint",
        }),
      ]),
    );
  });

  it("stops instead of falling back to browser speech when Google synthesis fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network unavailable"));
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", {
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      pause: vi.fn(),
      resume: vi.fn(),
      speak,
    });

    await speechController.play(makePlan(), "female", "th");

    expect(speak).not.toHaveBeenCalled();
    expect(speechController.getStatus()).toBe("idle");
    expect(getVoiceLogEntries()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "google_tts_failed",
          provider: "Google Cloud TTS",
          error: "network unavailable",
          reason: "cloud TTS required",
        }),
      ]),
    );
  });
});
