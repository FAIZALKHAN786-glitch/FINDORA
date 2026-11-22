import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { createApp } = await import('../server/app.js');

function fakeStore() {
  const users = [];
  const sessions = new Map();
  return {
    async findUserByEmail(email) { return users.find((u) => u.email === email) || null; },
    async createUser({ email, fullName, passwordHash }) {
      const user = { id: String(users.length + 1), email, full_name: fullName, password_hash: passwordHash };
      users.push(user);
      return user;
    },
    async createSession(token, userId) { sessions.set(token, userId); },
    async findSessionUser(token) {
      const id = sessions.get(token);
      return id ? users.find((u) => u.id === id) || null : null;
    },
    async deleteSession(token) { sessions.delete(token); },
  };
}

async function withApp(t, run) {
  const uploadsDir = await mkdtemp(join(tmpdir(), 'findora-security-'));
  const app = createApp({ store: fakeStore(), uploadsDir });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(uploadsDir, { recursive: true, force: true });
  });
  return run(`http://127.0.0.1:${server.address().port}`);
}

test('malformed session cookie returns JSON instead of escaping the error handler', async (t) => {
  await withApp(t, async (base) => {
    const response = await fetch(`${base}/api/auth/me`, { headers: { cookie: 'lf_session=%' } });
    assert.equal(response.status, 401);
    assert.deepEqual(Object.keys(await response.json()), ['error']);
  });
});

test('unknown and known-email login failures return the same response shape', async (t) => {
  await withApp(t, async (base) => {
    const request = (email) => fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrong-password' }),
    });
    const unknown = await request('nobody@example.edu');
    const known = await request('owner@example.edu');
    assert.equal(unknown.status, 401);
    assert.equal(known.status, 401);
    assert.deepEqual(await unknown.json(), await known.json());
    assert.equal(unknown.headers.get('set-cookie'), null);
    assert.equal(known.headers.get('set-cookie'), null);
  });
});

test('auth endpoints are rate limited', async (t) => {
  await withApp(t, async (base) => {
    const attempt = () => fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123', fullName: 'Test' }),
    });
    for (let i = 0; i < 10; i += 1) assert.equal((await attempt()).status, 400);
    const limited = await attempt();
    assert.equal(limited.status, 429);
    assert.match((await limited.json()).error, /too many attempts/i);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });
});
