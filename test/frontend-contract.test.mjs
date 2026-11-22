import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('frontend no longer imports Supabase', () => {
  const app = read('src/App.jsx');
  const pkg = read('package.json');
  assert.doesNotMatch(app, /@supabase\/supabase-js/);
  assert.doesNotMatch(pkg, /@supabase\/supabase-js/);
});

test('API client talks only to the local API with cookies', () => {
  const api = read('src/lib/api.js');
  assert.match(api, /credentials:\s*['"]include['"]/);
  for (const route of ['/api/auth/me', '/api/auth/signup', '/api/auth/login', '/api/auth/logout', '/api/items', '/api/ai/match']) {
    assert.match(api, new RegExp(route.replace('/', '\\/')));
  }
  assert.match(api, /FormData/);
});

test('auth context and design primitives exist', () => {
  const auth = read('src/lib/auth.jsx');
  assert.match(auth, /export function AuthProvider/);
  assert.match(auth, /export function useAuth/);
  for (const name of ['Button', 'Input', 'Select', 'Textarea', 'StatusPill', 'Card', 'EmptyState', 'Spinner']) {
    assert.ok(existsSync(resolve(root, `src/components/${name}.jsx`)), `missing ${name}.jsx`);
  }
});

test('Vite proxies API and uploads to Express', () => {
  const vite = read('vite.config.js');
  assert.match(vite, /['"]\/api['"]/);
  assert.match(vite, /['"]\/uploads['"]/);
  assert.match(vite, /3001/);
});

test('design tokens and reduced motion are configured', () => {
  const tailwind = read('tailwind.config.js');
  assert.match(tailwind, /ink/);
  assert.match(tailwind, /paper/);
  assert.match(tailwind, /accent/);
  const css = read('src/index.css');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
});

test('the app is branded as Findora', () => {
  const html = read('index.html');
  const pkg = JSON.parse(read('package.json'));
  const logo = read('src/components/Logo.jsx');
  const app = read('src/App.jsx');

  assert.match(html, /<title>Findora/);
  assert.equal(pkg.name, 'findora');
  assert.match(logo, /Findora/);
  assert.match(app, /Findora/);
  assert.doesNotMatch(app, /Campus Lost and Found home/);
});

test('soft paper visual tokens are configured', () => {
  const tailwind = read('tailwind.config.js');
  assert.match(tailwind, /clay/);
  assert.match(tailwind, /paper/);
  const css = read('src/index.css');
  assert.match(css, /paper-grain/);
});
