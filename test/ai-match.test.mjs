import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createStore } from '../server/store.js';
import { buildItemText, cosine, matchReasons, rankMatches } from '../server/match.js';

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
