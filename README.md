# مَسار — Medical Rehabilitation Digital Platform

منصة رقمية متكاملة لإدارة رحلة المراجع التأهيلية: تربط الجلسات الحضورية بالبرنامج المنزلي، وتمكّن المراجع من أداء خطته اليومية بالفيديو، وتمكّن مقدم الرعاية من المتابعة والتواصل والتعديل، وتوفر للإدارة أدوات التشغيل والتوزيع والحوكمة والقياس.

Arabic-first (RTL), calm premium-wellness visual identity, governed by the database rather than the UI.

## What is in the box

| Area | Entry | Built for | Highlights |
|---|---|---|---|
| Public portal | `/` | Everyone | Services, «ابدأ رحلتك» wizard, appointment request + tracking, patient guide, FAQ, contact, privacy |
| Patient experience | `/patient` | Mobile-first | «اليوم» daily plan, guided session player (video, hold timer, feeling + pain), weekly plan, progress, appointments + change requests, secure messages, care team, preferences |
| Provider workspace | `/provider` | Desktop-first | «يومي» attention centre, caseload, full patient record (journey, sessions, program, outcomes, goals, notes), versioned program builder, exercise library, calendar, inbox |
| Command center | `/admin` | Operations | KPIs, patient registration with duplicate check, assignment board (drag & drop), team + capacity, appointment centre, Exercise Studio (review with separation of duties), program templates, communications, reports + CSV, website CMS, settings, roles matrix, audit log |
| Design system | `/design-system` | Designers & devs | Living reference for tokens and every component |

## Visual identity
Deep Slate Blue `#44556B` (primary) · Midnight Ink `#29323D` (hover/depth) · Soft Sage `#97A88B` (progress) · Clay Beige `#C98D6B` (sparing accents) · Sand Mist `#E6D5C7` · Warm Ivory `#F7F3EE` (page).
Tokens live in `src/app/globals.css`; components in `src/components/ui`. No teal, cyan, neon, harsh gradients or glassmorphism.

## Sign-in
- **Patients** enter their **national ID / Iqama number** (10 digits; Arabic or Latin digits both work), then a one-time code sent to the phone registered with the department. The national ID is required and unique at registration.
- **Staff** accounts exist only when an admin creates them in **فريق التأهيل → موظف جديد** with the employee's work email and a temporary password. There is no self sign-up. At first sign-in, and after any admin reset, the employee must choose their own password before any patient data is reachable.

## Hospital identity
Upload the hospital's official logo in **إدارة الموقع → هوية المستشفى** (SVG preferred, PNG/WEBP accepted, up to 1 MB). It appears beside the مَسار platform mark on the public site, sign-in screens, staff workspace and patient app. SVG files are checked and rejected if they contain scripts or external references, and the logo is served from the site's own domain.

## Stack
- **Next.js 15** (App Router, RSC, Server Actions) · React 19 · TypeScript · Tailwind CSS v4
- **Supabase** — Postgres, Auth (national ID / Iqama + OTP for patients; admin-issued work email + password with forced first-login change and optional TOTP MFA for staff), Row-Level Security, private Storage with signed URLs
- **Vercel** — hosting

## Security model (summary)
- **RLS on every table.** Access = role + scope: providers see only episodes where they are an active care-team member; patients see only their own data and never internal notes or draft programs.
- **State changes go through `security definer` RPCs** that re-check authorization, run in one transaction, and write the timeline, notifications and audit trail. Direct status updates are blocked.
- **Nothing clinical is deleted.** Drafts are discarded, exercises archived, notes revised, accounts disabled, audit events append-only.
- **Staff policy is enforced server-side**: idle timeout and the optional MFA requirement (`Settings`).

Details: [`supabase/README.md`](supabase/README.md).

## Demo access
| Role | Login | Secret |
|---|---|---|
| Department admin | admin@masar.health | `Masar@2026!` |
| Supervisor | supervisor@masar.health | `Masar@2026!` |
| Physiotherapist | noura@masar.health | `Masar@2026!` |
| Content reviewer | reviewer@masar.health | `Masar@2026!` |
| Patient (knee rehab) | National ID `1023456789` | One-time code shown on screen while `demo_mode` is on |

More accounts and patients are listed in `supabase/README.md`.

## Local development
```bash
cp .env.example .env.local   # Supabase URL + publishable key
npm install
npm run dev                  # http://localhost:3000
npm run typecheck
```

## Database
```text
supabase/migrations/   schema, RLS, RPCs, storage, audit triggers (apply in filename order)
supabase/seed/         demo dataset (01 → 05, after migrations)
```

## Deploy to Vercel
1. In Vercel, choose **Add New → Project** and import `suoaljohani/rehab`. The framework is detected as Next.js; no build settings need changing.
2. Add these environment variables for Production and Preview:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://jvquffyuzhjjdbljtzan.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's publishable key |
   | `NEXT_PUBLIC_SITE_URL` | the production URL, e.g. `https://rehab.vercel.app` |

3. Deploy. Every push to `main` redeploys.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the production URL.

## Before going live
- Disable public sign-ups in Supabase **Authentication → Providers → Email**. Accounts are created only by admins.
- Enable **leaked password protection** in Supabase **Authentication → Password security**.
- Connect an SMS gateway for patient one-time codes, then turn **وضع العرض** off in `/admin/settings`.
- Turn on **إلزام الموظفين بالتحقق الثنائي** in `/admin/settings` once staff have enrolled.
- Replace the seeded demo staff passwords, or disable those accounts.
- Upload real exercise videos in Exercise Studio. The bucket is private and served via short-lived signed URLs.

---
<sub>Powered by **JqAlshalan**</sub>
