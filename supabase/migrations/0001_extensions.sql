-- 0001 — extensions and shared helpers.
--
-- Baseline only. The schema itself (gyms, profiles, trainees, exercises, programs …)
-- arrives with Phase 1; see PLAN.md §7 for the full model.

create extension if not exists "pgcrypto"; -- gen_random_bytes for access tokens
create extension if not exists "pg_trgm"; -- fuzzy exercise-name search alongside tsvector

-- Every table gets updated_at maintained by the database, never by the client.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Access tokens are compared by hash. The plaintext is shown to the coach exactly once,
-- at creation, and never stored — a database leak must not hand over trainee logins.
create or replace function public.hash_access_token(token text)
returns text
language sql
immutable
strict
as $$
  select encode(digest(token, 'sha256'), 'hex');
$$;
