import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../pool.js';

test('createPool listens for pool errors so an idle-client failure cannot crash the process', async () => {
  const pool = createPool('postgresql://user:pass@127.0.0.1:1/none');

  assert.ok(
    pool.listenerCount('error') >= 1,
    'the pool must have an error listener; without one Node exits on the first dropped idle connection',
  );
  assert.doesNotThrow(() => pool.emit('error', new Error('simulated idle-client failure')));

  await pool.end();
});
