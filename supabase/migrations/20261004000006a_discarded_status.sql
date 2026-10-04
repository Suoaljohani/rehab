-- 06a Drafts are never deleted: discarded program drafts keep their history.
alter type public.program_version_status add value if not exists 'discarded';
