-- Sign-in codes go out on WhatsApp by default (Supabase Auth · Twilio Verify),
-- with an automatic SMS fallback when WhatsApp delivery fails.
insert into public.system_settings(key, value, description) values
  ('otp_channel', '"whatsapp"', 'قناة إرسال رمز دخول المراجع: واتساب أو رسالة نصية'),
  ('otp_sms_fallback', 'true', 'إرسال الرمز برسالة نصية تلقائيًا إذا تعذّر الإرسال عبر واتساب')
on conflict (key) do nothing;

alter table public.sms_deliveries add column if not exists channel text not null default 'sms';

create or replace function private.otp_channel() returns text
language sql stable security definer set search_path = public as $$
  select case when private.setting('otp_channel', '"whatsapp"') #>> '{}' = 'sms' then 'sms' else 'whatsapp' end
$$;

-- The login screen shows where the code will arrive (a setting, not personal data).
create or replace function public.login_channel() returns text
language sql stable security definer set search_path = public as $$ select private.otp_channel() $$;
grant execute on function public.login_channel() to anon, authenticated;

create or replace function public.request_patient_otp(p_access_id text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text := private.normalize_identifier(p_access_id);
  v_patient public.patients; v_e164 text; v_auth_phone text; v_last timestamptz; r record;
  v_channel text := private.otp_channel();
  v_fallback boolean := coalesce((private.setting('otp_sms_fallback', 'true'::jsonb))::text::boolean, true);
  v_ok jsonb := jsonb_build_object('ok', true, 'cooldown', 60, 'channel', private.otp_channel());
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
    insert into public.sms_deliveries(patient_id, event, channel) values (v_patient.id, 'suppressed', v_channel);
    return v_ok;
  end if;
  v_e164 := private.to_e164(v_patient.phone);
  select phone into v_auth_phone from auth.users where id = v_patient.user_id;
  if v_e164 is null then
    insert into public.sms_deliveries(patient_id, event, channel) values (v_patient.id, 'no_phone', v_channel);
    return v_ok;
  end if;
  if v_auth_phone is distinct from substr(v_e164, 2) then
    insert into public.sms_deliveries(patient_id, event, error_code, channel) values (v_patient.id, 'phone_conflict', 'auth_phone_mismatch', v_channel);
    return v_ok;
  end if;

  select * into r from private.auth_api('otp', jsonb_build_object('phone', v_e164, 'create_user', false, 'channel', v_channel));
  insert into public.sms_deliveries(patient_id, event, http_status, error_code, provider_code, detail, channel)
  values (v_patient.id, case when r.status = 200 then 'sent' when r.status = 429 then 'rate_limited' else 'failed' end,
          r.status, case when r.status <> 200 then left(coalesce(r.body->>'error_code', r.body->>'msg', 'unknown'), 80) end,
          case when r.status <> 200 then private.provider_code(r.body->>'msg') end,
          case when r.status <> 200 then left(r.body->>'msg', 400) end, v_channel);

  -- WhatsApp unavailable for this number or not yet enabled: fall back to SMS once.
  if r.status not in (200, 429) and v_channel = 'whatsapp' and v_fallback then
    select * into r from private.auth_api('otp', jsonb_build_object('phone', v_e164, 'create_user', false, 'channel', 'sms'));
    insert into public.sms_deliveries(patient_id, event, http_status, error_code, provider_code, detail, channel)
    values (v_patient.id, case when r.status = 200 then 'sent' when r.status = 429 then 'rate_limited' else 'failed' end,
            r.status, case when r.status <> 200 then left(coalesce(r.body->>'error_code', r.body->>'msg', 'unknown'), 80) end,
            case when r.status <> 200 then private.provider_code(r.body->>'msg') end,
            case when r.status <> 200 then left(r.body->>'msg', 400) end, 'sms');
  end if;
  return v_ok;
end $$;
