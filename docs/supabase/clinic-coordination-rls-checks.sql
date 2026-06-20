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
