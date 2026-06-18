import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAnalyticsDebugLog,
  getAnalyticsDebugLog,
  initializeAnalytics,
  trackEvent,
} from "./analytics";

describe("analytics", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "true");
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "plausible");
    window.plausible = vi.fn() as typeof window.plausible;
    window.umami = { track: vi.fn() };
    clearAnalyticsDebugLog();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.plausible;
    delete window.umami;
    clearAnalyticsDebugLog();
  });

  it("sends allowlisted properties to Plausible", () => {
    trackEvent("tool_used", {
      section: "patient_toolkit",
      tool: "voice",
      lang: "th",
      wCode: "W-SECRET",
      currentInr: 2.8,
      scheduleWeeklyDose: 35,
    });

    expect(window.plausible).toHaveBeenCalledWith("tool_used", {
      props: {
        section: "patient_toolkit",
        tool: "voice",
        lang: "th",
      },
    });
    const [{ timestamp: _timestamp, ...entryWithoutTimestamp }] = getAnalyticsDebugLog();
    const serialized = JSON.stringify(entryWithoutTimestamp);
    expect(serialized).not.toContain("W-SECRET");
    expect(serialized).not.toContain("2.8");
    expect(serialized).not.toContain("35");
  });

  it("does not send events when analytics is disabled", () => {
    vi.stubEnv("VITE_ANALYTICS_ENABLED", "false");

    trackEvent("section_viewed", { section: "doctor_mode" });

    expect(window.plausible).not.toHaveBeenCalled();
    expect(getAnalyticsDebugLog()).toHaveLength(0);
  });

  it("sends events to Umami when configured", () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "umami");

    trackEvent("section_viewed", { section: "patient_viewer" });

    expect(window.umami?.track).toHaveBeenCalledWith("section_viewed", {
      section: "patient_viewer",
    });
  });

  it("exposes local debug helpers on window", () => {
    trackEvent("workflow_step_completed", { step: "plan_calculated" });

    expect(window.__WARFARINPRO_ANALYTICS__?.entries()).toHaveLength(1);
    window.__WARFARINPRO_ANALYTICS__?.clear();
    expect(getAnalyticsDebugLog()).toHaveLength(0);
  });

  it("bootstraps the Plausible script only when enabled and configured", () => {
    vi.stubEnv("VITE_PLAUSIBLE_DOMAIN", "warfarinpro.example");
    delete window.plausible;

    initializeAnalytics();

    const script = document.querySelector<HTMLScriptElement>("script[data-domain='warfarinpro.example']");
    expect(script?.src).toBe("https://plausible.io/js/script.js");
    expect(script?.defer).toBe(true);
    expect(window.plausible).toEqual(expect.any(Function));
  });

  it("queues Plausible events before the script finishes loading", () => {
    vi.stubEnv("VITE_PLAUSIBLE_DOMAIN", "warfarinpro.example");
    delete window.plausible;

    initializeAnalytics();
    trackEvent("section_viewed", { section: "patient_viewer" });

    const queuedPlausible = window.plausible as unknown as { q?: unknown[] };
    expect(queuedPlausible.q).toHaveLength(1);
  });
});
