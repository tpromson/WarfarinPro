type Gender = "female" | "male";
type Lang = "th" | "en";

type Env = {
  GOOGLE_TTS_API_KEY?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
};

type GoogleTtsResult = {
  audioContent: string;
  voiceName: string;
};

const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const MAX_TEXT_LENGTH = 4500;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

function getVoiceNames(gender: Gender, lang: Lang): string[] {
  if (lang === "th") {
    return gender === "female"
      ? ["th-TH-Chirp3-HD-Kore", "th-TH-Chirp3-HD-Aoede", "th-TH-Chirp3-HD-Leda"]
      : ["th-TH-Chirp3-HD-Charon", "th-TH-Chirp3-HD-Fenrir", "th-TH-Chirp3-HD-Orus"];
  }
  return gender === "female"
    ? ["en-US-Chirp3-HD-Kore", "en-US-Neural2-F"]
    : ["en-US-Chirp3-HD-Charon", "en-US-Neural2-D"];
}

function getSpeakingRate(gender: Gender, lang: Lang): number {
  return lang === "th" ? (gender === "female" ? 0.98 : 0.93) : gender === "female" ? 0.95 : 0.9;
}

function toSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 240);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function synthesizeGoogleTts(
  text: string,
  apiKey: string,
  gender: Gender,
  lang: Lang,
): Promise<GoogleTtsResult> {
  const languageCode = lang === "th" ? "th-TH" : "en-US";
  const speakingRate = getSpeakingRate(gender, lang);
  let lastError = new Error("No voices attempted");

  for (const voiceName of getVoiceNames(gender, lang)) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode, name: voiceName },
            audioConfig: { audioEncoding: "MP3", speakingRate },
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          lastError = new Error(`Google TTS API returned status ${response.status}: ${errText}`);
          if (attempt === 0 && isRetryableStatus(response.status)) continue;
          break;
        }

        const data = (await response.json()) as Partial<GoogleTtsResult>;
        if (typeof data.audioContent !== "string" || !data.audioContent) {
          lastError = new Error("Google TTS API returned no audio content");
          break;
        }
        return { audioContent: data.audioContent, voiceName };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === 0) continue;
        break;
      }
    }
  }

  throw lastError;
}

async function readPayload(request: Request): Promise<{ text: string; gender: Gender; lang: Lang }> {
  const payload = (await request.json()) as Partial<{ text: unknown; gender: unknown; lang: unknown }>;
  if (typeof payload.text !== "string" || payload.text.trim().length === 0) {
    throw new Error("Text is required");
  }
  if (payload.text.length > MAX_TEXT_LENGTH) {
    throw new Error("Text is too long");
  }
  if (payload.gender !== "female" && payload.gender !== "male") {
    throw new Error("Invalid gender");
  }
  if (payload.lang !== "th" && payload.lang !== "en") {
    throw new Error("Invalid language");
  }
  return { text: payload.text, gender: payload.gender, lang: payload.lang };
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  if (!context.env.GOOGLE_TTS_API_KEY) {
    return json({ error: "Google Cloud TTS API key is not configured" }, { status: 500 });
  }

  let payload: { text: string; gender: Gender; lang: Lang };
  try {
    payload = await readPayload(context.request);
  } catch (error) {
    return json({ error: toSafeErrorMessage(error) }, { status: 400 });
  }

  const cacheKey = await sha256(JSON.stringify(payload));
  const cacheRequest = new Request(`https://warfarinpro.local/tts-cache/${cacheKey}`);
  const cached = await caches.default.match(cacheRequest);
  if (cached) {
    const body = (await cached.json()) as GoogleTtsResult;
    return json({ ...body, cached: true });
  }

  try {
    const result = await synthesizeGoogleTts(
      payload.text,
      context.env.GOOGLE_TTS_API_KEY,
      payload.gender,
      payload.lang,
    );
    const cacheResponse = json(result, {
      headers: { "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}` },
    });
    context.waitUntil?.(caches.default.put(cacheRequest, cacheResponse.clone()));
    return json({ ...result, cached: false });
  } catch (error) {
    return json({ error: toSafeErrorMessage(error) }, { status: 502 });
  }
}

export async function onRequest(): Promise<Response> {
  return json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
}
