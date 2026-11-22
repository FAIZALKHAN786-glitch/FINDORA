import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createStore } from '../server/store.js';

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
