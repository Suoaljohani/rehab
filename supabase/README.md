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

## Demo accounts (seed)
| Role | Login | Secret |
|---|---|---|
| Department admin | admin@masar.health | Masar@2026! |
| Supervisor | supervisor@masar.health | Masar@2026! |
| Provider (PT) | noura@masar.health | Masar@2026! |
| Provider (PT) | faisal@masar.health | Masar@2026! |
| Provider (OT) | huda@masar.health | Masar@2026! |
| Provider (SLP) | majed@masar.health | Masar@2026! |
| Content reviewer | reviewer@masar.health | Masar@2026! |
| Patient | National ID `1023456789` | one-time code (shown on screen while `demo_mode` is on) |

Turn `demo_mode` off in **Settings** before production and connect an SMS gateway.
