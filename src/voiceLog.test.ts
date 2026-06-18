import { beforeEach, describe, expect, it } from "vitest";
import { clearVoiceLog, getVoiceLogEntries, logVoiceEvent } from "./voiceLog";

describe("voiceLog", () => {
  beforeEach(() => {
    clearVoiceLog();
  });

  it("records local voice events with technical metadata", () => {
    logVoiceEvent("voice_selected", {
      lang: "th",
      gender: "female",
      provider: "Google Cloud TTS",
      model: "Chirp 3 HD",
      voiceName: "th-TH-Chirp3-HD-Kore",
    });

    expect(getVoiceLogEntries()).toMatchObject([
      {
        event: "voice_selected",
        lang: "th",
        gender: "female",
        provider: "Google Cloud TTS",
        model: "Chirp 3 HD",
        voiceName: "th-TH-Chirp3-HD-Kore",
      },
    ]);
    expect(getVoiceLogEntries()[0].timestamp).toEqual(expect.any(String));
  });

  it("drops plan identifiers and dosing data from event details", () => {
    logVoiceEvent("play_requested", {
      lang: "th",
      gender: "female",
      wCode: "W-SECRET",
      currentInr: 2.8,
      dose: 5,
      scheduleWeeklyDose: 35,
      plan: { wCode: "W-SECRET" },
    });

    const [{ timestamp: _timestamp, ...entryWithoutTimestamp }] = getVoiceLogEntries();
    const serialized = JSON.stringify(entryWithoutTimestamp);
    expect(serialized).toContain("play_requested");
    expect(serialized).toContain("female");
    expect(serialized).not.toContain("W-SECRET");
    expect(serialized).not.toContain("2.8");
    expect(serialized).not.toContain("35");
  });

  it("exposes local debug helpers on window for browser troubleshooting", () => {
    logVoiceEvent("pause", { provider: "Google Cloud TTS" });

    const debugApi = (
      window as Window & {
        __WARFARINPRO_VOICE_LOG__?: {
          entries: () => unknown[];
          clear: () => void;
        };
      }
    ).__WARFARINPRO_VOICE_LOG__;

    expect(debugApi?.entries()).toHaveLength(1);
    debugApi?.clear();
    expect(getVoiceLogEntries()).toHaveLength(0);
  });
});
