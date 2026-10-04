-- =====================================================================
-- 05 Row-Level Security — RBAC + resource scope enforced in the database
-- (§87, §116, §117). Hiding a button is never the security boundary.
-- =====================================================================

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- Reference / public content ----------
create policy specialties_read on public.specialties for select using (true);
create policy specialties_admin on public.specialties for all using (private.is_admin()) with check (private.is_admin());

create policy services_read on public.services for select using (is_published or private.is_admin());
create policy services_admin on public.services for all using (private.is_admin()) with check (private.is_admin());
create policy faqs_read on public.faqs for select using (is_published or private.is_admin());
create policy faqs_admin on public.faqs for all using (private.is_admin()) with check (private.is_admin());
create policy cms_read on public.cms_blocks for select using (true);
create policy cms_admin on public.cms_blocks for all using (private.is_admin()) with check (private.is_admin());

create policy settings_read on public.system_settings for select using (auth.uid() is not null);
create policy settings_admin on public.system_settings for all using (private.is_admin()) with check (private.is_admin());

-- ---------- Identity ----------
create policy profiles_self on public.profiles for select using (id = auth.uid());
create policy profiles_staff_read on public.profiles for select using (private.is_staff() and role <> 'patient');
create policy profiles_staff_read_patients on public.profiles for select using (
  role = 'patient' and exists (select 1 from public.patients p where p.user_id = profiles.id and private.staff_can_access_patient(p.id)));
create policy profiles_patient_care_team on public.profiles for select using (private.is_my_care_provider(id));
create policy profiles_admin on public.profiles for update using (private.is_admin()) with check (private.is_admin());

create policy staff_read on public.staff_profiles for select using (private.is_staff() or private.is_my_care_provider(user_id));
create policy staff_admin on public.staff_profiles for all using (private.is_admin()) with check (private.is_admin());

create policy patients_read on public.patients for select using (private.can_access_patient(id));
create policy patients_admin_update on public.patients for update using (private.is_admin()) with check (private.is_admin());

-- ---------- Episodes & care team ----------
create policy episodes_read on public.episodes for select using (private.can_access_episode(id));
create policy episodes_staff_update on public.episodes for update
  using (private.staff_can_access_episode(id)) with check (private.staff_can_access_episode(id));

create policy ctm_read on public.care_team_members for select using (private.can_access_episode(episode_id));

create policy goals_read on public.goals for select using (private.can_access_episode(episode_id));
create policy goals_write on public.goals for insert with check (private.staff_can_access_episode(episode_id) and private.my_role() <> 'content_reviewer');
create policy goals_update on public.goals for update using (private.staff_can_access_episode(episode_id)) with check (private.staff_can_access_episode(episode_id));

-- Clinical notes: staff only; patients never see notes (BR-010).
create policy notes_read on public.clinical_notes for select using (private.staff_can_access_episode(episode_id));
create policy notes_insert on public.clinical_notes for insert with check (
  author_id = auth.uid() and private.staff_can_access_episode(episode_id) and private.my_role() in ('provider','supervisor','admin','super_admin'));
create policy notes_update_author on public.clinical_notes for update using (author_id = auth.uid() and private.staff_can_access_episode(episode_id))
  with check (author_id = auth.uid());
create policy note_rev_read on public.clinical_note_revisions for select using (
  exists (select 1 from public.clinical_notes n where n.id = note_id and private.staff_can_access_episode(n.episode_id)));

create policy outcomes_read on public.outcomes for select using (private.can_access_episode(episode_id));
create policy outcomes_staff_insert on public.outcomes for insert with check (
  source = 'provider' and recorded_by = auth.uid() and private.staff_can_access_episode(episode_id));

create policy timeline_staff on public.timeline_events for select using (private.staff_can_access_patient(patient_id) and (episode_id is null or private.staff_can_access_episode(episode_id)));
create policy timeline_patient on public.timeline_events for select using (patient_visible and patient_id = private.my_patient_id());

-- ---------- Exercise library ----------
create policy exercises_staff_read on public.exercises for select using (private.is_staff());
create policy exercises_patient_read on public.exercises for select using (
  exists (select 1 from public.program_exercises pe
          join public.program_versions pv on pv.id = pe.program_version_id and pv.status <> 'draft'
          join public.home_programs hp on hp.id = pv.program_id
          where pe.exercise_id = exercises.id and hp.patient_id = private.my_patient_id()));

