# Clinic Coordination Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build same-day cloud-synced doctor/pharmacist coordination sessions keyed by server-side HN hash, with Supabase email/password auth, role-aware workflow rules, correction requests, and hash-only archive summaries.

**Architecture:** Keep existing patient-facing W-code and QR privacy boundaries unchanged. Add a staff-only coordination layer backed by Supabase Auth/Postgres/RLS, plus a Cloudflare Pages Function that hashes HN with a server secret before any session lookup. Implement workflow state rules in a small domain module and reuse them from UI and server calls.

**Tech Stack:** React/Vite, TypeScript, Supabase Auth/Postgres/RLS, `@supabase/supabase-js`, Cloudflare Pages Functions, Vitest, Testing Library.

---

## File Structure

- Create `src/coordination/types.ts`: shared coordination status, role, correction reason, and session DTO types.
- Create `src/coordination/workflow.ts`: pure status-transition guards and correction/dispense rules.
- Create `src/coordination/workflow.test.ts`: unit tests for workflow rules.
- Create `src/coordination/supabaseClient.ts`: browser Supabase client factory using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Create `src/coordination/api.ts`: typed frontend functions for staff profile, session lookup, plan save, correction requests, and status updates.
- Create `src/coordination/api.test.ts`: fetch/Supabase-client mocked tests for frontend coordination API behavior.
- Create `functions/api/coordination/session.ts`: Cloudflare Pages Function for HN normalization, server-side HMAC hashing, and active-session lookup/create handoff.
- Create `functions/api/coordination/session.test.ts`: unit tests for hash endpoint behavior without exposing HN.
- Create `supabase/migrations/20260620_clinic_coordination.sql`: Supabase schema, constraints, indexes, RLS, and helper functions.
- Create `src/components/StaffLogin.tsx`: email/password staff login panel.
- Create `src/components/StaffCoordination.tsx`: staff shell that routes doctor/pharmacist workflow after login.
- Create `src/components/DoctorSessionPanel.tsx`: doctor session creation/revision/review flow.
- Create `src/components/PharmacySessionPanel.tsx`: pharmacist lookup/review/correction/dispense flow.
- Modify `src/App.tsx`: add staff coordination route/tab behind login.
- Modify `src/i18n.ts`: add Thai/English staff workflow copy.
- Modify `.env.example`: add Supabase and HN hash environment variables.
- Modify `package.json` and `package-lock.json`: add `@supabase/supabase-js`.

---

### Task 1: Coordination Domain Types And Workflow Guards

**Files:**
- Create: `src/coordination/types.ts`
- Create: `src/coordination/workflow.ts`
- Create: `src/coordination/workflow.test.ts`

- [ ] **Step 1: Write the failing workflow tests**

Create `src/coordination/workflow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canDispense,
  canResolveCorrection,
  canRequestCorrection,
  nextStatusAfterCorrectionResolution,
  transitionSessionStatus,
} from "./workflow";

describe("coordination workflow guards", () => {
  it("blocks dispensing while a correction request is open", () => {
    expect(
      canDispense({
        status: "correction_requested",
        hasOpenCorrection: true,
        planReviewedAfterLatestCorrection: false,
      }),
    ).toBe(false);
  });

  it("allows dispensing only after pharmacy review with no open correction", () => {
    expect(
      canDispense({
        status: "pharmacy_reviewed",
        hasOpenCorrection: false,
        planReviewedAfterLatestCorrection: true,
      }),
    ).toBe(true);
  });

  it("allows only pharmacists to request correction on a physician-reviewed plan", () => {
    expect(canRequestCorrection({ role: "pharmacist", status: "physician_reviewed" })).toBe(true);
    expect(canRequestCorrection({ role: "doctor", status: "physician_reviewed" })).toBe(false);
    expect(canRequestCorrection({ role: "pharmacist", status: "draft" })).toBe(false);
  });

  it("allows only doctors to resolve correction requests", () => {
    expect(canResolveCorrection({ role: "doctor", status: "correction_requested" })).toBe(true);
    expect(canResolveCorrection({ role: "pharmacist", status: "correction_requested" })).toBe(false);
    expect(canResolveCorrection({ role: "doctor", status: "pharmacy_reviewed" })).toBe(false);
  });

  it("returns physician_revised when a doctor resolves correction by updating the plan", () => {
    expect(nextStatusAfterCorrectionResolution("updated_plan")).toBe("physician_revised");
    expect(nextStatusAfterCorrectionResolution("accepted")).toBe("physician_revised");
    expect(nextStatusAfterCorrectionResolution("rejected")).toBe("physician_reviewed");
  });

  it("rejects invalid status transitions", () => {
    expect(() => transitionSessionStatus("draft", "dispensed")).toThrow(
      "Invalid coordination status transition: draft -> dispensed",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/coordination/workflow.test.ts
```

