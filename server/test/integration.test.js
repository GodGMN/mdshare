import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import pg from 'pg';
import { createApp } from '../app.js';
import { deleteExpiredPastes } from '../cleanup.js';
import { createPool } from '../pool.js';
import { SCHEMA_SQL } from '../schema.js';

const DATABASE_URL = process.env.TEST_DATABASE_URL;
const options = { skip: !DATABASE_URL && 'TEST_DATABASE_URL not set' };

describe('integration (real PostgreSQL)', options, () => {
  let pool;
  let app;

  before(async () => {
    pool = createPool(DATABASE_URL);
    await pool.query(SCHEMA_SQL);
    await pool.query('DELETE FROM pastes');
    app = createApp({ pool, enableRateLimit: false, trustProxy: 1 });
  });

  after(async () => {
    if (pool) await pool.end();
  });

  test('health check verifies the real database connection', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });

  test('paste is stored and retrieved via real Postgres', async () => {
    const post = await request(app).post('/api/paste').send({ content: '# real db' });
    assert.equal(post.status, 200);

    const get = await request(app).get(`/api/paste/${post.body.id}`);
    assert.equal(get.status, 200);
    assert.equal(get.body.id, post.body.id);
    assert.equal(get.body.content, '# real db');
    assert.equal(typeof get.body.created_at, 'number');
  });

  test('stored paste is not found after removal', async () => {
    const post = await request(app).post('/api/paste').send({ content: 'temp' });
    await pool.query('DELETE FROM pastes WHERE id = $1', [post.body.id]);
    const res = await request(app).get(`/api/paste/${post.body.id}`);
    assert.equal(res.status, 404);
  });

  test('a dropped idle connection does not crash the process and the pool recovers', async () => {
    await pool.query('SELECT 1'); // leave an idle client checked into the pool

    const killer = new pg.Client({ connectionString: DATABASE_URL });
    await killer.connect();
    const { rowCount } = await killer.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = current_database()
          AND backend_type = 'client backend'
          AND state = 'idle'
          AND pid <> pg_backend_pid()`,
    );
    await killer.end();
    assert.ok(rowCount >= 1, 'expected at least one idle backend to terminate');

    // Give the terminated client a moment to surface its error on the pool. If
    // nothing listened for it, Node would have exited here.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });

  test('expired pastes are deleted by cleanup', async () => {
    const ttlMs = 1000;
    await pool.query('INSERT INTO pastes (id, content, created_at) VALUES ($1, $2, $3)', [
      'old-paste',
      'stale',
      Date.now() - ttlMs - 5000,
    ]);
    await deleteExpiredPastes(pool, ttlMs);
    const res = await request(app).get('/api/paste/old-paste');
    assert.equal(res.status, 404);
  });
});
