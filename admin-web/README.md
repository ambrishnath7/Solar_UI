# Solar Maintenance — Admin Web

React 19 + TypeScript + Vite 8 + Tailwind 4 + React Router 7 + TanStack Query 5. Deployed to Cloudflare Pages.

## Run locally
```
cp .env.example .env        # already done for dev; points at http://localhost:5182 (the API's launch profile)
npm install
npm run dev                 # http://localhost:5173
```
Login uses Supabase Auth (email + password) with the publishable key. The API then checks the user's row in `app_users`; only `admin` users get past the guard.

Local API note: while the API runs against the local `solar_dev` database, the Supabase auth user id must also exist in that local database. See `backend/README.md` → "Local development".

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build to `dist/`
- `npx tsc -b` — type-check only

## Structure
```
src/lib/        api.ts (axios + Supabase session), types.ts (DTOs + form section definitions)
src/app/        router.tsx (routes, admin guard, shell)
src/components/ ui.tsx (buttons, inputs, table, modal, dialogs, badges)
src/features/   auth, dashboard, clients, engineers, reports, calendar, amc, defects, settings
public/_redirects   SPA fallback for Cloudflare Pages
```

## Deploy (Cloudflare Pages)
Project root `admin-web`, build command `npm run build`, output `dist`. Variables: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Add the Pages URL to the API `Cors:AllowedOrigins` and to Supabase Auth redirect URLs.
