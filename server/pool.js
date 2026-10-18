import pg from 'pg';

/**
 * Create the application's connection pool.
 *
 * `pg-pool` re-emits an idle client's failure on the pool itself. With no
 * `'error'` listener that becomes an unhandled event and Node exits, so a
 * dropped database connection (restart, failover, network blip) would take the
 * whole server down. Log it and let the pool discard the dead client: the next
 * query opens a fresh connection.
 */
export function createPool(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  pool.on('error', (err) => {
    console.error('mdshare: database connection error:', err.message);
  });
  return pool;
}
