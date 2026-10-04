-- Public website content is governed like clinical data (§93): every change is audited.
create trigger audit_cms after insert or update on public.cms_blocks for each row execute function private.audit_row();
create trigger audit_services after insert or update on public.services for each row execute function private.audit_row();
create trigger audit_faqs after insert or update on public.faqs for each row execute function private.audit_row();
create trigger audit_specialties after insert or update on public.specialties for each row execute function private.audit_row();
