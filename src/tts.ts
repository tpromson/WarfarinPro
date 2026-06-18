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

async function synthesizeGoogleTts(
  text: string,
  apiKey: string,
  gender: "female" | "male",
  lang: "th" | "en",
): Promise<GoogleTtsResult> {
  // Multiple voices in priority order — if the first fails (not available in the project
  // or region), subsequent ones are tried before giving up and falling back to browser TTS.
  const voiceNames =
    lang === "th"
      ? gender === "female"
        ? ["th-TH-Chirp3-HD-Kore", "th-TH-Chirp3-HD-Aoede", "th-TH-Chirp3-HD-Leda"]
        : ["th-TH-Chirp3-HD-Charon", "th-TH-Chirp3-HD-Fenrir", "th-TH-Chirp3-HD-Orus"]
      : gender === "female"
        ? ["en-US-Chirp3-HD-Kore", "en-US-Neural2-F"]
        : ["en-US-Chirp3-HD-Charon", "en-US-Neural2-D"];
  const languageCode = lang === "th" ? "th-TH" : "en-US";
  const speakingRate =
    lang === "th" ? (gender === "female" ? 0.98 : 0.93) : gender === "female" ? 0.95 : 0.9;

  let lastError: Error = new Error("No voices attempted");
  for (const voiceName of voiceNames) {
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode, name: voiceName },
            audioConfig: { audioEncoding: "MP3", speakingRate },
          }),
        },
      );
      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Google TTS API returned status ${response.status}: ${errText}`);
        continue;
      }
      const data = await response.json();
      return { audioContent: data.audioContent, voiceName };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError;
}

class SpeechController {
  private activeAudio: HTMLAudioElement | null = null;
  private status: SpeechStatus = "idle";
  private subscribers: Set<(status: SpeechStatus) => void> = new Set();
  private voiceInfo: SpeechVoiceInfo | null = null;
  private voiceInfoSubscribers: Set<(voiceInfo: SpeechVoiceInfo | null) => void> = new Set();

  private setStatus(status: SpeechStatus) {
    this.status = status;
    this.subscribers.forEach((callback) => callback(status));
  }

  private setVoiceInfo(voiceInfo: SpeechVoiceInfo | null) {
    this.voiceInfo = voiceInfo;
    this.voiceInfoSubscribers.forEach((callback) => callback(voiceInfo));
  }

  getStatus(): SpeechStatus {
    return this.status;
  }

  getVoiceInfo(): SpeechVoiceInfo | null {
    return this.voiceInfo;
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

  async play(plan: MedicationPlan, gender: "female" | "male" = "female", lang: "th" | "en" = "th") {
    this.stop();
    this.setVoiceInfo(null);
    this.setStatus("playing");
    logVoiceEvent("play_requested", { lang, gender });
    trackEvent("audio_event", { action: "play_requested", lang, gender });

    const speechText = planSpeech(plan, gender, lang);
    const apiKey = import.meta.env.VITE_GOOGLE_TTS_API_KEY;

    if (apiKey) {
      try {
        const cacheKey = `warfarinpro.audio.${plan.id}.${gender}.${lang}`;
        let cachedAudio = sessionStorage.getItem(cacheKey);
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
          const result = await synthesizeGoogleTts(speechText, apiKey, gender, lang);
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
        return;
      } catch (error) {
        console.error("Google Cloud TTS failed, falling back to browser TTS:", error);
        logVoiceEvent("google_tts_failed", {
          lang,
          gender,
          provider: "Google Cloud TTS",
          error: toSafeErrorMessage(error),
          reason: "falling back to browser TTS",
        });
        trackEvent("error_event", { area: "voice", type: "google_tts_fallback", lang, gender });
      }
    }

    // Fallback: Web Speech API Synthesis
    if (!("speechSynthesis" in window)) {
      this.setStatus("idle");
      this.setVoiceInfo(null);
      logVoiceEvent("browser_tts_unavailable", { lang, gender, provider: "Browser Web Speech" });
      trackEvent("error_event", { area: "voice", type: "browser_tts_unavailable", lang, gender });
      return;
    }

    window.speechSynthesis.cancel();
    const plainText = speechText
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(plainText);
    const targetLang = lang === "th" ? "th-TH" : "en-US";
    utterance.lang = targetLang;
    utterance.rate =
      lang === "th" ? (gender === "female" ? 0.85 : 0.78) : gender === "female" ? 0.95 : 0.9;

    utterance.onend = () => {
      this.setStatus("idle");
      this.setVoiceInfo(null);
      logVoiceEvent("ended", { lang, gender, provider: "Browser Web Speech" });
      trackEvent("audio_event", { action: "ended", lang, gender, provider: "browser_web_speech" });
    };
    utterance.onerror = (event) => {
      this.setStatus("idle");
      this.setVoiceInfo(null);
      logVoiceEvent("error", {
        lang,
        gender,
        provider: "Browser Web Speech",
        error: event.error,
      });
      trackEvent("error_event", { area: "voice", type: "browser_tts_error", lang, gender });
    };

    const applyVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const langVoices = voices.filter((v) => v.lang === targetLang || v.lang.startsWith(lang));
      if (langVoices.length > 0) {
        const maleVoice = langVoices.find((v) => /male/i.test(v.name));
        const femaleVoice = langVoices.find((v) => !/male/i.test(v.name));
        if (gender === "male") {
          utterance.voice = maleVoice ?? langVoices[0];
          // Dedicated male voice: natural pitch. Shared female voice: lower pitch noticeably
          // so the listener can hear the gender difference even without a native male voice.
          utterance.pitch = maleVoice ? 1.0 : 0.75;
        } else {
          utterance.voice = femaleVoice ?? langVoices[0];
          utterance.pitch = 1.15;
        }
        const voiceInfo: SpeechVoiceInfo = {
          provider: "Browser Web Speech",
          model: "Web Speech API",
          voiceName: utterance.voice?.name ?? targetLang,
        };
        this.setVoiceInfo(voiceInfo);
        logVoiceEvent("voice_selected", { ...voiceInfo, lang, gender });
        trackEvent("audio_event", {
          action: "voice_selected",
          lang,
          gender,
          provider: "browser_web_speech",
          model: voiceInfo.model,
        });
      } else {
        utterance.pitch = gender === "female" ? 1.15 : 0.75;
        const voiceInfo: SpeechVoiceInfo = {
          provider: "Browser Web Speech",
          model: "Web Speech API",
          voiceName: targetLang,
        };
        this.setVoiceInfo(voiceInfo);
        logVoiceEvent("voice_selected", { ...voiceInfo, lang, gender });
        trackEvent("audio_event", {
          action: "voice_selected",
          lang,
          gender,
          provider: "browser_web_speech",
          model: voiceInfo.model,
        });
      }
      window.speechSynthesis.speak(utterance);
    };

    // Chrome loads voices asynchronously on first call; Safari/Firefox load synchronously.
    if (window.speechSynthesis.getVoices().length > 0) {
      applyVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        applyVoiceAndSpeak();
      };
    }
  }

  pause() {
    if (this.status !== "playing") return;
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.setStatus("paused");
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
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
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
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
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.setStatus("idle");
    logVoiceEvent("stop", this.voiceInfo ?? {});
    trackEvent("audio_event", { action: "stop", provider: this.voiceInfo?.provider, model: this.voiceInfo?.model });
    this.setVoiceInfo(null);
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
