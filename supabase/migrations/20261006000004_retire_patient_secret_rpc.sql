-- Patients now sign in through Supabase Auth phone OTP; the one-time password path is retired.
revoke execute on function public.rotate_my_patient_secret() from anon, authenticated, public;
