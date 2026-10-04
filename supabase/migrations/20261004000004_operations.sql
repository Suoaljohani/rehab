-- =====================================================================
-- 04 Scheduling, communication, CMS, governance
-- =====================================================================

-- ---------- Appointment requests (public, §12) ----------
create sequence public.request_ref_seq start 125;
create table public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  journey_type text not null default 'new_appointment'
    check (journey_type in ('referral','returning','new_appointment','find_service','inquiry')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  national_id text,
  phone text not null,
  specialty_code text references public.specialties(code),
  has_referral boolean not null default false,
  preferred_period text,
  notes text check (char_length(notes) <= 1500),
  status public.request_status not null default 'new',
  internal_note text,
  patient_id uuid references public.patients(id),
  appointment_id uuid,
  handled_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ar_status_idx on public.appointment_requests(status, created_at desc);
create trigger trg_ar_touch before update on public.appointment_requests for each row execute function private.touch_updated_at();

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.appointment_requests(id) on delete cascade,
  status public.request_status not null,
  note text,
  public_note text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Appointments (§73–§76) ----------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  episode_id uuid references public.episodes(id),
  specialty_code text references public.specialties(code),
  provider_id uuid references public.profiles(id),
  starts_at timestamptz not null,
  duration_min integer not null default 45 check (duration_min between 5 and 480),
  location text,
  status public.appointment_status not null default 'confirmed',
  notes text,
  request_id uuid references public.appointment_requests(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appt_patient_idx on public.appointments(patient_id, starts_at);
create index appt_provider_idx on public.appointments(provider_id, starts_at);
create index appt_start_idx on public.appointments(starts_at);
create trigger trg_appt_touch before update on public.appointments for each row execute function private.touch_updated_at();
alter table public.appointment_requests add constraint ar_appt_fk foreign key (appointment_id) references public.appointments(id);

create table public.appointment_change_requests (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  kind text not null check (kind in ('change','cancel')),
  reason text check (char_length(reason) <= 600),
  preferred text,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  handled_by uuid references public.profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id),
  full_name text not null,
  phone text,
  specialty_code text references public.specialties(code),
  preferred_days smallint[] not null default '{}',
  preferred_time text,
  priority text check (priority in ('routine','soon','priority')),
  status text not null default 'waiting' check (status in ('waiting','offered','scheduled','removed')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  location text,
  check (end_time > start_time)
);

-- ---------- Messaging (§29, §30, §55) ----------
create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  episode_id uuid references public.episodes(id),
  subject text not null check (char_length(subject) between 1 and 160),
  category public.thread_category not null default 'general',
  program_exercise_id uuid references public.program_exercises(id),
  exercise_id uuid references public.exercises(id),
  status text not null default 'open' check (status in ('open','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_sender_role text
);
create index mt_patient_idx on public.message_threads(patient_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index msg_thread_idx on public.messages(thread_id, created_at);

create table public.thread_reads (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  archived boolean not null default false,
  primary key (thread_id, user_id)
);

-- ---------- Notifications (§77–§80) ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notif_user_idx on public.notifications(user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  exercise_reminders boolean not null default true,
  appointment_reminders boolean not null default true,
  messages boolean not null default true,
  announcements boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','patients','staff')),
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'general',
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Public content (CMS §86) ----------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  specialty_code text references public.specialties(code),
  name text not null,
  name_en text,
  summary text not null,
  description text,
  conditions text[] not null default '{}',
  access_steps text[] not null default '{}',
  instructions text[] not null default '{}',
  icon text,
  sort smallint not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'general',
  sort smallint not null default 0,
  is_published boolean not null default true
);

create table public.cms_blocks (
  key text primary key,
  content jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- ---------- Governance ----------
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text,
  previous jsonb,
  new jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index audit_created_idx on public.audit_events(created_at desc);
create index audit_entity_idx on public.audit_events(entity_type, entity_id);
create index audit_actor_idx on public.audit_events(actor_id, created_at desc);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  user_id uuid references public.profiles(id),
  kind text not null,
  version text not null,
  accepted_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  event text not null check (event ~ '^[a-z_]{3,48}$'),
  props jsonb,
  created_at timestamptz not null default now()
);

create table public.patient_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_patient_idx on public.patient_otp_challenges(patient_id, created_at desc);

create table public.auth_throttle (
  id bigint generated always as identity primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index throttle_idx on public.auth_throttle(bucket, created_at desc);

-- ---------- Audit writer ----------
create or replace function private.audit(p_action text, p_entity text, p_entity_id text, p_summary text default null,
  p_prev jsonb default null, p_new jsonb default null, p_meta jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_events(actor_id, actor_role, action, entity_type, entity_id, summary, previous, new, metadata)
  values (auth.uid(), private.my_role()::text, p_action, p_entity, p_entity_id, p_summary, p_prev, p_new, p_meta);
end $$;

-- Generic row-level audit trigger: stores only changed columns on update.
create or replace function private.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_prev jsonb := '{}'; v_next jsonb := '{}'; k text;
begin
  if tg_op = 'INSERT' then
    perform private.audit('create', tg_table_name, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', to_jsonb(new)->>'key'), null, null, to_jsonb(new) - 'national_id');
    return new;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old); v_new := to_jsonb(new);
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('updated_at','last_message_at','last_login_at') and (v_old->k) is distinct from (v_new->k) then
        v_prev := v_prev || jsonb_build_object(k, case when k = 'national_id' then '"***"'::jsonb else v_old->k end);
        v_next := v_next || jsonb_build_object(k, case when k = 'national_id' then '"***"'::jsonb else v_new->k end);
      end if;
    end loop;
    if v_next <> '{}'::jsonb then
      perform private.audit('update', tg_table_name, coalesce(v_new->>'id', v_new->>'user_id', v_new->>'key'), null, v_prev, v_next);
    end if;
    return new;
  else
    perform private.audit('delete', tg_table_name, coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'user_id', to_jsonb(old)->>'key'), null, to_jsonb(old) - 'national_id', null);
    return old;
  end if;
end $$;

-- Audit integrity (§94): nobody edits or deletes audit history through the API.
revoke update, delete, truncate on public.audit_events from anon, authenticated;

grant execute on all functions in schema private to authenticated, anon;
