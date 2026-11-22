import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Supabase is fully removed', () => {
  assert.equal(existsSync(resolve(root, 'supabase')), false, 'supabase/ directory should be gone');
  assert.doesNotMatch(read('.env.example'), /SUPABASE/i);
  assert.doesNotMatch(read('SETUP.md'), /supabase/i);
});

test('setup documents the local Docker workflow', () => {
  const setup = read('SETUP.md');
  assert.match(setup, /docker compose up -d/);
  assert.match(setup, /npm run db:init/);
  assert.match(setup, /localhost:3000/);
  assert.match(setup, /npm test/);
});

test('local uploads are ignored and the shell has a theme colour', () => {
  assert.match(read('.gitignore'), /uploads\//);
  assert.match(read('.gitignore'), /\.playwright-cli\//);
  assert.match(read('index.html'), /theme-color/);
  assert.match(read('index.html'), /name="description"/);
});
