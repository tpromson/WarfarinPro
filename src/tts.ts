import { MedicationPlan } from "./types";
import { planSpeech } from "./clinical";
import { logVoiceEvent } from "./voiceLog";
import { trackEvent } from "./analytics";

export type SpeechStatus = "idle" | "playing" | "paused";
export type SpeechVoiceInfo = {
  provider: "Google Cloud TTS" | "Browser Web Speech";
  model: string;
  voiceName: string;
};
export type SpeechErrorInfo = {
  message: string;
  reason: string;
};

type GoogleTtsResult = {
  audioContent: string;
  voiceName: string;
};

type CachedGoogleAudio = GoogleTtsResult;

function getGoogleVoiceModel(voiceName: string): string {
  if (voiceName.includes("Chirp3-HD")) return "Chirp 3 HD";
  if (voiceName.includes("Neural2")) return "Neural2";
  return "Google TTS";
}

function parseCachedGoogleAudio(cachedValue: string, fallbackVoiceName: string): CachedGoogleAudio {
  try {
    const parsed = JSON.parse(cachedValue) as Partial<CachedGoogleAudio>;
    if (typeof parsed.audioContent === "string" && typeof parsed.voiceName === "string") {
      return {
        audioContent: parsed.audioContent,
        voiceName: parsed.voiceName,
      };
    }
  } catch {
    // Older cache entries stored only the base64 audio string.
  }
  return { audioContent: cachedValue, voiceName: fallbackVoiceName };
}

function toSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 240);
}

