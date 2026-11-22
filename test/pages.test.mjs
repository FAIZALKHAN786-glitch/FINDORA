import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const page = (name) => readFileSync(resolve(root, `src/pages/${name}.jsx`), 'utf8');

test('home has search, filters, refresh and accessible item cards', () => {
  const home = page('Home');
  assert.match(home, /useVisibilityRefresh/);
  assert.match(home, /api\.listItems/);
  assert.match(home, /aria-label/);
  assert.match(home, /role="status"|aria-live/);
  assert.match(home, /label="Search"/);
});

test('home offers local AI matching alongside normal filters', () => {
  const home = page('Home');
  for (const text of ['Ask Findora', 'api.matchItems', 'Possible matches', 'AI suggestions', 'Browse all']) {
    assert.ok(home.includes(text), `Home must include ${text}`);
  }
  assert.doesNotMatch(home, /found your item/i);
});

test('AI results heading stays a heading and its section is a polite live region', () => {
  const home = page('Home');
  const heading = home.match(/<h2 id="ai-results-heading"[^>]*>/)[0];
  assert.doesNotMatch(heading, /role="status"/);
  assert.match(home, /<section aria-labelledby="ai-results-heading" aria-live="polite">/);
});

test('report submits multipart data with an optional photo', () => {
  const report = page('Report');
  assert.match(report, /type="file"/);
  assert.match(report, /accept="image\//);
  assert.match(report, /api\.createItem/);
  assert.match(report, /aria-live/);
});

test('detail supports contact, claim and refresh', () => {
  const item = page('Item');
  assert.match(item, /api\.getItem/);
  assert.match(item, /api\.claimItem/);
  assert.match(item, /mailto:/);
  assert.match(item, /tel:/);
  assert.match(item, /useVisibilityRefresh/);
});

test('my items supports delete with an in-app confirmation', () => {
  const mine = page('Mine');
  assert.match(mine, /api\.deleteItem/);
  assert.match(mine, /Cancel/);
  assert.match(mine, /Delete/);
});

test('login switches between sign in and sign up', () => {
  const login = page('Login');
  assert.match(login, /signup/);
  assert.match(login, /signin/);
  assert.match(login, /api\.login|signin\(/);
});

test('no native dialogs remain in the UI', () => {
  for (const name of ['Home', 'Report', 'Item', 'Mine', 'Login']) {
    assert.doesNotMatch(page(name), /\b(alert|confirm|prompt)\s*\(/);
  }
});
