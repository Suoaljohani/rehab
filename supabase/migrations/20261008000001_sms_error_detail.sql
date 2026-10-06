-- Keep the provider's own reason (e.g. "Twilio 21608") so staff see the exact fix.
alter table public.sms_deliveries add column if not exists provider_code text, add column if not exists detail text;

create or replace function private.provider_code(p_msg text) returns text
language sql immutable set search_path = public as $$
  select coalesce(substring(coalesce(p_msg, '') from 'errors/(\d{5})'), substring(coalesce(p_msg, '') from '\m(2\d{4}|6\d{4})\M'))
$$;

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
    insert into public.sms_deliveries(patient_id, event, error_code) values (v_patient.id, 'phone_conflict', 'auth_phone_mismatch');
    return v_ok;
  end if;
  select * into r from private.auth_api('otp', jsonb_build_object('phone', v_e164, 'create_user', false, 'channel', 'sms'));
  insert into public.sms_deliveries(patient_id, event, http_status, error_code, provider_code, detail)
  values (v_patient.id, case when r.status = 200 then 'sent' when r.status = 429 then 'rate_limited' else 'failed' end,
          r.status, case when r.status <> 200 then left(coalesce(r.body->>'error_code', r.body->>'msg', 'unknown'), 80) end,
          case when r.status <> 200 then private.provider_code(r.body->>'msg') end,
          case when r.status <> 200 then left(r.body->>'msg', 400) end);
  return v_ok;
end $$;

-- Backfill the code for earlier failures where the reason is known from the Auth logs.
update public.sms_deliveries set provider_code = '21608' where error_code = 'sms_send_failed' and provider_code is null;
