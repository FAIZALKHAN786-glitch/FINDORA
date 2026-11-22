import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createStore } from '../server/store.js';
import { createEmbedder } from '../server/embedder.js';
import { buildItemText } from '../server/match.js';

const { Pool } = pg;

export async function runBackfill({ store, embedder }) {
  const items = await store.listItemsNeedingEmbedding(embedder.model);
  for (const item of items) {
    const vector = await embedder.embed(buildItemText(item));
    await store.upsertEmbedding(item.id, { model: embedder.model, vector });
  }
  return { indexed: items.length };
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://lostfound:lostfound@localhost:5432/lostfound',
  });
  try {
    const { indexed } = await runBackfill({ store: createStore(pool), embedder: createEmbedder() });
    console.log(`Indexed ${indexed} item(s) for AI matching.`);
  } catch (error) {
    console.error(`AI backfill failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
