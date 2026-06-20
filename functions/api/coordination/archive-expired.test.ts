import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./archive-expired";

describe("/api/coordination/archive-expired", () => {
  it("requires archive secret", async () => {
    const response = await onRequestPost({
      request: new Request("https://warfarinpro.pages.dev/api/coordination/archive-expired", {
        method: "POST",
        headers: { Authorization: "Bearer wrong" },
      }),
      env: { ARCHIVE_JOB_SECRET: "secret" },
    });

    expect(response.status).toBe(401);
  });

  it("calls Supabase archive RPC with service role credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ archived: 2 }) }));

    const response = await onRequestPost({
      request: new Request("https://warfarinpro.pages.dev/api/coordination/archive-expired", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
      env: {
        ARCHIVE_JOB_SECRET: "secret",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ archived: 2 });
  });
});
