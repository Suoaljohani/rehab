-- Supabase Auth reads users on its own connection, so the sign-in phone must be
-- committed before a code is requested. Keep it in sync whenever a patient's
-- mobile or account changes, instead of inside the sign-in request.
create or replace function private.on_patient_phone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and not new.is_sample then
    perform private.ensure_auth_phone(new.user_id, new.phone);
  end if;
  return new;
end $$;
create trigger trg_patient_phone_sync after insert or update of phone, user_id on public.patients
for each row execute function private.on_patient_phone();

-- Backfill real (non-sample) patients.
select private.ensure_auth_phone(user_id, phone) from public.patients where user_id is not null and not is_sample;

create or replace function public.request_patient_otp(p_access_id text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text := private.normalize_identifier(p_access_id);
  v_patient public.patients; v_e164 text; v_auth_phone text; v_last timestamptz; r record;
  v_ok constant jsonb := jsonb_build_object('ok', true, 'cooldown', 60);
begin
  if v_key !~ '^[12]\d{9}$' then return jsonb_build_object('ok', false, 'error', 'invalid_identifier'); end if;
  if private.throttled('otp:' || v_key, 5, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_patient := private.find_login_patient(v_key);
  if v_patient.id is null then return v_ok; end if;

  select max(created_at) into v_last from public.sms_deliveries
   where patient_id = v_patient.id and purpose = 'login' and event = 'sent';
  if v_last is not null and v_last > now() - interval '60 seconds' then
    insert into public.sms_deliveries(patient_id, event) values (v_patient.id, 'suppressed');
    return v_ok;
  end if;

  v_e164 := private.to_e164(v_patient.phone);
  select phone into v_auth_phone from auth.users where id = v_patient.user_id;
  if v_e164 is null then
    insert into public.sms_deliveries(patient_id, event) values (v_patient.id, 'no_phone');
    return v_ok;
  end if;
  if v_auth_phone is distinct from substr(v_e164, 2) then
    -- out of sync (e.g. number shared with another account): staff must correct the mobile
    insert into public.sms_deliveries(patient_id, event, error_code) values (v_patient.id, 'phone_conflict', 'auth_phone_mismatch');
    return v_ok;
  end if;

  select * into r from private.auth_api('otp', jsonb_build_object('phone', v_e164, 'create_user', false, 'channel', 'sms'));
  insert into public.sms_deliveries(patient_id, event, http_status, error_code)
  values (v_patient.id, case when r.status = 200 then 'sent' when r.status = 429 then 'rate_limited' else 'failed' end,
          r.status, case when r.status <> 200 then left(coalesce(r.body->>'error_code', r.body->>'msg', 'unknown'), 80) end);
  return v_ok;
end $$;

-- Registration and phone corrections now rely on the trigger for the sync.
create or replace function public.admin_update_patient_phone(p_patient uuid, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare v_phone text := private.normalize_phone(p_phone); pt public.patients;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select * into pt from public.patients where id = p_patient;
  perform private.require(found, 'not_found');
  perform private.require(v_phone ~ '^05\d{8}$', 'invalid_phone');
  perform private.require(not exists (select 1 from auth.users where phone = substr(private.to_e164(v_phone), 2) and id is distinct from pt.user_id), 'phone_in_use');
  update public.patients set phone = v_phone, phone_verified = false where id = p_patient;
  update public.profiles set phone = v_phone where id = pt.user_id;
end $$;
