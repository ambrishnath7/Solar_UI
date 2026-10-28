# Solar Maintenance — Admin Web

React 19 + TypeScript + Vite 8 + Tailwind 4 + React Router 7 + TanStack Query 5. Deployed to Cloudflare Pages.

## Run locally
```
cp .env.example .env        # VITE_API_URL=http://localhost:5000 (the API's Development launch profile)
npm install
npm run dev                 # http://localhost:3000
```
Login uses Supabase Auth (email + password) with the publishable key. The API then checks the user's row in `app_users`; only `admin` users get past the guard.

**Developer sign-in** (local testing only): set `VITE_DEV_LOGIN=true` in `.env`. The login page then lists the active admin users from the API's `/dev/users` and signs in as the one you pick, without a Supabase password. It works only while the API runs in Development with `DevAuth:Enabled` against a local database (see `backend/README.md`); production APIs reject dev tokens.

Local API note: for a real Supabase login while the API uses the local `solar_dev` database, that Supabase user id must also exist in the local database (`auth.users` stub + `app_users`).

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build to `dist/`
- `npx tsc -b` — type-check only
- `npm run lint` — oxlint
- `npm run e2e` — Playwright (starts the dev server itself; set `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` for the signed-in tests)

## Structure
```
src/lib/        api.ts (axios + Supabase/dev session), devAuth.ts, format.ts (dates, tones), invalidate.ts, useMe.ts, types.ts (DTOs + form sections)
src/app/        router.tsx (lazy routes), AdminShell.tsx (auth guard, layout)
src/components/ ui.tsx (buttons, inputs, table, modal, dialogs, badges, notices), SearchBox.tsx
src/features/   auth, dashboard, clients, engineers, reports, calendar, amc, defects, settings
public/_redirects   SPA fallback for Cloudflare Pages
```

## Deploy (Cloudflare Pages)
Project root `admin-web`, build command `npm run build`, output `dist`. Variables: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Add the Pages URL to the API `Cors:AllowedOrigins` and to Supabase Auth redirect URLs.
