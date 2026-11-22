import pg from 'pg';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createStore } from './store.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uploadsDir = resolve(root, 'uploads');
mkdirSync(uploadsDir, { recursive: true });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://lostfound:lostfound@localhost:5432/lostfound',
});
const app = createApp({ store: createStore(pool), uploadsDir });
const port = Number(process.env.PORT || 3001);

app.listen(port, '127.0.0.1', () => console.log(`API listening on http://localhost:${port}`));
