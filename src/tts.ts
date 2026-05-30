import { MedicationPlan } from "./types";
import { planSpeech } from "./clinical";

async function synthesizeGoogleTts(text: string, apiKey: string, gender: "female" | "male"): Promise<string> {
  const voiceName = gender === "female" ? "th-TH-Neural2-C" : "th-TH-Chirp3-HD-Achird";
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { ssml: text },
      voice: {
        languageCode: "th-TH",
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 0.93,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google TTS API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.audioContent;
}

export async function speakPlan(plan: MedicationPlan, gender: "female" | "male" = "female") {
  const speechText = planSpeech(plan, gender);
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_TTS_API_KEY;

  if (apiKey) {
    try {
      const cacheKey = `warfarinpro.audio.${plan.id}.${gender}`;
      let audioContent = sessionStorage.getItem(cacheKey);

      if (!audioContent) {
        audioContent = await synthesizeGoogleTts(speechText, apiKey, gender);
        sessionStorage.setItem(cacheKey, audioContent);
      }

      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      await audio.play();
      return;
    } catch (error) {
      console.error("Google Cloud TTS failed, falling back to browser TTS:", error);
    }
  }

  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const plainText = speechText.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const utterance = new SpeechSynthesisUtterance(plainText);
  utterance.lang = "th-TH";
  utterance.rate = 0.75;
  window.speechSynthesis.speak(utterance);
}
