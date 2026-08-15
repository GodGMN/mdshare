export function parsePositiveInt(env, name, { required = false, fallback = null } = {}) {
  const raw = env[name];
  if (raw === undefined || raw === '') {
    if (required) {
      throw new Error(`${name} is required and must be a positive integer`);
    }
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${raw}`);
  }
  return value;
}

export function parseNonNegativeInt(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, got: ${raw}`);
  }
  return value;
}

export function parseTrustProxy(value) {
  if (!value) return false;
  if (value === 'true') return true;
  const hops = Number(value);
  return Number.isInteger(hops) && hops >= 0 ? hops : value;
}

export function loadConfig(env = process.env) {
  const config = {
    port: parsePositiveInt(env, 'PORT', { fallback: 20080 }),
    host: env.HOST || '0.0.0.0',
    maxContent: parsePositiveInt(env, 'MAX_CONTENT', { fallback: 1_000_000 }),
    pasteTtlDays: parseNonNegativeInt(env, 'PASTE_TTL_DAYS', 30),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
  };
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required (e.g. postgresql://user:pass@host:5432/mdshare)');
  }
  config.databaseUrl = env.DATABASE_URL;
  return config;
}
