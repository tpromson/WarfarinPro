type Env = {
  HN_HASH_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type Context = {
  request: Request;
  env: Env;
};

function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init.headers },
  });
}

function normalizeHn(hn: string): string {
  return hn.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context: Context): Promise<Response> {
  const { HN_HASH_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = context.env;
  if (!HN_HASH_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Coordination server environment is not configured" }, { status: 500 });
  }

  const payload = (await context.request.json()) as Partial<{ hn: unknown; clinicDate: unknown }>;
  if (typeof payload.hn !== "string" || normalizeHn(payload.hn).length === 0) {
    return json({ error: "HN is required" }, { status: 400 });
  }
  if (typeof payload.clinicDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(payload.clinicDate)) {
    return json({ error: "Clinic date is required" }, { status: 400 });
  }

  const sessionHash = await hmacSha256(`${normalizeHn(payload.hn)}:${payload.clinicDate}`, HN_HASH_SECRET);
  const url = `${SUPABASE_URL}/rest/v1/clinic_sessions?session_hash=eq.${sessionHash}&clinic_date=eq.${payload.clinicDate}&select=id,session_hash`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!response.ok) {
    return json({ error: "Session lookup failed" }, { status: 502 });
  }

  const rows = (await response.json()) as Array<{ id: string; session_hash: string }>;
  if (rows.length === 0) {
    return json({ sessionHash, found: false });
  }

  return json({ sessionId: rows[0].id, found: true });
}