create policy exv_staff_read on public.exercise_versions for select using (private.is_staff());
create policy exv_patient_read on public.exercise_versions for select using (
  exists (select 1 from public.program_exercises pe
          join public.program_versions pv on pv.id = pe.program_version_id and pv.status <> 'draft'
          join public.home_programs hp on hp.id = pv.program_id
          where pe.exercise_version_id = exercise_versions.id and hp.patient_id = private.my_patient_id()));
-- Drafts are editable by their author or content managers; approved content is immutable.
create policy exv_edit_draft on public.exercise_versions for update
  using (status in ('draft','changes_requested','rejected') and (created_by = auth.uid() or private.is_content_manager()))
  with check (status in ('draft','changes_requested','rejected'));

create policy exre_read on public.exercise_review_events for select using (private.is_staff());

create policy tpl_read on public.program_templates for select using (private.is_staff());
create policy tpl_write on public.program_templates for all using (private.is_supervisor_plus()) with check (private.is_supervisor_plus());
create policy tple_read on public.template_exercises for select using (private.is_staff());
create policy tple_write on public.template_exercises for all using (private.is_supervisor_plus()) with check (private.is_supervisor_plus());

-- ---------- Home programs (BR-005: patients never see drafts) ----------
create policy hp_staff on public.home_programs for select using (private.staff_can_access_episode(episode_id));
create policy hp_patient on public.home_programs for select using (patient_id = private.my_patient_id() and status not in ('draft'));
create policy hp_staff_update on public.home_programs for update using (private.staff_can_access_episode(episode_id) and status = 'draft')
  with check (private.staff_can_access_episode(episode_id));

create policy pv_staff on public.program_versions for select using (
  exists (select 1 from public.home_programs hp where hp.id = program_id and private.staff_can_access_episode(hp.episode_id)));
create policy pv_patient on public.program_versions for select using (
  status <> 'draft' and exists (select 1 from public.home_programs hp where hp.id = program_id and hp.patient_id = private.my_patient_id()));
create policy pv_staff_update on public.program_versions for update using (
  status = 'draft' and exists (select 1 from public.home_programs hp where hp.id = program_id and private.staff_can_access_episode(hp.episode_id)))
  with check (status = 'draft');

create policy pe_staff on public.program_exercises for select using (
  exists (select 1 from public.program_versions pv join public.home_programs hp on hp.id = pv.program_id
          where pv.id = program_version_id and private.staff_can_access_episode(hp.episode_id)));
create policy pe_patient on public.program_exercises for select using (
  exists (select 1 from public.program_versions pv join public.home_programs hp on hp.id = pv.program_id
          where pv.id = program_version_id and pv.status <> 'draft' and hp.patient_id = private.my_patient_id()));
-- Prescriptions can only change while their version is a draft (BR-007).
create policy pe_draft_write on public.program_exercises for all using (
  exists (select 1 from public.program_versions pv join public.home_programs hp on hp.id = pv.program_id
          where pv.id = program_version_id and pv.status = 'draft' and private.staff_can_access_episode(hp.episode_id)))
  with check (
  exists (select 1 from public.program_versions pv join public.home_programs hp on hp.id = pv.program_id
          where pv.id = program_version_id and pv.status = 'draft' and private.staff_can_access_episode(hp.episode_id))
  and exists (select 1 from public.exercise_versions ev join public.exercises ex on ex.id = ev.exercise_id
              where ev.id = exercise_version_id and ev.status = 'approved' and ex.status = 'approved'));  -- BR-006

create policy si_read on public.schedule_items for select using (private.can_access_episode(episode_id));

create policy hs_read on public.home_sessions for select using (private.can_access_episode(episode_id));
create policy ec_read on public.exercise_completions for select using (private.can_access_episode(episode_id));
create policy ir_read on public.issue_reports for select using (private.can_access_episode(episode_id));
create policy ir_staff_update on public.issue_reports for update using (private.staff_can_access_episode(episode_id)) with check (private.staff_can_access_episode(episode_id));

create policy af_read on public.attention_flags for select using (private.staff_can_access_episode(episode_id));

-- ---------- Scheduling ----------
create policy ar_staff on public.appointment_requests for select using (private.is_supervisor_plus());
create policy ar_staff_update on public.appointment_requests for update using (private.is_supervisor_plus()) with check (private.is_supervisor_plus());
create policy re_staff on public.request_events for select using (private.is_supervisor_plus());

