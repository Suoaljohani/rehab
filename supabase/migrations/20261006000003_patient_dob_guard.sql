-- A birth date cannot be in the future (new and edited rows; legacy rows are left for staff to correct).
alter table public.patients add constraint patients_dob_valid
  check (date_of_birth is null or (date_of_birth >= date '1900-01-01' and date_of_birth <= (now() at time zone 'Asia/Riyadh')::date)) not valid;
