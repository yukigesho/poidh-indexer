import dotenv from "dotenv";
import * as offchainSchema from "./offchain.schema";
import {
  drizzle,
  NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { Client } from "pg";
import fs from "fs";

fs.existsSync(".env")
  ? dotenv.config({ path: ".env" })
  : dotenv.config({ path: ".env.local" });

let database: NodePgDatabase<
  typeof offchainSchema
> | null = null;

async function createDatabaseConnection() {
  if (database) {
    return database;
  }

  const client = new Client({
    connectionString: `${process.env.DATABASE_URL}?schema=${process.env.DATABASE_SCHEMA}`,
  });

  await client.connect();

  database = drizzle(client, {
    schema: offchainSchema,
  });

  return database;
}

export default await createDatabaseConnection();