Expected: FAIL because `src/coordination/workflow.ts` does not exist.

- [ ] **Step 3: Implement coordination types**

Create `src/coordination/types.ts`:

```ts
import type { MedicationPlan } from "../types";

export type StaffRole = "doctor" | "pharmacist" | "admin";

export type CoordinationStatus =
  | "draft"
  | "physician_reviewed"
  | "pharmacy_reviewed"
  | "correction_requested"
  | "physician_revised"
  | "dispensed"
  | "cancelled"
  | "expired"
  | "archived";

export type CorrectionReason =
  | "pill_burden"
  | "stock_issue"
  | "safety_concern"
  | "unclear_instruction"
  | "other";

export type CorrectionResolution = "accepted" | "rejected" | "updated_plan";

export type StaffProfile = {
  userId: string;
  role: StaffRole;
  displayName: string;
  active: boolean;
};

export type ClinicSession = {
  id: string;
  sessionHash: string;
  clinicDate: string;
  status: CoordinationStatus;
  currentPlan: MedicationPlan | null;
  expiresAt: string;
  createdBy: string;
  physicianReviewedBy: string | null;
  physicianReviewedAt: string | null;
  pharmacyReviewedBy: string | null;
  pharmacyReviewedAt: string | null;
  dispensedBy: string | null;
  dispensedAt: string | null;
};

export type CorrectionRequest = {
  id: string;
  sessionId: string;
  reason: CorrectionReason;
  note: string;
  requestedBy: string;
  requestedAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: CorrectionResolution | null;
};
```

- [ ] **Step 4: Implement workflow guards**

Create `src/coordination/workflow.ts`:

```ts
import type { CoordinationStatus, CorrectionResolution, StaffRole } from "./types";

const VALID_TRANSITIONS: Record<CoordinationStatus, CoordinationStatus[]> = {
  draft: ["physician_reviewed", "cancelled", "expired"],
  physician_reviewed: ["pharmacy_reviewed", "correction_requested", "cancelled", "expired"],
  pharmacy_reviewed: ["dispensed", "correction_requested", "cancelled", "expired"],
  correction_requested: ["physician_revised", "physician_reviewed", "cancelled", "expired"],
  physician_revised: ["pharmacy_reviewed", "correction_requested", "cancelled", "expired"],
  dispensed: ["archived"],
  cancelled: ["archived"],
  expired: ["archived"],
  archived: [],
};

export function canRequestCorrection({
  role,
  status,
}: {
  role: StaffRole;
  status: CoordinationStatus;
}): boolean {
  return role === "pharmacist" && (status === "physician_reviewed" || status === "pharmacy_reviewed");
}

export function canResolveCorrection({
  role,
  status,
}: {
  role: StaffRole;
  status: CoordinationStatus;
}): boolean {
  return role === "doctor" && status === "correction_requested";
}

export function canDispense({
  status,
  hasOpenCorrection,
  planReviewedAfterLatestCorrection,
}: {
  status: CoordinationStatus;
  hasOpenCorrection: boolean;
  planReviewedAfterLatestCorrection: boolean;
}): boolean {
  return status === "pharmacy_reviewed" && !hasOpenCorrection && planReviewedAfterLatestCorrection;
}

export function nextStatusAfterCorrectionResolution(
  resolution: CorrectionResolution,
): CoordinationStatus {
  return resolution === "rejected" ? "physician_reviewed" : "physician_revised";
}

export function transitionSessionStatus(
  current: CoordinationStatus,
  next: CoordinationStatus,
): CoordinationStatus {
  if (!VALID_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid coordination status transition: ${current} -> ${next}`);
  }
  return next;
}
```

- [ ] **Step 5: Run workflow tests**

Run:

```bash
npm test -- src/coordination/workflow.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/coordination/types.ts src/coordination/workflow.ts src/coordination/workflow.test.ts
git commit -m "Add coordination workflow guards"
```

---

### Task 2: Supabase Dependency, Environment, And Browser Client

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `src/coordination/supabaseClient.ts`
- Create: `src/coordination/supabaseClient.test.ts`

- [ ] **Step 1: Install Supabase client**

Run:

```bash
npm install @supabase/supabase-js
```

Expected: `package.json` and `package-lock.json` include `@supabase/supabase-js`.

- [ ] **Step 2: Update environment example**

Modify `.env.example` so it includes:

```bash
GOOGLE_TTS_API_KEY=your_google_tts_api_key_here
VITE_TTS_ENDPOINT=/api/tts
VITE_DOCTOR_PASSCODE=10949
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
HN_HASH_SECRET=replace_with_32_plus_random_bytes
```

- [ ] **Step 3: Write failing Supabase client tests**

Create `src/coordination/supabaseClient.test.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
npm test -- src/coordination/supabaseClient.test.ts
```

Expected: FAIL because `supabaseClient.ts` does not exist.

- [ ] **Step 5: Implement Supabase client factory**

Create `src/coordination/supabaseClient.ts`:

```ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase coordination env vars are not configured");
  }

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return client;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/coordination/supabaseClient.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example src/coordination/supabaseClient.ts src/coordination/supabaseClient.test.ts
git commit -m "Add Supabase coordination client"
```

---

### Task 3: Supabase Schema, Constraints, RLS, And Archive Summary

**Files:**
- Create: `supabase/migrations/20260620_clinic_coordination.sql`
- Create: `docs/supabase/clinic-coordination-rls-checks.sql`

- [ ] **Step 1: Create migration SQL**

Create `supabase/migrations/20260620_clinic_coordination.sql`:

```sql
create extension if not exists pgcrypto;

