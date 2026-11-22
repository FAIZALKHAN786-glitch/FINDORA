# Campus Lost & Found — Postgres MVP redesign

## Intent

Build an MVP with **zero running cost** and no vendor dependency. Remove Supabase completely and replace it with a small Node API backed by plain Postgres. At the same time, turn the current plain Tailwind screens into a polished, accessible, responsive interface.

The person building this wants ownership and learning, not speed of setup. The app is a campus lost-and-found board used by tens of students, not a high-scale service.

## Goals

- Replace Supabase Auth with local username/password auth and cookie sessions.
- Replace Supabase's database with a plain Postgres schema, migrations, and seed data.
- Replace Supabase Storage with local disk uploads under a gitignored directory.
- Replace Supabase Realtime with a small refetch/poll loop.
- Redesign the whole UI with clear hierarchy, deliberate type and colour, responsive layout, useful feedback states, and restrained motion.
- Keep every current feature: browse/search/filter items, report an item with a photo, contact the poster, mark a lost item claimed, and manage/delete your own listings.

## Non-goals

- No public deployment or hosting in this phase; it runs on localhost for $0.
- No email sending, password reset, admin panel, AI matching, or messaging.
- No microservices, queues, or caching.
- No new paid service, even a free trial.

## Anti-goals

- No browser-to-Postgres connection. The browser only talks to our API over HTTP.
- No secrets in frontend code or committed files.
- No client-side-only validation; every input is rechecked on the server.

## Constraints

- Host machine is Windows with Node and npm available. Docker is optional; a local Postgres install also works.
- Existing stack stays: Vite 5, React 18, Tailwind 3. All current UI lives in `src/App.jsx` (~330 lines) and will be split up.
- The Supabase project currently holds 5 seed items. They must be exported into `db/seed.sql` before the switch.
- Budget is $0 for software and hosting at MVP stage.

### Builder-check answers

- The live Supabase project has no real accounts: 5 seed items, 0 photos, 0 reporters, and the temporary test user was deleted. A clean slate is acceptable. `supabase/seed.sql` is authoritative for the 5 demo rows.
- This Windows machine has no local Postgres install and no server on port 5432. Docker Desktop is installed but its daemon is not running. **Decision: start Docker Desktop and run the official `postgres:16-alpine` container via `docker-compose.yml`, with a named volume and `DATABASE_URL=postgres://lostfound:lostfound@localhost:5432/lostfound`.** PGlite was considered and rejected by the user.

## Approaches

1. **Local Node + Postgres in Docker (chosen).** Express + `pg` + a `postgres:16-alpine` container, bcrypt password hashes, httpOnly cookie sessions, `multer` disk uploads, refetch for freshness. Free, fully owned, roughly a few hundred lines of new backend. Cost: we own backups, security, and eventual hosting.
2. **Keep Supabase free tier, redesign UI only.** $0 today and much less code, but keeps the vendor dependency the user asked to remove and leaves free-tier limits in the path. Rejected.
3. **SQLite instead of Postgres.** Simplest possible MVP, but the user explicitly asked for Postgres. Rejected.

## Architecture

```mermaid
graph TD
  Browser["React SPA (Vite, localhost:3000)"] -->|"JSON + httpOnly cookie"| API["Express API (localhost:3001)"]
  API --> PG[("Postgres (localhost:5432)")]
  API --> Files[("uploads/ on disk")]
```

Vite proxies `/api` to the Express port so the browser only sees one origin.

## Backend design

- `db/schema.sql`: `users` (id, email unique, password_hash, full_name, created_at), `sessions` (token_hash, user_id, expires_at), `items` (id, title, description, category, status, location, lost_found_date, photo_url, reporter_id FK users, reporter_email, reporter_phone, created_at, updated_at). Status check allows `lost`, `found`, `claimed`, `returned`.
- `db/seed.sql`: the 5 current demo items, with no reporter.
- `scripts/db-init.mjs`: runs the two SQL files through `pg`, so no `psql` install is needed.
- Auth: `bcryptjs` for hashes; a random session token stored hashed in `sessions`, sent as an httpOnly, sameSite=lax cookie. `secure` only when deployed over HTTPS. Password rules: 8+ characters. Email validated server-side.
- Endpoints: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; `GET /api/items` (q, category, status filters), `GET /api/items/:id`, `POST /api/items` (multipart with optional photo), `PATCH /api/items/:id/claim`, `DELETE /api/items/:id`.
- Every query is parameterized. Reads are public; updates and deletes require `reporter_id = session user`. The API never returns password hashes or session tokens.
- Uploads: `multer` disk storage into `uploads/`, random filenames, MIME allowlist (jpeg/png/webp/gif), 5 MB limit, validated again on the server. Photos are served by a read-only route.
- Freshness: Home and Item refetch after mutations and every 15 seconds while visible. No WebSocket server.
- Errors: consistent JSON `{ error: message }`, 400/401/403/404/500, and one try/catch per route. No stack traces to the client.

## Frontend design

- Split the monolith into `src/lib/api.js`, `src/lib/auth.jsx`, `src/components/`, and `src/pages/` (Home, Report, Item, Mine, Login).
- Visual direction: **campus noticeboard, editorial and warm**. Warm off-white page, deep ink-navy text, one confident accent (indigo), generous whitespace, large tight-tracked headings, soft cards with thin borders, category chips, and clear status pills. No gradients everywhere, no glassmorphism overload, no emoji-as-icons.
- Typography: system font stack for $0 and no network call; distinct display and body scale, 1.5 line height for reading.
- Interaction: focus rings on every control, labels bound to inputs, keyboard-operable cards (real buttons), `aria-live` for messages, skeleton/empty/error states, confirm before delete, and visible loading states.
- Motion: 150–300 ms, opacity and transform only, short stagger on list entrance, respect `prefers-reduced-motion`. No animation on typing or high-frequency updates.
- Responsive: mobile-first single column, two-column cards on tablet, three on desktop; touch targets at least 44 px.

## Dependencies

Add: `express`, `pg`, `bcryptjs`, `multer`, `concurrently` (dev). Remove: `@supabase/supabase-js`. Keep React, React DOM, Vite, Tailwind, PostCSS, autoprefixer.

## Verification

- `npm run db:init` creates the schema and seed on a fresh local database.
- `npm run dev` starts API and Vite together.
- A small `node:test` smoke test covers signup → login → create item → only-owner delete, plus the filter predicate. No new test framework.
- Manual browser pass: sign up, report with photo, browse/filter, open detail, claim, delete, mobile viewport, reduced motion, keyboard-only navigation.
- Run `npm run build` at the end.

## What is left to the builder

Exact component breakdown, file names, Tailwind theme tokens, copy, and the order of implementation are builder decisions within this design.
