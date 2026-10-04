-- 06b Patients only ever see published (or superseded, for history) program versions.
alter policy pv_patient on public.program_versions using (
  status in ('published','superseded') and exists (select 1 from public.home_programs hp where hp.id = program_id and hp.patient_id = private.my_patient_id()));
alter policy pe_patient on public.program_exercises using (
  exists (select 1 from public.program_versions pv join public.home_programs hp on hp.id = pv.program_id
          where pv.id = program_version_id and pv.status in ('published','superseded') and hp.patient_id = private.my_patient_id()));
alter policy exercises_patient_read on public.exercises using (
  exists (select 1 from public.program_exercises pe
          join public.program_versions pv on pv.id = pe.program_version_id and pv.status in ('published','superseded')
          join public.home_programs hp on hp.id = pv.program_id
          where pe.exercise_id = exercises.id and hp.patient_id = private.my_patient_id()));
alter policy exv_patient_read on public.exercise_versions using (
  exists (select 1 from public.program_exercises pe
          join public.program_versions pv on pv.id = pe.program_version_id and pv.status in ('published','superseded')
          join public.home_programs hp on hp.id = pv.program_id
          where pe.exercise_version_id = exercise_versions.id and hp.patient_id = private.my_patient_id()));