create type public.staff_role as enum ('doctor', 'pharmacist', 'admin');
create type public.coordination_status as enum (
  'draft',
  'physician_reviewed',
  'pharmacy_reviewed',
  'correction_requested',
  'physician_revised',
  'dispensed',
  'cancelled',
  'expired',
  'archived'
);
create type public.correction_reason as enum (
  'pill_burden',
  'stock_issue',
  'safety_concern',
  'unclear_instruction',
  'other'
);
create type public.correction_resolution as enum ('accepted', 'rejected', 'updated_plan');

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.staff_role not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  clinic_id text not null default 'default',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clinic_sessions (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null,
  clinic_date date not null,
  status public.coordination_status not null default 'draft',
  current_plan jsonb,
  created_by uuid not null references public.staff_profiles(user_id),
  physician_reviewed_by uuid references public.staff_profiles(user_id),
  physician_reviewed_at timestamptz,
  pharmacy_reviewed_by uuid references public.staff_profiles(user_id),
  pharmacy_reviewed_at timestamptz,
  dispensed_by uuid references public.staff_profiles(user_id),
  dispensed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_hash, clinic_date)
);

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.clinic_sessions(id) on delete cascade,
  reason public.correction_reason not null,
  note text not null check (char_length(note) between 1 and 300),
  requested_by uuid not null references public.staff_profiles(user_id),
  requested_at timestamptz not null default now(),
  resolved_by uuid references public.staff_profiles(user_id),
  resolved_at timestamptz,
  resolution public.correction_resolution,
  check (
    (resolved_by is null and resolved_at is null and resolution is null)
    or (resolved_by is not null and resolved_at is not null and resolution is not null)
  )
);

create unique index correction_requests_one_open_per_session
  on public.correction_requests (session_id)
  where resolution is null;

