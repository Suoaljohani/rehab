-- =====================================================================
-- 10 Private exercise media (§70, §118) + remaining timeline triggers
-- Media is never public: viewers receive short-lived signed URLs, and a
-- patient can only sign objects belonging to exercises prescribed to them.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', false, 524288000,
        array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp','text/vtt'])
on conflict (id) do nothing;

create policy media_read on storage.objects for select using (
  bucket_id = 'exercise-media' and (
    private.is_staff()
    or exists (select 1 from public.exercise_versions ev
               where ev.video_path = storage.objects.name or ev.thumbnail_path = storage.objects.name or ev.captions_path = storage.objects.name)));
create policy media_upload on storage.objects for insert with check (
  bucket_id = 'exercise-media' and private.my_role() in ('provider','supervisor','admin','content_reviewer','super_admin'));

-- Goal progress is part of the patient's visible journey.
create or replace function private.on_goal_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform private.add_timeline(new.episode_id, 'GOAL_CREATED', 'هدف جديد: ' || new.title, null, new.id, true);
  elsif new.current_value is distinct from old.current_value or new.status is distinct from old.status then
    perform private.add_timeline(new.episode_id, 'GOAL_UPDATED',
      case when new.status = 'achieved' and old.status <> 'achieved' then 'تحقق الهدف: ' else 'تحديث الهدف: ' end || new.title,
      case when new.current_value is not null then 'القيمة الحالية ' || new.current_value || coalesce(' ' || new.unit, '') end, new.id, true);
  end if;
  return new;
end $$;
create trigger trg_goal_timeline after insert or update on public.goals for each row execute function private.on_goal_change();

-- Session notes appear on the staff timeline only (never patient-visible).
create or replace function private.on_note_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.add_timeline(new.episode_id, case when new.kind = 'internal' then 'INTERNAL_NOTE' else 'SESSION_RECORDED' end,
    case when new.kind = 'internal' then 'ملاحظة داخلية' else 'جلسة مسجلة' || coalesce(': ' || new.session_type, '') end,
    left(coalesce(new.progress, new.internal_note, new.plan), 160), new.id, false);
  return new;
end $$;
create trigger trg_note_timeline after insert on public.clinical_notes for each row execute function private.on_note_insert();

grant execute on all functions in schema private to authenticated, anon;
