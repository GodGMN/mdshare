import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteExpiredPastes, startCleanupInterval } from '../cleanup.js';

function makePool() {
  const queries = [];
  const pool = {
    query: async (text, params) => {
      queries.push({ text, params });
      return { rowCount: 2 };
    },
  };
  return { pool, queries };
}

test('deleteExpiredPastes deletes rows older than the TTL cutoff', async () => {
  const { pool, queries } = makePool();
  const before = Date.now();
  await deleteExpiredPastes(pool, 1000);
  const after = Date.now();
  assert.match(queries[0].text, /DELETE FROM pastes WHERE created_at < \$1/);
  const cutoff = queries[0].params[0];
  assert.ok(cutoff <= after - 1000 && cutoff >= before - 1000);
});

test('startCleanupInterval runs immediately and stops when cleared', async () => {
  const { pool, queries } = makePool();
  const timer = startCleanupInterval(pool, 5000, 60_000);
  assert.ok(timer.hasRef() === false);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(queries.length >= 1);
  clearInterval(timer);
});

test('startCleanupInterval keeps going when a cleanup run fails', async () => {
  let calls = 0;
  const pool = {
    query: async () => {
      calls += 1;
      throw new Error('db down');
    },
  };
  const timer = startCleanupInterval(pool, 5000, 5);
  await new Promise((resolve) => setTimeout(resolve, 15));
  clearInterval(timer);
  assert.ok(calls >= 1);
});
