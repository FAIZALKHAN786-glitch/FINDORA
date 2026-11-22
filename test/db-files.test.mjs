import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('docker compose runs local Postgres 16 with a named volume', () => {
  const compose = read('docker-compose.yml');
  assert.match(compose, /image:\s*postgres:16-alpine/);
  assert.match(compose, /5432:5432/);
  assert.match(compose, /volumes:/);
});

test('schema defines users, sessions, items and the allowed statuses', () => {
  const schema = read('db/schema.sql');
  for (const table of ['users', 'sessions', 'items']) {
    assert.match(schema, new RegExp(`CREATE TABLE.*${table}`, 'i'));
  }
  for (const status of ['lost', 'found', 'claimed', 'returned']) {
    assert.match(schema, new RegExp(`'${status}'`));
  }
  assert.match(schema, /REFERENCES users/i);
  assert.match(schema, /CREATE INDEX/i);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS item_embeddings/i);
  assert.match(schema, /item_id uuid primary key references items\(id\) on delete cascade/i);
  assert.match(schema, /model text not null/i);
  assert.match(schema, /embedding jsonb not null/i);
});

test('seed contains the five authoritative demo rows and no reporters', () => {
  const seed = read('db/seed.sql');
  assert.equal((seed.match(/^\s*\(/gm) || []).length, 5);
  assert.doesNotMatch(seed, /reporter_id/i);
});

test('db init applies the local SQL files with pg', () => {
  const script = read('scripts/db-init.mjs');
  assert.match(script, /db[\\/]schema\.sql/);
  assert.match(script, /db[\\/]seed\.sql/);
  assert.match(script, /readFileSync/);
  assert.match(script, /new Pool|pg/);
});

test('package scripts cover db init, api, dev and tests', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['db:init'], /db-init/);
  assert.match(pkg.scripts.server, /server/);
  assert.match(pkg.scripts.test, /node --test/);
  assert.match(pkg.scripts.dev, /concurrently/);
});
