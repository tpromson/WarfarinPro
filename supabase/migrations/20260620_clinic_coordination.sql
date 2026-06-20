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
