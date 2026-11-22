# Findora AI Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local AI-powered “Ask Findora” panel that turns a plain-language description into a short list of likely lost-and-found matches.

**Architecture:** A small local sentence-embedding model converts item text and user queries into vectors. Postgres stores one vector per item as `jsonb`; Node computes cosine similarity and returns ranked candidates with deterministic reasons. The existing Express API and React Home page gain one endpoint and one panel; no service, key, or public deployment is added.

**Tech Stack:** Node 20+, Express 4, Postgres 16, React 18 + Vite 5, `@huggingface/transformers` 4.3.2, `pg`, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-22-findora-ai-match-design.md`

## Global Constraints

- localhost-only, $0 MVP; no public deployment, no API keys, no external AI service at runtime.
- One new dependency only: `@huggingface/transformers@^4.3.2`. Do not add pgvector, a vector DB, or a second model package.
- Embedding model: `Xenova/all-MiniLM-L6-v2`, `dtype: 'q8'`, `pooling: 'mean'`, `normalize: true`, 384 dimensions.
- `AI_MODEL_VERSION = 'findora-minilm-v1'` is stored in the database; vectors from other versions are never ranked.
- `POST /api/ai/match` accepts a 3–300 character query, returns at most 5 matches, and drops scores below `0.35`.
- All SQL is parameterized; existing auth, ownership checks, validation, and security headers remain unchanged.
- Copy rules: “Ask Findora”, “Possible matches”, “AI suggestions”, “Browse all”. Never say “found your item” or imply certainty.
- Node 20+ and npm; browser talks only to the local Express API.

## Review Focus

- **Missing or stale embeddings:** an item with no vector, or a vector from an older model, must not be ranked and must be re-indexed — covered by Task 2 store methods, Task 3 `rankMatches` filter, and Task 5 backfill.
- **Invalid query length:** 2-character and 301-character queries must return 400 before any model work — Task 4.
- **Model failure during report:** if embedding fails, no item may be created — Task 2 transaction rollback test and Task 4 endpoint failure test.
- **Weak or irrelevant result:** a low-similarity item must not appear as a suggestion — Task 3 threshold test.
- **Abuse of the free local model:** the 31st request in 15 minutes from one IP must return 429 — Task 4.

---

### Task 1: Local embedder and dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `SETUP.md`
- Create: `server/embedder.js`
- Test: `test/ai-match.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `AI_MODEL_VERSION: string` — constant `'findora-minilm-v1'`.
  - `createEmbedder(): { model: string, embed(text: string): Promise<number[]> }` — lazy local model loader.

- [ ] **Step 1: Write the failing contract test**

Add to `test/ai-match.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('embedder uses one local quantized model with a local cache', () => {
  const pkg = JSON.parse(read('package.json'));
  const src = read('server/embedder.js');
  assert.equal(pkg.dependencies['@huggingface/transformers'], '^4.3.2');
  assert.match(src, /Xenova\/all-MiniLM-L6-v2/);
  assert.match(src, /dtype:\s*['"]q8['"]/);
  assert.match(src, /pooling:\s*['"]mean['"]/);
  assert.match(src, /normalize:\s*true/);
  assert.match(src, /FINDORA_MODEL_CACHE/);
  assert.doesNotMatch(src, /https?:\/\/api\./);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/ai-match.test.mjs`
Expected: FAIL because `server/embedder.js` does not exist.

- [ ] **Step 3: Install the dependency**

Run: `npm install @huggingface/transformers@^4.3.2`
Expected: package.json and package-lock.json updated with exactly `^4.3.2`.

- [ ] **Step 4: Implement `server/embedder.js`**

Export `AI_MODEL_VERSION = 'findora-minilm-v1'`. Import `pipeline` and `env` from `@huggingface/transformers`. Set `env.cacheDir = process.env.FINDORA_MODEL_CACHE || './.cache/findora-models'` at module load. Keep one module-level pipeline promise; create it on first `embed()` call with `pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' })`. `embed(text)` calls the pipeline with `{ pooling: 'mean', normalize: true }` and returns `result.tolist()[0]` as a plain number array. Log one line on first load: `Loading local AI model (first run downloads model files).`

- [ ] **Step 5: Add cache and setup notes**

