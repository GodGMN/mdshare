import path from 'node:path';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

export function createApp({
  pool,
  distDir = null,
  maxContent = 1_000_000,
  enableRateLimit = true,
  trustProxy = false,
}) {
  const app = express();
  if (trustProxy) app.set('trust proxy', trustProxy);
  app.use(express.json({ limit: maxContent }));

  const createPaste = async (req, res) => {
    const content = typeof req.body?.content === 'string' ? req.body.content : null;
    if (content === null) return res.status(400).json({ error: 'missing content' });

    try {
      const id = uuidv4();
      await pool.query(
        'INSERT INTO pastes (id, content, created_at) VALUES ($1, $2, $3)',
        [id, content, Date.now()]
      );
      res.json({ id, url: `/${id}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal error' });
    }
  };

  if (enableRateLimit) {
    app.post(
      '/api/paste',
      rateLimit({
        windowMs: 1_000,
        limit: 1,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (_req, res) => res.status(429).json({ error: 'rate limited' }),
      }),
      createPaste
    );
  } else {
    app.post('/api/paste', createPaste);
  }

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/paste/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, content, created_at FROM pastes WHERE id = $1',
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal error' });
    }
  });

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
