export function deleteExpiredPastes(pool, ttlMs, now = Date.now()) {
  return pool.query('DELETE FROM pastes WHERE created_at < $1', [now - ttlMs]);
}

export function startCleanupInterval(pool, ttlMs, intervalMs = 60 * 60 * 1000) {
  const run = async () => {
    try {
      const result = await deleteExpiredPastes(pool, ttlMs);
      if (result.rowCount > 0) console.log(`mdshare: deleted ${result.rowCount} expired paste(s)`);
    } catch (err) {
      console.error('mdshare: paste cleanup failed:', err.message);
    }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
}
