import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import pg from 'pg';
import { createApp } from '../app.js';
import { deleteExpiredPastes } from '../cleanup.js';

const DATABASE_URL = process.env.TEST_DATABASE_URL;
const options = { skip: !DATABASE_URL && 'TEST_DATABASE_URL not set' };

let pool;
let app;

before(options, async () => {
  pool = new pg.Pool({ connectionString: DATABASE_URL });
  await pool.query('DELETE FROM pastes');
  app = createApp({ pool, enableRateLimit: false, trustProxy: 1 });
});

after(options, async () => {
  if (pool) await pool.end();
});

test(options, 'paste is stored and retrieved via real Postgres', async () => {
  const post = await request(app).post('/api/paste').send({ content: '# real db' });
  assert.equal(post.status, 200);

  const get = await request(app).get(`/api/paste/${post.body.id}`);
  assert.equal(get.status, 200);
  assert.equal(get.body.id, post.body.id);
  assert.equal(get.body.content, '# real db');
  assert.equal(typeof get.body.created_at, 'number');
});

test(options, 'stored paste is not found after removal', async () => {
  const post = await request(app).post('/api/paste').send({ content: 'temp' });
  await pool.query('DELETE FROM pastes WHERE id = $1', [post.body.id]);
  const res = await request(app).get(`/api/paste/${post.body.id}`);
  assert.equal(res.status, 404);
});

test(options, 'expired pastes are deleted by cleanup', async () => {
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
