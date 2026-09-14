import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import dotenv from "dotenv";
import pg from "pg";
import {
  copyDegenScores,
  deploymentSettings,
  option,
  waitAndCopy,
} from "./degen-leaderboard.mjs";

dotenv.config({
  path: existsSync(".env") ? ".env" : ".env.local",
  quiet: true,
});

async function start() {
  const args = process.argv.slice(2);
  const settings = deploymentSettings(args, process.env);
  if (settings && !process.env.DATABASE_URL)
    throw new Error("DATABASE_URL must be set");
  if (settings && !option(args, "--schema", null))
    args.push(`--schema=${settings.schema}`);

  const controller = new AbortController();
  const child = spawn("ponder", ["start", ...args], {
    stdio: "inherit",
    shell: false,
  });
  let forcedExitCode;
  let killTimer;
  const stop = (signal) => {
    controller.abort();
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill(signal);
    killTimer ??= setTimeout(() => child.kill("SIGKILL"), 10_000);
    killTimer.unref();
  };
  const onTerm = () => stop("SIGTERM");
  const onInt = () => stop("SIGINT");
  process.on("SIGTERM", onTerm);
  process.on("SIGINT", onInt);
  child.once("error", () => {
    console.error("Unable to start Ponder");
    forcedExitCode = 1;
    controller.abort();
  });
  child.once("close", (code, signal) => {
    controller.abort();
    clearTimeout(killTimer);
    process.off("SIGTERM", onTerm);
    process.off("SIGINT", onInt);
    process.exitCode =
      forcedExitCode ?? code ?? (signal === "SIGINT" ? 130 : 143);
  });

  if (!settings) {
    console.log(
      "No RAILWAY_DEPLOYMENT_ID: starting Ponder without historical Degen copy",
    );
    return;
  }
  console.log(
    `Waiting for local Ponder readiness before copying Degen into ${settings.schema}`,
  );
  try {
    await waitAndCopy({
      stopped: () => controller.signal.aborted,
      sleep: () =>
        delay(5_000, undefined, { signal: controller.signal }).catch(() => {}),
      log: (message) => console.log(message),
      ready: async () => {
        try {
          const response = await fetch(settings.readyUrl, {
            signal: AbortSignal.timeout(3_000),
          });
          await response.body?.cancel();
          return response.status === 200;
        } catch {
          return false;
        }
      },
      copy: async () => {
        const client = new pg.Client({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 5_000,
          statement_timeout: 15_000,
          query_timeout: 20_000,
          keepAlive: true,
        });
        // pg also emits idle connection failures outside query promises.
        client.on("error", () =>
          console.error("Degen database connection interrupted"),
        );
        try {
          await client.connect();
          if (controller.signal.aborted) return 0;
          return await copyDegenScores(client, settings.schema);
        } finally {
          await client.end();
        }
      },
    });
  } catch {
    if (!controller.signal.aborted) {
      console.error(
        "Degen import failed after retries; stopping Ponder so Railway can restart",
      );
      forcedExitCode = 1;
      stop("SIGTERM");
    }
  }
}

try {
  await start();
} catch (error) {
  // Startup validation errors contain no connection strings.
  console.error(error.message);
  process.exitCode = 1;
}
