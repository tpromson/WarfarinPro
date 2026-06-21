# Clinic Coordination Session Design

## Purpose

WarfarinPro should support same-day coordination between doctors and pharmacists working on different devices in the same clinic. Staff can find the same active clinic session by entering the patient's HN, but the system must preserve the existing privacy stance: patient-facing outputs must not carry HN or other identifying patient information, and long-lived storage must not retain HN plaintext.

This feature is for clinician-to-clinician coordination only. It is not a patient record, prescription archive, or patient self-management workflow.

## Scope

This design covers a single-clinic cloud sync workflow using Supabase. Staff authenticate with email and password. A doctor creates or updates a medication plan in a same-day session. A pharmacist reviews the plan, can request a correction, and can only mark the plan dispensed after the latest relevant doctor approval.

Out of scope for the first implementation:

- Multi-clinic tenancy in the UI.
- Patient access to staff sessions.
- Long-term storage of full medication plans after the clinic day.
- Pharmacist editing of the medication plan itself.
- SSO, magic links, OTP, or external hospital identity integration.
- Full clinical note-taking.

## Recommended Architecture

Use Supabase for staff authentication and the coordination database.

Supabase is the recommended backend because this workflow needs staff login, roles, row-level security, auditability, and future realtime sync. Cloudflare D1 remains a good fit for edge cache or simple anonymous storage, but this feature handles identifying clinical workflow and benefits from Supabase Auth, Postgres constraints, and RLS.

The existing Cloudflare Pages app remains the frontend host. The app talks to Supabase using the browser client for authenticated staff workflows. Sensitive HN hashing should happen in a server-side function or database RPC that uses a secret unavailable to the browser.

## Authentication And Roles

Staff use Supabase Auth email/password.

Roles:

- `doctor`: create and revise medication plans, mark physician review, resolve correction requests.
- `pharmacist`: open same-day sessions by HN, review plans, request corrections, mark pharmacy review, and mark dispensed only when allowed.
- `admin`: manage staff later. Admin UI can be deferred.

For the first release, the product is single-clinic. The schema may still include a default `clinic_id` to avoid a painful migration later, but the UI does not need clinic switching.

Authorization must not use user-editable metadata. Staff role and clinic assignment should live in a `staff_profiles` table or trusted app metadata, with RLS policies based on authenticated user identity and role.

## Session Identity

A staff member enters HN to find or create today's session.

The system must not store HN plaintext. Instead, it creates a same-day session hash:

```text
session_hash = HMAC_SHA256(normalized_hn + clinic_date + clinic_secret)
```

Rules:

- `normalized_hn` should trim spaces and normalize formatting consistently.
- `clinic_date` uses the clinic local date.
- The secret stays server-side only.
- The same HN on the same date maps to the same session.
- The same HN on another date maps to a different session.
- Patient QR, W-code, printed patient viewer links, and saved patient plans still exclude HN.

## Session Lifecycle

Sessions are active only within the clinic day.

Boundary:

- Active until 23:59 clinic local time.
- After 23:59, the session can no longer be found or edited by entering HN.
- Expired active sessions are archived as hash-only records.

Archive behavior:

- Remove or exclude full medication plan details.
- Remove INR, schedule details, correction notes, and any clinical free text.
- Keep only hash-based audit summary:
  - `session_hash`
  - `clinic_date`
  - final status
  - created/reviewed/dispensed/archived timestamps
  - relevant staff actor ids
  - event counts or compact audit summary

Archive records must not contain HN plaintext or full medication plans.

## Workflow Statuses

Active session statuses:

```text
draft
physician_reviewed
pharmacy_reviewed
correction_requested
physician_revised
dispensed
cancelled
expired
archived
```

Expected flow:

```text
Doctor creates plan
-> physician_reviewed

Pharmacist reviews
-> pharmacy_reviewed
-> dispensed
```

Correction flow:

```text
Doctor creates plan
-> physician_reviewed

Pharmacist requests correction
-> correction_requested

Doctor resolves correction
-> physician_revised

Pharmacist reviews revised plan
-> pharmacy_reviewed
-> dispensed
```

Dispensing is blocked while an unresolved correction request exists. Dispensing is also blocked if the current medication plan has not been physician-reviewed after the latest correction request.

## Correction Requests

