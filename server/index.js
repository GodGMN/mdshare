import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 20080;
const HOST = process.env.HOST || '0.0.0.0';
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:toor@192.168.100.212:5433/mdshare';
const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');
const MAX_CONTENT = Number(process.env.MAX_CONTENT) || 1_000_000;

const pool = new pg.Pool({ connectionString: DATABASE_URL });

await pool.query(`
  CREATE TABLE IF NOT EXISTS pastes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
`);

const app = express();
app.use(cors());
app.use(express.json({ limit: MAX_CONTENT }));

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
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/paste', async (req, res) => {
  const content = typeof req.body?.content === 'string' ? req.body.content : null;
  if (content === null) return res.status(400).json({ error: 'missing content' });
  if (content.length > MAX_CONTENT)
    return res.status(413).json({ error: 'content too large' });

  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO pastes (id, content, created_at) VALUES ($1, $2, $3)',
      [id, content, Date.now()]
    );
    res.json({ id, url: `/${id}` });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(PORT, HOST, () => {
  console.log(`mdshare listening on http://${HOST}:${PORT}`);
});