Add `.cache/findora-models/` to `.gitignore`. In `SETUP.md`, add a note after the install step: the first AI match or index run downloads the local model into `.cache/findora-models`; later runs are offline.

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test test/ai-match.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore SETUP.md server/embedder.js test/ai-match.test.mjs
git commit -m "feat(ai): add local embedding helper"
```

---

### Task 2: Embedding storage and transactional item insert

**Files:**
- Modify: `db/schema.sql`
- Modify: `server/store.js`
- Modify: `test/db-files.test.mjs`
- Test: `test/ai-match.test.mjs`

**Interfaces:**
- Consumes: `AI_MODEL_VERSION` only as a caller-supplied string; the store itself does not import the embedder.
- Produces:
  - `store.insertItem(data, embedding)` — `embedding` is `{ model: string, vector: number[] } | null`; inserts item and embedding in one transaction; returns the item row.
  - `store.listMatchCandidates(model)` — returns open item rows joined to current-model embeddings, each with `embedding` and `model` fields.
  - `store.listItemsNeedingEmbedding(model)` — returns item rows whose embedding is missing or has a different `model`.
  - `store.upsertEmbedding(itemId, embedding)` — inserts or updates one embedding row.

- [ ] **Step 1: Write the failing tests**

Add to `test/db-files.test.mjs` inside the existing schema test:

```js
assert.match(schema, /CREATE TABLE IF NOT EXISTS item_embeddings/i);
assert.match(schema, /item_id uuid primary key references items\(id\) on delete cascade/i);
assert.match(schema, /model text not null/i);
assert.match(schema, /embedding jsonb not null/i);
```

Add to `test/ai-match.test.mjs`:

```js
import { createStore } from '../server/store.js';

test('insertItem commits the item and its embedding together', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (/insert into items/i.test(sql)) return { rows: [{ id: 'item-1' }] };
      return { rows: [] };
    },
    release() {},
  };
  const store = createStore({ connect: async () => client });
  const item = await store.insertItem(
    { title: 'Blue notebook' },
    { model: 'findora-minilm-v1', vector: [0.1, 0.2] },
  );
  assert.equal(item.id, 'item-1');
  assert.deepEqual(calls.map((call) => call.sql.trim().split(/\s+/)[0].toLowerCase()), ['begin', 'insert', 'insert', 'commit']);
  assert.match(calls[2].sql, /insert into item_embeddings/i);
  assert.deepEqual(calls[2].params, ['item-1', 'findora-minilm-v1', '[0.1,0.2]']);
});

