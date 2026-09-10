import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { createErpcTransport, ERPC_TIMEOUT_MS } from "../src/helpers/erpc";
import { createOffchainPool } from "../src/helpers/offchainPool";

test("eRPC transport overrides Ponder's 10s timeout and disables Viem retries", () => {
  const transport = createErpcTransport(
    "http://localhost:1",
    "test-only-token",
  );
  const instance = transport({ timeout: 10_000, retryCount: 3 });
  assert.equal(instance.config.timeout, 35_000);
  assert.equal(instance.config.timeout, ERPC_TIMEOUT_MS);
  assert.equal(instance.config.retryCount, 0);
});

test("eRPC transport preserves authentication and chain URL", async () => {
  const server = createServer((request, response) => {
    assert.equal(request.url, "/main/evm/8453");
    assert.equal(request.headers["x-erpc-secret-token"], "test-only-token");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: 0, result: "0x123" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const transport = createErpcTransport(
      `http://127.0.0.1:${address.port}/main/evm/8453`,
      "test-only-token",
    )({ timeout: 10_000 });
    assert.equal(
      await transport.request({ method: "eth_blockNumber" }),
      "0x123",
    );
  } finally {
    const closed = once(server, "close");
    server.close();
    server.closeAllConnections();
    await closed;
  }
});

test("off-chain pool preserves URL options and bounds connection/query waits", async () => {
  const url = "postgresql://localhost:1/test?sslmode=require";
  const pool = createOffchainPool(url);
  try {
    assert.equal(pool.options.connectionString, url);
    assert.equal(pool.options.max, 5);
    assert.equal(pool.options.connectionTimeoutMillis, 5_000);
    assert.equal(pool.options.statement_timeout, 15_000);
    assert.equal(pool.options.query_timeout, 20_000);
    assert.equal(pool.options.keepAlive, true);
    assert.equal(pool.options.allowExitOnIdle, true);
    assert.equal(pool.listenerCount("error"), 1);
    // Construction is lazy: unit tests never connect to PostgreSQL.
    assert.equal(pool.totalCount, 0);
  } finally {
    await pool.end();
  }
});
