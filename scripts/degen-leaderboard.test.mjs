import assert from "node:assert/strict";
import { test } from "node:test";
import {
  copyDegenScores,
  deploymentSettings,
  waitAndCopy,
} from "./degen-leaderboard.mjs";

const env = { RAILWAY_DEPLOYMENT_ID: "deployment-123", PORT: "42069" };

test("Railway arguments select deployment schema and loopback readiness", () => {
  assert.deepEqual(
    deploymentSettings(
      [
        "--schema=deployment-123",
        "--views-schema=public",
        "--hostname",
        "::",
        "--port",
        "42069",
      ],
      env,
    ),
    { schema: "deployment-123", readyUrl: "http://[::1]:42069/ready" },
  );
  assert.equal(
    deploymentSettings([], env).readyUrl,
    "http://127.0.0.1:42069/ready",
  );
  assert.equal(deploymentSettings([], {}), null);
  assert.throws(
    () => deploymentSettings(["--schema=other"], env),
    /must match/,
  );
  assert.throws(() => deploymentSettings(["--port=bad"], env), /Invalid/);
  assert.throws(() => deploymentSettings(["--schema"], env), /Missing/);
  assert.throws(
    () => deploymentSettings([], { RAILWAY_DEPLOYMENT_ID: "public" }),
    /Invalid/,
  );
});

test("unsafe schema identifiers are rejected before querying", async () => {
  const client = fakeClient();
  await assert.rejects(
    copyDegenScores(client, 'a"; DROP SCHEMA public; --'),
    /Invalid/,
  );
  assert.equal(client.calls.length, 0);
});

function fakeClient({ count = 582, failInsert = false } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT count")) return { rows: [{ count }] };
      if (sql.includes("INSERT INTO")) {
        if (failInsert) throw new Error("test database failure");
        return { rowCount: 582 };
      }
      return {};
    },
  };
}

test("copy uses deployment table, chain parameter, and absolute upsert values", async () => {
  const client = fakeClient();
  assert.equal(await copyDegenScores(client, "deployment-123"), 582);
  const insert = client.calls.find(({ sql }) => sql.includes("INSERT INTO"));
  assert.match(insert.sql, /"deployment-123"\."Leaderboard"/);
  assert.match(insert.sql, /ON CONFLICT \(address, chain_id\) DO UPDATE/);
  for (const column of ["paid", "earned", "nfts"]) {
    assert.ok(insert.sql.includes(`${column} = EXCLUDED.${column}`));
  }
  assert.deepEqual(insert.params, [666666666]);
  assert.equal(client.calls.at(-1).sql, "COMMIT");
  await copyDegenScores(client, "deployment-123");
  assert.equal(client.calls.filter(({ sql }) => sql === "COMMIT").length, 2);
});

test("invalid source and failed inserts roll back", async () => {
  for (const options of [{ count: 0 }, { count: 585 }, { failInsert: true }]) {
    const client = fakeClient(options);
    await assert.rejects(copyDegenScores(client, "deployment-123"));
    assert.equal(client.calls.at(-1).sql, "ROLLBACK");
    assert.ok(!client.calls.some(({ sql }) => sql === "COMMIT"));
  }
});

test("waits for readiness, retries failed copy, then stops copying", async () => {
  let checks = 0;
  let copies = 0;
  let sleeps = 0;
  await waitAndCopy({
    ready: async () => ++checks >= 3,
    copy: async () => {
      assert.ok(checks >= 3);
      if (++copies === 1) throw new Error("transient");
      return 582;
    },
    sleep: async () => {
      sleeps++;
    },
    stopped: () => false,
    log: () => {},
  });
  assert.equal(copies, 2);
  assert.equal(sleeps, 3);
});

test("shutdown while waiting never copies", async () => {
  let stopped = false;
  await waitAndCopy({
    ready: async () => false,
    copy: async () => assert.fail("must not copy"),
    sleep: async () => {
      stopped = true;
    },
    stopped: () => stopped,
    log: () => {},
  });
});

test("persistent import failures exhaust bounded retries", async () => {
  let attempts = 0;
  await assert.rejects(
    waitAndCopy({
      ready: async () => true,
      copy: async () => {
        attempts++;
        throw new Error("failure");
      },
      sleep: async () => {},
      stopped: () => false,
      log: () => {},
      maxAttempts: 3,
    }),
    /exhausted retries/,
  );
  assert.equal(attempts, 3);
});
