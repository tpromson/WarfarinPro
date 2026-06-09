import { MedicationPlan } from "./types";
import { planSpeech } from "./clinical";

export type SpeechStatus = "idle" | "playing" | "paused";

async function synthesizeGoogleTts(
  text: string,
  apiKey: string,
  gender: "female" | "male",
  lang: "th" | "en",
): Promise<string> {
  const voiceName =
    lang === "th"
      ? gender === "female"
        ? "th-TH-Chirp3-HD-Kore"
        : "th-TH-Chirp3-HD-Charon"
      : gender === "female"
        ? "en-US-Neural2-F"
        : "en-US-Neural2-M";
  const languageCode = lang === "th" ? "th-TH" : "en-US";

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate:
            lang === "th" ? (gender === "female" ? 0.98 : 0.93) : gender === "female" ? 0.95 : 0.9,
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google TTS API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.audioContent;
}

class SpeechController {
  private activeAudio: HTMLAudioElement | null = null;
  private status: SpeechStatus = "idle";
  private subscribers: Set<(status: SpeechStatus) => void> = new Set();

  private setStatus(status: SpeechStatus) {
    this.status = status;
    this.subscribers.forEach((callback) => callback(status));
  }

  getStatus(): SpeechStatus {
    return this.status;
  }

  subscribe(callback: (status: SpeechStatus) => void) {
    this.subscribers.add(callback);
    callback(this.status);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  async play(plan: MedicationPlan, gender: "female" | "male" = "female", lang: "th" | "en" = "th") {
    this.stop();
    this.setStatus("playing");

    const speechText = planSpeech(plan, gender, lang);
    const apiKey = import.meta.env.VITE_GOOGLE_TTS_API_KEY;

    if (apiKey) {
      try {
        const cacheKey = `warfarinpro.audio.${plan.id}.${gender}.${lang}`;
        let audioContent = sessionStorage.getItem(cacheKey);

        if (!audioContent) {
          audioContent = await synthesizeGoogleTts(speechText, apiKey, gender, lang);
          sessionStorage.setItem(cacheKey, audioContent);
        }

        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        this.activeAudio = audio;

        audio.addEventListener("ended", () => {
          this.setStatus("idle");
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
      }
    }

    // Fallback: Web Speech API Synthesis
    if (!("speechSynthesis" in window)) {
      this.setStatus("idle");
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
    utterance.pitch = gender === "female" ? 1.15 : 1.0;

    const voices = window.speechSynthesis.getVoices();
    const langVoices = voices.filter((v) => v.lang === targetLang || v.lang.startsWith(lang));
    if (langVoices.length > 0) {
      const maleVoice = langVoices.find((v) => /male/i.test(v.name));
      const femaleVoice = langVoices.find((v) => !/male/i.test(v.name));
      utterance.voice = (gender === "male" ? maleVoice : femaleVoice) ?? langVoices[0];
    }

    utterance.onend = () => {
      this.setStatus("idle");
    };

    utterance.onerror = () => {
      this.setStatus("idle");
    };

    window.speechSynthesis.speak(utterance);
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
  }

  resume() {
    if (this.status !== "paused") return;
    if (this.activeAudio) {
      this.activeAudio.play().catch((err) => {
        console.error("Failed to resume audio:", err);
        this.setStatus("idle");
      });
      this.setStatus("playing");
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
      this.setStatus("playing");
    }
  }

  stop() {
    if (this.status === "idle") return;
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.setStatus("idle");
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
