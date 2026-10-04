-- =====================================================================
-- 02 Rehabilitation episodes, care teams, clinical records
-- =====================================================================

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  patient_id uuid not null references public.patients(id) on delete restrict,
  specialty_code text not null references public.specialties(code),   -- BR-002
  title text not null,
  referral_reason text,
  referral_source text,
  diagnosis_summary text,
  main_goal text,
  status public.episode_status not null default 'active',
  start_date date not null default (now() at time zone 'Asia/Riyadh')::date,
  end_date date,
  closed_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index episodes_patient_idx on public.episodes(patient_id);
create index episodes_status_idx on public.episodes(status);
create trigger trg_episodes_touch before update on public.episodes for each row execute function private.touch_updated_at();

-- Care team (decision 2): many providers per episode, with history.
create table public.care_team_members (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  provider_id uuid not null references public.profiles(id),
  role public.care_role not null default 'secondary',
  start_date date not null default (now() at time zone 'Asia/Riyadh')::date,
  end_date date,
  ended_at timestamptz,
  assigned_by uuid references public.profiles(id),
  reason text,
  end_reason text,
  created_at timestamptz not null default now()
);
create index ctm_episode_idx on public.care_team_members(episode_id) where ended_at is null;
create index ctm_provider_idx on public.care_team_members(provider_id) where ended_at is null;
create unique index ctm_one_primary on public.care_team_members(episode_id) where role = 'primary' and ended_at is null;
create unique index ctm_unique_active on public.care_team_members(episode_id, provider_id) where ended_at is null;

-- ---------- Resource-scope access functions (RBAC + scope, §87) ----------
create or replace function private.staff_can_access_episode(p_episode uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.is_supervisor_plus()
      or (private.my_role() = 'provider' and exists (
            select 1 from public.care_team_members m
            where m.episode_id = p_episode and m.provider_id = auth.uid() and m.ended_at is null))
$$;

create or replace function private.can_access_episode(p_episode uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.staff_can_access_episode(p_episode)
      or exists (select 1 from public.episodes e where e.id = p_episode and e.patient_id = private.my_patient_id())
$$;

create or replace function private.staff_can_access_patient(p_patient uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.is_supervisor_plus()
      or (private.my_role() = 'provider' and exists (
            select 1 from public.episodes e
            join public.care_team_members m on m.episode_id = e.id and m.ended_at is null
            where e.patient_id = p_patient and m.provider_id = auth.uid()))
$$;

create or replace function private.can_access_patient(p_patient uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_patient = private.my_patient_id() or private.staff_can_access_patient(p_patient)
$$;

-- Is this profile someone the current patient may see (their care team)?
create or replace function private.is_my_care_provider(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.care_team_members m
    join public.episodes e on e.id = m.episode_id
    where m.provider_id = p_profile and m.ended_at is null and e.patient_id = private.my_patient_id())
$$;

-- ---------- Goals ----------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  title text not null,
  baseline numeric,
  target numeric,
  current_value numeric,
  unit text,
  higher_is_better boolean not null default true,
  due_date date,
  status text not null default 'active' check (status in ('active','achieved','not_achieved','cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_episode_idx on public.goals(episode_id);
create trigger trg_goals_touch before update on public.goals for each row execute function private.touch_updated_at();

-- ---------- Clinical notes (§40, §41, §54) ----------
create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete restrict,
  author_id uuid not null references public.profiles(id),
  kind text not null default 'session' check (kind in ('session','internal')),
  note_date date not null default (now() at time zone 'Asia/Riyadh')::date,
  session_type text,
  pain_score smallint check (pain_score between 0 and 10),
  patient_report text,
  functional_observation text,
  interventions text,
  progress text,
  plan text,
  internal_note text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_episode_idx on public.clinical_notes(episode_id, note_date desc);

create table public.clinical_note_revisions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.clinical_notes(id) on delete restrict,
  version integer not null,
  snapshot jsonb not null,
  edited_by uuid references public.profiles(id),
  edited_at timestamptz not null default now()
);

create or replace function private.note_revision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.author_id <> old.author_id or new.episode_id <> old.episode_id then
    raise exception 'author and episode are immutable';
  end if;
  insert into public.clinical_note_revisions(note_id, version, snapshot, edited_by)
  values (old.id, old.version, to_jsonb(old), auth.uid());
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_note_revision before update on public.clinical_notes for each row execute function private.note_revision();

-- ---------- Outcomes ----------
create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  measure text not null,
  value numeric not null,
  unit text,
  source text not null default 'provider' check (source in ('provider','patient')),
  note text,
  recorded_by uuid references public.profiles(id),
  recorded_at timestamptz not null default now()
);
create index outcomes_episode_idx on public.outcomes(episode_id, measure, recorded_at);

-- ---------- Timeline (system-generated, §97) ----------
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references public.episodes(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  type text not null,
  title text not null,
  detail text,
  actor_id uuid references public.profiles(id),
  ref_id uuid,
  patient_visible boolean not null default false,
  created_at timestamptz not null default now()
);
create index timeline_episode_idx on public.timeline_events(episode_id, created_at desc);
create index timeline_patient_idx on public.timeline_events(patient_id, created_at desc);

create or replace function private.add_timeline(p_episode uuid, p_type text, p_title text, p_detail text default null, p_ref uuid default null, p_visible boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_patient uuid;
begin
  select patient_id into v_patient from public.episodes where id = p_episode;
  if v_patient is null then return; end if;
  insert into public.timeline_events(episode_id, patient_id, type, title, detail, actor_id, ref_id, patient_visible)
  values (p_episode, v_patient, p_type, p_title, p_detail, auth.uid(), p_ref, p_visible);
end $$;

grant execute on all functions in schema private to authenticated, anon;
