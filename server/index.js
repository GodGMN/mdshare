import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';
import { createApp } from './app.js';
import { startCleanupInterval } from './cleanup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required (e.g. postgresql://user:pass@host:5432/mdshare)');
  process.exit(1);
}

const PORT = process.env.PORT || 20080;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_CONTENT = Number(process.env.MAX_CONTENT) || 1_000_000;
const PASTE_TTL_DAYS = Number(process.env.PASTE_TTL_DAYS ?? 30);

function parseTrustProxy(value) {
  if (!value) return false;
  if (value === 'true') return true;
  const hops = Number(value);
  return Number.isInteger(hops) && hops >= 0 ? hops : value;
}

const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');

const pool = new pg.Pool({ connectionString: DATABASE_URL });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pastes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);
} catch (err) {
  console.error('mdshare: could not initialize database:', err.message);
  process.exit(1);
}

if (PASTE_TTL_DAYS > 0) {
  startCleanupInterval(pool, PASTE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

const app = createApp({
  pool,
  distDir: fs.existsSync(DIST_DIR) ? DIST_DIR : null,
  maxContent: MAX_CONTENT,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
});

app.listen(PORT, HOST, () => {
  console.log(`mdshare listening on http://${HOST}:${PORT}`);
});
