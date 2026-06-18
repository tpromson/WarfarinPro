import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speechController } from "./tts";
import type { DayDose, MedicationPlan } from "./types";
import { clearVoiceLog, getVoiceLogEntries } from "./voiceLog";

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
    vi.stubEnv("VITE_GOOGLE_TTS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ audioContent: "ZmFrZS1tcDM=" }),
      }),
    );
    class MockAudio {
      currentTime = 0;
      addEventListener = vi.fn();
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
    }
    vi.stubGlobal("Audio", MockAudio);
    sessionStorage.clear();
    clearVoiceLog();
  });

  afterEach(() => {
    speechController.stop();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    clearVoiceLog();
  });

  it("reports the Google TTS voice model used for the current playback", async () => {
    await speechController.play(makePlan(), "female", "th");

    expect(speechController.getVoiceInfo()).toEqual({
      provider: "Google Cloud TTS",
      model: "Chirp 3 HD",
      voiceName: "th-TH-Chirp3-HD-Kore",
    });
  });

  it("keeps the successful fallback Google voice name when replaying cached audio", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve("voice unavailable"),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ audioContent: "ZmFrZS1tcDM=" }),
      } as Response);

    const plan = makePlan();
    await speechController.play(plan, "female", "th");
    expect(speechController.getVoiceInfo()?.voiceName).toBe("th-TH-Chirp3-HD-Aoede");

    speechController.stop();
    await speechController.play(plan, "female", "th");

    expect(speechController.getVoiceInfo()?.voiceName).toBe("th-TH-Chirp3-HD-Aoede");
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
});
