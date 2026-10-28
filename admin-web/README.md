# Solar Maintenance — Admin Web

React 19 + TypeScript + Vite 8 + Tailwind 4 + React Router 7 + TanStack Query 5. Deployed to Cloudflare Pages.

## Run locally
```
npm install
npm run dev                 # http://localhost:3000, API from .env.development (http://localhost:5000)
```
Sign-in goes to the API (`POST /auth/login`); the API issues the tokens and checks the role. Only `admin` users get past the guard.
The session (access + refresh token) is kept in the browser's localStorage and refreshed automatically; sign-out revokes it at the API.

**Environment files** (every `VITE_` value is public — it is compiled into the page; never put secrets here):
| File | Used by | Contents |
|---|---|---|
| `.env.development` | `npm run dev` | `VITE_API_URL=http://localhost:5000`, `VITE_DEV_LOGIN=true` |
| `.env.development.local` | your machine only (git-ignored) | e.g. `VITE_API_URL=http://192.168.1.53:5000` |
| `.env.production` | `npm run build`, Cloudflare Pages | `VITE_DEV_LOGIN=false`; set `VITE_API_URL` in Pages. The build fails unless it is `https://` |

**Developer sign-in** (development only): the login page lists the active admin users from the API's `/dev/users` and signs in as the one you pick, without a password. It works only while the API runs in Development with `DevAuth:Enabled` against a local database (see `Solar_Api/backend/README.md`); production APIs reject dev tokens.

**Forgotten password:** another administrator cannot reset an admin password from the site; the operator runs the API's `create-admin` command again with a new password. Engineer passwords are set on the Engineers page.

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build to `dist/`
- `npx tsc -b` — type-check only
- `npm run lint` — oxlint
- `npm run e2e` — Playwright (starts the dev server itself; set `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` for the signed-in tests)

## Structure
```
src/lib/        api.ts (axios client, 401 → refresh), session.ts (tokens, refresh, logout), devAuth.ts, format.ts (dates, tones), invalidate.ts, useMe.ts, types.ts (DTOs + form sections)
src/app/        router.tsx (lazy routes), AdminShell.tsx (auth guard, layout)
src/components/ ui.tsx (buttons, inputs, table, modal, dialogs, badges, notices), SearchBox.tsx
src/features/   auth, dashboard, clients, engineers, reports, calendar, amc, defects, settings
public/_redirects   SPA fallback for Cloudflare Pages
```

## Deploy (Cloudflare Pages)
Project root `admin-web`, build command `npm run build`, output `dist`. Variable: `VITE_API_URL=https://<api host>`.
Add the Pages URL to the API's `Cors__AllowedOrigins__0`. Full steps: `Solar_Api/docs/deployment.md`.
