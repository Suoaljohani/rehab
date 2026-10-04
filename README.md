# مَسار — Medical Rehabilitation Digital Platform

منصة رقمية متكاملة لإدارة رحلة المراجع التأهيلية: تربط الجلسات الحضورية بالبرنامج المنزلي، وتمكّن المراجع من أداء خطته اليومية بالفيديو، وتمكّن مقدم الرعاية من المتابعة والتواصل والتعديل، وتوفر للإدارة أدوات التشغيل والتوزيع والحوكمة والقياس.

## Stack
- **Next.js 15** (App Router, Server Actions, RSC) · TypeScript · Tailwind CSS v4
- **Supabase** — Postgres, Auth, Row-Level Security, private Storage
- **Vercel** — hosting

## Design system
Live reference at `/design-system`. Tokens live in `src/app/globals.css`, components in `src/components/ui`.

## Local development
```bash
cp .env.example .env.local   # fill Supabase URL + publishable key
npm install
npm run dev
```
