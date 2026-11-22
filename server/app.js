import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { unlink } from 'node:fs/promises';

const COOKIE = 'lf_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CATEGORIES = ['Books', 'Electronics', 'Clothing', 'Keys', 'ID & Documents', 'Bags', 'Other'];
const STATUSES = ['lost', 'found', 'claimed', 'returned'];
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LIMIT = 10;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('findora-no-such-user', 10);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const publicUser = ({ id, email, full_name }) => ({ id, email, full_name });

function cookies(req) {
  const result = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    try {
      result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      result[part.slice(0, index).trim()] = '';
    }
  }
  return result;
}

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp({ store, uploadsDir, sessionTtlMs = SESSION_TTL_MS }) {
  if (!store) throw new Error('createApp requires a store');
  mkdirSync(uploadsDir, { recursive: true });

  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '32kb' }));

  const authHits = new Map();
  const authRateLimit = (req, res, next) => {
    const now = Date.now();
    for (const [key, hit] of authHits) if (now >= hit.reset) authHits.delete(key);
    const key = req.ip || 'unknown';
    const hit = authHits.get(key);
    if (!hit) {
      authHits.set(key, { count: 1, reset: now + AUTH_WINDOW_MS });
      return next();
    }
    if (hit.count >= AUTH_LIMIT) {
      res.setHeader('Retry-After', Math.ceil((hit.reset - now) / 1000));
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
    hit.count += 1;
    next();
  };

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req, file, callback) => callback(null, `${randomUUID()}.${MIME_EXT[file.mimetype]}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 12 },
    fileFilter: (_req, file, callback) => {
      if (!MIME_EXT[file.mimetype]) return callback(new HttpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed.'));
      callback(null, true);
    },
  });

  async function issueSession(req, res, userId) {
    const token = randomBytes(32).toString('hex');
    await store.createSession(hashToken(token), userId, new Date(Date.now() + sessionTtlMs));
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: sessionTtlMs,
    });
  }

  const requireAuth = asyncRoute(async (req, _res, next) => {
    const token = cookies(req)[COOKIE];
    if (!token) return next(new HttpError(401, 'Sign in to continue.'));
    const user = await store.findSessionUser(hashToken(token));
    if (!user) return next(new HttpError(401, 'Your session has expired. Sign in again.'));
    req.user = user;
    next();
  });

  app.post('/api/auth/signup', authRateLimit, asyncRoute(async (req, res) => {
    const email = text(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const fullName = text(req.body?.fullName);
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address.');
    if (password.length < 8 || password.length > 128) throw new HttpError(400, 'Password must be 8–128 characters.');
    if (fullName.length < 2 || fullName.length > 80) throw new HttpError(400, 'Name must be 2–80 characters.');
    if (await store.findUserByEmail(email)) throw new HttpError(409, 'An account with that email already exists.');

    const user = await store.createUser({ email, fullName, passwordHash: await bcrypt.hash(password, 10) });
    await issueSession(req, res, user.id);
    res.status(201).json(publicUser(user));
  }));

  app.post('/api/auth/login', authRateLimit, asyncRoute(async (req, res) => {
    const email = text(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = await store.findUserByEmail(email);
    const valid = await bcrypt.compare(password, user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      throw new HttpError(401, 'Email or password is incorrect.');
    }
    await issueSession(req, res, user.id);
    res.json(publicUser(user));
  }));

  app.post('/api/auth/logout', asyncRoute(async (req, res) => {
    const token = cookies(req)[COOKIE];
    if (token) await store.deleteSession(hashToken(token));
    res.clearCookie(COOKIE, { path: '/' });
    res.status(204).end();
  }));

  app.get('/api/auth/session', asyncRoute(async (req, res) => {
    const token = cookies(req)[COOKIE];
    const user = token ? await store.findSessionUser(hashToken(token)) : null;
    res.json({ user: user ? publicUser(user) : null });
  }));

  app.get('/api/auth/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

  app.get('/api/items', asyncRoute(async (req, res) => {
    const q = text(req.query.q).slice(0, 120);
    const category = text(req.query.category);
    const status = text(req.query.status);
    if (category && !CATEGORIES.includes(category)) throw new HttpError(400, 'Unknown category.');
    if (status && !STATUSES.includes(status)) throw new HttpError(400, 'Unknown status.');
    res.json(await store.listItems({ q, category, status }));
  }));

  app.get('/api/items/:id', asyncRoute(async (req, res) => {
    const item = await store.findItem(req.params.id);
    if (!item) throw new HttpError(404, 'Item not found.');
    res.json(item);
  }));

  app.post('/api/items', requireAuth, upload.single('photo'), asyncRoute(async (req, res) => {
    const body = req.body || {};
    const data = {
      title: text(body.title),
      description: text(body.description) || null,
      category: text(body.category),
      status: text(body.status),
      location: text(body.location) || null,
      lost_found_date: text(body.lost_found_date) || null,
      reporter_phone: text(body.reporter_phone) || null,
      photo_url: req.file ? `/uploads/${req.file.filename}` : null,
      reporter_id: req.user.id,
      reporter_email: req.user.email,
    };
    if (data.title.length < 2 || data.title.length > 120) throw new HttpError(400, 'Title must be 2–120 characters.');
    if ((data.description?.length || 0) > 1000) throw new HttpError(400, 'Description must be under 1000 characters.');
    if ((data.location?.length || 0) > 200) throw new HttpError(400, 'Location must be under 200 characters.');
    if (!CATEGORIES.includes(data.category)) throw new HttpError(400, 'Choose a valid category.');
    if (!['lost', 'found'].includes(data.status)) throw new HttpError(400, 'Choose lost or found.');
    if (data.lost_found_date && (!DATE_RE.test(data.lost_found_date) || Number.isNaN(Date.parse(data.lost_found_date)))) {
      throw new HttpError(400, 'Enter a valid date.');
    }
    if (data.reporter_phone && !PHONE_RE.test(data.reporter_phone)) throw new HttpError(400, 'Enter a valid phone number.');
    res.status(201).json(await store.insertItem(data));
  }));

  app.patch('/api/items/:id/claim', requireAuth, asyncRoute(async (req, res) => {
    const item = await store.findItem(req.params.id);
    if (!item) throw new HttpError(404, 'Item not found.');
    if (item.reporter_id !== req.user.id) throw new HttpError(403, 'You can only manage your own listings.');
    if (!['lost', 'found'].includes(item.status)) throw new HttpError(400, 'This item is no longer open.');
    res.json(await store.claimItem(req.params.id, req.user.id));
  }));

  app.delete('/api/items/:id', requireAuth, asyncRoute(async (req, res) => {
    const item = await store.findItem(req.params.id);
    if (!item) throw new HttpError(404, 'Item not found.');
    if (item.reporter_id !== req.user.id) throw new HttpError(403, 'You can only manage your own listings.');
    const deleted = await store.deleteItem(req.params.id, req.user.id);
    if (item.photo_url?.startsWith('/uploads/')) {
      await unlink(resolve(uploadsDir, basename(item.photo_url))).catch(() => {});
    }
    res.status(204).json(deleted);
  }));

  app.use('/uploads', express.static(uploadsDir, { fallthrough: false, index: false, dotfiles: 'deny' }));

  app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be under 5 MB.' });
    if (error.name === 'MulterError') return res.status(400).json({ error: error.message });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
    if (error.code === '22P02') return res.status(400).json({ error: 'Invalid identifier.' });
    if (error.status === 404) return res.status(404).json({ error: 'Not found.' });
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
