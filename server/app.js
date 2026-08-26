import path from 'node:path';
import { randomBytes } from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';

// 64 URL-safe symbols -> 6 bits of entropy per character.
const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const ID_LENGTH = 12; // 72 bits: collision-probability ~0 for any realistic paste volume

function shortId() {
  let id = '';
  const bytes = randomBytes(ID_LENGTH);
  for (let i = 0; i < ID_LENGTH; i++) id += ID_ALPHABET[bytes[i] & 63];
  return id;
}

export function createApp({
  pool,
  distDir = null,
  maxContent = 1_000_000,
  enableRateLimit = true,
  rateLimitOptions = { windowMs: 60_000, limit: 10 },
  readRateLimitOptions = { windowMs: 60_000, limit: 60 },
  trustProxy = false,
}) {
  const app = express();
  if (trustProxy) app.set('trust proxy', trustProxy);
  app.use((_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: maxContent }));

  const createPaste = async (req, res) => {
    const content = typeof req.body?.content === 'string' ? req.body.content : null;
    if (content === null) return res.status(400).json({ error: 'missing content' });
    if (content.trim().length === 0) return res.status(400).json({ error: 'empty content' });

    try {
      const id = shortId();
      await pool.query('INSERT INTO pastes (id, content, created_at) VALUES ($1, $2, $3)', [
        id,
        content,
        Date.now(),
      ]);
      res.json({ id, url: `/${id}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal error' });
    }
  };

  const postLimiter = enableRateLimit
    ? rateLimit({
        ...rateLimitOptions,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (_req, res) => res.status(429).json({ error: 'rate limited' }),
      })
    : null;
  const readLimiter = enableRateLimit
    ? rateLimit({
        ...readRateLimitOptions,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (_req, res) => res.status(429).json({ error: 'rate limited' }),
      })
    : null;

  if (postLimiter) {
    app.post('/api/paste', postLimiter, createPaste);
  } else {
    app.post('/api/paste', createPaste);
  }

  app.get('/health', (_req, res) => res.json({ ok: true }));

  const readPaste = async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, content, created_at FROM pastes WHERE id = $1',
        [req.params.id],
      );
      if (!rows.length) return res.status(404).json({ error: 'not found' });
      const { id, content, created_at } = rows[0];
      res.json({ id, content, created_at: Number(created_at) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal error' });
    }
  };

  if (readLimiter) {
    app.get('/api/paste/:id', readLimiter, readPaste);
  } else {
    app.get('/api/paste/:id', readPaste);
  }

  if (distDir) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: status === 413 ? 'content too large' : 'internal error' });
  });

  return app;
}
