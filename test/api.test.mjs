import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { createApp } = await import('../server/app.js').catch(() => ({}));

function fakeStore() {
  const users = [];
  const sessions = new Map();
  const items = [];
  let id = 0;
  const nextId = () => String(++id);

  return {
    users,
    sessions,
    items,
    async findUserByEmail(email) { return users.find((u) => u.email === email) || null; },
    async createUser({ email, fullName, passwordHash }) {
      const user = { id: nextId(), email, full_name: fullName, password_hash: passwordHash };
      users.push(user);
      return user;
    },
    async createSession(tokenHash, userId) { sessions.set(tokenHash, userId); },
    async findSessionUser(tokenHash) {
      const userId = sessions.get(tokenHash);
      return userId ? users.find((u) => u.id === userId) || null : null;
    },
    async deleteSession(tokenHash) { sessions.delete(tokenHash); },
    async findItem(itemId) { return items.find((i) => i.id === itemId) || null; },
    async listItems({ q, category, status } = {}) {
      return items.filter((i) => {
        if (category && i.category !== category) return false;
        if (status && i.status !== status) return false;
        if (q && !`${i.title} ${i.description} ${i.location}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });
    },
    async insertItem(data) {
      const item = { id: nextId(), ...data, created_at: new Date().toISOString() };
      items.push(item);
      return item;
    },
    async claimItem(itemId, userId) {
      const item = items.find((i) => i.id === itemId);
      if (!item || item.reporter_id !== userId || !['lost', 'found'].includes(item.status)) return null;
      item.status = 'claimed';
      return item;
    },
    async deleteItem(itemId, userId) {
      const index = items.findIndex((i) => i.id === itemId && i.reporter_id === userId);
      return index === -1 ? null : items.splice(index, 1)[0];
    },
  };
}

async function start(store, uploadsDir) {
  const app = createApp({ store, uploadsDir });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

const call = (base, path, options = {}) => fetch(`${base}${path}`, options);

test('auth, items, upload and owner-only mutations work end to end', async (t) => {
  assert.equal(typeof createApp, 'function', 'server/app.js must export createApp');
  const uploadsDir = await mkdtemp(join(tmpdir(), 'lostfound-uploads-'));
  const store = fakeStore();
  const { server, base } = await start(store, uploadsDir);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(uploadsDir, { recursive: true, force: true });
  });

  const signup = await call(base, '/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'Owner@Student.edu', password: 'password123', fullName: 'Owner' }),
  });
  assert.equal(signup.status, 201);
  const owner = await signup.json();
  assert.equal(owner.email, 'owner@student.edu');
  assert.equal(owner.password_hash, undefined);
  const ownerCookie = signup.headers.get('set-cookie').split(';')[0];

  const me = await call(base, '/api/auth/me', { headers: { cookie: ownerCookie } });
  assert.equal(me.status, 200);

  const wrongLogin = await call(base, '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'owner@student.edu', password: 'wrong-password' }),
  });
  assert.equal(wrongLogin.status, 401);
  assert.deepEqual(Object.keys(await wrongLogin.json()), ['error']);

  const form = new FormData();
  form.set('title', 'Blue notebook');
  form.set('description', 'Chemistry notes');
  form.set('category', 'Books');
  form.set('status', 'lost');
  form.set('location', 'Library');
  form.set('lost_found_date', '2026-11-20');
  form.set('reporter_phone', '555-0100');
  form.set('photo', new Blob(['png-bytes'], { type: 'image/png' }), 'notebook.png');

  const createdRes = await call(base, '/api/items', { method: 'POST', headers: { cookie: ownerCookie }, body: form });
  assert.equal(createdRes.status, 201);
  const created = await createdRes.json();
  assert.equal(created.reporter_id, owner.id);
  assert.match(created.photo_url, /^\/uploads\/.+\.png$/);

  const filtered = await (await call(base, '/api/items?q=chemistry&category=Books&status=lost')).json();
  assert.equal(filtered.length, 1);
  const noMatch = await (await call(base, '/api/items?q=unrelated')).json();
  assert.equal(noMatch.length, 0);

  const otherSignup = await call(base, '/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'other@student.edu', password: 'password123', fullName: 'Other' }),
  });
  const otherCookie = otherSignup.headers.get('set-cookie').split(';')[0];

  const forbiddenClaim = await call(base, `/api/items/${created.id}/claim`, { method: 'PATCH', headers: { cookie: otherCookie } });
  assert.equal(forbiddenClaim.status, 403);
  const forbiddenDelete = await call(base, `/api/items/${created.id}`, { method: 'DELETE', headers: { cookie: otherCookie } });
  assert.equal(forbiddenDelete.status, 403);

  const claim = await call(base, `/api/items/${created.id}/claim`, { method: 'PATCH', headers: { cookie: ownerCookie } });
  assert.equal(claim.status, 200);
  assert.equal((await claim.json()).status, 'claimed');

  const removed = await call(base, `/api/items/${created.id}`, { method: 'DELETE', headers: { cookie: ownerCookie } });
  assert.equal(removed.status, 204);
  assert.equal((await (await call(base, `/api/items/${created.id}`)).json()).error, 'Item not found.');

  const logout = await call(base, '/api/auth/logout', { method: 'POST', headers: { cookie: ownerCookie } });
  assert.equal(logout.status, 204);
  assert.equal((await call(base, '/api/auth/me', { headers: { cookie: ownerCookie } })).status, 401);
});
