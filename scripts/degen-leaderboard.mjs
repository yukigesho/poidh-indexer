import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

export const DEGEN_CHAIN_ID = 666666666;

export function option(args, name, fallback) {
  const index = args.findIndex(
    (arg) => arg === name || arg.startsWith(`${name}=`),
  );
  if (index === -1) return fallback;
  const arg = args[index];
  const value = arg === name ? args[index + 1] : arg.slice(name.length + 1);
  if (!value || value.startsWith("--"))
    throw new Error(`Missing value for ${name}`);
  return value;
}

function validateSchema(schema) {
  if (
    typeof schema !== "string" ||
    !/^[a-zA-Z0-9_-]{1,63}$/.test(schema) ||
    schema === "public" ||
    schema === "historical"
  ) {
    throw new Error("Invalid Railway deployment schema");
  }
}

export function deploymentSettings(args, env) {
  const schema = env.RAILWAY_DEPLOYMENT_ID;
  if (!schema) return null;
  validateSchema(schema);
  if (option(args, "--schema", schema) !== schema) {
    throw new Error("--schema must match RAILWAY_DEPLOYMENT_ID");
  }
  const port = Number(option(args, "--port", env.PORT || "42069"));
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid Ponder port");
  const host = option(args, "--hostname", "0.0.0.0");
  let localHost = host;
  if (host === "::") localHost = "[::1]";
  else if (host === "0.0.0.0") localHost = "127.0.0.1";
  else if (host.includes(":") && !host.startsWith("[")) localHost = `[${host}]`;
  return { schema, readyUrl: `http://${localHost}:${port}/ready` };
}

// Drizzle quotes schema identifiers and binds chain IDs as parameters.
export async function copyDegenScores(client, schema) {
  validateSchema(schema);
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    // Ponder 0.17's live_query trigger expects this per-connection temp table.
    // Match its own transaction setup without disabling any managed triggers.
    await client.query(
      "CREATE TEMP TABLE live_query_tables (table_name TEXT PRIMARY KEY) ON COMMIT DROP",
    );
    const source = await client.query(
      "SELECT count(*)::integer AS count FROM historical.degenscores",
    );
    if (source.rows[0].count !== 582)
      throw new Error("Expected 582 historical Degen wallets");
    const query = new PgDialect().sqlToQuery(sql`
      INSERT INTO ${sql.identifier(schema)}."Leaderboard" (address, chain_id, paid, earned, nfts)
      SELECT address, ${DEGEN_CHAIN_ID}, paid, earned, nfts FROM historical.degenscores
      ON CONFLICT (address, chain_id) DO UPDATE SET
        paid = EXCLUDED.paid,
        earned = EXCLUDED.earned,
        nfts = EXCLUDED.nfts
    `);
    const result = await client.query(query.sql, query.params);
    if (result.rowCount !== 582)
      throw new Error("Unexpected Degen import count");
    await client.query("COMMIT");
    return result.rowCount;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

// Log only known diagnostics: connection errors can include credentials/URLs.
export function describeCopyError(error) {
  const descriptions = {
    "42P01":
      "Required table is missing (check source, destination, and Ponder trigger dependencies)",
    42501: "Database role lacks required permissions",
    "55P03": "Database lock timeout",
    57014: "Database statement timeout or cancellation",
    40001: "Serialization failure",
    "40P01": "Database deadlock",
    23505: "Unique constraint violation",
    23502: "NOT NULL constraint violation",
    "08006": "Database connection failure",
    ECONNREFUSED: "Database connection refused",
    ECONNRESET: "Database connection reset",
    ENOTFOUND: "Database hostname could not be resolved",
    ETIMEDOUT: "Database connection timed out",
  };
  const code = error?.code;
  if (typeof code === "string" && /^[A-Z0-9_]{2,24}$/.test(code)) {
    return `${code}: ${Object.hasOwn(descriptions, code) ? descriptions[code] : "Database error"}`;
  }
  if (
    error?.message === "Expected 582 historical Degen wallets" ||
    error?.message === "Unexpected Degen import count"
  ) {
    return error.message;
  }
  return "Import error (no safe database error code available)";
}

// Readiness is polled only on this container, never via a public/service URL.
export async function waitAndCopy({
  ready,
  copy,
  sleep,
  stopped,
  log,
  maxAttempts = 12,
}) {
  while (!stopped()) {
    if (await ready()) break;
    await sleep();
  }
  for (let attempt = 1; !stopped(); attempt++) {
    try {
      const count = await copy();
      if (stopped()) return;
      log(`Historical Degen leaderboard populated: ${count} wallets`);
      return;
    } catch (error) {
      if (stopped()) return;
      log(
        `Historical Degen copy failed (attempt ${attempt}/${maxAttempts}): ${describeCopyError(error)}`,
      );
      if (attempt >= maxAttempts)
        throw new Error("Historical Degen copy exhausted retries");
      await sleep();
    }
  }
}
