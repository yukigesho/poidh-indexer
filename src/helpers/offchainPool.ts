import { Pool } from "pg";

/** A failed connection is discarded; failed queries still propagate to Ponder. */
export function createOffchainPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    application_name: "poidh-indexer-offchain",
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    // Cancel on the server before the client-side query deadline expires.
    statement_timeout: 15_000,
    query_timeout: 20_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    allowExitOnIdle: true,
  });

  // pg-pool removes failed idle clients and creates replacements on demand.
  // Never log the connection URL or raw server error (may contain credentials).
  pool.on("error", () => {
    console.error(
      "Off-chain PostgreSQL idle connection failed; pool will replace it",
    );
  });

  return pool;
}