create policy appt_read on public.appointments for select using (
  private.can_access_patient(patient_id) or provider_id = auth.uid());
create policy appt_admin on public.appointments for all using (private.is_supervisor_plus()) with check (private.is_supervisor_plus());
create policy appt_provider_update on public.appointments for update using (provider_id = auth.uid()) with check (provider_id = auth.uid());

create policy acr_read on public.appointment_change_requests for select using (patient_id = private.my_patient_id() or private.is_supervisor_plus());
create policy acr_admin on public.appointment_change_requests for update using (private.is_supervisor_plus()) with check (private.is_supervisor_plus());

create policy wl_admin on public.waitlist_entries for all using (private.is_supervisor_plus()) with check (private.is_supervisor_plus());

create policy avail_read on public.provider_availability for select using (private.is_staff());
create policy avail_write on public.provider_availability for all using (provider_id = auth.uid() or private.is_supervisor_plus())
  with check (provider_id = auth.uid() or private.is_supervisor_plus());

-- ---------- Messaging ----------
create policy mt_read on public.message_threads for select using (
  patient_id = private.my_patient_id()
  or (private.my_role() in ('provider','supervisor','admin','super_admin') and private.staff_can_access_patient(patient_id)));
create policy mt_patient_insert on public.message_threads for insert with check (
  patient_id = private.my_patient_id() and created_by = auth.uid());
create policy mt_staff_insert on public.message_threads for insert with check (
  created_by = auth.uid() and private.my_role() in ('provider','supervisor','admin','super_admin') and private.staff_can_access_patient(patient_id));
create policy mt_update on public.message_threads for update using (
  patient_id = private.my_patient_id() or private.staff_can_access_patient(patient_id))
  with check (patient_id = private.my_patient_id() or private.staff_can_access_patient(patient_id));

create policy msg_read on public.messages for select using (
  exists (select 1 from public.message_threads t where t.id = thread_id));   -- inherits mt_read
create policy msg_insert on public.messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.message_threads t where t.id = thread_id and t.status = 'open'));

create policy tr_own on public.thread_reads for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notif_own on public.notifications for select using (user_id = auth.uid());
create policy notif_own_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy np_own on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ann_read on public.announcements for select using (
  private.is_admin()
  or (is_published and (audience = 'all'
      or (audience = 'patients' and private.my_role() = 'patient')
      or (audience = 'staff' and private.is_staff()))));
create policy ann_admin on public.announcements for all using (private.is_admin()) with check (private.is_admin());

create policy mtpl_read on public.message_templates for select using (private.is_staff());
create policy mtpl_admin on public.message_templates for all using (private.is_admin()) with check (private.is_admin());

-- ---------- Governance ----------
-- Audit: admins see everything; supervisors see operational (non-identity) events.
create policy audit_admin on public.audit_events for select using (private.is_admin());
create policy audit_supervisor on public.audit_events for select using (
  private.my_role() = 'supervisor' and entity_type in ('episodes','care_team_members','home_programs','program_versions','appointments','exercise_versions'));

create policy consent_read on public.consent_records for select using (patient_id = private.my_patient_id() or private.is_admin());
create policy analytics_insert on public.analytics_events for insert with check (user_id = auth.uid());
create policy analytics_admin on public.analytics_events for select using (private.is_admin());
-- patient_otp_challenges, auth_throttle: no policies → no API access at all.

-- ---------- Audit triggers on sensitive tables (§93) ----------
create trigger audit_patients after insert or update on public.patients for each row execute function private.audit_row();
create trigger audit_episodes after insert or update on public.episodes for each row execute function private.audit_row();
create trigger audit_ctm after insert or update on public.care_team_members for each row execute function private.audit_row();
create trigger audit_profiles after update on public.profiles for each row execute function private.audit_row();
create trigger audit_staff after insert or update on public.staff_profiles for each row execute function private.audit_row();
create trigger audit_programs after insert or update on public.home_programs for each row execute function private.audit_row();
create trigger audit_pv after update on public.program_versions for each row execute function private.audit_row();
create trigger audit_notes after insert or update on public.clinical_notes for each row execute function private.audit_row();
create trigger audit_exv after update of status on public.exercise_versions for each row execute function private.audit_row();
create trigger audit_settings after insert or update or delete on public.system_settings for each row execute function private.audit_row();
create trigger audit_appts after insert or update on public.appointments for each row execute function private.audit_row();
create trigger audit_goals after insert or update on public.goals for each row execute function private.audit_row();
