import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

async function fixture(t, body) {
  const directory = await mkdtemp(join(tmpdir(), "ponder-wrapper-test-"));
  await writeFile(join(directory, "ponder"), `#!/usr/bin/env node\n${body}`, {
    mode: 0o700,
  });
  const env = {
    ...process.env,
    PATH: `${directory}${delimiter}${process.env.PATH}`,
  };
  delete env.RAILWAY_DEPLOYMENT_ID;
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("./start.mjs", import.meta.url)), "--port", "42069"],
    {
      cwd: directory,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGTERM");
    await rm(directory, { recursive: true, force: true });
  });
  return child;
}

test("wrapper forwards CLI arguments and propagates Ponder failure", {
  timeout: 10_000,
}, async (t) => {
  const child = await fixture(
    t,
    `
    if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(['start', '--port', '42069'])) process.exit(8);
    process.exit(7);
  `,
  );
  const [code] = await once(child, "close");
  assert.equal(code, 7);
});

test("wrapper forwards SIGTERM and waits for child exit", {
  timeout: 10_000,
}, async (t) => {
  const child = await fixture(
    t,
    `
    process.on('SIGTERM', () => process.exit(0));
    setInterval(() => {}, 1000);
    console.log('FAKE_PONDER_READY');
  `,
  );
  const closed = once(child, "close");
  let output = "";
  for await (const chunk of child.stdout) {
    output += chunk.toString();
    if (output.includes("FAKE_PONDER_READY")) {
      child.kill("SIGTERM");
      break;
    }
  }
  const [code] = await closed;
  assert.equal(code, 0);
});
