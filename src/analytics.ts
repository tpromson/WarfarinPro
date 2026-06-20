export type AnalyticsEvent =
  | "section_viewed"
  | "tool_used"
  | "workflow_step_completed"
  | "audio_event"
  | "error_event";

export type AnalyticsProps = {
  section?: string;
  tool?: string;
  step?: string;
  action?: string;
  lang?: "th" | "en";
  gender?: "female" | "male";
  provider?: string;
  model?: string;
  result?: string;
  area?: string;
  type?: string;
  layout?: string;
  source?: string;
};

export type AnalyticsDebugEntry = AnalyticsProps & {
  timestamp: string;
  event: AnalyticsEvent;
  providerName: "plausible" | "umami";
};

type AnalyticsProvider = "plausible" | "umami";

const MAX_ANALYTICS_DEBUG_ENTRIES = 100;
const SAFE_ANALYTICS_KEYS = new Set<keyof AnalyticsProps>([
  "section",
  "tool",
  "step",
  "action",
  "lang",
  "gender",
  "provider",
  "model",
  "result",
  "area",
  "type",
  "layout",
  "source",
]);

const debugEntries: AnalyticsDebugEntry[] = [];

declare global {
  interface Window {
    plausible?: ((eventName: string, options?: { props?: AnalyticsProps }) => void) & {
      q?: unknown[];
    };
    umami?: { track?: (eventName: string, props?: AnalyticsProps) => void };
    __WARFARINPRO_ANALYTICS__?: {
      entries: () => AnalyticsDebugEntry[];
      clear: () => void;
    };
  }
}

function analyticsEnabled(): boolean {
  return import.meta.env.VITE_ANALYTICS_ENABLED === "true";
}

function analyticsProvider(): AnalyticsProvider {
  return import.meta.env.VITE_ANALYTICS_PROVIDER === "umami" ? "umami" : "plausible";
}

function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function sanitizeAnalyticsProps(props: Record<string, unknown> = {}): AnalyticsProps {
  const safeProps: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (!SAFE_ANALYTICS_KEYS.has(key as keyof AnalyticsProps)) continue;
    if (typeof value !== "string") continue;
    Object.assign(safeProps, { [key]: value.slice(0, 80) });
  }
  return safeProps;
}

function recordDebugEntry(
  providerName: AnalyticsDebugEntry["providerName"],
  event: AnalyticsEvent,
  props: AnalyticsProps,
) {
  debugEntries.push({
    timestamp: new Date().toISOString(),
    providerName,
    event,
    ...props,
  });

  if (debugEntries.length > MAX_ANALYTICS_DEBUG_ENTRIES) {
    debugEntries.splice(0, debugEntries.length - MAX_ANALYTICS_DEBUG_ENTRIES);
  }
}

export function trackEvent(event: AnalyticsEvent, props: Record<string, unknown> = {}) {
  if (!analyticsEnabled() || !online()) return;

  const safeProps = sanitizeAnalyticsProps(props);
  const providerName = analyticsProvider();

  if (providerName === "umami") {
    window.umami?.track?.(event, safeProps);
  } else {
    window.plausible?.(event, { props: safeProps });
  }

  recordDebugEntry(providerName, event, safeProps);
}

export function initializeAnalytics() {
  if (!analyticsEnabled() || typeof document === "undefined") return;

  const providerName = analyticsProvider();
  if (providerName === "plausible") {
    const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
    if (!domain) return;

    window.plausible =
      window.plausible ||
      function plausibleQueue(eventName: string, options?: { props?: AnalyticsProps }) {
        (window.plausible!.q = window.plausible!.q || []).push([eventName, options]);
      };

    if (document.querySelector(`script[data-domain="${domain}"]`)) return;

    const script = document.createElement("script");
    script.defer = true;
    script.dataset.domain = domain;
    script.src = "https://plausible.io/js/script.js";
    document.head.appendChild(script);
  }
}

export function getAnalyticsDebugLog(): AnalyticsDebugEntry[] {
  return debugEntries.map((entry) => ({ ...entry }));
}

export function clearAnalyticsDebugLog() {
  debugEntries.length = 0;
}

if (typeof window !== "undefined") {
  window.__WARFARINPRO_ANALYTICS__ = {
    entries: getAnalyticsDebugLog,
    clear: clearAnalyticsDebugLog,
  };
}