async function synthesizeCloudTts(
  text: string,
  gender: "female" | "male",
  lang: "th" | "en",
): Promise<GoogleTtsResult> {
  const endpoint = import.meta.env.VITE_TTS_ENDPOINT ?? "/api/tts";
  if (!endpoint) {
    throw new Error("missing cloud TTS endpoint");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, gender, lang }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloud TTS endpoint returned status ${response.status}: ${errText}`);
  }
  const data = (await response.json()) as Partial<GoogleTtsResult>;
  if (typeof data.audioContent !== "string" || typeof data.voiceName !== "string") {
    throw new Error("Cloud TTS endpoint returned an invalid response");
  }
  return { audioContent: data.audioContent, voiceName: data.voiceName };
}

class SpeechController {
  private activeAudio: HTMLAudioElement | null = null;
  private status: SpeechStatus = "idle";
  private subscribers: Set<(status: SpeechStatus) => void> = new Set();
  private voiceInfo: SpeechVoiceInfo | null = null;
  private voiceInfoSubscribers: Set<(voiceInfo: SpeechVoiceInfo | null) => void> = new Set();
  private errorInfo: SpeechErrorInfo | null = null;
  private errorInfoSubscribers: Set<(errorInfo: SpeechErrorInfo | null) => void> = new Set();

  private setStatus(status: SpeechStatus) {
    this.status = status;
    this.subscribers.forEach((callback) => callback(status));
  }

  private setVoiceInfo(voiceInfo: SpeechVoiceInfo | null) {
    this.voiceInfo = voiceInfo;
    this.voiceInfoSubscribers.forEach((callback) => callback(voiceInfo));
  }

  private setErrorInfo(errorInfo: SpeechErrorInfo | null) {
    this.errorInfo = errorInfo;
    this.errorInfoSubscribers.forEach((callback) => callback(errorInfo));
  }

  getStatus(): SpeechStatus {
    return this.status;
  }

  getVoiceInfo(): SpeechVoiceInfo | null {
    return this.voiceInfo;
  }

  getErrorInfo(): SpeechErrorInfo | null {
    return this.errorInfo;
  }

  subscribe(callback: (status: SpeechStatus) => void) {
    this.subscribers.add(callback);
    callback(this.status);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  subscribeVoiceInfo(callback: (voiceInfo: SpeechVoiceInfo | null) => void) {
    this.voiceInfoSubscribers.add(callback);
    callback(this.voiceInfo);
    return () => {
      this.voiceInfoSubscribers.delete(callback);
    };
  }

  subscribeErrorInfo(callback: (errorInfo: SpeechErrorInfo | null) => void) {
    this.errorInfoSubscribers.add(callback);
    callback(this.errorInfo);
    return () => {
      this.errorInfoSubscribers.delete(callback);
    };
  }

  async play(plan: MedicationPlan, gender: "female" | "male" = "female", lang: "th" | "en" = "th") {
    this.stop();
    this.setVoiceInfo(null);
    this.setErrorInfo(null);
    this.setStatus("playing");
    logVoiceEvent("play_requested", { lang, gender });
    trackEvent("audio_event", { action: "play_requested", lang, gender });

    const speechText = planSpeech(plan, gender, lang);

    try {
      const cacheKey = `warfarinpro.audio.${plan.id}.${gender}.${lang}`;
      const cachedAudio = sessionStorage.getItem(cacheKey);
      let voiceName =
        lang === "th"
          ? gender === "female"
            ? "th-TH-Chirp3-HD-Kore"
            : "th-TH-Chirp3-HD-Charon"
          : gender === "female"
            ? "en-US-Chirp3-HD-Kore"
            : "en-US-Chirp3-HD-Charon";
      let audioContent: string;

      const cached = Boolean(cachedAudio);
      if (cachedAudio) {
        const parsedCache = parseCachedGoogleAudio(cachedAudio, voiceName);
        audioContent = parsedCache.audioContent;
        voiceName = parsedCache.voiceName;
      } else {
        const result = await synthesizeCloudTts(speechText, gender, lang);
        audioContent = result.audioContent;
        voiceName = result.voiceName;
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
      }

      const voiceInfo: SpeechVoiceInfo = {
        provider: "Google Cloud TTS",
        model: getGoogleVoiceModel(voiceName),
        voiceName,
      };
      this.setVoiceInfo(voiceInfo);
      logVoiceEvent("voice_selected", { ...voiceInfo, lang, gender, cached });
      trackEvent("audio_event", {
        action: "voice_selected",
        lang,
        gender,
        provider: "google_tts",
        model: voiceInfo.model,
        result: cached ? "cached" : "generated",
      });

      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      this.activeAudio = audio;

      audio.addEventListener("ended", () => {
        this.setStatus("idle");
        this.setVoiceInfo(null);
        logVoiceEvent("ended", { lang, gender, provider: "Google Cloud TTS" });
        trackEvent("audio_event", { action: "ended", lang, gender, provider: "google_tts" });
        this.activeAudio = null;
      });

      audio.addEventListener("pause", () => {
        // Verify we didn't pause because it ended or was stopped
        if (this.status === "playing") {
          this.setStatus("paused");
        }
      });

      audio.addEventListener("play", () => {
        if (this.status === "paused") {
          this.setStatus("playing");
        }
      });

      await audio.play();
    } catch (error) {
      console.error("Google Cloud TTS failed:", error);
      const reason =
        error instanceof Error && error.message === "missing cloud TTS endpoint"
          ? "missing cloud TTS endpoint"
          : "cloud TTS required";
      this.setStatus("idle");
      this.setVoiceInfo(null);
      this.setErrorInfo({
        message:
          lang === "th"
            ? "ไม่สามารถสร้างเสียงอ่านจาก Cloud TTS ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง"
            : "Cloud TTS could not generate audio. Check the connection and try again.",
        reason,
      });
      logVoiceEvent("google_tts_failed", {
        lang,
        gender,
        provider: "Google Cloud TTS",
        error: toSafeErrorMessage(error),
        reason,
      });
      trackEvent("error_event", { area: "voice", type: "google_tts_required_failed", lang, gender });
    }
  }

  pause() {
    if (this.status !== "playing") return;
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.setStatus("paused");
    }
    logVoiceEvent("pause", this.voiceInfo ?? {});
    trackEvent("audio_event", { action: "pause", provider: this.voiceInfo?.provider, model: this.voiceInfo?.model });
  }

  resume() {
    if (this.status !== "paused") return;
    if (this.activeAudio) {
      this.activeAudio.play().catch((err) => {
        console.error("Failed to resume audio:", err);
        logVoiceEvent("error", {
          ...(this.voiceInfo ?? {}),
          error: toSafeErrorMessage(err),
          reason: "failed to resume audio",
        });
        trackEvent("error_event", { area: "voice", type: "resume_failed" });
        this.setStatus("idle");
      });
      this.setStatus("playing");
    }
    logVoiceEvent("resume", this.voiceInfo ?? {});
    trackEvent("audio_event", { action: "resume", provider: this.voiceInfo?.provider, model: this.voiceInfo?.model });
  }

  stop() {
    if (this.status === "idle") {
      this.setVoiceInfo(null);
      return;
    }
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }
    this.setStatus("idle");
    logVoiceEvent("stop", this.voiceInfo ?? {});
    trackEvent("audio_event", { action: "stop", provider: this.voiceInfo?.provider, model: this.voiceInfo?.model });
    this.setVoiceInfo(null);
    this.setErrorInfo(null);
  }
}

export const speechController = new SpeechController();

// Deprecated fallback helper for backward compatibility
export async function speakPlan(
  plan: MedicationPlan,
  gender: "female" | "male" = "female",
  lang: "th" | "en" = "th",
) {
  return speechController.play(plan, gender, lang);
}
