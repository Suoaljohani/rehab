-- =====================================================================
-- 03 Exercise library (versioned), templates, home programs, activity
-- =====================================================================

-- ---------- Exercise library (§65–§70) ----------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status public.exercise_status not null default 'draft',
  current_version_id uuid,          -- latest APPROVED version (what providers prescribe)
  latest_version_id uuid,           -- newest version in any state
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  archive_reason text
);

create table public.exercise_versions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  version integer not null,
  status public.exercise_status not null default 'draft',
  name text not null,
  name_en text,
  description text,
  instructions text[] not null default '{}',
  specialty_code text references public.specialties(code),
  body_region text,
  category text,
  exercise_type text,
  difficulty text check (difficulty in ('beginner','intermediate','advanced')),
  equipment text[] not null default '{}',
  position text,
  video_path text,
  thumbnail_path text,
  video_duration_sec integer,
  media_status text not null default 'none' check (media_status in ('none','processing','ready','failed')),
  captions_path text,
  est_duration_sec integer not null default 120,
  default_reps integer,
  default_sets integer,
  default_hold_sec integer,
  default_duration_sec integer,
  safety_notes text,
  contraindications text,
  tags text[] not null default '{}',
  change_note text,
  is_safety_update boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_comment text,
  unique (exercise_id, version)
);
create index exv_status_idx on public.exercise_versions(status);
alter table public.exercises add constraint exercises_current_fk foreign key (current_version_id) references public.exercise_versions(id);
alter table public.exercises add constraint exercises_latest_fk foreign key (latest_version_id) references public.exercise_versions(id);

create table public.exercise_review_events (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id),
  version_id uuid references public.exercise_versions(id),
  action text not null check (action in ('created','submitted','approved','changes_requested','rejected','archived','restored','safety_update')),
  comment text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index exre_ex_idx on public.exercise_review_events(exercise_id, created_at desc);

-- ---------- Program templates (§71, §72) ----------
create table public.program_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty_code text references public.specialties(code),
  category text,
  description text,
  instructions text,
  duration_weeks smallint not null default 4,
  status text not null default 'active' check (status in ('draft','active','archived')),
  version integer not null default 1,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_tpl_touch before update on public.program_templates for each row execute function private.touch_updated_at();

create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.program_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  order_index integer not null default 0,
  reps integer, sets integer, hold_sec integer, duration_sec integer,
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',
  instructions text
);

-- ---------- Home programs (§42–§50) ----------
create table public.home_programs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  title text not null,
  status public.program_status not null default 'draft',
  start_date date not null,
  end_date date not null,
  instructions text,
  current_version_id uuid,
  template_id uuid references public.program_templates(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paused_at timestamptz,
  ended_at timestamptz,
  check (end_date >= start_date)
);
create index hp_episode_idx on public.home_programs(episode_id);
create index hp_patient_idx on public.home_programs(patient_id, status);
create trigger trg_hp_touch before update on public.home_programs for each row execute function private.touch_updated_at();

create table public.program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.home_programs(id) on delete restrict,
  version integer not null,
  status public.program_version_status not null default 'draft',
  effective_date date,
  change_summary text,
  instructions text,
  published_by uuid references public.profiles(id),
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (program_id, version)
);
create unique index pv_one_draft on public.program_versions(program_id) where status = 'draft';
alter table public.home_programs add constraint hp_current_version_fk foreign key (current_version_id) references public.program_versions(id);

-- Prescription is separate from the exercise definition (decision 3, §46)
create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_version_id uuid not null references public.program_versions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  exercise_version_id uuid not null references public.exercise_versions(id),
  order_index integer not null default 0,
  reps integer check (reps between 0 and 500),
  sets integer check (sets between 0 and 50),
  hold_sec integer check (hold_sec between 0 and 600),
  duration_sec integer check (duration_sec between 0 and 7200),
  schedule_type text not null default 'weekly' check (schedule_type in ('daily','weekly','dates','interval')),
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',   -- 0 = Sunday … 6 = Saturday
  specific_dates date[] not null default '{}',
  interval_days smallint check (interval_days between 1 and 30),
  start_date date,
  end_date date,
  instructions text,
  is_required boolean not null default true,
  request_feedback boolean not null default true,
  created_at timestamptz not null default now()
);
create index pe_version_idx on public.program_exercises(program_version_id, order_index);

-- Materialised schedule (§47, §100–§102)
create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.home_programs(id) on delete restrict,
  program_version_id uuid not null references public.program_versions(id),
  program_exercise_id uuid not null references public.program_exercises(id),
  patient_id uuid not null references public.patients(id),
  episode_id uuid not null references public.episodes(id),
  scheduled_date date not null,
  status public.schedule_status not null default 'scheduled',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (program_exercise_id, scheduled_date)
);
create index si_patient_date_idx on public.schedule_items(patient_id, scheduled_date);
create index si_program_date_idx on public.schedule_items(program_id, scheduled_date);
create index si_episode_idx on public.schedule_items(episode_id, scheduled_date);

-- ---------- Patient activity ----------
create table public.home_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  episode_id uuid not null references public.episodes(id),
  program_id uuid not null references public.home_programs(id),
  session_date date not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  feeling public.feeling,
  patient_note text,
  unique (program_id, session_date)
);
create index hs_patient_idx on public.home_sessions(patient_id, session_date desc);

create table public.exercise_completions (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null unique references public.schedule_items(id),   -- no double counting (§130)
  home_session_id uuid references public.home_sessions(id),
  patient_id uuid not null references public.patients(id),
  episode_id uuid not null references public.episodes(id),
  program_exercise_id uuid not null references public.program_exercises(id),
  exercise_version_id uuid not null references public.exercise_versions(id),
  program_version_id uuid not null references public.program_versions(id),
  pain_score smallint check (pain_score between 0 and 10),
  difficulty public.difficulty_level,
  completed_at timestamptz not null default now()
);
create index ec_patient_idx on public.exercise_completions(patient_id, completed_at desc);
create index ec_episode_idx on public.exercise_completions(episode_id, completed_at desc);

create table public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  episode_id uuid not null references public.episodes(id),
  schedule_item_id uuid references public.schedule_items(id),
  program_exercise_id uuid references public.program_exercises(id),
  exercise_version_id uuid references public.exercise_versions(id),
  reason public.issue_reason not null,
  comment text check (char_length(comment) <= 1000),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  handled_by uuid references public.profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index ir_episode_idx on public.issue_reports(episode_id, created_at desc);

-- Provider attention flags (§34) — informative, never clinical decisions.
create table public.attention_flags (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  episode_id uuid not null references public.episodes(id),
  kind text not null check (kind in ('high_pain','issue_reported','inactivity','program_ending','patient_message','feeling_worse','unassigned')),
  severity public.flag_severity not null default 'medium',
  title text not null,
  detail text,
  source_id uuid,
  status public.flag_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text
);
create index af_open_idx on public.attention_flags(episode_id) where status = 'open';
create unique index af_unique_open on public.attention_flags(episode_id, kind, coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)) where status = 'open';

-- Derived view: "missed" is computed, never stored (§100). security_invoker keeps RLS.
create view public.schedule_items_v with (security_invoker = true) as
select si.*,
  case
    when si.status = 'scheduled' and si.scheduled_date < private.today() then 'missed'
    else si.status::text
  end as effective_status
from public.schedule_items si;
