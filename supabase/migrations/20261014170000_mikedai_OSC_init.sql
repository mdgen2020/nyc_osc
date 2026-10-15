-- mikedai_OSC_ initial schema (UNOFFICIAL DEMO - fictional data only)
-- Additive and idempotent. No ALTER on existing objects, no DROP, no TRUNCATE, no DELETE.
-- NOTE: Postgres folds unquoted identifiers to lowercase. To keep the exact, case-sensitive
-- prefix `mikedai_OSC_`, every project identifier is double-quoted. Reported in external-preflight.md.
-- The schema is NOT exposed through PostgREST; all access is via Edge Functions (service role).

create schema if not exists "mikedai_OSC_core";

-- Fictional claims -------------------------------------------------------------
create table if not exists "mikedai_OSC_core"."mikedai_OSC_claims" (
  id uuid primary key default gen_random_uuid(),
  claim_ref text not null unique,                 -- fictional, e.g. DEMO-100001
  claimant_last_name text not null,
  claimant_zip text not null,
  claimant_dob date,                              -- fictional; optional (verification needs any two attributes)
  owner_deceased boolean not null default false,
  status_code text not null check (status_code in (
    'processing','documents_required','documents_received','under_review',
    'additional_info_required','verification_in_progress','manual_review',
    'approved','check_preparing','check_mailed','check_not_received','closed')),
  status_changed_on date not null,
  next_action text not null,
  human_help_recommended boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_claimant_contacts" (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references "mikedai_OSC_core"."mikedai_OSC_claims"(id),
  channel text not null check (channel in ('sms','email')),
  destination text not null,                      -- fictional; never returned unmasked
  masked_destination text not null,
  created_at timestamptz not null default now()
);

-- ANI convenience lookup: keyed hash only, never plaintext. Not authentication.
create table if not exists "mikedai_OSC_core"."mikedai_OSC_caller_recognition" (
  ani_hash text primary key,
  first_name text not null,                       -- fictional persona (e.g. Linus)
  claim_id uuid references "mikedai_OSC_core"."mikedai_OSC_claims"(id)
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_representative_relationships" (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references "mikedai_OSC_core"."mikedai_OSC_claims"(id),
  relationship text not null check (relationship in (
    'self','estate','minor_child','parent_or_dependent','guardian',
    'power_of_attorney','trustee','business_representative','legal_representative')),
  authority_documented boolean not null default false,
  created_at timestamptz not null default now()
);

-- Verification ------------------------------------------------------------------
create table if not exists "mikedai_OSC_core"."mikedai_OSC_verification_sessions" (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references "mikedai_OSC_core"."mikedai_OSC_claims"(id),  -- null when claim not found (no enumeration)
  state text not null default 'started' check (state in ('started','attributes_ok','code_sent','verified','failed','locked')),
  attribute_attempts int not null default 0,
  code_attempts int not null default 0,
  resend_count int not null default 0,
  last_resend_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_verification_codes" (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references "mikedai_OSC_core"."mikedai_OSC_verification_sessions"(id),
  code_hash text not null,                        -- HMAC-SHA256, secret held in Edge Function env
  expires_at timestamptz not null,
  consumed_at timestamptz,                        -- single use
  created_at timestamptz not null default now()
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_verification_tokens" (
  token_hash text primary key,                    -- opaque token is returned once; only hash stored
  session_id uuid not null references "mikedai_OSC_core"."mikedai_OSC_verification_sessions"(id),
  claim_id uuid not null references "mikedai_OSC_core"."mikedai_OSC_claims"(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Claim-scoped attempt counters: lockout cannot be bypassed by starting a new session.
-- Key is a keyed hash of the normalized Claim ID string as typed (found or not), so behavior is uniform.
create table if not exists "mikedai_OSC_core"."mikedai_OSC_attempt_counters" (
  key_hash text primary key,
  attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Documents, payments, cases, notifications, audit ------------------------------
create table if not exists "mikedai_OSC_core"."mikedai_OSC_requested_documents" (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references "mikedai_OSC_core"."mikedai_OSC_claims"(id),
  category text not null check (category in (
    'signed_claim_form','proof_old_address','proof_ownership','name_change',
    'estate_documentation','representative_authorization','other')),
  state text not null default 'required' check (state in ('required','received','accepted')),
  created_at timestamptz not null default now()
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_document_receipts" (
  id uuid primary key default gen_random_uuid(),
  receipt_ref text not null unique,               -- fictional receipt number
  claim_id uuid not null references "mikedai_OSC_core"."mikedai_OSC_claims"(id),
  category text not null,
  file_type text not null check (file_type in ('pdf','png','jpg','tif')),
  file_size_bytes int not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  created_at timestamptz not null default now()   -- file contents are never stored
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_payment_status" (
  claim_id uuid primary key references "mikedai_OSC_core"."mikedai_OSC_claims"(id),
  payment_state text not null check (payment_state in (
    'none','approved','check_preparing','check_mailed','check_not_received',
    'lost_check','incorrect_payee_or_address','expired_check','check_cannot_be_cashed')),
  mailed_on date,
  mailing_address_masked text
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_service_cases" (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null unique,
  claim_id uuid references "mikedai_OSC_core"."mikedai_OSC_claims"(id),
  reason text not null,
  summary text not null,                          -- sanitized; no PII/OTP/tokens
  created_at timestamptz not null default now()
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_notification_deliveries" (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references "mikedai_OSC_core"."mikedai_OSC_claims"(id),
  kind text not null,
  simulated boolean not null default true,        -- demo never sends real SMS/email
  created_at timestamptz not null default now()
);

create table if not exists "mikedai_OSC_core"."mikedai_OSC_audit_events" (
  id bigint generated always as identity primary key,
  event text not null,
  session_id uuid,
  outcome text not null,
  created_at timestamptz not null default now()   -- sanitized: no values, only event + outcome
);

-- Row Level Security: enabled everywhere, no policies => deny by default ----------
do $$
declare t text;
begin
  for t in select tablename from pg_tables
           where schemaname = 'mikedai_OSC_core' and tablename like 'mikedai\_OSC\_%' escape '\'
  loop
    execute format('alter table "mikedai_OSC_core".%I enable row level security', t);
    execute format('revoke all on "mikedai_OSC_core".%I from anon, authenticated', t);
  end loop;
end $$;

revoke all on schema "mikedai_OSC_core" from anon, authenticated;
