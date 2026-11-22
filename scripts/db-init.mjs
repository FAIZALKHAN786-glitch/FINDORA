import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://lostfound:lostfound@localhost:5432/lostfound',
});

try {
  for (const file of ['db/schema.sql', 'db/seed.sql']) {
    await pool.query(readFileSync(resolve(root, file), 'utf8'));
    console.log(`Applied ${file}`);
  }
} catch (error) {
  console.error(`Database init failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