create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.clinic_sessions(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 80),
  actor_id uuid not null references public.staff_profiles(user_id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.archived_session_summaries (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null,
  clinic_date date not null,
  final_status public.coordination_status not null,
  created_at timestamptz,
  physician_reviewed_at timestamptz,
  pharmacy_reviewed_at timestamptz,
  dispensed_at timestamptz,
  archived_at timestamptz not null default now(),
  created_by uuid,
  physician_reviewed_by uuid,
  pharmacy_reviewed_by uuid,
  dispensed_by uuid,
  correction_request_count integer not null default 0 check (correction_request_count >= 0),
  event_count integer not null default 0 check (event_count >= 0),
  unique (session_hash, clinic_date)
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clinic_sessions_set_updated_at
before update on public.clinic_sessions
for each row execute function public.set_updated_at();

alter table public.staff_profiles enable row level security;
alter table public.clinic_sessions enable row level security;
alter table public.correction_requests enable row level security;
alter table public.session_events enable row level security;
alter table public.archived_session_summaries enable row level security;

create function public.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.staff_profiles where user_id = auth.uid() and active = true;
$$;

create function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.staff_profiles where user_id = auth.uid() and active = true);
$$;

create policy staff_profiles_read_self on public.staff_profiles
for select
to authenticated
using (user_id = auth.uid() or public.current_staff_role() = 'admin');

create policy clinic_sessions_staff_read on public.clinic_sessions
for select
to authenticated
using (public.is_active_staff());

create policy clinic_sessions_doctor_insert on public.clinic_sessions
for insert
to authenticated
with check (public.current_staff_role() in ('doctor', 'admin') and created_by = auth.uid());

create policy clinic_sessions_doctor_update on public.clinic_sessions
for update
to authenticated
using (public.current_staff_role() in ('doctor', 'admin'))
with check (public.current_staff_role() in ('doctor', 'admin'));

create policy clinic_sessions_pharmacist_dispense_update on public.clinic_sessions
for update
to authenticated
using (public.current_staff_role() in ('pharmacist', 'admin'))
with check (
  status in ('pharmacy_reviewed', 'dispensed', 'correction_requested')
);

create policy correction_requests_staff_read on public.correction_requests
for select
to authenticated
using (public.is_active_staff());

create policy correction_requests_pharmacist_insert on public.correction_requests
for insert
to authenticated
with check (public.current_staff_role() in ('pharmacist', 'admin') and requested_by = auth.uid());

create policy correction_requests_doctor_update on public.correction_requests
for update
to authenticated
using (public.current_staff_role() in ('doctor', 'admin'))
with check (public.current_staff_role() in ('doctor', 'admin'));

create policy session_events_staff_read on public.session_events
for select
to authenticated
using (public.is_active_staff());

create policy session_events_staff_insert on public.session_events
for insert
to authenticated
with check (public.is_active_staff() and actor_id = auth.uid());

create policy archived_summaries_admin_read on public.archived_session_summaries
for select
to authenticated
using (public.current_staff_role() = 'admin');
```

- [ ] **Step 2: Create RLS check script**

Create `docs/supabase/clinic-coordination-rls-checks.sql`:

```sql
-- Run these checks in a Supabase SQL session after creating test users and staff_profiles.
-- Expected outcomes are comments beside each query.

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'staff_profiles',
    'clinic_sessions',
    'correction_requests',
    'session_events',
    'archived_session_summaries'
  );
-- Expected: rowsecurity = true for all rows.

select policyname, tablename
from pg_policies
where schemaname = 'public'
  and tablename in (
    'staff_profiles',
    'clinic_sessions',
    'correction_requests',
    'session_events',
    'archived_session_summaries'
  )
order by tablename, policyname;
-- Expected: policies listed for read/write paths described in the implementation plan.

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('clinic_sessions', 'archived_session_summaries')
  and column_name in ('hn', 'patient_hn', 'hn_plaintext', 'patient_name');
-- Expected: zero rows.
```

- [ ] **Step 3: Apply migration to a Supabase project**

Run the migration with the project’s migration process. If using Supabase CLI:

```bash
supabase db push
```

Expected: migration applies without SQL errors.

- [ ] **Step 4: Run RLS checks**

Run the SQL from `docs/supabase/clinic-coordination-rls-checks.sql`.

Expected:

- RLS enabled on all listed tables.
- Policies exist for staff read, doctor insert/update, pharmacist correction/dispense paths.
- No HN plaintext columns exist in active or archive tables.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260620_clinic_coordination.sql docs/supabase/clinic-coordination-rls-checks.sql
git commit -m "Add clinic coordination Supabase schema"
```

---

### Task 4: Server-Side HN Hash And Session Endpoint

**Files:**
- Create: `functions/api/coordination/session.ts`
- Create: `functions/api/coordination/session.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write failing endpoint tests**

Create `functions/api/coordination/session.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- functions/api/coordination/session.test.ts
```

Expected: FAIL because `session.ts` does not exist.

- [ ] **Step 3: Implement endpoint**

Create `functions/api/coordination/session.ts`:

```ts
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
```

- [ ] **Step 4: Add server env examples**

Modify `.env.example` so it includes server-only values:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
HN_HASH_SECRET=replace_with_32_plus_random_bytes
```

Keep `SUPABASE_SERVICE_ROLE_KEY` without `VITE_`.

- [ ] **Step 5: Run endpoint tests**

Run:

```bash
npm test -- functions/api/coordination/session.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/api/coordination/session.ts functions/api/coordination/session.test.ts .env.example
git commit -m "Add coordination session hash endpoint"
```

---

### Task 5: Frontend Coordination API

**Files:**
- Create: `src/coordination/api.ts`
- Create: `src/coordination/api.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `src/coordination/api.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffProfile } from "./types";

const singleMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: vi.fn(() => ({ single: singleMock })) }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("./supabaseClient", () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

describe("coordination API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active staff profile for the current user", async () => {
    const profile: StaffProfile = {
      userId: "user-1",
      role: "doctor",
      displayName: "Dr Test",
      active: true,
    };
    singleMock.mockResolvedValueOnce({
      data: {
        user_id: "user-1",
        role: "doctor",
        display_name: "Dr Test",
        active: true,
      },
      error: null,
    });

    const { loadStaffProfile } = await import("./api");

    await expect(loadStaffProfile("user-1")).resolves.toEqual(profile);
  });

  it("throws when profile lookup fails", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const { loadStaffProfile } = await import("./api");

    await expect(loadStaffProfile("user-1")).rejects.toThrow("Staff profile lookup failed: not found");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/coordination/api.test.ts
```

Expected: FAIL because `api.ts` does not exist.

- [ ] **Step 3: Implement profile loader**

Create `src/coordination/api.ts`:

```ts
import { getSupabaseClient } from "./supabaseClient";
import type { StaffProfile } from "./types";

type StaffProfileRow = {
  user_id: string;
  role: StaffProfile["role"];
  display_name: string;
  active: boolean;
};

function mapStaffProfile(row: StaffProfileRow): StaffProfile {
  return {
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    active: row.active,
  };
}

export async function loadStaffProfile(userId: string): Promise<StaffProfile> {
  const { data, error } = await getSupabaseClient()
    .from("staff_profiles")
    .select("user_id, role, display_name, active")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error(`Staff profile lookup failed: ${error?.message ?? "missing profile"}`);
  }

  return mapStaffProfile(data as StaffProfileRow);
}
```

- [ ] **Step 4: Run API tests**

Run:

```bash
npm test -- src/coordination/api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Extend API in separate TDD cycles**

Add one failing test, implement it, and rerun tests for each function:

```ts
export async function findSessionByHn(hn: string, clinicDate: string): Promise<{ found: boolean; sessionId?: string }>;
export async function createDoctorSession(sessionHash: string, plan: MedicationPlan): Promise<ClinicSession>;
export async function savePhysicianReviewedPlan(sessionId: string, plan: MedicationPlan): Promise<void>;
export async function requestCorrection(sessionId: string, reason: CorrectionReason, note: string): Promise<void>;
export async function resolveCorrection(requestId: string, resolution: CorrectionResolution): Promise<void>;
export async function markPharmacyReviewed(sessionId: string): Promise<void>;
export async function markDispensed(sessionId: string): Promise<void>;
```

Expected behavior:

- `findSessionByHn` calls `/api/coordination/session` and never sends HN to Supabase directly from the browser.
- `requestCorrection` rejects notes longer than 300 characters before sending.
- `markDispensed` uses `canDispense` from `workflow.ts` before calling Supabase.

- [ ] **Step 6: Commit**

```bash
git add src/coordination/api.ts src/coordination/api.test.ts
git commit -m "Add coordination frontend API"
```

---

### Task 6: Staff Login UI

**Files:**
- Create: `src/components/StaffLogin.tsx`
- Create or modify: `src/components.test.tsx`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Write failing UI tests**

Add to `src/components.test.tsx`:

```tsx
import StaffLogin from "./components/StaffLogin";

describe("StaffLogin", () => {
  it("submits email and password", () => {
    const onLogin = vi.fn();
    render(<StaffLogin lang="th" loading={false} error="" onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText("อีเมล"), { target: { value: "doctor@example.com" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByText("เข้าสู่ระบบเจ้าหน้าที่"));

    expect(onLogin).toHaveBeenCalledWith("doctor@example.com", "secret123");
  });

  it("shows login errors", () => {
    render(<StaffLogin lang="en" loading={false} error="Invalid credentials" onLogin={vi.fn()} />);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/components.test.tsx
```

Expected: FAIL because `StaffLogin.tsx` does not exist.

- [ ] **Step 3: Implement login component**

Create `src/components/StaffLogin.tsx`:

```tsx
import { useState } from "react";
import { Lock } from "lucide-react";
import Panel from "./Panel";

export default function StaffLogin({
  lang,
  loading,
  error,
  onLogin,
}: {
  lang: "th" | "en";
  loading: boolean;
  error: string;
  onLogin: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Panel title={lang === "th" ? "เข้าสู่ระบบเจ้าหน้าที่" : "Staff Login"} icon={<Lock size={18} />}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin(email.trim(), password);
          }}
        >
          <label className="field">
            {lang === "th" ? "อีเมล" : "Email"}
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label className="field">
            {lang === "th" ? "รหัสผ่าน" : "Password"}
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>
          {error && <p className="text-xs font-bold text-clinic-red">{error}</p>}
          <button className="icon-button w-full justify-center" disabled={loading} type="submit">
            {loading
              ? lang === "th"
                ? "กำลังเข้าสู่ระบบ..."
                : "Signing in..."
              : lang === "th"
                ? "เข้าสู่ระบบเจ้าหน้าที่"
                : "Sign in"}
          </button>
        </form>
      </Panel>
    </div>
  );
}
```

- [ ] **Step 4: Run component tests**

Run:

```bash
npm test -- src/components.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/StaffLogin.tsx src/components.test.tsx src/i18n.ts
git commit -m "Add staff login UI"
```

---

### Task 7: Staff Coordination Shell And App Route

**Files:**
- Create: `src/components/StaffCoordination.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components.test.tsx`

- [ ] **Step 1: Write failing route tests**

Add to `src/components.test.tsx`:

```tsx
import StaffCoordination from "./components/StaffCoordination";

describe("StaffCoordination", () => {
  it("shows doctor workflow for doctor role", () => {
    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u1", role: "doctor", displayName: "Doctor A", active: true }}
      />,
    );

    expect(screen.getByText("Doctor A")).toBeInTheDocument();
    expect(screen.getByText("เปิดหรือสร้าง session วันนี้")).toBeInTheDocument();
  });

  it("shows pharmacist workflow for pharmacist role", () => {
    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u2", role: "pharmacist", displayName: "Pharmacist B", active: true }}
      />,
    );

    expect(screen.getByText("Pharmacist B")).toBeInTheDocument();
    expect(screen.getByText("ค้นหา session วันนี้")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/components.test.tsx
```

Expected: FAIL because `StaffCoordination.tsx` does not exist.

- [ ] **Step 3: Implement shell component**

Create `src/components/StaffCoordination.tsx`:

```tsx
import type { StaffProfile } from "../coordination/types";

export default function StaffCoordination({
  lang,
  profile,
}: {
  lang: "th" | "en";
  profile: StaffProfile;
}) {
  const heading =
    profile.role === "pharmacist"
      ? lang === "th"
        ? "ค้นหา session วันนี้"
        : "Find Today's Session"
      : lang === "th"
        ? "เปิดหรือสร้าง session วันนี้"
        : "Open Or Create Today's Session";

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {lang === "th" ? "ประสานงานแพทย์-เภสัช" : "Doctor-Pharmacy Coordination"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            {profile.displayName} · {profile.role}
          </p>
        </div>
      </div>
      <section className="border border-clinic-line bg-white rounded-2xl p-4 shadow-soft">
        <h3 className="text-sm font-extrabold text-clinic-ink">{heading}</h3>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire `App.tsx` route**

Modify `src/App.tsx`:

- Add `staff` to the active section union.
- Add a staff navigation button.
- Render `StaffLogin` when no staff session exists.
- Render `StaffCoordination` after login and profile load.

Use Supabase auth methods:

```ts
const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
```

On successful login, call `loadStaffProfile(user.id)` and store it in component state.

- [ ] **Step 5: Run component tests**

Run:

```bash
npm test -- src/components.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/StaffCoordination.tsx src/App.tsx src/components.test.tsx
git commit -m "Add staff coordination shell"
```

---

### Task 8: Doctor Session Panel

**Files:**
- Create: `src/components/DoctorSessionPanel.tsx`
- Modify: `src/components/StaffCoordination.tsx`
- Modify: `src/components.test.tsx`

- [ ] **Step 1: Write failing doctor panel tests**

Add tests:

```tsx
import DoctorSessionPanel from "./components/DoctorSessionPanel";

describe("DoctorSessionPanel", () => {
  it("submits HN to open or create today's session", () => {
    const onOpen = vi.fn();
    render(<DoctorSessionPanel lang="th" loading={false} error="" onOpenSession={onOpen} />);

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("เปิดหรือสร้าง session"));

    expect(onOpen).toHaveBeenCalledWith("12345");
  });
});
```

- [ ] **Step 2: Implement doctor panel**

Create `src/components/DoctorSessionPanel.tsx`:

```tsx
import { useState } from "react";

