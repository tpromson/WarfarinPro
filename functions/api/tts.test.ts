import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./tts";

function makeContext(request: Request, env: Record<string, string> = {}) {
  return {
    request,
    env,
    waitUntil: vi.fn(),
  };
}

function makeCache() {
  const store = new Map<string, Response>();
  return {
    match: vi.fn(async (request: Request) => store.get(request.url)?.clone()),
    put: vi.fn(async (request: Request, response: Response) => {
      store.set(request.url, response.clone());
    }),
  };
}

describe("Cloudflare Pages /api/tts", () => {
  it("synthesizes speech with the server-side Google key and caches the response", async () => {
    const cache = makeCache();
    vi.stubGlobal("caches", { default: cache });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ audioContent: "ZmFrZS1tcDM=" }),
      }),
    );

    const request = new Request("https://warfarinpro.pages.dev/api/tts", {
      method: "POST",
      body: JSON.stringify({ text: "ยา วาร์ฟาริน", gender: "female", lang: "th" }),
    });

    const first = await onRequestPost(makeContext(request.clone(), { GOOGLE_TTS_API_KEY: "server-key" }));
    const second = await onRequestPost(makeContext(request.clone(), { GOOGLE_TTS_API_KEY: "server-key" }));

    await expect(first.json()).resolves.toEqual({
      audioContent: "ZmFrZS1tcDM=",
      voiceName: "th-TH-Chirp3-HD-Kore",
      cached: false,
    });
    await expect(second.json()).resolves.toEqual({
      audioContent: "ZmFrZS1tcDM=",
      voiceName: "th-TH-Chirp3-HD-Kore",
      cached: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=server-key",
    );
  });

  it("retries transient Google failures before returning audio", async () => {
    vi.stubGlobal("caches", { default: makeCache() });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: () => Promise.resolve("temporary unavailable"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ audioContent: "ZmFrZS1tcDM=" }),
        }),
    );

    const request = new Request("https://warfarinpro.pages.dev/api/tts", {
      method: "POST",
      body: JSON.stringify({ text: "Warfarin", gender: "male", lang: "en" }),
    });

    const response = await onRequestPost(makeContext(request, { GOOGLE_TTS_API_KEY: "server-key" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      audioContent: "ZmFrZS1tcDM=",
      voiceName: "en-US-Chirp3-HD-Charon",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
