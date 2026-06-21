import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./session";

function makeContext(body: unknown, env: Record<string, string> = {}) {
  return {
    request: new Request("https://warfarinpro.pages.dev/api/coordination/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env: {
      HN_HASH_SECRET: "0123456789abcdef0123456789abcdef",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      ...env,
    },
  };
}

describe("/api/coordination/session", () => {
  it("normalizes HN and never returns HN plaintext", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: "session-1", session_hash: "hash-value" }]),
      }),
    );

    const response = await onRequestPost(makeContext({ hn: " 12-34 ", clinicDate: "2026-06-20" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("12-34");
    expect(body).toEqual({ sessionId: "session-1", found: true });
  });

  it("rejects missing HN", async () => {
    const response = await onRequestPost(makeContext({ hn: "", clinicDate: "2026-06-20" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "HN is required" });
  });
});
