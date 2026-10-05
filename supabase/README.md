# Database

Migrations in `migrations/` are applied in filename order and are the source of truth.
`seed/` contains the demo dataset (run in order 01 → 05 after migrations).

## Security model
- **RLS everywhere.** Every table has row-level security. Access = role (RBAC) + resource scope
  (care-team membership for providers, own record for patients).
- **State changes go through RPCs.** Episode status, program publishing, exercise review, and
  assignments are `security definer` functions that re-check authorization, run in one
  transaction, write the audit trail and the patient timeline, and notify the right people.
- **Nothing clinical is deleted.** Program drafts are discarded (kept), exercises are archived,
  notes keep revisions, audit events are append-only.

## Seeded accounts
The seed creates example staff accounts and sample patients (`patients.is_sample = true`, never texted).
Change every seeded staff password, or disable the accounts, before real use.
