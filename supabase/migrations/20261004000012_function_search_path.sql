-- Pin search_path on helper functions (Supabase advisor 0011).
alter function private.guard_episode() set search_path = public, extensions;
alter function private.guard_exercise_version() set search_path = public, extensions;
alter function private.guard_program() set search_path = public, extensions;
alter function private.is_via_rpc() set search_path = public, extensions;
alter function private.new_access_id() set search_path = public, extensions;
alter function private.normalize_phone(p text) set search_path = public, extensions;
alter function private.random_secret() set search_path = public, extensions;
alter function private.require(p_ok boolean, p_err text) set search_path = public, extensions;
alter function private.today() set search_path = public, extensions;
alter function private.touch_updated_at() set search_path = public, extensions;
alter function private.via_rpc() set search_path = public, extensions;
