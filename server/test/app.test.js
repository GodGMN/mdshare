import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';

function makePool({ selectRows = [], selectError = null, insertError = null } = {}) {
  const queries = [];
  const pool = {
    query: async (text, params) => {
      queries.push({ text, params });
      if (text.trimStart().startsWith('SELECT') && selectError) throw selectError;
      if (text.trimStart().startsWith('INSERT') && insertError) throw insertError;
      if (text.trimStart().startsWith('SELECT')) return { rows: selectRows };
      return { rows: [] };
    },
  };
  return { pool, queries };
}

test('GET /health returns ok', async () => {
  const { pool } = makePool();
  const res = await request(createApp({ pool, enableRateLimit: false })).get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test('POST /api/paste stores content and returns url', async () => {
  const { pool, queries } = makePool();
  const res = await request(createApp({ pool, enableRateLimit: false }))
    .post('/api/paste')
    .send({ content: '# hello' });
  assert.equal(res.status, 200);
  assert.match(res.body.id, /^[0-9a-f-]{36}$/);
  assert.equal(res.body.url, `/${res.body.id}`);
  assert.equal(queries.length, 1);
  assert.equal(queries[0].params[0], res.body.id);
  assert.equal(queries[0].params[1], '# hello');
});

test('POST /api/paste with missing content returns 400', async () => {
  const { pool, queries } = makePool();
  const res = await request(createApp({ pool, enableRateLimit: false }))
    .post('/api/paste')
    .send({});
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: 'missing content' });
  assert.equal(queries.length, 0);
});

test('POST /api/paste with non-string content returns 400', async () => {
  const { pool } = makePool();
  const res = await request(createApp({ pool, enableRateLimit: false }))
    .post('/api/paste')
    .send({ content: 42 });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: 'missing content' });
});

test('POST /api/paste with body over limit returns 413', async () => {
  const { pool, queries } = makePool();
  const res = await request(createApp({ pool, maxContent: 20, enableRateLimit: false }))
    .post('/api/paste')
    .send({ content: 'x'.repeat(100) });
  assert.equal(res.status, 413);
  assert.deepEqual(res.body, { error: 'content too large' });
  assert.equal(queries.length, 0);
});

test('POST /api/paste returns 500 when insert fails', async () => {
  const { pool } = makePool({ insertError: new Error('db down') });
  const res = await request(createApp({ pool, enableRateLimit: false }))
    .post('/api/paste')
    .send({ content: 'hi' });
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: 'internal error' });
});

test('POST /api/paste with malformed JSON returns 400', async () => {
  const { pool } = makePool();
  const res = await request(createApp({ pool, enableRateLimit: false }))
    .post('/api/paste')
    .set('Content-Type', 'application/json')
    .send('{not json');
  assert.equal(res.status, 400);
});

test('GET /api/paste/:id returns stored paste', async () => {
  const row = { id: 'abc', content: '# hi', created_at: 123 };
  const { pool, queries } = makePool({ selectRows: [row] });
  const res = await request(createApp({ pool, enableRateLimit: false })).get('/api/paste/abc');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, row);
  assert.equal(queries[0].params[0], 'abc');
});

test('GET /api/paste/:id returns 404 when missing', async () => {
  const { pool } = makePool({ selectRows: [] });
  const res = await request(createApp({ pool, enableRateLimit: false })).get('/api/paste/missing');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'not found' });
});

test('GET /api/paste/:id returns 500 when query fails', async () => {
  const { pool } = makePool({ selectError: new Error('db down') });
  const res = await request(createApp({ pool, enableRateLimit: false })).get('/api/paste/abc');
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: 'internal error' });
});

test('rate limiter allows one post per second', async () => {
  const { pool, queries } = makePool();
  const app = createApp({ pool });
  const first = await request(app).post('/api/paste').send({ content: 'one' });
  assert.equal(first.status, 200);
  const second = await request(app).post('/api/paste').send({ content: 'two' });
  assert.equal(second.status, 429);
  assert.deepEqual(second.body, { error: 'rate limited' });
  assert.equal(queries.length, 1);
});

test('trust proxy is applied when configured', async () => {
  const { pool } = makePool();
  const app = createApp({ pool, trustProxy: 1 });
  assert.equal(app.get('trust proxy'), 1);
});

test('rate limit is per client IP when behind a trusted proxy', async () => {
  const { pool, queries } = makePool();
  const app = createApp({ pool, trustProxy: 1 });
  const first = await request(app).post('/api/paste').set('X-Forwarded-For', '1.1.1.1').send({ content: 'one' });
  assert.equal(first.status, 200);
  const second = await request(app).post('/api/paste').set('X-Forwarded-For', '2.2.2.2').send({ content: 'two' });
  assert.equal(second.status, 200);
  assert.equal(queries.length, 2);
});

test('serves SPA from dist dir and passes through /api', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mdshare-dist-'));
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>mdshare</title>');
  const { pool } = makePool();
  const app = createApp({ pool, distDir: dir, enableRateLimit: false });

  const root = await request(app).get('/');
  assert.equal(root.status, 200);
  assert.match(root.text, /mdshare/);

  const page = await request(app).get('/some/path');
  assert.equal(page.status, 200);
  assert.match(page.text, /mdshare/);

  const api = await request(app).get('/api/paste/nope');
  assert.equal(api.status, 404);

  rmSync(dir, { recursive: true, force: true });
});
