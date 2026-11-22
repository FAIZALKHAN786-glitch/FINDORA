# Campus Lost & Found — setup

Everything runs on your machine. The browser talks only to the local Express API, and the API talks only to a local Postgres container. No cloud account, hosted database or public URL is needed.

## 1. Prerequisites

- Docker Desktop (Linux containers) running
- Node.js 20+ and npm

Check Docker is ready:

```powershell
docker info
```

## 2. Install dependencies

```powershell
npm install
```

## 3. Configure the environment (optional)

The defaults in `.env.example` already match `docker-compose.yml`, so you can skip this step. If you want explicit values:

```powershell
copy .env.example .env
```

`DATABASE_URL` points the API and the init script at the local database. `PORT` is the API port (default `3001`). Nothing here is exposed to the browser.

## 4. Start Postgres

```powershell
docker compose up -d
```

This starts `postgres:16-alpine` on `localhost:5432` with a named volume so your data survives container restarts.

## 5. Create the schema and seed data

```powershell
npm run db:init
```

This applies `db/schema.sql` and `db/seed.sql`. The schema is idempotent; the seed inserts the five demo notices. To start completely fresh, run `docker compose down -v`, then repeat steps 4 and 5.

## 6. Run the app

```powershell
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Uploaded photos: stored in `uploads/`, served read-only at `/uploads`

`npm run dev` starts both processes. You can also run `npm run server` and `npx vite` in separate terminals.

## Checks

```powershell
npm test        # API flow + file/contract checks
npm run build   # production bundle
```

## What works

- **Home**: browse lost/found items with search, category and status filters; the board refreshes every 15 seconds while the tab is visible.
- **Account**: create an account or sign in; a hashed, httpOnly cookie keeps the session on this machine.
- **Report**: post an item with title, category, location, date, description, optional phone and optional photo.
- **Item detail**: one-tap email/phone contact; the poster can mark an open item claimed.
- **My items**: see your notices, open them, or delete them with an inline confirmation.

## Notes and limits

- No email is sent. Contact links open the visitor's own mail/phone app.
- Photo uploads are limited to JPG, PNG, WEBP or GIF, up to 5 MB.
- Sessions last seven days and are stored as hashes in the database.
- This is an localhost-only MVP: no public deployment, no admin panel, no realtime socket and no AI matching.

## Troubleshooting

- **`ECONNREFUSED` on `npm run db:init`**: Docker Desktop is not running or the container is still starting. Run `docker compose up -d` again and retry.
- **Port already in use**: stop whatever owns `5432` or `3000`/`3001`, or change the matching values in `docker-compose.yml` / `.env`.
- **Blank board after a fresh init**: confirm `npm run db:init` printed `Applied db/schema.sql` and `Applied db/seed.sql`.