Pharmacists do not edit the medication plan directly in the first implementation. They create structured correction requests.

Correction request fields:

```ts
{
  session_id: string;
  reason:
    | "pill_burden"
    | "stock_issue"
    | "safety_concern"
    | "unclear_instruction"
    | "other";
  note: string;
  requested_by: string;
  requested_at: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution?: "accepted" | "rejected" | "updated_plan";
}
```

Rules:

- `note` is short free text, capped at 300 characters.
- Only pharmacists can create correction requests.
- Only doctors can resolve correction requests.
- A session can have multiple historical correction requests, but only one open request at a time.
- The open request must be resolved before pharmacy review or dispensing.
- Correction notes are active-day coordination data and are not retained in hash-only archive records.

## Medication Plan Source Of Truth

The medication plan remains doctor-controlled.

Doctors can create or revise the medication plan inside an active session. Pharmacists can review and request corrections, but they cannot create an alternate schedule that becomes active without doctor action.

When a doctor updates a plan in response to a correction, the current plan version changes and the session status becomes `physician_revised`. The pharmacist must review the revised plan before dispensing.

## Data Model Draft

Initial tables:

- `staff_profiles`
  - `user_id`
  - `role`
  - `display_name`
  - optional default `clinic_id`
  - `active`
- `clinic_sessions`
  - `id`
  - `session_hash`
  - `clinic_date`
  - `status`
  - `current_plan`
  - timestamps and actor ids
  - `expires_at`
- `correction_requests`
  - fields listed above
- `session_events`
  - `session_id`
  - `event_type`
  - `actor_id`
  - `created_at`
  - safe metadata
- `archived_session_summaries`
  - hash-only archive fields

The exact SQL schema should be written during implementation planning, with RLS policies designed alongside the tables.

## UI Surfaces

Doctor workflow:

- Login.
- Enter HN to open or create today's session.
- Create or revise medication plan.
- Mark physician-reviewed.
- See open correction requests and resolve them.

Pharmacist workflow:

- Login.
- Enter HN to open today's session.
- Review latest physician-reviewed plan.
- Mark pharmacy-reviewed and dispensed if no correction is open.
- Request correction with structured reason and short note.

Patient Viewer:

- Unchanged privacy boundary.
- No HN in QR, W-code, URL hash, saved patient plans, or voice guidance.

## Error Handling

- If no active session exists for an entered HN, doctor users may create one; pharmacist users see a clear “no active session found for today” state.
- If a session expired, staff cannot reopen it by HN.
- If Supabase is unavailable, staff workflows show a retryable sync error and do not pretend local changes are saved.
- If a role lacks permission, the UI hides the action and the backend/RLS still blocks it.
- If a correction is open, dispense actions are disabled with an explicit reason.

## Testing Strategy

Unit tests:

- HN normalization and hash request behavior.
- Status transition guards.
- Correction request validation.
- Archive redaction rules.

Database/RLS tests:

- Doctor can create and revise active sessions.
- Pharmacist can read active sessions and create corrections.
- Pharmacist cannot update the medication plan.
- Dispense is blocked with open correction.
- Archived summaries do not include plan, INR, correction note, or HN plaintext.

Integration tests:

- Doctor creates session on one browser session; pharmacist opens by same HN on another.
- Pharmacist requests correction; doctor resolves; pharmacist dispenses.
- Session cannot be found by HN after 23:59 boundary logic.

## Security And Privacy Notes

- Treat HN as identifying patient information.
- Never expose the hashing secret to the browser.
- Do not store HN plaintext in Supabase.
- Keep service-role keys out of frontend code.
- Enable RLS on exposed tables.
- Use trusted role/profile data for authorization, not user-editable metadata.
- Keep archive records hash-only and plan-free.

## Open Implementation Decisions

- Whether HN hashing should be implemented as a Supabase Edge Function, a Postgres RPC in a private schema, or a Cloudflare Pages Function that calls Supabase server-side.
- Whether active sessions should be physically deleted and summarized at 23:59 by scheduled job, or lazily archived on next access plus a scheduled cleanup.
- Whether realtime subscriptions are needed in v1 or whether manual refresh is enough for clinic workflow.

Recommended defaults for implementation planning:

- Use a server-side function for HN hashing.
- Use scheduled archive cleanup.
- Start without realtime; add realtime only if staff need live status updates without refresh.
