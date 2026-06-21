type Env = {
  ARCHIVE_JOB_SECRET?: string;
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

export async function onRequestPost(context: Context): Promise<Response> {
  const token = context.request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!context.env.ARCHIVE_JOB_SECRET || token !== context.env.ARCHIVE_JOB_SECRET) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Archive server environment is not configured" }, { status: 500 });
  }

  const response = await fetch(`${context.env.SUPABASE_URL}/rest/v1/rpc/archive_expired_clinic_sessions`, {
    method: "POST",
    headers: {
      apikey: context.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${context.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    return json({ error: "Archive RPC failed" }, { status: 502 });
  }

  return json(await response.json());
}
