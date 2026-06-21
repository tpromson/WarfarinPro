import { afterEach, describe, expect, it, vi } from "vitest";

describe("coordination Supabase client", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("throws a clear error when Supabase env vars are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    const { getSupabaseClient } = await import("./supabaseClient");

    expect(() => getSupabaseClient()).toThrow("Supabase coordination env vars are not configured");
  });

  it("returns the same client instance when env vars are configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const { getSupabaseClient } = await import("./supabaseClient");

    expect(getSupabaseClient()).toBe(getSupabaseClient());
  });
});
