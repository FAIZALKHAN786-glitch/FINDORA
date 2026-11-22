# Postgres MVP rewrite — implementation plan

Spec: `docs/superpowers/specs/2026-11-22-lost-found-postgres-redesign-design.md`.

Global constraints: localhost only; $0; no Supabase; no secrets in frontend; every mutation authorized server-side; parameterized SQL; accessible, responsive, restrained motion.

## Task 1: Database foundation

- Add `docker-compose.yml` with `postgres:16-alpine` on port 5432 and named volume.
- Add `db/schema.sql` (users, sessions, items, indexes, status check) and `db/seed.sql` (the 5 authoritative demo rows, no reporter).
- Add `scripts/db-init.mjs` to apply both files with `pg`.
- Add a `node:test` test asserting schema/seed invariants and that `db-init.mjs` uses parameterized-free DDL execution only for local SQL files.
- Change `package.json` scripts: `dev` runs API + Vite concurrently, `db:init`, `test`, `server`.
- Expected: `npm test` passes with DB files in place; `npm run db:init` works when Docker is running.
- Commit: `feat: add local Postgres schema and seed`.

## Task 2: Express API

- Add Express app factory in `server/app.js` with JSON errors, cookie parsing, auth middleware, and routes from the spec.
- Use `pg` pool, `bcryptjs`, `multer` disk storage, random hashed session tokens, MIME/size validation, read-only `/uploads`.
- Add `server/index.js` listener on 3001.
- Add `node:test` smoke test covering signup → login → create item → owner-only claim/delete and the item filter predicate.
- Expected: `npm test` passes; API never returns password hashes or session tokens.
- Commit: `feat: add Express API with local auth and uploads`.

## Task 3: Frontend foundation and design system

- Remove `@supabase/supabase-js`; add `src/lib/api.js` and `src/lib/auth.jsx`.
- Rewrite `src/App.jsx` as a small router + layout with auth bootstrap and 15 s visibility-aware refetch hook.
- Add `src/components/` primitives: Button, Input, Field, Select, Textarea, StatusPill, Card, EmptyState, Spinner, Logo, Icon.
- Update `vite.config.js` proxy `/api` and `/uploads` to 3001; add Tailwind theme tokens in `tailwind.config.js` and base styles in `src/index.css`.
- Expected: `npm run build` succeeds with no Supabase imports.
- Commit: `feat: replace Supabase client with local API client and design system`.

## Task 4: Screens and flows

- Add `src/pages/Home.jsx`, `Report.jsx`, `Item.jsx`, `Mine.jsx`, `Login.jsx`.
- Preserve all current flows: browse/search/filter, report with photo, contact poster, claim, delete own listing.
- Use server errors in `aria-live` regions and visible loading/disabled states; no `alert()`/`confirm()`.
- Expected: `npm run build` succeeds; every route renders without runtime errors.
- Commit: `feat: rebuild frontend screens around the local API`.

## Task 5: Polish, docs, verification

- Add restrained entrance motion with `prefers-reduced-motion` support; keep it to opacity/transform, 150–300 ms.
- Rewrite `SETUP.md` and `.env.example` for Docker/Postgres; add `uploads/` to `.gitignore`.
- Manual browser pass on desktop + mobile, keyboard-only, reduced motion.
- Final: `npm test` and `npm run build` both pass.
- Commit: `docs: document local Postgres setup and polish UI`.