export default function DoctorSessionPanel({
  lang,
  loading,
  error,
  onOpenSession,
}: {
  lang: "th" | "en";
  loading: boolean;
  error: string;
  onOpenSession: (hn: string) => void;
}) {
  const [hn, setHn] = useState("");

  return (
    <section className="border border-clinic-line bg-white rounded-2xl p-4 shadow-soft">
      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onOpenSession(hn.trim());
        }}
      >
        <label className="field flex-1">
          HN
          <input value={hn} onChange={(event) => setHn(event.target.value)} required />
        </label>
        <button className="icon-button self-end" disabled={loading} type="submit">
          {lang === "th" ? "เปิดหรือสร้าง session" : "Open or create session"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs font-bold text-clinic-red">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 3: Integrate into staff shell**

Modify `StaffCoordination.tsx` to render `DoctorSessionPanel` when `profile.role === "doctor"`.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- src/components.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/DoctorSessionPanel.tsx src/components/StaffCoordination.tsx src/components.test.tsx
git commit -m "Add doctor coordination session panel"
```

---

### Task 9: Pharmacist Session Panel And Correction Request UI

**Files:**
- Create: `src/components/PharmacySessionPanel.tsx`
- Modify: `src/components/StaffCoordination.tsx`
- Modify: `src/components.test.tsx`

- [ ] **Step 1: Write failing pharmacist panel tests**

Add tests:

```tsx
import PharmacySessionPanel from "./components/PharmacySessionPanel";

describe("PharmacySessionPanel", () => {
  it("submits HN to find today's session", () => {
    const onFind = vi.fn();
    render(<PharmacySessionPanel lang="th" loading={false} error="" onFindSession={onFind} onRequestCorrection={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("ค้นหา session"));

    expect(onFind).toHaveBeenCalledWith("12345");
  });

  it("submits structured correction reason and short note", () => {
    const onRequestCorrection = vi.fn();
    render(<PharmacySessionPanel lang="th" loading={false} error="" onFindSession={vi.fn()} onRequestCorrection={onRequestCorrection} />);

    fireEvent.change(screen.getByLabelText("เหตุผล"), { target: { value: "pill_burden" } });
    fireEvent.change(screen.getByLabelText("หมายเหตุสั้น ๆ"), { target: { value: "จำนวนเม็ดยาต่อวันสูง" } });
    fireEvent.click(screen.getByText("ขอให้แพทย์แก้ไข"));

    expect(onRequestCorrection).toHaveBeenCalledWith("pill_burden", "จำนวนเม็ดยาต่อวันสูง");
  });
});
```

- [ ] **Step 2: Implement pharmacist panel**

Create `src/components/PharmacySessionPanel.tsx`:

```tsx
import { useState } from "react";
import type { CorrectionReason } from "../coordination/types";

const reasons: CorrectionReason[] = [
  "pill_burden",
  "stock_issue",
  "safety_concern",
  "unclear_instruction",
  "other",
];

export default function PharmacySessionPanel({
  lang,
  loading,
  error,
  onFindSession,
  onRequestCorrection,
}: {
  lang: "th" | "en";
  loading: boolean;
  error: string;
  onFindSession: (hn: string) => void;
  onRequestCorrection: (reason: CorrectionReason, note: string) => void;
}) {
  const [hn, setHn] = useState("");
  const [reason, setReason] = useState<CorrectionReason>("pill_burden");
  const [note, setNote] = useState("");

  return (
    <section className="space-y-4 border border-clinic-line bg-white rounded-2xl p-4 shadow-soft">
      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onFindSession(hn.trim());
        }}
      >
        <label className="field flex-1">
          HN
          <input value={hn} onChange={(event) => setHn(event.target.value)} required />
        </label>
        <button className="icon-button self-end" disabled={loading} type="submit">
          {lang === "th" ? "ค้นหา session" : "Find session"}
        </button>
      </form>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onRequestCorrection(reason, note.trim());
        }}
      >
        <label className="field">
          {lang === "th" ? "เหตุผล" : "Reason"}
          <select value={reason} onChange={(event) => setReason(event.target.value as CorrectionReason)}>
            {reasons.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {lang === "th" ? "หมายเหตุสั้น ๆ" : "Short note"}
          <textarea maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} required />
        </label>
        <button className="icon-button" disabled={loading || note.trim().length === 0} type="submit">
          {lang === "th" ? "ขอให้แพทย์แก้ไข" : "Request correction"}
        </button>
      </form>
      {error && <p className="text-xs font-bold text-clinic-red">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 3: Integrate into staff shell**

Modify `StaffCoordination.tsx` to render `PharmacySessionPanel` when `profile.role === "pharmacist"`.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- src/components.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PharmacySessionPanel.tsx src/components/StaffCoordination.tsx src/components.test.tsx
git commit -m "Add pharmacy correction request panel"
```

---

### Task 10: Archive Job Design Implementation

**Files:**
- Create: `functions/api/coordination/archive-expired.ts`
- Create: `functions/api/coordination/archive-expired.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write failing archive tests**

Create `functions/api/coordination/archive-expired.test.ts`:

```ts
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
```

- [ ] **Step 2: Implement archive endpoint**

Create `functions/api/coordination/archive-expired.ts`:

```ts
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
```

- [ ] **Step 3: Add SQL RPC to migration**

Append this function to `supabase/migrations/20260620_clinic_coordination.sql`:

```sql
create function public.archive_expired_clinic_sessions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_count integer;
begin
  insert into public.archived_session_summaries (
    session_hash,
    clinic_date,
    final_status,
    created_at,
    physician_reviewed_at,
    pharmacy_reviewed_at,
    dispensed_at,
    created_by,
    physician_reviewed_by,
    pharmacy_reviewed_by,
    dispensed_by,
    correction_request_count,
    event_count
  )
  select
    s.session_hash,
    s.clinic_date,
    case when s.status = 'dispensed' then s.status else 'expired'::public.coordination_status end,
    s.created_at,
    s.physician_reviewed_at,
    s.pharmacy_reviewed_at,
    s.dispensed_at,
    s.created_by,
    s.physician_reviewed_by,
    s.pharmacy_reviewed_by,
    s.dispensed_by,
    (select count(*) from public.correction_requests c where c.session_id = s.id),
    (select count(*) from public.session_events e where e.session_id = s.id)
  from public.clinic_sessions s
  where s.expires_at <= now()
  on conflict (session_hash, clinic_date) do nothing;

  get diagnostics archived_count = row_count;

  delete from public.clinic_sessions
  where expires_at <= now();

  return jsonb_build_object('archived', archived_count);
end;
$$;
```

- [ ] **Step 4: Run archive tests**

Run:

```bash
npm test -- functions/api/coordination/archive-expired.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/api/coordination/archive-expired.ts functions/api/coordination/archive-expired.test.ts supabase/migrations/20260620_clinic_coordination.sql .env.example
git commit -m "Add expired coordination session archive job"
```

---

### Task 11: End-To-End Validation

**Files:**
- Modify only files touched by earlier tasks if validation reveals defects.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
npm test
npm run build
npm run lint
```

Expected:

- Vitest: all tests pass.
- Build: TypeScript and Vite build pass.
- Lint: no ESLint errors.

- [ ] **Step 2: Manual local staff flow with Supabase**

Use a Supabase project with:

- One doctor user in `auth.users` and `staff_profiles`.
- One pharmacist user in `auth.users` and `staff_profiles`.
- Required local env values set.

Run:

```bash
npm run build
npx wrangler pages dev dist
```

Manual checks:

- Doctor signs in with email/password.
- Doctor enters HN and creates same-day session.
- Pharmacist signs in on a separate browser profile or incognito window.
- Pharmacist enters same HN and sees the same session.
- Pharmacist requests correction with reason `pill_burden` and a short note.
- Dispense action is disabled while correction is open.
- Doctor resolves correction and updates/reviews plan.
- Pharmacist marks pharmacy reviewed.
- Pharmacist marks dispensed.

- [ ] **Step 3: Verify privacy boundaries**

Run these checks:

```bash
rg -n "patient_hn|hn_plaintext|patient_name" supabase src functions
rg -n "service_role|SUPABASE_SERVICE_ROLE_KEY" src
```

Expected:

- First command does not find HN plaintext storage fields.
- Second command does not find service-role key usage in `src/`.

- [ ] **Step 4: Commit validation fixes when validation changes files**

If Step 1, 2, or 3 required code fixes:

```bash
git status --short
git add src/coordination src/components src/App.tsx src/i18n.ts functions/api/coordination supabase/migrations docs/supabase .env.example package.json package-lock.json
git commit -m "Harden clinic coordination validation"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Supabase email/password auth: Tasks 2, 6, 7.
- Single-clinic scope with future clinic id: Task 3.
- Server-side HN hash: Task 4.
- Same-day session expires at 23:59: Tasks 3, 5, 10.
- Hash-only archive: Tasks 3, 10, 11.
- Pharmacist correction request with doctor approval before dispense: Tasks 1, 5, 8, 9.
- Patient Viewer privacy unchanged: Tasks 3, 11.
- RLS/security: Tasks 3, 11.

Placeholder scan:

- The plan defines concrete files, commands, expected outcomes, and starter code for each implementation area.

Type consistency:

- Status values, staff roles, correction reasons, and correction resolutions match across `types.ts`, workflow guards, SQL enums, and UI test snippets.
