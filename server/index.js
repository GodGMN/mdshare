import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';
import { createApp } from './app.js';
import { startCleanupInterval } from './cleanup.js';
import { SCHEMA_SQL } from './schema.js';
import { loadConfig } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`mdshare: ${err.message}`);
  process.exit(1);
}

const {
  databaseUrl: DATABASE_URL,
  port: PORT,
  host: HOST,
  maxContent: MAX_CONTENT,
  pasteTtlDays: PASTE_TTL_DAYS,
} = config;

const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');

const pool = new pg.Pool({ connectionString: DATABASE_URL });

try {
  await pool.query(SCHEMA_SQL);
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
  trustProxy: config.trustProxy,
});

const server = app.listen(PORT, HOST, () => {
  console.log(`mdshare listening on http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`mdshare: ${signal} received, shutting down`);
  server.close(async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
