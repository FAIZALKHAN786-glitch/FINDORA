import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createStore } from '../server/store.js';
import { buildItemText, cosine, matchReasons, rankMatches } from '../server/match.js';
import { runBackfill } from '../scripts/ai-backfill.mjs';

const { createApp } = await import('../server/app.js');

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
