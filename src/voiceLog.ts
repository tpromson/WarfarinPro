export type VoiceLogEvent =
  | "play_requested"
  | "voice_selected"
  | "google_tts_failed"
  | "browser_tts_unavailable"
  | "pause"
  | "resume"
  | "stop"
  | "ended"
  | "error";

export type VoiceLogDetails = {
  lang?: "th" | "en";
  gender?: "female" | "male";
  provider?: "Google Cloud TTS" | "Browser Web Speech";
  model?: string;
  voiceName?: string;
  error?: string;
  reason?: string;
  cached?: boolean;
};

export type VoiceLogEntry = VoiceLogDetails & {
  timestamp: string;
  event: VoiceLogEvent;
};

const MAX_VOICE_LOG_ENTRIES = 100;
const SAFE_DETAIL_KEYS = new Set<keyof VoiceLogDetails>([
  "lang",
  "gender",
  "provider",
  "model",
  "voiceName",
  "error",
  "reason",
  "cached",
]);

const entries: VoiceLogEntry[] = [];

declare global {
  interface Window {
    __WARFARINPRO_VOICE_LOG__?: {
      entries: () => VoiceLogEntry[];
      clear: () => void;
    };
  }
}

function sanitizeDetails(details: Record<string, unknown> = {}): VoiceLogDetails {
  const safeDetails: VoiceLogDetails = {};
  for (const [key, value] of Object.entries(details)) {
    if (!SAFE_DETAIL_KEYS.has(key as keyof VoiceLogDetails)) continue;
    if (typeof value === "string" || typeof value === "boolean") {
      Object.assign(safeDetails, { [key]: value });
    }
  }
  return safeDetails;
}

export function logVoiceEvent(event: VoiceLogEvent, details: Record<string, unknown> = {}) {
  entries.push({
    timestamp: new Date().toISOString(),
    event,
    ...sanitizeDetails(details),
  });

  if (entries.length > MAX_VOICE_LOG_ENTRIES) {
    entries.splice(0, entries.length - MAX_VOICE_LOG_ENTRIES);
  }
}

export function getVoiceLogEntries(): VoiceLogEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

export function clearVoiceLog() {
  entries.length = 0;
}

if (typeof window !== "undefined") {
  window.__WARFARINPRO_VOICE_LOG__ = {
    entries: getVoiceLogEntries,
    clear: clearVoiceLog,
  };
}
