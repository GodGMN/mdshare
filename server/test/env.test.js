import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, parsePositiveInt, parseNonNegativeInt, parseTrustProxy } from '../env.js';

const BASE_ENV = { DATABASE_URL: 'postgresql://user:pass@host:5432/mdshare' };

test('loadConfig returns defaults when only DATABASE_URL is set', () => {
  const config = loadConfig(BASE_ENV);
  assert.deepEqual(config, {
    databaseUrl: 'postgresql://user:pass@host:5432/mdshare',
    port: 20080,
    host: '0.0.0.0',
    maxContent: 1_000_000,
    pasteTtlDays: 30,
    trustProxy: false,
  });
});

test('loadConfig applies configured values', () => {
  const config = loadConfig({
    ...BASE_ENV,
    PORT: '3000',
    HOST: '127.0.0.1',
    MAX_CONTENT: '5000',
    PASTE_TTL_DAYS: '0',
    TRUST_PROXY: '1',
  });
  assert.equal(config.port, 3000);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.maxContent, 5000);
  assert.equal(config.pasteTtlDays, 0);
  assert.equal(config.trustProxy, 1);
});

test('loadConfig throws without DATABASE_URL', () => {
  assert.throws(() => loadConfig({}), /DATABASE_URL is required/);
});

test('PORT must be a positive integer', () => {
  assert.throws(() => loadConfig({ ...BASE_ENV, PORT: 'abc' }), /PORT must be a positive integer/);
  assert.throws(() => loadConfig({ ...BASE_ENV, PORT: '0' }), /PORT must be a positive integer/);
  assert.throws(() => loadConfig({ ...BASE_ENV, PORT: '-1' }), /PORT must be a positive integer/);
  assert.throws(() => loadConfig({ ...BASE_ENV, PORT: '20.5' }), /PORT must be a positive integer/);
});

test('MAX_CONTENT must be a positive integer', () => {
  assert.throws(
    () => loadConfig({ ...BASE_ENV, MAX_CONTENT: 'big' }),
    /MAX_CONTENT must be a positive integer/,
  );
});

test('PASTE_TTL_DAYS accepts zero but rejects negatives and garbage', () => {
  assert.equal(parseNonNegativeInt({ PASTE_TTL_DAYS: '0' }, 'PASTE_TTL_DAYS', 30), 0);
  assert.throws(
    () => loadConfig({ ...BASE_ENV, PASTE_TTL_DAYS: '-3' }),
    /PASTE_TTL_DAYS must be a non-negative integer/,
  );
  assert.throws(
    () => loadConfig({ ...BASE_ENV, PASTE_TTL_DAYS: 'forever' }),
    /PASTE_TTL_DAYS must be a non-negative integer/,
  );
});

test('empty values fall back to defaults', () => {
  assert.equal(parsePositiveInt({ PORT: '' }, 'PORT', { fallback: 20080 }), 20080);
  assert.equal(parseNonNegativeInt({ PASTE_TTL_DAYS: '' }, 'PASTE_TTL_DAYS', 30), 30);
});

test('parseTrustProxy handles true, hop counts, subnets and falsy values', () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy(''), false);
  assert.equal(parseTrustProxy('true'), true);
  assert.equal(parseTrustProxy('2'), 2);
  assert.equal(parseTrustProxy('10.0.0.0/8'), '10.0.0.0/8');
  assert.equal(parseTrustProxy('bogus'), 'bogus');
});