test('insertItem rolls back when embedding insert fails', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql.trim().split(/\s+/)[0].toLowerCase());
      if (/insert into items/i.test(sql)) return { rows: [{ id: 'item-1' }] };
      if (/insert into item_embeddings/i.test(sql)) throw new Error('embedding failed');
      return { rows: [] };
    },
    release() {},
  };
  const store = createStore({ connect: async () => client });
  await assert.rejects(
    store.insertItem({ title: 'Blue notebook' }, { model: 'findora-minilm-v1', vector: [0.1] }),
    /embedding failed/,
  );
  assert.deepEqual(calls, ['begin', 'insert', 'insert', 'rollback']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/db-files.test.mjs test/ai-match.test.mjs`
Expected: FAIL because `item_embeddings` and the new store methods do not exist.

- [ ] **Step 3: Add the schema table**

Append to `db/schema.sql`:

```sql
create table if not exists item_embeddings (
  item_id uuid primary key references items(id) on delete cascade,
  model text not null,
  embedding jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists item_embeddings_model_idx on item_embeddings (model);
```

- [ ] **Step 4: Implement the store methods**

In `server/store.js`, change `insertItem` to accept `(data, embedding)`. If `embedding` is null, keep the current single insert behavior. Otherwise call `db.connect()`, run `begin`, insert the item returning the row, insert the embedding with `JSON.stringify(embedding.vector)` as the `jsonb` parameter, `commit`, return the item; on any error run `rollback`, release the client, and rethrow. Always release in `finally`.

Add `listMatchCandidates(model)` with a parameterized join:

```sql
select i.*, e.model, e.embedding
  from items i join item_embeddings e on e.item_id = i.id
 where i.status in ('lost', 'found') and e.model = $1
 order by i.created_at desc
```

Add `listItemsNeedingEmbedding(model)` using a left join where `e.item_id is null or e.model <> $1`. Add `upsertEmbedding(itemId, embedding)` using `insert ... on conflict (item_id) do update set model = excluded.model, embedding = excluded.embedding, updated_at = now()`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/db-files.test.mjs test/ai-match.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add db/schema.sql server/store.js test/db-files.test.mjs test/ai-match.test.mjs
git commit -m "feat(ai): store item embeddings transactionally"
```

---

### Task 3: Pure ranking and reason logic

**Files:**
- Create: `server/match.js`
- Test: `test/ai-match.test.mjs`

**Interfaces:**
- Consumes: nothing beyond plain objects and arrays.
- Produces:
  - `MATCH_LIMIT = 5`
  - `MIN_SCORE = 0.35`
  - `buildItemText(item: object): string`
  - `cosine(a: number[], b: number[]): number`
  - `matchReasons(item: object, query: string): string[]`
  - `rankMatches(rows, queryVector, { query, model, limit = MATCH_LIMIT, minScore = MIN_SCORE }): Array<{ item: object, score: number, reasons: string[] }>`

- [ ] **Step 1: Write the failing tests**

Add to `test/ai-match.test.mjs`:

```js
import { buildItemText, cosine, matchReasons, rankMatches } from '../server/match.js';

test('buildItemText uses title, description, category, location and date', () => {
  const text = buildItemText({
    title: 'Campus ID card',
    description: 'Blue student ID',
    category: 'ID & Documents',
    location: 'Cafeteria, Building A',
    lost_found_date: '2026-11-10',
  });
  assert.equal(text, 'Campus ID card. Blue student ID. Category: ID & Documents. Location: Cafeteria, Building A. Date: 2026-11-10');
});

test('cosine ranks aligned vectors above orthogonal vectors and skips stale models', () => {
  const rows = [
    { id: 'stale', model: 'old-model', embedding: [1, 0] },
    { id: 'far', model: 'findora-minilm-v1', embedding: [0, 1] },
    { id: 'near', model: 'findora-minilm-v1', embedding: [0.9, Math.sqrt(0.19)] },
  ];
  const matches = rankMatches(rows, [1, 0], { query: 'campus id', model: 'findora-minilm-v1' });
  assert.deepEqual(matches.map((match) => match.item.id), ['near']);
  assert.ok(matches[0].score > 0.8);
  assert.equal('embedding' in matches[0].item, false);
});

test('matchReasons describes category, location, date and description overlap', () => {
  const reasons = matchReasons({
    title: 'Campus ID card',
    description: 'Blue student ID',
    category: 'ID & Documents',
    location: 'Cafeteria, Building A',
    lost_found_date: '2026-11-10',
  }, 'campus id card cafeteria documents Tuesday');
  assert.ok(reasons.includes('similar category: ID & Documents'));
  assert.ok(reasons.includes('mentions Cafeteria, Building A'));
  assert.ok(reasons.includes('date matches'));
  assert.ok(reasons.includes('description overlap'));
});

test('cosine returns zero for a zero vector', () => {
  assert.equal(cosine([0, 0], [1, 1]), 0);
});

test('rankMatches returns at most five matches', () => {
  const rows = Array.from({ length: 8 }, (_, index) => ({
    id: String(index),
    model: 'findora-minilm-v1',
    embedding: [1, index / 100],
  }));
  const matches = rankMatches(rows, [1, 0], { query: 'campus card', model: 'findora-minilm-v1' });
  assert.equal(matches.length, 5);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/ai-match.test.mjs`
Expected: FAIL because `server/match.js` does not exist.

- [ ] **Step 3: Implement `server/match.js`**

`buildItemText` uses exactly `[title, description, 'Category: ' + category, 'Location: ' + location, 'Date: ' + lost_found_date].filter(Boolean).join('. ')`.

`cosine` returns 0 when either norm is 0.

`matchReasons` lowercases the query and emits, in this order: `similar category: ${category}` when the lowercased category appears in the query or any category token longer than 2 chars appears; `mentions ${location}` when any location token longer than 3 chars appears; `date matches` when the query contains the ISO date, the weekday long/short name for that date (UTC), or `Month D` / `Mon D` text; `description overlap` when any title/description token of length 4+ not in `['the','and','for','with','left','found','lost','item','please','someone']` appears. Return the unique strings.

`rankMatches` filters rows to `row.model === model`, computes `cosine(row.embedding, queryVector)`, drops scores below `minScore`, sorts descending, slices to `limit`, and returns `{ item, score, reasons: matchReasons(item, query) }` where `item` is the row without `embedding` and `model`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/ai-match.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/match.js test/ai-match.test.mjs
git commit -m "feat(ai): add local match ranking"
```

---

### Task 4: API endpoint and report-time embedding

**Files:**
- Modify: `server/app.js`
- Modify: `test/api.test.mjs`
- Test: `test/ai-match.test.mjs`

**Interfaces:**
- Consumes: `createEmbedder` and `AI_MODEL_VERSION` from Task 1; `buildItemText` and `rankMatches` from Task 3; store methods from Task 2.
- Produces:
  - `createApp({ store, uploadsDir, embedder, sessionTtlMs })` — `embedder` defaults to `createEmbedder()`.
  - `POST /api/ai/match` — JSON `{ query }`, response `{ matches }`.
  - `createRateLimit({ windowMs, limit, message })` — internal helper used by auth and AI routes.

- [ ] **Step 1: Write the failing tests**

Add to `test/ai-match.test.mjs`:

```js
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { createApp } = await import('../server/app.js');

function aiFakeStore() {
  const items = [
    { id: '1', title: 'Near', category: 'Bags', status: 'lost', embedding: [1, 0], model: 'fake-model-v1' },
    { id: '2', title: 'Far', category: 'Books', status: 'lost', embedding: [0.5, Math.sqrt(0.75)], model: 'fake-model-v1' },
  ];
  return {
    listMatchCandidates: async () => items,
    insertItem: async (data, embedding) => ({ ...data, id: 'new', embedding }),
  };
}

async function startAiApp(t, embedder = { model: 'fake-model-v1', embed: async () => [1, 0] }) {
  const uploadsDir = await mkdtemp(join(tmpdir(), 'findora-ai-'));
  const app = createApp({ store: aiFakeStore(), uploadsDir, embedder });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(uploadsDir, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${server.address().port}`;
}

const matchRequest = (base, query) => fetch(`${base}/api/ai/match`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query }),
});

test('AI match validates query length', async (t) => {
  const base = await startAiApp(t);
  assert.equal((await matchRequest(base, 'ab')).status, 400);
  assert.equal((await matchRequest(base, 'a'.repeat(301))).status, 400);
});

test('AI match returns ranked candidates without embedding data', async (t) => {
  const base = await startAiApp(t);
  const response = await matchRequest(base, 'black bag');
  assert.equal(response.status, 200);
  const { matches } = await response.json();
  assert.deepEqual(matches.map((match) => match.item.id), ['1', '2']);
  assert.equal('embedding' in matches[0].item, false);
});

test('AI match is rate limited at 30 requests per 15 minutes', async (t) => {
  const base = await startAiApp(t);
  for (let i = 0; i < 30; i += 1) assert.equal((await matchRequest(base, 'black bag')).status, 200);
  const limited = await matchRequest(base, 'black bag');
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});

test('reporting an item passes the generated embedding to the store', async (t) => {
  const uploadsDir = await mkdtemp(join(tmpdir(), 'findora-ai-create-'));
  const store = {
    ...aiFakeStore(),
    findUserByEmail: async () => null,
    createUser: async ({ email, fullName, passwordHash }) => ({ id: '1', email, full_name: fullName, password_hash: passwordHash }),
    createSession: async () => {},
    findSessionUser: async () => ({ id: '1', email: 'owner@example.edu', full_name: 'Owner' }),
    deleteSession: async () => {},
  };
  const app = createApp({ store, uploadsDir, embedder: { model: 'fake-model-v1', embed: async () => [0.4, 0.9] } });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(uploadsDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const form = new FormData();
  form.set('title', 'Black backpack');
  form.set('category', 'Bags');
  form.set('status', 'found');
  const response = await fetch(`${base}/api/items`, {
    method: 'POST',
    headers: { cookie: 'lf_session=fake' },
    body: form,
  });
  assert.equal(response.status, 201);
  assert.deepEqual((await response.json()).embedding, { model: 'fake-model-v1', vector: [0.4, 0.9] });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/ai-match.test.mjs`
Expected: FAIL because `/api/ai/match` is not registered and item creation does not embed.

- [ ] **Step 3: Refactor the rate limiter in `server/app.js`**

Replace `authHits`/`authRateLimit` with `createRateLimit({ windowMs, limit, message })` returning an Express middleware. Keep the exact 401-adjacent behavior: 429 JSON `{ error: message }` plus a positive `Retry-After`. Configure auth with `AUTH_WINDOW_MS`, `AUTH_LIMIT`, and `'Too many attempts. Try again later.'`. Add `AI_WINDOW_MS = 15 * 60 * 1000` and `AI_LIMIT = 30`, with message `'Too many searches. Try again later.'`.

- [ ] **Step 4: Add the AI endpoint**

Import `createEmbedder`, `AI_MODEL_VERSION`, `buildItemText`, and `rankMatches`. Change `createApp` to accept an optional `embedder`, defaulting to `createEmbedder()`. Register `POST /api/ai/match` with the AI rate limiter: validate `text(req.body?.query)` is 3–300 chars, otherwise throw `HttpError(400, 'Describe the item in 3–300 characters.')`; call `embedder.embed(query)`; call `store.listMatchCandidates(embedder.model)`; respond with `rankMatches(rows, vector, { query, model: embedder.model })`.

- [ ] **Step 5: Embed on item creation**

In `POST /api/items`, after existing validation, compute `embedding = { model: embedder.model, vector: await embedder.embed(buildItemText(data)) }` and call `store.insertItem(data, embedding)`.

- [ ] **Step 6: Keep the existing API test working**

In `test/api.test.mjs`, update `start(store, uploadsDir, embedder = { model: 'fake-model-v1', embed: async () => [1, 0] })` and pass `embedder` to `createApp`. Change fake `insertItem(data, embedding)` to spread `embedding` onto the returned item. Keep all existing assertions unchanged.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test test/ai-match.test.mjs test/api.test.mjs test/security.test.mjs`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/app.js test/ai-match.test.mjs test/api.test.mjs
git commit -m "feat(ai): add local match endpoint"
```

---

### Task 5: Backfill script and setup docs

**Files:**
- Modify: `package.json`
- Modify: `SETUP.md`
- Create: `scripts/ai-backfill.mjs`
- Test: `test/ai-match.test.mjs`

**Interfaces:**
- Consumes: store methods from Task 2, `buildItemText` from Task 3, `AI_MODEL_VERSION` and `createEmbedder` from Task 1.
- Produces: `runBackfill({ store, embedder }): Promise<{ indexed: number }>`; `npm run ai:index`.

- [ ] **Step 1: Write the failing test**

Add to `test/ai-match.test.mjs`:

```js
import { runBackfill } from '../scripts/ai-backfill.mjs';

test('backfill embeds only rows needing a current vector', async () => {
  const embedded = [];
  const upserted = [];
  const result = await runBackfill({
    store: {
      listItemsNeedingEmbedding: async (model) => {
        assert.equal(model, 'findora-minilm-v1');
        return [{ id: '1', title: 'Campus ID card', location: 'Cafeteria' }];
      },
      upsertEmbedding: async (...args) => upserted.push(args),
    },
    embedder: {
      model: 'findora-minilm-v1',
      embed: async (text) => { embedded.push(text); return [1, 0]; },
    },
  });
  assert.deepEqual(result, { indexed: 1 });
  assert.match(embedded[0], /Campus ID card/);
  assert.deepEqual(upserted, [['1', { model: 'findora-minilm-v1', vector: [1, 0] }]]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/ai-match.test.mjs`
Expected: FAIL because `scripts/ai-backfill.mjs` does not exist or does not export `runBackfill`.

- [ ] **Step 3: Implement the script**

`scripts/ai-backfill.mjs` imports `pg`, `createStore`, `createEmbedder`, `AI_MODEL_VERSION`, and `buildItemText`. Export `runBackfill({ store, embedder })`: get rows from `store.listItemsNeedingEmbedding(embedder.model)`, embed each `buildItemText(row)`, call `store.upsertEmbedding(row.id, { model: embedder.model, vector })`, and return `{ indexed: rows.length }`. Do not create a Pool at module top level. Add a CLI guard using `process.argv[1]` compared with `fileURLToPath(import.meta.url)` that creates the Pool from `DATABASE_URL`, runs `runBackfill({ store: createStore(pool), embedder: createEmbedder() })`, logs `Indexed N item(s) for AI matching.`, and closes the pool.

- [ ] **Step 4: Add the package script and setup step**

Add `"ai:index": "node scripts/ai-backfill.mjs"` to `package.json`. In `SETUP.md`, insert a step after `npm run db:init`:

```powershell
npm run ai:index
```

Explain that this creates vectors for demo and restored rows, and may download the local model once. Update the “What works” section to mention AI matching and the “Notes and limits” section to remove “no AI matching”.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/ai-match.test.mjs test/db-files.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json SETUP.md scripts/ai-backfill.mjs test/ai-match.test.mjs
git commit -m "feat(ai): add embedding backfill script"
```

---

### Task 6: Ask Findora panel

**Files:**
- Modify: `src/lib/api.js`
- Modify: `src/pages/Home.jsx`
- Modify: `test/frontend-contract.test.mjs`
- Modify: `test/pages.test.mjs`

**Interfaces:**
- Consumes: `POST /api/ai/match` response shape from Task 4.
- Produces: `api.matchItems(query): Promise<{ matches: Array<{ item: object, score: number, reasons: string[] }> }>`.

- [ ] **Step 1: Write the failing contract tests**

In `test/frontend-contract.test.mjs`, add `/api/ai/match` to the route list in the API-client test.

In `test/pages.test.mjs`, add:

```js
test('home offers local AI matching alongside normal filters', () => {
  const home = page('Home');
  for (const text of ['Ask Findora', 'api.matchItems', 'Possible matches', 'AI suggestions', 'Browse all']) {
    assert.ok(home.includes(text), `Home must include ${text}`);
  }
  assert.doesNotMatch(home, /found your item/i);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/frontend-contract.test.mjs test/pages.test.mjs`
Expected: FAIL because `api.matchItems` and the panel copy are absent.

- [ ] **Step 3: Add the API client method**

In `src/lib/api.js`, add:

```js
matchItems: (query) => request('/api/ai/match', { method: 'POST', json: { query } }),
```

- [ ] **Step 4: Implement the Home panel**

In `src/pages/Home.jsx`, add state `aiQuery`, `aiMatches`, `aiLoading`, `aiError`, and `aiSearched`. Add a `findMatches()` handler that clears prior results, sets loading, calls `api.matchItems(aiQuery)`, sets `aiMatches`, and handles errors with `role="alert"`. Add a `<Card>` above the existing search/filter card containing heading `Ask Findora`, an `<Input label="Describe what you lost">`, a `<Button>Find matches</Button>`, three example buttons that set `aiQuery` (`Black backpack, bus stop`, `Campus ID, Tuesday`, `Earbuds, library`), and a `Browse all` button that clears AI state without changing normal filters. When `aiSearched`, show `Possible matches` and render `ItemCard` for each match with a footer showing `${Math.round(score * 100)}% similar` and one line per reason. Show an empty state when `aiMatches` is empty and `aiLoading` is false. Include the exact phrase `AI suggestions` in a visible note. Keep the existing search/filter card and results section unchanged and below this panel. Use existing components and classes; do not add a new component file or dependency.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/frontend-contract.test.mjs test/pages.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api.js src/pages/Home.jsx test/frontend-contract.test.mjs test/pages.test.mjs
git commit -m "feat(ai): add Ask Findora panel"
```

---

### Task 7: Whole-feature verification

**Files:**
- No new files expected; commit only if verification requires a fix.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified working tree.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Browser smoke check**

Run: `npm run dev`, open `http://localhost:3000`, type `Campus ID, Tuesday`, submit, and confirm candidate cards show `Possible matches` and reasons. Clear with `Browse all` and confirm the normal filters and notice list still work. Check a narrow viewport for no horizontal overflow and confirm no console errors.

- [ ] **Step 4: Commit any verification fixes**

```bash
git status --short
git add <fixed files>
git commit -m "fix(ai): address verification findings"
```

Skip this step when there are no changes.
